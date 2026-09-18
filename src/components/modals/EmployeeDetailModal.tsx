import React from 'react';
import { User } from '../../types';

interface EmployeeDetailModalProps {
  employee: User | null;
  onClose: () => void;
}

export const EmployeeDetailModal: React.FC<EmployeeDetailModalProps> = ({
  employee,
  onClose,
}) => {
  if (!employee) return null;

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
      </div>
    </div>
  );
};