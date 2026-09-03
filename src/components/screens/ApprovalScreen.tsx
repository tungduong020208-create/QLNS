import React, { useState } from 'react';
import { User, ApprovalRequest } from '../../types';

interface ApprovalScreenProps {
  currentUser: User;
  requests: ApprovalRequest[];
  onApprove: (id: string, note: string) => void;
  onReject: (id: string, note: string) => void;
}

const TYPE_CONFIG: Record<string, { label: string; icon: string; color: string; bg: string }> = {
  shift_swap: { label: 'Đổi ca', icon: 'swap_horiz', color: '#EFC14B', bg: 'rgba(239,193,75,0.15)' },
  time_off: { label: 'Nghỉ phép', icon: 'event_busy', color: '#D4A833', bg: 'rgba(212,168,51,0.15)' },
  overtime: { label: 'Tăng ca', icon: 'schedule', color: '#4CAF72', bg: 'rgba(76,175,114,0.15)' },
  other: { label: 'Khác', icon: 'more_horiz', color: '#7A829A', bg: 'rgba(122,130,154,0.15)' },
};

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: 'Chờ duyệt', color: '#D4A833', bg: 'rgba(212,168,51,0.15)' },
  approved: { label: 'Đã duyệt', color: '#4CAF72', bg: 'rgba(76,175,114,0.15)' },
  rejected: { label: 'Từ chối', color: '#FF3131', bg: 'rgba(255,49,49,0.15)' },
};

export const ApprovalScreen: React.FC<ApprovalScreenProps> = ({
  currentUser,
  requests,
  onApprove,
  onReject,
}) => {
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState<ApprovalRequest | null>(null);
  const [modalAction, setModalAction] = useState<'approve' | 'reject'>('approve');
  const [modalNote, setModalNote] = useState('');

  const filtered = requests.filter((r) => {
    if (filter !== 'all' && r.status !== filter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        r.title.toLowerCase().includes(q) ||
        r.employeeName.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const pendingCount = requests.filter((r) => r.status === 'pending').length;

  const handleOpenModal = (request: ApprovalRequest, action: 'approve' | 'reject') => {
    setShowModal(request);
    setModalAction(action);
    setModalNote('');
  };

  const handleSubmitModal = () => {
    if (!showModal) return;
    if (modalAction === 'approve') {
      onApprove(showModal.id, modalNote || 'Đồng ý yêu cầu');
    } else {
      onReject(showModal.id, modalNote || 'Không đồng ý');
    }
    setShowModal(null);
    setModalNote('');
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / 3600000);
    if (hours < 1) return 'Vừa xong';
    if (hours < 24) return `${hours} giờ trước`;
    return `${Math.floor(hours / 24)} ngày trước`;
  };

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="font-heading text-xl md:text-2xl font-bold text-[#0F1E44] mb-1">
          Duyệt yêu cầu nhân viên
        </h1>
        <p className="text-sm text-[#7A829A]">
          {pendingCount > 0
            ? `Có ${pendingCount} yêu cầu chờ bạn duyệt`
            : 'Không có yêu cầu chờ duyệt'}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        {[
          {
            label: 'Chờ duyệt',
            count: requests.filter((r) => r.status === 'pending').length,
            color: '#D4A833',
            bg: 'rgba(212,168,51,0.12)',
            icon: 'hourglass_top',
          },
          {
            label: 'Đã duyệt',
            count: requests.filter((r) => r.status === 'approved').length,
            color: '#4CAF72',
            bg: 'rgba(76,175,114,0.12)',
            icon: 'check_circle',
          },
          {
            label: 'Từ chối',
            count: requests.filter((r) => r.status === 'rejected').length,
            color: '#FF3131',
            bg: 'rgba(255,49,49,0.12)',
            icon: 'cancel',
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl p-3 border border-[#E8DFD0]"
            style={{ backgroundColor: stat.bg }}
          >
            <div className="flex items-center gap-2 mb-1">
              <span className="material-symbols-outlined text-lg" style={{ color: stat.color }}>
                {stat.icon}
              </span>
              <span className="text-xs font-medium" style={{ color: stat.color }}>
                {stat.label}
              </span>
            </div>
            <div className="text-2xl font-bold" style={{ color: stat.color }}>
              {stat.count}
            </div>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
        {[
          { key: 'all', label: 'Tất cả' },
          { key: 'pending', label: 'Chờ duyệt' },
          { key: 'approved', label: 'Đã duyệt' },
          { key: 'rejected', label: 'Từ chối' },
        ].map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key as typeof filter)}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
              filter === f.key
                ? 'bg-[#0F1E44] text-white shadow-navy'
                : 'bg-white text-[#3D4663] border border-[#E8DFD0] hover:bg-[#FDF8EE]'
            }`}
          >
            {f.label}
            {f.key === 'pending' && pendingCount > 0 && (
              <span className="ml-1.5 bg-[#D4A833] text-[#0F1E44] text-xs px-1.5 py-0.5 rounded-full font-bold">
                {pendingCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative mb-5">
        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#7A829A]">
          search
        </span>
        <input
          type="text"
          placeholder="Tìm kiếm nhân viên, loại yêu cầu..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-3 rounded-xl bg-white border border-[#E8DFD0] text-sm focus:outline-none focus:ring-2 focus:ring-[#EFC14B] focus:border-transparent"
        />
      </div>

      {/* Request List */}
      <div className="flex flex-col gap-3">
        {filtered.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl border border-[#E8DFD0]">
            <span className="material-symbols-outlined text-5xl text-[#E8DFD0] mb-3 block">
              inbox
            </span>
            <p className="text-[#7A829A] font-medium">Không có yêu cầu nào</p>
          </div>
        ) : (
          filtered.map((req) => {
            const typeConfig = TYPE_CONFIG[req.type] || TYPE_CONFIG.other;
            const statusConfig = STATUS_CONFIG[req.status];
            return (
              <div
                key={req.id}
                className="bg-white rounded-2xl border border-[#E8DFD0] p-4 hover:shadow-navy transition-shadow"
              >
                {/* Top row */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <img
                      src={req.employeeAvatar}
                      alt={req.employeeName}
                      className="w-10 h-10 rounded-full object-cover border-2"
                      style={{ borderColor: typeConfig.color + '44' }}
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-[#0F1E44]">
                          {req.employeeName}
                        </span>
                        <span
                          className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                          style={{ backgroundColor: typeConfig.bg, color: typeConfig.color }}
                        >
                          {typeConfig.label}
                        </span>
                      </div>
                      <p className="text-xs text-[#7A829A] mt-0.5">{formatDate(req.dateString)}</p>
                    </div>
                  </div>
                  <span
                    className="text-xs font-bold px-2.5 py-1 rounded-full"
                    style={{ backgroundColor: statusConfig.bg, color: statusConfig.color }}
                  >
                    {statusConfig.label}
                  </span>
                </div>

                {/* Title & Description */}
                <h3 className="font-bold text-sm text-[#0F1E44] mb-1">{req.title}</h3>
                <p className="text-xs text-[#7A829A] leading-relaxed mb-3">{req.description}</p>

                {/* Target employee if swap */}
                {req.targetEmployee && (
                  <div className="flex items-center gap-2 mb-3 bg-[#FDF8EE] rounded-lg px-3 py-2">
                    <span className="material-symbols-outlined text-sm text-[#EFC14B]">
                      person_swap
                    </span>
                    <span className="text-xs text-[#7A829A]">
                      Đổi với:{' '}
                      <span className="font-semibold text-[#0F1E44]">{req.targetEmployee}</span>
                    </span>
                  </div>
                )}

                {/* Manager note if reviewed */}
                {req.managerNote && (
                  <div className="bg-[#FDF8EE] rounded-lg px-3 py-2 mb-3">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="material-symbols-outlined text-sm text-[#EFC14B]">
                        note
                      </span>
                      <span className="text-[11px] font-semibold text-[#0F1E44]">
                        Ghi chú của quản lý:
                      </span>
                    </div>
                    <p className="text-xs text-[#7A829A]">{req.managerNote}</p>
                  </div>
                )}

                {/* Action buttons (only for pending) */}
                {req.status === 'pending' && currentUser.role === 'manager' && (
                  <div className="flex gap-2 pt-2 border-t border-[#F5EDDF]">
                    <button
                      onClick={() => handleOpenModal(req, 'reject')}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-medium bg-[#FF3131]/10 text-[#FF3131] hover:bg-[#FF3131]/20 transition-colors"
                    >
                      <span className="material-symbols-outlined text-lg">close</span>
                      Từ chối
                    </button>
                    <button
                      onClick={() => handleOpenModal(req, 'approve')}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-medium bg-[#4CAF72]/15 text-[#4CAF72] hover:bg-[#4CAF72]/25 transition-colors"
                    >
                      <span className="material-symbols-outlined text-lg">check</span>
                      Duyệt
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Approve/Reject Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-lg w-full max-w-md overflow-hidden border border-[#E8DFD0]">
            {/* Header */}
            <div
              className="p-5 text-center"
              style={{
                backgroundColor: modalAction === 'approve' ? 'rgba(76,175,114,0.12)' : 'rgba(255,49,49,0.12)',
              }}
            >
              <span
                className="material-symbols-outlined text-5xl mb-2 block"
                style={{ color: modalAction === 'approve' ? '#4CAF72' : '#FF3131' }}
              >
                {modalAction === 'approve' ? 'check_circle' : 'cancel'}
              </span>
              <h3 className="font-heading text-lg font-bold text-[#0F1E44]">
                {modalAction === 'approve' ? 'Duyệt yêu cầu?' : 'Từ chối yêu cầu?'}
              </h3>
              <p className="text-xs text-[#7A829A] mt-1">
                {showModal.title} — {showModal.employeeName}
              </p>
            </div>

            {/* Note input */}
            <div className="p-5">
              <label className="block text-sm font-medium text-[#7A829A] mb-2">
                Ghi chú {modalAction === 'approve' ? '(tùy chọn)' : '(bắt buộc)'}
              </label>
              <textarea
                value={modalNote}
                onChange={(e) => setModalNote(e.target.value)}
                placeholder={
                  modalAction === 'approve'
                    ? 'VD: Đồng ý, sắp xếp lại lịch ca...'
                    : 'VD: Lý do từ chối...'
                }
                rows={3}
                className="w-full px-4 py-3 rounded-xl bg-[#FDF8EE] border border-[#E8DFD0] text-sm focus:outline-none focus:ring-2 focus:ring-[#EFC14B] resize-none"
              />
            </div>

            {/* Buttons */}
            <div className="flex gap-3 p-5 pt-0">
              <button
                onClick={() => {
                  setShowModal(null);
                  setModalNote('');
                }}
                className="flex-1 py-3 rounded-xl text-sm font-medium bg-[#FDF8EE] text-[#7A829A] hover:bg-[#F5EDDF] transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={handleSubmitModal}
                disabled={modalAction === 'reject' && !modalNote.trim()}
                className="flex-1 py-3 rounded-xl text-sm font-bold text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                style={{
                  backgroundColor: modalAction === 'approve' ? '#4CAF72' : '#FF3131',
                }}
              >
                {modalAction === 'approve' ? 'Duyệt' : 'Từ chối'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
