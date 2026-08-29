import React from 'react';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  title: string;
  message: string;
}

interface ToastNotificationProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const ToastNotification: React.FC<ToastNotificationProps> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-18 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`pointer-events-auto p-3.5 rounded-2xl shadow-xl border flex items-start gap-3 transform transition-all duration-300 animate-in slide-in-from-top-4 ${
            toast.type === 'success'
              ? 'bg-[#dee0ff] border-[#8999ff] text-[#000e5e]'
              : toast.type === 'error'
              ? 'bg-[#ffdad6] border-[#ba1a1a]/40 text-[#93000a]'
              : 'bg-white border-[#c6c5d4] text-[#1b1b21]'
          }`}
        >
          <span className="material-symbols-outlined text-[22px] mt-0.5 fill flex-shrink-0">
            {toast.type === 'success' ? 'check_circle' : toast.type === 'error' ? 'error' : 'info'}
          </span>
          <div className="flex-1 min-w-0">
            <div className="font-bold text-xs">{toast.title}</div>
            <div className="text-[11px] opacity-90 leading-tight mt-0.5">{toast.message}</div>
          </div>
          <button
            onClick={() => onDismiss(toast.id)}
            className="text-current opacity-60 hover:opacity-100 p-0.5 rounded cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">close</span>
          </button>
        </div>
      ))}
    </div>
  );
};
