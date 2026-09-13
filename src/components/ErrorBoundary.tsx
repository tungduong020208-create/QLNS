/**
 * ErrorBoundary — the app's safety net for render-time crashes.
 *
 * WHY IT EXISTS: a single exception during render unmounts the whole React
 * tree, leaving a blank white page with no way to recover — the classic SPA
 * "white screen of death". React cannot render anything below a thrown
 * error, but a CLASS component can catch errors of its children during
 * render/lifecycle/constructor (the ONLY feature class components still
 * exist for — hooks have no equivalent; react-error-boundary wraps this).
 *
 * The most likely crash source in this app was corrupted localStorage JSON
 * (schema drift after updates). That root cause is now gone — every storage
 * read goes through safeParse() — but any future render bug still lands
 * here instead of a blank page.
 *
 * Recovery ladder (least → most destructive):
 *   1. "Thử lại"     — clear the error, remount children (transient glitches)
 *   2. "Xóa dữ liệu" — wipe AiiCafe localStorage keys + reload, for cases
 *                      where stale/corrupt persisted data IS the crash cause
 */

import React from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

/** localStorage keys owned by this app (session keys included — a fresh login follows). */
const APP_STORAGE_PREFIXES = [
  'enterprise_hr_',
  'aiicafe_',
  'coffeehouse_',
  'coffeeshift_',
  'customerRatings',
];

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { hasError: false, message: '' };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, message: error?.message || 'Lỗi không xác định' };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Keep a breadcrumb in the console for debugging
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  private handleRetry = () => {
    this.setState({ hasError: false, message: '' });
  };

  private handleWipeData = () => {
    try {
      const doomed: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && APP_STORAGE_PREFIXES.some(p => key.startsWith(p))) {
          doomed.push(key);
        }
      }
      doomed.forEach(k => localStorage.removeItem(k));
    } catch {
      // storage itself broken — reload is still the best move
    }
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="min-h-screen bg-[#FDF8EE] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl border border-[#E8DFD0] shadow-lg p-6 text-center">
          <div className="w-16 h-16 bg-[#FF3131]/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="material-symbols-outlined text-[#FF3131] text-3xl">report</span>
          </div>
          <h1 className="font-heading text-xl font-bold text-[#0F1E44] mb-2">
            Có lỗi, bấm để xóa dữ liệu cũ
          </h1>
          <p className="text-sm text-[#7A829A] mb-1">
            Ứng dụng gặp sự cố khi hiển thị. Thử lại trước — nếu vẫn lỗi, xóa
            dữ liệu cũ của ứng dụng trên thiết bị này rồi đăng nhập lại.
          </p>
          <p className="text-[11px] text-[#A0A3B1] mb-5 break-words">
            {this.state.message}
          </p>
          <div className="flex flex-col gap-2">
            <button
              onClick={this.handleRetry}
              className="w-full h-11 bg-[#0F1E44] text-white rounded-lg font-semibold text-sm hover:bg-[#1A2D5A] transition-all active:scale-[0.98] cursor-pointer"
            >
              Thử lại
            </button>
            <button
              onClick={this.handleWipeData}
              className="w-full h-11 bg-white text-[#FF3131] border border-[#FF3131]/40 rounded-lg font-semibold text-sm hover:bg-[#FF3131]/5 transition-all active:scale-[0.98] cursor-pointer"
            >
              Xóa dữ liệu cũ & tải lại
            </button>
          </div>
        </div>
      </div>
    );
  }
}
