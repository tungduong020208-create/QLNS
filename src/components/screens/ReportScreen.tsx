import React, { useState } from 'react';
import { User, EvidenceItem, WeeklyData } from '../../types';
import { WEEKLY_CHART_DATA, ATTENTION_EMPLOYEES } from '../../data/initialData';

interface ReportScreenProps {
  currentUser: User;
  evidences: EvidenceItem[];
  onSelectEvidence?: (evidence: EvidenceItem) => void;
}

export const ReportScreen: React.FC<ReportScreenProps> = ({
  currentUser,
  evidences,
  onSelectEvidence
}) => {
  const [period, setPeriod] = useState<'day' | 'week' | 'month' | 'custom'>('month');
  const [selectedWeek, setSelectedWeek] = useState<WeeklyData | null>(WEEKLY_CHART_DATA[2]);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showCustomDateModal, setShowCustomDateModal] = useState(false);
  const [customStartDate, setCustomStartDate] = useState('2026-08-01');
  const [customEndDate, setCustomEndDate] = useState('2026-08-28');
  const [selectedEmployeeAlert, setSelectedEmployeeAlert] = useState<typeof ATTENTION_EMPLOYEES[0] | null>(null);

  // Dynamic KPI counts
  const totalEvidencesCount = 1245 + evidences.length - 5;
  const goodRate = 85;
  const totalPointsGiven = 4520 + evidences.filter(e => e.status === 'good').length * 15;

  const handleExportCSV = () => {
    // Generate CSV data with UTF-8 BOM
    const headers = ['Mã minh chứng', 'Tên công việc', 'Phòng ban', 'Nhân viên', 'Thời gian', 'Trạng thái', 'Điểm số', 'Ghi chú duyệt'];
    const rows = evidences.map(item => [
      item.id,
      `"${item.title.replace(/"/g, '""')}"`,
      `"${item.department}"`,
      `"${item.employeeName}"`,
      `"${item.timestamp}"`,
      item.status === 'good' ? 'TỐT' : item.status === 'bad' ? 'CHƯA TỐT' : 'CHỜ DUYỆT',
      item.points,
      `"${(item.managerNote || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Bao_Cao_Nhan_Su_${period}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setShowExportModal(true);
  };

  return (
    <div className="pb-28 pt-20 px-4 max-w-3xl mx-auto w-full antialiased">
      {/* Title */}
      <div className="flex justify-between items-center mb-5">
        <div>
          <h2 className="font-headline text-2xl md:text-3xl font-bold text-[#000666]">
            Báo cáo tổng hợp
          </h2>
          <p className="text-xs text-[#454652] mt-0.5">
            Thống kê minh chứng, tỷ lệ tuân thủ và xếp hạng nhân sự
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 overflow-x-auto hide-scrollbar mb-6 pb-1">
        <button
          onClick={() => setPeriod('day')}
          className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
            period === 'day'
              ? 'bg-[#000666] text-white shadow-md'
              : 'bg-[#eae7ef] text-[#1b1b21] border border-[#c6c5d4] hover:bg-[#e4e1ea]'
          }`}
        >
          Ngày
        </button>
        <button
          onClick={() => setPeriod('week')}
          className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
            period === 'week'
              ? 'bg-[#000666] text-white shadow-md'
              : 'bg-[#eae7ef] text-[#1b1b21] border border-[#c6c5d4] hover:bg-[#e4e1ea]'
          }`}
        >
          Tuần
        </button>
        <button
          onClick={() => setPeriod('month')}
          className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
            period === 'month'
              ? 'bg-[#000666] text-white shadow-md'
              : 'bg-[#eae7ef] text-[#1b1b21] border border-[#c6c5d4] hover:bg-[#e4e1ea]'
          }`}
        >
          Tháng
        </button>
        <button
          onClick={() => {
            setPeriod('custom');
            setShowCustomDateModal(true);
          }}
          className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
            period === 'custom'
              ? 'bg-[#000666] text-white shadow-md'
              : 'bg-[#eae7ef] text-[#1b1b21] border border-[#c6c5d4] hover:bg-[#e4e1ea]'
          }`}
        >
          <span>Tùy chỉnh</span>
          <span className="material-symbols-outlined text-[16px]">calendar_today</span>
        </button>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 mb-6">
        {/* KPI 1 */}
        <div className="bg-white border border-[#c6c5d4]/60 rounded-2xl p-5 shadow-sm flex flex-col gap-2">
          <div className="flex items-center gap-2 text-[#454652]">
            <span className="material-symbols-outlined text-[20px] text-[#000666]">collections</span>
            <h3 className="text-xs font-semibold uppercase tracking-wide">Tổng minh chứng</h3>
          </div>
          <div className="font-headline text-3xl font-bold text-[#000666]">
            {totalEvidencesCount.toLocaleString('vi-VN')}
          </div>
          <div className="text-[11px] font-semibold text-[#1b1b21] bg-[#efecf5] py-1 px-2.5 rounded-full w-max mt-auto flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px] text-green-700 font-bold">trending_up</span>
            <span className="text-green-800">+12%</span> so với tháng trước
          </div>
        </div>

        {/* KPI 2 */}
        <div className="bg-white border border-[#c6c5d4]/60 rounded-2xl p-5 shadow-sm flex flex-col gap-2">
          <div className="flex items-center gap-2 text-[#454652]">
            <span className="material-symbols-outlined text-[20px] text-[#000666]">thumb_up</span>
            <h3 className="text-xs font-semibold uppercase tracking-wide">Tỷ lệ Tốt</h3>
          </div>
          <div className="font-headline text-3xl font-bold text-[#000666]">
            {goodRate}%
          </div>
          <div className="w-full bg-[#efecf5] h-2 rounded-full mt-2 overflow-hidden">
            <div
              className="bg-[#000666] h-full rounded-full transition-all duration-500"
              style={{ width: `${goodRate}%` }}
            />
          </div>
        </div>

        {/* KPI 3 */}
        <div className="bg-white border border-[#c6c5d4]/60 rounded-2xl p-5 shadow-sm flex flex-col gap-2">
          <div className="flex items-center gap-2 text-[#454652]">
            <span className="material-symbols-outlined text-[20px] text-[#000666]">star_rate</span>
            <h3 className="text-xs font-semibold uppercase tracking-wide">Tổng điểm đã cấp</h3>
          </div>
          <div className="font-headline text-3xl font-bold text-[#000666]">
            {totalPointsGiven.toLocaleString('vi-VN')}
          </div>
          <div className="text-[11px] text-[#454652] bg-[#efecf5] py-1 px-2.5 rounded-full w-max mt-auto font-medium">
            Trung bình 120 điểm/ngày
          </div>
        </div>
      </div>

      {/* Main Chart Area */}
      <div className="bg-white border border-[#c6c5d4]/60 rounded-2xl p-5 shadow-sm mb-6">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h3 className="font-headline text-lg font-bold text-[#1b1b21]">Xu hướng đánh giá</h3>
            <p className="text-xs text-[#767683]">Tỷ lệ đạt chuẩn qua các tuần trong tháng</p>
          </div>
          <button
            onClick={() => setSelectedWeek(WEEKLY_CHART_DATA[2])}
            className="text-[#000666] text-xs font-bold flex items-center gap-1 hover:underline cursor-pointer"
          >
            Chi tiết <span className="material-symbols-outlined text-[16px]">chevron_right</span>
          </button>
        </div>

        {/* Bar Chart Visualization */}
        <div className="h-48 flex items-end justify-between gap-3 sm:gap-6 mt-4 px-2 sm:px-4 relative">
          {/* Background Grid Lines */}
          <div className="absolute inset-0 flex flex-col justify-between pointer-events-none pb-6">
            <div className="w-full border-b border-[#efecf5] h-0" />
            <div className="w-full border-b border-[#efecf5] h-0" />
            <div className="w-full border-b border-[#efecf5] h-0" />
            <div className="w-full border-b border-[#efecf5] h-0" />
          </div>

          {/* Dynamic Bars */}
          {WEEKLY_CHART_DATA.map((item) => {
            const isHighlighted = item.isCurrent || selectedWeek?.week === item.week;
            return (
              <div
                key={item.week}
                onClick={() => setSelectedWeek(item)}
                className="flex-1 flex flex-col items-center h-full justify-end relative group cursor-pointer"
              >
                {/* Value tooltip on hover or select */}
                <div
                  className={`absolute -top-7 left-1/2 -translate-x-1/2 bg-[#303036] text-white text-[11px] font-bold px-2 py-0.5 rounded shadow transition-all duration-150 whitespace-nowrap z-20 ${
                    isHighlighted ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                  }`}
                >
                  {item.percentage}% ({item.points} pts)
                </div>

                {/* The Bar */}
                <div
                  className={`w-full max-w-[64px] rounded-t-lg transition-all duration-300 ${
                    isHighlighted
                      ? 'bg-[#000666] shadow-[0_0_14px_rgba(0,6,102,0.35)] ring-2 ring-[#000666]/30'
                      : 'bg-[#dee0ff] hover:bg-[#c4c6d2]'
                  }`}
                  style={{ height: `${item.percentage}%` }}
                />
              </div>
            );
          })}
        </div>

        {/* X-Axis labels */}
        <div className="flex justify-between mt-3 text-[#454652] text-xs font-semibold px-2 sm:px-4 border-t border-[#efecf5] pt-2">
          {WEEKLY_CHART_DATA.map((item) => (
            <span
              key={item.week}
              onClick={() => setSelectedWeek(item)}
              className={`cursor-pointer transition-colors ${
                selectedWeek?.week === item.week || item.isCurrent ? 'text-[#000666] font-bold' : ''
              }`}
            >
              {item.week} {item.isCurrent && '(Hiện tại)'}
            </span>
          ))}
        </div>

        {/* Selected Week Info Box */}
        {selectedWeek && (
          <div className="mt-4 p-3 bg-[#f5f2fb] rounded-xl border border-[#c6c5d4]/40 flex items-center justify-between text-xs text-[#1b1b21]">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[#000666]">insights</span>
              <span>
                <strong>{selectedWeek.week}:</strong> {selectedWeek.goodCount}/{selectedWeek.totalCount} minh chứng TỐT ({selectedWeek.percentage}%)
              </span>
            </div>
            <span className="font-bold text-[#000666]">+{selectedWeek.points} điểm</span>
          </div>
        )}
      </div>

      {/* Attention List */}
      <div className="mb-8">
        <h3 className="font-headline text-lg font-bold text-[#1b1b21] mb-3 flex items-center gap-2">
          <span className="material-symbols-outlined text-[#ba1a1a]">warning</span>
          Nhân viên cần chú ý
        </h3>

        <div className="flex flex-col gap-3">
          {ATTENTION_EMPLOYEES.map((emp) => (
            <div
              key={emp.id}
              onClick={() => setSelectedEmployeeAlert(emp)}
              className="bg-white border border-[#ffdad6] hover:border-[#ba1a1a]/40 rounded-xl p-3.5 shadow-sm flex items-center gap-3 cursor-pointer transition-all hover:bg-[#fff8f7]"
            >
              {emp.avatar ? (
                <img
                  className="w-11 h-11 rounded-full object-cover border border-[#c6c5d4]"
                  src={emp.avatar}
                  alt={emp.name}
                />
              ) : (
                <div className="w-11 h-11 rounded-full bg-[#eae7ef] flex items-center justify-center font-headline text-base font-bold text-[#000666]">
                  {emp.initialLetter || emp.name.charAt(0)}
                </div>
              )}

              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm text-[#1b1b21] truncate">{emp.name}</div>
                <div className="text-xs text-[#454652] truncate">{emp.department}</div>
              </div>

              <div className="bg-[#ffdad6] text-[#93000a] font-bold text-xs px-3 py-1 rounded-full flex items-center gap-1 flex-shrink-0">
                {emp.issue}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Export Action Button */}
      <div className="flex justify-center mb-6">
        <button
          onClick={handleExportCSV}
          className="bg-[#000666] text-white text-sm font-bold px-6 py-3 rounded-xl shadow-[0_4px_12px_rgba(0,6,102,0.18)] hover:bg-[#1a237e] transition-all flex items-center gap-2 active:scale-95 cursor-pointer"
        >
          <span className="material-symbols-outlined text-[20px]">download</span>
          Xuất báo cáo (CSV/Excel)
        </button>
      </div>

      {/* Export Success Modal */}
      {showExportModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-[#c6c5d4] animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-xl bg-[#dee0ff] text-[#000666] flex items-center justify-center mb-3">
              <span className="material-symbols-outlined text-[28px]">file_download_done</span>
            </div>
            <h3 className="font-headline text-lg font-bold text-[#000666] mb-1">Xuất file thành công!</h3>
            <p className="text-xs text-[#454652] mb-4">
              Tệp bảng tính <strong>Bao_Cao_Nhan_Su.csv</strong> đã được tải xuống máy của bạn, tương thích hoàn toàn với Microsoft Excel và Google Sheets.
            </p>
            <button
              onClick={() => setShowExportModal(false)}
              className="w-full py-2.5 bg-[#000666] text-white rounded-xl text-xs font-bold hover:bg-[#1a237e]"
            >
              Đã hiểu
            </button>
          </div>
        </div>
      )}

      {/* Custom Date Range Modal */}
      {showCustomDateModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-[#c6c5d4] animate-in fade-in zoom-in-95 duration-150">
            <h3 className="font-headline text-lg font-bold text-[#000666] mb-3">Chọn khoảng thời gian</h3>
            <div className="space-y-3 mb-4 text-xs">
              <div>
                <label className="block font-semibold text-[#454652] mb-1">Từ ngày:</label>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="w-full px-3 py-2 border border-[#c6c5d4] rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block font-semibold text-[#454652] mb-1">Đến ngày:</label>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="w-full px-3 py-2 border border-[#c6c5d4] rounded-lg text-sm"
                />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowCustomDateModal(false)}
                className="px-4 py-2 text-xs font-semibold text-[#454652] hover:bg-[#f5f2fb] rounded-lg"
              >
                Hủy
              </button>
              <button
                onClick={() => setShowCustomDateModal(false)}
                className="px-4 py-2 text-xs font-semibold bg-[#000666] text-white rounded-lg hover:bg-[#1a237e]"
              >
                Áp dụng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Employee Attention Detail Modal */}
      {selectedEmployeeAlert && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-[#c6c5d4] animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 mb-4">
              {selectedEmployeeAlert.avatar ? (
                <img
                  src={selectedEmployeeAlert.avatar}
                  alt={selectedEmployeeAlert.name}
                  className="w-12 h-12 rounded-full object-cover border"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-[#eae7ef] flex items-center justify-center font-bold text-[#000666]">
                  {selectedEmployeeAlert.initialLetter || selectedEmployeeAlert.name.charAt(0)}
                </div>
              )}
              <div>
                <h3 className="font-headline font-bold text-base text-[#1b1b21]">{selectedEmployeeAlert.name}</h3>
                <p className="text-xs text-[#454652]">{selectedEmployeeAlert.department}</p>
              </div>
            </div>

            <div className="p-3 bg-[#ffdad6]/60 border border-[#ba1a1a]/30 rounded-xl text-xs mb-4">
              <div className="font-bold text-[#93000a] mb-1">Cảnh báo vi phạm: {selectedEmployeeAlert.issue}</div>
              <p className="text-[#454652]">{selectedEmployeeAlert.notes}</p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setSelectedEmployeeAlert(null)}
                className="flex-1 py-2 text-xs font-semibold text-[#454652] hover:bg-[#f5f2fb] rounded-lg border border-[#c6c5d4]"
              >
                Đóng
              </button>
              <button
                onClick={() => {
                  alert(`Đã gửi thông báo nhắc nhở đến ${selectedEmployeeAlert.name}`);
                  setSelectedEmployeeAlert(null);
                }}
                className="flex-1 py-2 text-xs font-semibold bg-[#ba1a1a] text-white rounded-lg hover:bg-red-700"
              >
                Gửi nhắc nhở
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
