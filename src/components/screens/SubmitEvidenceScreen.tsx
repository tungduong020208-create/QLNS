import React, { useState, useRef } from 'react';
import { User, EvidenceItem } from '../../types';

interface SubmitEvidenceScreenProps {
  currentUser: User;
  onBack: () => void;
  onSubmit: (newEvidence: EvidenceItem) => void;
}

export const SubmitEvidenceScreen: React.FC<SubmitEvidenceScreenProps> = ({
  currentUser,
  onBack,
  onSubmit,
}) => {
  const [jobTitle, setJobTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedImage, setSelectedImage] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setErrorMessage('Dung lượng tệp vượt quá 5MB. Vui lòng chọn tệp nhỏ hơn.');
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        if (reader.result) {
          setSelectedImage(reader.result as string);
          setErrorMessage('');
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setErrorMessage('Dung lượng tệp vượt quá 5MB.');
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        if (reader.result) {
          setSelectedImage(reader.result as string);
          setErrorMessage('');
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!jobTitle.trim()) {
      setErrorMessage('Vui lòng nhập tên công việc');
      return;
    }
    if (!selectedImage) {
      setErrorMessage('Vui lòng chụp hoặc tải lên hình ảnh minh chứng');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    setTimeout(() => {
      const now = new Date();
      const timeString = `Hôm nay, ${now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`;

      const newEvidence: EvidenceItem = {
        id: `ev-${Date.now()}`,
        title: jobTitle.trim(),
        department: '',
        timestamp: timeString,
        dateString: now.toISOString(),
        imageUrl: selectedImage,
        description: description.trim() || 'Không có mô tả',
        status: 'pending',
        points: 0,
        employeeId: currentUser.id,
        employeeName: currentUser.name,
        employeeAvatar: currentUser.avatar
      };

      onSubmit(newEvidence);
      setIsSubmitting(false);
      setSuccessMessage('Gửi minh chứng thành công!');
      
      // Reset form after success
      setTimeout(() => {
        setJobTitle('');
        setSelectedImage('');
        setDescription('');
        setSuccessMessage('');
      }, 2000);
    }, 600);
  };

  return (
    <div className="bg-[#FDF8EE] text-[#0F1E44] min-h-screen pb-28 pt-20 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Page Title */}
        <div className="mb-6">
          <h1 className="font-heading text-2xl md:text-3xl font-bold text-[#0F1E44] tracking-tight">
            Nộp minh chứng công việc
          </h1>
          <p className="text-sm text-[#7A829A] mt-1">
            Vui lòng cung cấp hình ảnh rõ nét và thông tin chính xác.
          </p>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-2xl border border-[#E8DFD0]/60 shadow-sm p-5">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Error Message */}
            {errorMessage && (
              <div className="p-3 bg-[rgba(255,49,49,0.12)] text-[#FF3131] text-xs font-semibold rounded-xl flex items-center gap-2 border border-[#FF3131]/30">
                <span className="material-symbols-outlined text-[18px]">error</span>
                {errorMessage}
              </div>
            )}

            {/* Success Message */}
            {successMessage && (
              <div className="p-3 bg-green-50 text-green-700 text-xs font-semibold rounded-xl flex items-center gap-2 border border-green-200">
                <span className="material-symbols-outlined text-[18px]">check_circle</span>
                {successMessage}
              </div>
            )}

            {/* Job Name Input */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-[#0F1E44]" htmlFor="job-name">
                Tên công việc
              </label>
              <input
                className="w-full rounded-xl border border-[#E8DFD0] bg-white px-4 py-3 text-sm text-[#0F1E44] placeholder:text-[#7A829A] focus:border-[#0F1E44] focus:ring-1 focus:ring-[#0F1E44] focus:outline-none transition-shadow"
                id="job-name"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                placeholder="VD: Vệ sinh khu vực sảnh chính"
                type="text"
              />
            </div>

            {/* Image Upload Area */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-[#0F1E44]">
                Hình ảnh minh chứng
              </label>
              
              {selectedImage ? (
                <div className="relative rounded-xl overflow-hidden border-2 border-[#0F1E44]/30 aspect-[4/3] max-h-64 w-full group">
                  <img
                    src={selectedImage}
                    alt="Ảnh minh chứng"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-4 py-2 bg-white text-[#0F1E44] rounded-lg text-xs font-bold shadow hover:bg-[rgba(239,193,75,0.15)] transition-colors"
                    >
                      Chọn ảnh khác
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedImage('')}
                      className="p-2 bg-[#FF3131] text-white rounded-lg shadow hover:bg-red-700 transition-colors"
                    >
                      <span className="material-symbols-outlined text-[18px]">delete</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-xl bg-[#f8f7fc] hover:bg-[#f0eef5] transition-all cursor-pointer group ${
                    isDragging ? 'border-[#0F1E44] bg-[rgba(239,193,75,0.15)]/30' : 'border-[#E8DFD0]'
                  }`}
                >
                  <div className="p-3 bg-[#1A2D5A] text-white rounded-full group-hover:scale-110 transition-transform shadow-md mb-3">
                    <span className="material-symbols-outlined text-3xl">photo_camera</span>
                  </div>
                  <p className="text-sm font-semibold text-[#0F1E44]">Chụp ảnh / Tải ảnh minh chứng</p>
                </div>
              )}

              <p className="text-xs text-[#7A829A]">
                Định dạng hỗ trợ: JPG, PNG. Kích thước tối đa: 5MB.
              </p>

              <input
                ref={fileInputRef}
                accept="image/png, image/jpeg"
                className="hidden"
                type="file"
                onChange={handleFileChange}
              />
            </div>

            {/* Description Input (Optional) */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-[#0F1E44]" htmlFor="description">
                Mô tả công việc <span className="text-[#7A829A] font-normal">(không bắt buộc)</span>
              </label>
              <textarea
                className="w-full rounded-xl border border-[#E8DFD0] bg-white px-4 py-3 text-sm text-[#0F1E44] placeholder:text-[#7A829A] focus:border-[#0F1E44] focus:ring-1 focus:ring-[#0F1E44] focus:outline-none transition-shadow resize-none"
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Thêm chi tiết nếu cần thiết..."
                rows={3}
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-12 bg-[#0F1E44] text-white rounded-xl font-semibold text-sm flex items-center justify-center gap-2 shadow-md hover:bg-[#1A2D5A] active:scale-[0.98] transition-all cursor-pointer disabled:opacity-70"
            >
              {isSubmitting ? (
                <>
                  <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  <span>Đang gửi...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[20px]">send</span>
                  <span>Gửi minh chứng</span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
