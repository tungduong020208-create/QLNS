import React, { useState, useMemo } from 'react';
import { User, CheckInRecord, PeerReviewSubmission, WeeklyShiftRegistration } from '../../types';
import { Shift } from './ManagerScheduleScreen';
import * as XLSX from 'xlsx';

interface ExportReportScreenProps {
  currentUser: User;
  allUsers: User[];
  shifts: Shift[];
  peerReviews: PeerReviewSubmission[];
  shiftRegistrations: WeeklyShiftRegistration[];
}

type ExportType = 'attendance' | 'schedule' | 'peer_review';

export const ExportReportScreen: React.FC<ExportReportScreenProps> = ({
  currentUser, allUsers, shifts, peerReviews, shiftRegistrations,
}) => {
  const [activeExport, setActiveExport] = useState<ExportType>('attendance');
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 7); return d.toISOString().split('T')[0];
  });
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().split('T')[0]);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date(); return now.getFullYear() + '-' + String(now.getMonth()+1).padStart(2,'0');
  });
  const [exporting, setExporting] = useState(false);

  const employees = useMemo(() => allUsers.filter(u => u.role === 'employee'), [allUsers]);

  const exportOptions: { id: ExportType; label: string; icon: string; desc: string }[] = [
    { id: 'attendance', label: 'Điểm danh', icon: 'login', desc: 'Check-in/out, giờ làm' },
    { id: 'schedule', label: 'Lịch làm việc', icon: 'calendar_month', desc: 'Phân công ca làm tuần' },
    { id: 'peer_review', label: 'Đánh giá chéo', icon: 'star', desc: 'Peer review & xếp hạng' },
  ];

  const handleExport = () => {
    setExporting(true);
    setTimeout(() => {
      try {
        if (activeExport === 'attendance') exportAttendance();
        else if (activeExport === 'schedule') exportSchedule();
        else exportPeerReview();
      } catch (e) { console.error('Export error:', e); }
      setExporting(false);
    }, 300);
  };

  const exportAttendance = () => {
    const stored = localStorage.getItem('coffeehouse_checkin_records');
    const allRecords: Record<string, CheckInRecord[]> = stored ? JSON.parse(stored) : {};
    const rows: any[][] = [['Mã NV', 'Tên nhân viên', 'Ngày', 'Giờ vào', 'Giờ ra', 'Tổng giờ', 'Phương thức', 'Đúng giờ']];

    employees.forEach(emp => {
      const records = allRecords[emp.id] || [];
      const filtered = records.filter(r => {
        const d = new Date(r.timestamp).toISOString().split('T')[0];
        return d >= dateFrom && d <= dateTo;
      });

      const byDate = new Map<string, CheckInRecord[]>();
      filtered.forEach(r => {
        const d = new Date(r.timestamp).toISOString().split('T')[0];
        if (!byDate.has(d)) byDate.set(d, []);
        byDate.get(d)!.push(r);
      });

      byDate.forEach((dayRecords, date) => {
        const checkIn = dayRecords.find(r => r.type === 'checkin');
        const checkOut = dayRecords.find(r => r.type === 'checkout');
        const hours = checkIn && checkOut
          ? ((checkOut.timestamp - checkIn.timestamp) / 3600000).toFixed(1)
          : checkIn ? 'Đang làm' : '—';
        const onTime = checkIn && checkIn.time < '08:00:00' ? 'Đúng giờ' : 'Muộn';
        rows.push([
          emp.employeeCode, emp.name, date,
          checkIn?.time || '—', checkOut?.time || '—',
          hours, checkIn?.checkInMethod || '—', onTime
        ]);
      });
    });

    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = [{ wch: 12 }, { wch: 20 }, { wch: 12 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Điểm danh');
    XLSX.writeFile(wb, 'AiiCafe_DiemDanh_' + dateFrom + '_' + dateTo + '.xlsx');
  };

  const exportSchedule = () => {
    const rows: any[][] = [['Mã NV', 'Tên nhân viên', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ nhật']];
    const dayLabels = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

    const now = new Date();
    const monday = new Date(now);
    const dayNum = now.getDay();
    monday.setDate(now.getDate() - (dayNum === 0 ? 6 : dayNum - 1));

    employees.forEach(emp => {
      const row: any[] = [emp.employeeCode, emp.name];
      for (let i = 0; i < 7; i++) {
        const d = new Date(monday); d.setDate(monday.getDate() + i);
        const ds = d.toISOString().split('T')[0];
        const shift = shifts.find(s => s.employeeId === emp.id && s.date === ds);
        row.push(shift ? shift.shiftName + ' ' + shift.startTime + '-' + shift.endTime : 'Nghỉ');
      }
      rows.push(row);
    });

    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = [{ wch: 12 }, { wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 20 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Lịch làm việc');
    XLSX.writeFile(wb, 'AiiCafe_LichLamViec_' + selectedMonth + '.xlsx');
  };

  const exportPeerReview = () => {
    const monthReviews = peerReviews.filter(r => r.monthKey === selectedMonth);
    const rows: any[][] = [['Người đánh giá', 'Người được đánh giá', 'TB Làm việc nhóm', 'TB Trách nhiệm', 'TB Chuyên môn', 'Điểm TB', 'Nhận xét', 'Ngày']];

    monthReviews.forEach(r => {
      const criteriaNames = ['Làm việc nhóm', 'Trách nhiệm', 'Chuyên môn'];
      const scores = r.answers.map(a => a.stars);
      rows.push([
        r.evaluatorName, r.targetName,
        scores[0] || '—', scores[1] || '—', scores[2] || '—',
        r.avgScore.toFixed(1), r.comment || '—', r.dateString
      ]);
    });

    // Add leaderboard summary
    rows.push([]);
    rows.push(['=== BẢNG XẾP HẠNG ===']);
    rows.push(['Thứ hạng', 'Tên nhân viên', 'Điểm TB', 'Số lượt đánh giá']);

    const scoreMap = new Map<string, {total:number;count:number}>();
    monthReviews.forEach(r => { const e = scoreMap.get(r.targetId)||{total:0,count:0}; e.total+=r.avgScore; e.count+=1; scoreMap.set(r.targetId,e); });
    const leaderboard = Array.from(scoreMap.entries())
      .map(([uid,d]) => ({ user: allUsers.find(u=>u.id===uid), avg: (d.total/d.count).toFixed(1), count: d.count }))
      .filter(e=>e.user).sort((a,b)=>parseFloat(b.avg)-parseFloat(a.avg));

    leaderboard.forEach((e, i) => { rows.push([i+1, e.user!.name, e.avg, e.count]); });

    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = [{ wch: 18 }, { wch: 18 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 10 }, { wch: 30 }, { wch: 12 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Peer Review');
    XLSX.writeFile(wb, 'AiiCafe_PeerReview_' + selectedMonth + '.xlsx');
  };

  return (
    <div className="pb-28 pt-20 px-4 max-w-3xl mx-auto w-full antialiased">
      <div className="mb-5">
        <h2 className="font-heading text-2xl font-bold text-[#0F1E44]">Xuất Báo Cáo</h2>
        <p className="text-xs text-[#7A829A] mt-0.5">Tải dữ liệu vận hành ra file Excel</p>
      </div>

      {/* Export type selector */}
      <div className="flex gap-2 mb-5 bg-[#F5EDDF] rounded-xl p-1">
        {exportOptions.map(opt => (
          <button key={opt.id} onClick={() => setActiveExport(opt.id)}
            className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-all flex flex-col items-center gap-1 ${
              activeExport === opt.id ? 'bg-[#0F1E44] text-white shadow-sm' : 'text-[#7A829A] hover:text-[#0F1E44]'
            }`}>
            <span className="material-symbols-outlined text-[18px]">{opt.icon}</span>
            <span>{opt.label}</span>
          </button>
        ))}
      </div>

      {/* Date filters */}
      <div className="bg-white rounded-2xl border border-[#E8DFD0] p-4 shadow-sm mb-4">
        {activeExport === 'attendance' ? (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#7A829A] mb-1">Từ ngày</label>
              <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                className="w-full rounded-lg border E8DFD0] px-3 py-2 text-sm text-[#0F1E44] focus:border-[#EFC14B] outline-none" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#7A829A] mb-1">Đến ngày</label>
              <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                className="w-full rounded-lg border border-[#E8DFD0] px-3 py-2 text-sm text-[#0F1E44] focus:border-[#EFC14B] outline-none" />
            </div>
          </div>
        ) : (
          <div>
            <label className="block text-xs font-semibold text-[#7A829A] mb-1">Tháng</label>
            <input type="month" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)}
              className="w-full rounded-lg border border-[#E8DFD0] px-3 py-2 text-sm text-[#0F1E44] focus:border-[#EFC14B] outline-none" />
          </div>
        )}
        <p className="text-[10px] text-[#7A829A] mt-2">
          {activeExport === "attendance" && "Dữ liệu từ " + dateFrom + " đến " + dateTo}
          {activeExport === "schedule" && "Xuất lịch phân công ca làm theo tuần hiện tại"}
          {activeExport === "peer_review" && "Dữ liệu đánh giá chéo tháng " + selectedMonth}
        </p>
      </div>

      {/* Preview info */}
      <div className="bg-[#FDF8EE] rounded-2xl border border-[#E8DFD0] p-4 mb-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="material-symbols-outlined text-[#EFC14B] text-lg">info</span>
          <h3 className="text-sm font-bold text-[#0F1E44]">Thông tin file xuất</h3>
        </div>
        <ul className="text-xs text-[#7A829A] space-y-1">
          <li>• Định dạng: <strong>.xlsx</strong> (Excel)</li>
          <li>• Font chữ: Tự động hiển thị tiếng Việt</li>
          <li>• Nhân viên: <strong>{employees.length}</strong> người</li>
          {activeExport === "attendance" && <li>• Khoảng ngày: {dateFrom} → {dateTo}</li>}
          {activeExport === "peer_review" && <li>• Lượt đánh giá: <strong>{peerReviews.filter(r => r.monthKey === selectedMonth).length}</strong></li>}
        </ul>
      </div>

      {/* Export button */}
      <button onClick={handleExport} disabled={exporting}
        className="w-full h-12 bg-[#0F1E44] text-white rounded-xl font-semibold text-sm flex items-center justify-center gap-2 shadow-md hover:bg-[#1A2D5A] active:scale-[0.98] transition-all disabled:opacity-50">
        {exporting ? (
          <><span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /><span>Đang xuất...</span></>
        ) : (
          <><span className="material-symbols-outlined text-[20px]">download</span><span>Xuất file Excel</span></>
        )}
      </button>
    </div>
  );
};