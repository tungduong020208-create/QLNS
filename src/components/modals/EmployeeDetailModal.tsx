import React from 'react';
import { User, EvidenceItem } from '../../types';

interface EmployeeDetailModalProps {
  employee: User | null;
  evidences: EvidenceItem[];
  onClose: () => void;
  onNavigateToReview?: () => void;
}

export const EmployeeDetailModal: React.FC<EmployeeDetailModalProps> = ({
  employee,
  evidences,
  onClose,
  onNavigateToReview
}) => {
  if (!employee) return null;

  const empEvidences = evidences.filter(e => e.employeeId === employee.id);
  const goodCount = empEvidences.filter(e => e.status === 'good').length;
  const badCount = empEvidences.filter(e => e.status === 'bad').length;
  const pendingCount = empEvidences.filter(e => e.status === 'pending').length;
  const totalPoints = empEvidences.reduce((acc, e) => acc + e.points, 0);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div 
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[85vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-[#0F1E44] to-[#1A2D5A] text-white p-5 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <h3 className="font-heading font-bold text-lg">Chi tiết nhân viên</h3>
            <button onClick={onClose} className="text-white/70 hover:text-white transition-colors">
              <span className="material-symbols-outlined text-[24px]">close</span>
            </button>
          </div>
        </div>

        {/* Employee Info */}
        <div className="p-5 border-b border-[#efecf5]">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-white shadow-lg flex-shrink-0">
              <img className="w-full h-full object-cover" src={employee.avatar} alt={employee.name} />
            </div>
            <div>
              <h4 className="font-heading font-bold text-[#0F1E44] text-lg">{employee.name}</h4>
              <p className="text-sm text-[#7A829A]">{employee.role === 'manager' ? 'Quản lý' : 'Nhân viên'}</p>
              <p className="text-xs text-[#7A829A] mt-0.5">{employee.employeeCode}</p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="p-5 border-b border-[#efecf5]">
          <h5 className="text-xs uppercase tracking-wider text-[#7A829A] font-semibold mb-3">Thống kê hiệu suất</h5>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-[#f0fdf4] rounded-xl p-3 text-center">
              <div className="font-heading text-xl font-bold text-green-600">{goodCount}</div>
              <div className="text-xs text-green-600">Tốt</div>
            </div>
            <div className="bg-[#fef2f2] rounded-xl p-3 text-center">
              <div className="font-heading text-xl font-bold text-red-500">{badCount}</div>
              <div className="text-xs text-red-500">Chưa tốt</div>
            </div>
            <div className="bg-[#fffbeb] rounded-xl p-3 text-center">
              <div className="font-heading text-xl font-bold text-amber-500">{pendingCount}</div>
              <div className="text-xs text-[#7A829A]">Chưa đánh giá</div>
            </div>
            <div className="bg-[#eff6ff] rounded-xl p-3 text-center">
              <div className="font-heading text-xl font-bold text-[#0F1E44]">{totalPoints}</div>
              <div className="text-xs text-[#0F1E44]">Tổng điểm</div>
            </div>
          </div>
        </div>

        {/* Contact Info */}
        <div className="p-5 border-b border-[#efecf5]">
          <h5 className="text-xs uppercase tracking-wider text-[#7A829A] font-semibold mb-3">Thông tin liên hệ</h5>
          <div className="space-y-2">
            <div className="flex items-center gap-3 text-sm">
              <span className="material-symbols-outlined text-[18px] text-[#7A829A]">email</span>
              <span className="text-[#0F1E44]">{employee.email}</span>
            </div>
            {employee.phone && (
              <div className="flex items-center gap-3 text-sm">
                <span className="material-symbols-outlined text-[18px] text-[#7A829A]">phone</span>
                <span className="text-[#0F1E44]">{employee.phone}</span>
              </div>
            )}
          </div>
        </div>

        {/* Recent Evidence */}
        <div className="p-5">
          <h5 className="text-xs uppercase tracking-wider text-[#7A829A] font-semibold mb-3">Minh chứng gần đây</h5>
          {empEvidences.length === 0 ? (
            <p className="text-sm text-[#7A829A] text-center py-4">Chưa có minh chứng nào</p>
          ) : (
            <div className="space-y-3">
              {empEvidences.slice(0, 3).map(item => (
                <div key={item.id} className="flex items-center gap-3 p-3 bg-[#f9f8fc] rounded-xl">
                  <div className="w-10 h-10 rounded-lg overflow-hidden border border-[#E8DFD0] flex-shrink-0">
                    <img className="w-full h-full object-cover" src={item.imageUrl} alt={item.title} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm text-[#0F1E44] truncate">{item.title}</div>
                    <div className="text-xs text-[#7A829A]">{item.timestamp}</div>
                  </div>
                  <div className="flex-shrink-0">
                    {item.status === 'good' ? (
                      <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full">Tốt +{item.points}</span>
                    ) : item.status === 'bad' ? (
                      <span className="text-xs font-medium text-red-500 bg-red-50 px-2 py-1 rounded-full">Chưa tốt {item.points}</span>
                    ) : (
                      <span className="text-xs font-medium text-[#7A829A] bg-gray-50 px-2 py-1 rounded-full">Chưa duyệt</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
          {empEvidences.length > 3 && onNavigateToReview && (
            <button 
              onClick={() => { onClose(); onNavigateToReview(); }}
              className="w-full mt-3 text-xs text-[#0F1E44] font-medium hover:underline"
            >
              Xem tất cả ({empEvidences.length}) →
            </button>
          )}
        </div>
      </div>
    </div>
  );
};