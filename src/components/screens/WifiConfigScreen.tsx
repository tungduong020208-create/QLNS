/**
 * WiFi Configuration Screen (Manager Only) - DUAL MODE
 * 
 * PURPOSE: Allows managers to configure BOTH:
 * 1. Public IP addresses (router's external IP - shared by all devices on same Wi-Fi)
 * 2. Local IP subnets (e.g., 192.168.1.0/24 - ensures device is on same network)
 * 
 * SECURITY: Dual validation = Maximum protection against remote check-in
 */

import React, { useState, useEffect, useCallback } from 'react';
import { User } from '../../types';
import {
  WifiConfig,
  fetchPublicIP,
  fetchLocalIP,
  getWifiConfig,
  saveWifiConfig,
  addAllowedPublicIP,
  removeAllowedPublicIP,
  addAllowedLocalSubnet,
  removeAllowedLocalSubnet,
  toggleFallback,
} from '../../utils/ipCheck';

interface WifiConfigScreenProps {
  currentUser: User;
}

export const WifiConfigScreen: React.FC<WifiConfigScreenProps> = ({ currentUser }) => {
  const [config, setConfig] = useState<WifiConfig>(getWifiConfig());
  
  // Public IP state
  const [newPublicIP, setNewPublicIP] = useState('');
  const [detectingPublicIP, setDetectingPublicIP] = useState(false);
  const [detectedPublicIP, setDetectedPublicIP] = useState<string | null>(null);
  
  // Local IP state
  const [newLocalSubnet, setNewLocalSubnet] = useState('');
  const [detectingLocalIP, setDetectingLocalIP] = useState(false);
  const [detectedLocalIP, setDetectedLocalIP] = useState<string | null>(null);
  
  // UI state
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Load config on mount
  useEffect(() => {
    setConfig(getWifiConfig());
  }, []);

  // Auto-detect current Public IP
  const handleDetectPublicIP = useCallback(async () => {
    setDetectingPublicIP(true);
    setError('');
    setDetectedPublicIP(null);

    try {
      const ip = await fetchPublicIP();
      if (ip) {
        setDetectedPublicIP(ip);
      } else {
        setError('Không thể xác định Public IP. Vui lòng kiểm tra kết nối mạng.');
      }
    } catch {
      setError('Lỗi khi lấy Public IP. Vui lòng thử lại.');
    } finally {
      setDetectingPublicIP(false);
    }
  }, []);

  // Auto-detect current Local IP
  const handleDetectLocalIP = useCallback(async () => {
    setDetectingLocalIP(true);
    setError('');
    setDetectedLocalIP(null);

    try {
      const ip = await fetchLocalIP();
      if (ip) {
        setDetectedLocalIP(ip);
        // Auto-generate subnet from local IP (e.g., 192.168.1.52 → 192.168.1.0/24)
        const parts = ip.split('.');
        const subnet = `${parts[0]}.${parts[1]}.${parts[2]}.0/24`;
        setNewLocalSubnet(subnet);
      } else {
        setError('Không thể xác định Local IP. Vui lòng kiểm tra kết nối mạng.');
      }
    } catch {
      setError('Lỗi khi lấy Local IP. Vui lòng thử lại.');
    } finally {
      setDetectingLocalIP(false);
    }
  }, []);

  // Add Public IP
  const handleAddPublicIP = useCallback(() => {
    setError('');
    setSuccess('');

    const ip = newPublicIP.trim();
    if (!ip) {
      setError('Vui lòng nhập địa chỉ IP');
      return;
    }

    // Validate IP format
    const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (!ipRegex.test(ip)) {
      setError('Địa chỉ IP không hợp lệ. Vui lòng nhập đúng định dạng (VD: 117.4.56.123)');
      return;
    }

    if (config.allowedPublicIPs.includes(ip)) {
      setError('Địa chỉ IP này đã tồn trong danh sách');
      return;
    }

    addAllowedPublicIP(ip, currentUser.name);
    setConfig(getWifiConfig());
    setNewPublicIP('');
    setSuccess(`Đã thêm Public IP ${ip} vào danh sách cho phép`);
    setTimeout(() => setSuccess(''), 3000);
  }, [newPublicIP, config.allowedPublicIPs, currentUser.name]);

  // Remove Public IP
  const handleRemovePublicIP = useCallback((ip: string) => {
    removeAllowedPublicIP(ip, currentUser.name);
    setConfig(getWifiConfig());
    setSuccess(`Đã xóa Public IP ${ip} khỏi danh sách`);
    setTimeout(() => setSuccess(''), 3000);
  }, [currentUser.name]);

  // Add Local Subnet
  const handleAddLocalSubnet = useCallback(() => {
    setError('');
    setSuccess('');

    const subnet = newLocalSubnet.trim();
    if (!subnet) {
      setError('Vui lòng nhập dải mạng');
      return;
    }

    // Validate CIDR format
    const cidrRegex = /^(\d{1,3}\.){3}\d{1,3}\/\d{1,2}$/;
    if (!cidrRegex.test(subnet)) {
      setError('Dải mạng không hợp lệ. Vui lòng nhập đúng định dạng (VD: 192.168.1.0/24)');
      return;
    }

    if (config.allowedLocalSubnets.includes(subnet)) {
      setError('Dải mạng này đã tồn trong danh sách');
      return;
    }

    addAllowedLocalSubnet(subnet, currentUser.name);
    setConfig(getWifiConfig());
    setNewLocalSubnet('');
    setSuccess(`Đã thêm dải mạng ${subnet} vào danh sách cho phép`);
    setTimeout(() => setSuccess(''), 3000);
  }, [newLocalSubnet, config.allowedLocalSubnets, currentUser.name]);

  // Remove Local Subnet
  const handleRemoveLocalSubnet = useCallback((subnet: string) => {
    removeAllowedLocalSubnet(subnet, currentUser.name);
    setConfig(getWifiConfig());
    setSuccess(`Đã xóa dải mạng ${subnet} khỏi danh sách`);
    setTimeout(() => setSuccess(''), 3000);
  }, [currentUser.name]);

  // Toggle fallback mode
  const handleToggleFallback = useCallback(() => {
    const newEnabled = !config.fallbackEnabled;
    toggleFallback(newEnabled, currentUser.name);
    setConfig(getWifiConfig());
    setSuccess(newEnabled
      ? 'Đã bật chế độ dự phòng (GPS/PIN) khi mất mạng'
      : 'Đã tắt chế độ dự phòng'
    );
    setTimeout(() => setSuccess(''), 3000);
  }, [config.fallbackEnabled, currentUser.name]);

  return (
    <div className="pb-28 pt-20 px-4 max-w-3xl mx-auto w-full antialiased">
      {/* Header */}
      <div className="mb-5">
        <h2 className="font-heading text-2xl font-bold text-[#0F1E44]">
          Cài đặt Wi-Fi
        </h2>
        <p className="text-xs text-[#7A829A] mt-0.5">
          Quản lý IP Wi-Fi hợp lệ cho điểm danh (Cả Public IP & Local IP)
        </p>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <div className="mb-4 p-3 bg-[#4CAF72]/15 text-[#4CAF72] text-sm font-semibold rounded-xl flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px]">check_circle</span>
          {success}
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 bg-[#FF3131]/10 border border-[#FF3131]/30 text-[#FF3131] text-sm font-semibold rounded-xl flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px]">error</span>
          {error}
        </div>
      )}

      {/* How it works info */}
      <div className="bg-[#EFC14B]/10 border border-[#EFC14B]/30 rounded-2xl p-4 mb-5">
        <div className="flex items-start gap-3">
          <span className="material-symbols-outlined text-[#EFC14B] text-xl mt-0.5">wifi</span>
          <div>
            <h3 className="text-sm font-bold text-[#0F1E44] mb-1">Cách hoạt động (Double Validation)</h3>
            <ul className="text-xs text-[#7A829A] space-y-1">
              <li>• <strong>Public IP:</strong> IP công khai của router. Tất cả thiết bị cùng Wi-Fi chung IP này.</li>
              <li>• <strong>Local IP:</strong> IP nội bộ mạng (VD: 192.168.1.x). Đảm bảo thiết bị nằm trong cùng subnet.</li>
              <li>• Hệ thống kiểm tra <strong>CẢ HAI</strong> — cả 2 phải khớp mới cho phép điểm danh.</li>
              <li>• Nếu quán mất mạng, bật chế độ dự phòng để dùng GPS/PIN.</li>
            </ul>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════ */}
      {/* PUBLIC IP SECTION */}
      {/* ═══════════════════════════════════════════════ */}
      <div className="bg-white rounded-2xl border border-[#E8DFD0] p-5 shadow-sm mb-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-10 h-10 bg-[#000666]/10 rounded-full flex items-center justify-center">
            <span className="material-symbols-outlined text-[#000666] text-xl">public</span>
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#0F1E44]">Public IP (IP Router)</h3>
            <p className="text-[10px] text-[#7A829A]">IP công khai từ nhà mạng — tất cả thiết bị cùng Wi-Fi chung IP này</p>
          </div>
        </div>

        {/* Auto-detect */}
        <button
          onClick={handleDetectPublicIP}
          disabled={detectingPublicIP}
          className="w-full h-12 bg-[#000666] text-white rounded-xl font-semibold text-sm flex items-center justify-center gap-2 shadow-md hover:bg-[#1a237e] active:scale-[0.98] transition-all disabled:opacity-50 mb-3"
        >
          {detectingPublicIP ? (
            <>
              <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Đang phát hiện...</span>
            </>
          ) : (
            <>
              <span className="material-symbols-outlined text-[20px]">wifi_find</span>
              <span>Tự động lấy Public IP hiện tại</span>
            </>
          )}
        </button>

        {detectedPublicIP && (
          <div className="mb-3 p-3 bg-[#4CAF72]/10 border border-[#4CAF72]/30 rounded-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#4CAF72] text-lg">check_circle</span>
                <div>
                  <p className="text-xs font-semibold text-[#4CAF72]">Public IP phát hiện được:</p>
                  <p className="text-sm font-bold text-[#0F1E44] font-mono">{detectedPublicIP}</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setNewPublicIP(detectedPublicIP);
                  setDetectedPublicIP(null);
                }}
                className="text-xs font-semibold text-[#0F1E44] bg-[#EFC14B]/20 px-3 py-1.5 rounded-lg hover:bg-[#EFC14B]/30"
              >
                Sử dụng
              </button>
            </div>
          </div>
        )}

        {/* Manual add */}
        <div className="flex items-center gap-2 mb-3">
          <input
            type="text"
            value={newPublicIP}
            onChange={(e) => {
              setNewPublicIP(e.target.value);
              setError('');
            }}
            placeholder="Nhập Public IP (VD: 117.4.56.123)"
            className="flex-1 h-11 px-4 rounded-xl border border-[#E8DFD0] bg-white text-sm text-[#0F1E44] font-mono focus:border-[#000666] focus:ring-2 focus:ring-[#000666]/30 outline-none transition-all"
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAddPublicIP();
            }}
          />
          <button
            onClick={handleAddPublicIP}
            disabled={!newPublicIP.trim()}
            className="h-11 px-5 bg-[#000666] text-white rounded-xl font-semibold text-sm flex items-center justify-center gap-2 shadow-md hover:bg-[#1a237e] active:scale-[0.98] transition-all disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            Thêm
          </button>
        </div>

        {/* Public IP List */}
        {config.allowedPublicIPs.length === 0 ? (
          <div className="text-center py-4 bg-[#F9F8FC] rounded-xl">
            <p className="text-xs text-[#7A829A]">Chưa có Public IP nào</p>
          </div>
        ) : (
          <div className="space-y-2">
            {config.allowedPublicIPs.map((ip) => (
              <div key={ip} className="flex items-center justify-between p-3 bg-[#F9F8FC] rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-[#000666]/20 rounded-full flex items-center justify-center">
                    <span className="material-symbols-outlined text-[#000666] text-sm">public</span>
                  </div>
                  <p className="text-sm font-bold text-[#0F1E44] font-mono">{ip}</p>
                </div>
                <button
                  onClick={() => handleRemovePublicIP(ip)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-[#FF3131] hover:bg-[#FF3131]/10 transition-colors"
                >
                  <span className="material-symbols-outlined text-[16px]">delete</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════ */}
      {/* LOCAL IP SECTION */}
      {/* ═══════════════════════════════════════════════ */}
      <div className="bg-white rounded-2xl border border-[#E8DFD0] p-5 shadow-sm mb-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-10 h-10 bg-[#4CAF72]/10 rounded-full flex items-center justify-center">
            <span className="material-symbols-outlined text-[#4CAF72] text-xl">router</span>
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#0F1E44]">Local IP (Dải mạng)</h3>
            <p className="text-[10px] text-[#7A829A]">IP nội bộ LAN — đảm bảo thiết bị nằm trong cùng mạng Wi-Fi</p>
          </div>
        </div>

        {/* Auto-detect */}
        <button
          onClick={handleDetectLocalIP}
          disabled={detectingLocalIP}
          className="w-full h-12 bg-[#4CAF72] text-white rounded-xl font-semibold text-sm flex items-center justify-center gap-2 shadow-md hover:bg-[#3d8b40] active:scale-[0.98] transition-all disabled:opacity-50 mb-3"
        >
          {detectingLocalIP ? (
            <>
              <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Đang phát hiện...</span>
            </>
          ) : (
            <>
              <span className="material-symbols-outlined text-[20px]">wifi_find</span>
              <span>Tự động lấy Local IP hiện tại</span>
            </>
          )}
        </button>

        {detectedLocalIP && (
          <div className="mb-3 p-3 bg-[#4CAF72]/10 border border-[#4CAF72]/30 rounded-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#4CAF72] text-lg">check_circle</span>
                <div>
                  <p className="text-xs font-semibold text-[#4CAF72]">Local IP phát hiện được:</p>
                  <p className="text-sm font-bold text-[#0F1E44] font-mono">{detectedLocalIP}</p>
                  <p className="text-[10px] text-[#7A829A]">Dải mạng tự động: {newLocalSubnet}</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setDetectedLocalIP(null);
                }}
                className="text-xs font-semibold text-[#0F1E44] bg-[#EFC14B]/20 px-3 py-1.5 rounded-lg hover:bg-[#EFC14B]/30"
              >
                Sử dụng
              </button>
            </div>
          </div>
        )}

        {/* Manual add */}
        <div className="flex items-center gap-2 mb-3">
          <input
            type="text"
            value={newLocalSubnet}
            onChange={(e) => {
              setNewLocalSubnet(e.target.value);
              setError('');
            }}
            placeholder="Nhập dải mạng (VD: 192.168.1.0/24)"
            className="flex-1 h-11 px-4 rounded-xl border border-[#E8DFD0] bg-white text-sm text-[#0F1E44] font-mono focus:border-[#4CAF72] focus:ring-2 focus:ring-[#4CAF72]/30 outline-none transition-all"
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAddLocalSubnet();
            }}
          />
          <button
            onClick={handleAddLocalSubnet}
            disabled={!newLocalSubnet.trim()}
            className="h-11 px-5 bg-[#4CAF72] text-white rounded-xl font-semibold text-sm flex items-center justify-center gap-2 shadow-md hover:bg-[#3d8b40] active:scale-[0.98] transition-all disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            Thêm
          </button>
        </div>

        <p className="text-[10px] text-[#7A829A] mb-3">
          Định dạng: 192.168.1.0/24 (cho phép tất cả IP từ 192.168.1.1 đến 192.168.1.254)
        </p>

        {/* Local Subnet List */}
        {config.allowedLocalSubnets.length === 0 ? (
          <div className="text-center py-4 bg-[#F9F8FC] rounded-xl">
            <p className="text-xs text-[#7A829A]">Chưa có dải mạng nào</p>
          </div>
        ) : (
          <div className="space-y-2">
            {config.allowedLocalSubnets.map((subnet) => (
              <div key={subnet} className="flex items-center justify-between p-3 bg-[#F9F8FC] rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-[#4CAF72]/20 rounded-full flex items-center justify-center">
                    <span className="material-symbols-outlined text-[#4CAF72] text-sm">router</span>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-[#0F1E44] font-mono">{subnet}</p>
                    <p className="text-[10px] text-[#7A829A]">Dải mạng nội bộ</p>
                  </div>
                </div>
                <button
                  onClick={() => handleRemoveLocalSubnet(subnet)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-[#FF3131] hover:bg-[#FF3131]/10 transition-colors"
                >
                  <span className="material-symbols-outlined text-[16px]">delete</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════ */}
      {/* FALLBACK MODE */}
      {/* ═══════════════════════════════════════════════ */}
      <div className="bg-white rounded-2xl border border-[#E8DFD0] p-5 shadow-sm mb-5">
        <div className="flex items-center gap-2 mb-4">
          <span className="material-symbols-outlined text-[#0F1E44] text-xl">emergency</span>
          <h3 className="text-sm font-bold text-[#0F1E44]">Chế độ dự phòng</h3>
        </div>

        <p className="text-xs text-[#7A829A] mb-4">
          Khi quán bị mất mạng/Wi-Fi gặp sự cố, bật chế độ này để nhân viên có thể điểm danh bằng GPS hoặc mã PIN.
        </p>

        <div
          className={`flex items-center justify-between p-4 rounded-xl border ${
            config.fallbackEnabled
              ? 'bg-[#4CAF72]/10 border-[#4CAF72]/30'
              : 'bg-[#F9F8FC] border-[#E8DFD0]'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
              config.fallbackEnabled ? 'bg-[#4CAF72]/20' : 'bg-gray-100'
            }`}>
              <span className={`material-symbols-outlined text-xl ${
                config.fallbackEnabled ? 'text-[#4CAF72]' : 'text-gray-400'
              }`}>
                {config.fallbackEnabled ? 'check_circle' : 'cancel'}
              </span>
            </div>
            <div>
              <p className={`text-sm font-bold ${
                config.fallbackEnabled ? 'text-[#4CAF72]' : 'text-[#7A829A]'
              }`}>
                {config.fallbackEnabled ? 'Đang bật' : 'Đang tắt'}
              </p>
              <p className="text-[10px] text-[#7A829A]">
                {config.fallbackEnabled
                  ? 'Nhân viên có thể dùng GPS/PIN khi mất mạng'
                  : 'Chỉ điểm danh qua Wi-Fi IP'}
              </p>
            </div>
          </div>

          <button
            onClick={handleToggleFallback}
            className={`relative w-14 h-8 rounded-full transition-all ${
              config.fallbackEnabled ? 'bg-[#4CAF72]' : 'bg-gray-300'
            }`}
          >
            <div
              className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow-md transition-all ${
                config.fallbackEnabled ? 'left-7' : 'left-1'
              }`}
            />
          </button>
        </div>

        {config.fallbackEnabled && (
          <div className="mt-3 p-3 bg-[#EFC14B]/10 border border-[#EFC14B]/30 rounded-xl">
            <div className="flex items-start gap-2">
              <span className="material-symbols-outlined text-[#EFC14B] text-lg mt-0.5">warning</span>
              <div>
                <p className="text-xs font-semibold text-[#0F1E44] mb-1">Lưu ý quan trọng</p>
                <p className="text-[11px] text-[#7A829A]">
                  Khi bật chế độ dự phòng, nhân viên có thể điểm danh từ bất kỳ đâu (chỉ cần GPS/PIN).
                  Chỉ bật khi quán thực sự mất mạng. Nên tắt ngay khi Wi-Fi hoạt động trở lại.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Summary */}
      <div className="bg-[#F9F8FC] rounded-2xl p-4 mb-5">
        <h3 className="text-sm font-bold text-[#0F1E44] mb-3">Tóm tắt cấu hình</h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-xl p-3 border border-[#E8DFD0] text-center">
            <p className="text-xl font-heading font-bold text-[#000666]">{config.allowedPublicIPs.length}</p>
            <p className="text-[10px] text-[#7A829A] uppercase tracking-wider font-semibold">Public IP</p>
          </div>
          <div className="bg-white rounded-xl p-3 border border-[#E8DFD0] text-center">
            <p className="text-xl font-heading font-bold text-[#4CAF72]">{config.allowedLocalSubnets.length}</p>
            <p className="text-[10px] text-[#7A829A] uppercase tracking-wider font-semibold">Local Subnet</p>
          </div>
        </div>
      </div>

      {/* Last updated info */}
      {config.lastUpdated && (
        <div className="text-center text-[10px] text-[#7A829A] mt-4">
          Cập nhật lần cuối: {new Date(config.lastUpdated).toLocaleString('vi-VN')} bởi {config.updatedBy}
        </div>
      )}
    </div>
  );
};
