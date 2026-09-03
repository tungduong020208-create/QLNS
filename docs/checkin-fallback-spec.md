# AiiCafe HR — Check-in/Check-out Fallback Mechanism

## 📋 USER STORY

**As a** nhân viên AiiCafe  
**I want to** điểm danh (check-in/check-out) ngay cả khi camera bị lỗi hoặc không khả dụng  
**So that** tôi không bị mất công hoặc trễ ca do sự cố kỹ thuật không đáng có

---

## ✅ ACCEPTANCE CRITERIA (Tiêu chí nghiệm thu)

### AC-1: Chế độ mặc định — Check-in bằng Ảnh
- [ ] Hệ thống mở camera khi nhân viên bấm "Check-in ngay"
- [ ] Camera chụp ảnh nụ cười tự động hoặc theo nút chụp
- [ ] Ảnh được lưu lại và hiển thị trong lịch sử check-in
- [ ] Nếu thành công → Hiển thị thông báo "Điểm danh thành công! 📸"

### AC-2: Xử lý lỗi Camera — Tự động Fallback
- [ ] Nếu camera không mở được trong **5 giây** → Tự động chuyển sang fallback
- [ ] Nếu người dùng từ chối quyền camera → Hiển thị thông báo lỗi thân thiện
- [ ] Nếu camera mất kết nối giữa chừng → Dừng và chuyển fallback
- [ ] Thông báo hiển thị: **"Camera gặp sự cố. Chuyển sang điểm danh bằng Vị trí GPS"**
- [ ] Sau **2 lần thử camera thất bại** → Hiển thị nút **"Dùng phương án dự phòng"**

### AC-3: Fallback — Check-in bằng GPS/Geofencing
- [ ] Yêu cầu bật GPS/Vị trí trên thiết bị
- [ ] Kiểm tra khoảng cách từ vị trí hiện tại đến tọa độ cửa hàng
- [ ] **Bán kính hợp lệ: 100m** từ tâm cửa hàng
- [ ] Nếu trong bán kính → Cho phép check-in
- [ ] Nếu ngoài bán kính → Hiển thị: **"Bạn đang不在 trong phạm vi cửa hàng (cách X m). Vui lòng đến cửa hàng để điểm danh."**
- [ ] Ghi lại tọa độ GPS khi check-in thành công

### AC-4: Fallback — Check-in bằng Mã PIN/Mã định danh
- [ ] Mã PIN là **6 chữ số**, được tạo tự động hoặc do quản lý đặt
- [ ] Mã PIN thay đổi **mỗi ca làm** (theo ngày + ca)
- [ ] Quản lý hiển thị mã PIN tại quầy/QR code
- [ ] Nhân viên nhập mã PIN để xác nhận
- [ ] Nếu mã đúng → Cho phép check-in
- [ ] Nếu mã sai → Hiển thị: **"Mã PIN không đúng. Vui lòng thử lại."**
- [ ] Sau **3 lần nhập sai** → Khóa trong **5 phút**

### AC-5: Ghi nhận & Phân loại Check-in
- [ ] Mỗi lượt check-in có trường `checkInMethod`:
  - `'photo'` — Check-in bằng ảnh
  - `'gps'` — Check-in bằng GPS/Geofencing
  - `'pin'` — Check-in bằng Mã PIN
- [ ] Hiển thị nhãn method trong lịch sử check-in (nhân viên thấy)
- [ ] Hiển thị trong Admin Dashboard để quản lý đối soát

### AC-6: UX/UI
- [ ] Nút **"Chụp ảnh điểm danh"** luôn hiển thị đầu tiên
- [ ] Sau 2 lần fail camera → Hiển thị nút **"Dùng phương án dự phòng"** bên dưới
- [ ] Khi chọn fallback → Hiển thị 2 lựa chọn: **GPS** hoặc **Mã PIN**
- [ ] Icon/label phân biệt rõ ràng giữa các phương thức
- [ ] Toast thông báo thân thiện bằng tiếng Việt

### AC-7: Logging & Admin View
- [ ] Lưu `checkInMethod` vào CheckInRecord
- [ ] Hiển thị trong Admin Dashboard:
  - Tổng số check-in theo từng phương thức
  - Danh sách check-in có `method !== 'photo'` để quản lý xem xét
- [ ] Filter theo phương thức check-in trong bảng quản trị

---

## 🔄 LUỒNG XỬ LÝ KỸ THUẬT (TECHNICAL FLOW)

### Flow 1: Check-in Mặc định (Ảnh)

```
Nhân viên bấm "Check-in ngay"
    │
    ▼
┌─────────────────────────┐
│ Yêu cầu quyền Camera   │
│ navigator.mediaDevices   │
│ .getUserMedia({video})   │
└───────────┬─────────────┘
            │
            ▼
    ┌───────────────┐
    │ Camera mở     │
    │ thành công?   │
    └───────┬───────┘
        YES │         NO
            ▼         ▼
┌──────────────┐  ┌──────────────────────────┐
│ Chụp ảnh     │  │ Đếm số lần thử (retryCount)│
│ Lưu base64   │  │ retryCount++               │
│ Gửi check-in │  └──────────┬───────────────┘
│ method='photo'│             │
└──────────────┘     ┌───────┴───────┐
                     │ retryCount >= 2│
                     └───────┬───────┘
                         YES │         NO
                             ▼         ▼
              ┌──────────────────┐  ┌──────────────┐
              │ Hiển thị nút:   │  │ Thử lại sau  │
              │ "Dùng phương án │  │ 2 giây        │
              │  dự phòng"      │  └──────────────┘
              └────────┬─────────┘
                       │
                       ▼
              ┌──────────────────┐
              │ Chọn fallback:  │
              │ 1. GPS          │
              │ 2. Mã PIN       │
              └────────┬─────────┘
                       │
                       ▼
                   Flow 2 hoặc 3
```

### Flow 2: Check-in Fallback — GPS/Geofencing

```
Chọn "Check-in bằng GPS"
    │
    ▼
┌─────────────────────────────┐
│ Yêu cầu quyền Location    │
│ navigator.geolocation      │
│ .getCurrentPosition()      │
└───────────┬─────────────────┘
            │
            ▼
    ┌───────────────┐
    │ GPS lấy được  │
    │ vị trí?       │
    └───────┬───────┘
        YES │         NO
            ▼         ▼
┌──────────────────┐  ┌──────────────────────────┐
│ Tính khoảng cách │  │ Hiển thị lỗi:           │
│ đến tâm cửa hàng │  │ "Không thể lấy vị trí.  │
│ (Haversine公式) │  │  Vui lòng bật GPS."      │
└────────┬─────────┘  └──────────────────────────┘
         │
         ▼
┌───────────────────┐
│ Khoảng cách <=    │
│ 100m?             │
└───────┬───────────┘
    YES │         NO
        ▼         ▼
┌──────────────┐  ┌──────────────────────────┐
│ Cho phép     │  │ Hiển thị:                │
│ check-in     │  │ "Bạn đang cách cửa hàng  │
│ method='gps' │  │  X m. Vui lòng đến nơi." │
│ Lưu tọa độ   │  └──────────────────────────┘
└──────────────┘
```

**Hàm tính khoảng cách (Haversine):**
```typescript
function haversineDistance(
  lat1: number, lon1: number,
  lat2: number, lon2: number
): number {
  const R = 6371e3; // Earth radius in meters
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c; // Distance in meters
}
```

### Flow 3: Check-in Fallback — Mã PIN

```
Chọn "Check-in bằng Mã PIN"
    │
    ▼
┌──────────────────────────┐
│ Hiển thị ô nhập Mã PIN │
│ 6 chữ số                 │
└───────────┬──────────────┘
            │
            ▼
┌──────────────────────────┐
│ Nhân viên nhập mã PIN   │
│ (hiển thị tại quầy/QR) │
└───────────┬──────────────┘
            │
            ▼
┌──────────────────────────┐
│ Xác thực mã PIN:        │
│ hash(MÃ + DATE + CA)    │
│ so sánh với stored hash │
└───────────┬──────────────┘
            │
            ▼
    ┌───────────────┐
    │ Mã đúng?      │
    └───────┬───────┘
        YES │         NO
            ▼         ▼
┌──────────────┐  ┌──────────────────────┐
│ Cho phép     │  │ pinAttempts++        │
│ check-in     │  │ if pinAttempts >= 3   │
│ method='pin' │  │   → Khóa 5 phút      │
│ Lưu timestamp│  │ Hiển thị: "Mã sai"  │
└──────────────┘  └──────────────────────┘
```

**Tạo Mã PIN theo ca:**
```typescript
function generateShiftPin(
  date: string,      // YYYY-MM-DD
  shiftType: string,  // 'morning' | 'afternoon' | 'evening'
  secret: string      // Server-side secret key
): string {
  const payload = `${date}-${shiftType}-${secret}`;
  const hash = sha256(payload);
  // Lấy 6 chữ số từ hash
  return (parseInt(hash.substring(0, 8), 16) % 1000000)
    .toString().padStart(6, '0');
}
```

---

## 📊 DATA MODEL (Mở rộng)

### CheckInRecord (Mở rộng)

```typescript
interface CheckInRecord {
  id: string;
  type: 'checkin' | 'checkout';
  time: string;
  address: string;
  photo: string;           // base64 (empty string nếu fallback)
  smileDetected: boolean;
  timestamp: number;

  // === THÊM MỚI ===
  checkInMethod: 'photo' | 'gps' | 'pin';
  location?: {
    latitude: number;
    longitude: number;
    accuracy: number;      // meters
    distanceFromStore?: number; // meters
  };
  pinAttempt?: number;     // Số lần nhập PIN (nếu dùng PIN)
  fallbackReason?: string; // Lý do fallback: 'camera_error' | 'camera_denied' | 'user_choice'
}
```

### Store Location (Config)

```typescript
interface StoreLocation {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  radius: number;         // meters (default: 100)
  shiftPins: {
    date: string;
    morning: string;      // 6-digit PIN
    afternoon: string;
    evening?: string;
  }[];
}
```

---

## 🖥️ UI/UX MOCKUP

### Trang Check-in (Employee)

```
┌─────────────────────────────────────┐
│         CHECK-IN / CHECK-OUT        │
│                                     │
│  ┌─────────────────────────────┐   │
│  │      📸 Camera Preview      │   │
│  │                             │   │
│  │    [ Chụp ảnh nụ cười ]    │   │
│  │                             │   │
│  └─────────────────────────────┘   │
│                                     │
│  ⏰ 08:30:15                        │
│  📍 Cửa hàng AiiCafe - Quận 1      │
│                                     │
│  ┌─────────────────────────────┐   │
│  │    ✓ Check-in ngay         │   │
│  └─────────────────────────────┘   │
│                                     │
│  ─── Hoặc ───                      │
│                                     │
│  🔄 Dùng phương án dự phòng        │
│     (hiện khi camera fail 2 lần)   │
│                                     │
└─────────────────────────────────────┘
```

### Modal Fallback (Khi chọn)

```
┌─────────────────────────────────────┐
│       Phương án dự phòng            │
│                                     │
│  Camera gặp sự cố. Chọn cách       │
│  điểm danh thay thế:               │
│                                     │
│  ┌─────────────────────────────┐   │
│  │  📍 Check-in bằng GPS      │   │
│  │  Xác nhận vị trí cửa hàng  │   │
│  └─────────────────────────────┘   │
│                                     │
│  ┌─────────────────────────────┐   │
│  │  🔢 Check-in bằng Mã PIN   │   │
│  │  Nhập mã 6 số từ quản lý  │   │
│  └─────────────────────────────┘   │
│                                     │
│  [ Quay lại camera ]               │
└─────────────────────────────────────┘
```

### Admin Dashboard (Phân loại Check-in)

```
┌─────────────────────────────────────┐
│       Lịch sử Check-in              │
│                                     │
│ Filter: [Tất cả ▾] [Phương thức ▾]│
│                                     │
│ Nhân viên    │ Thời gian │ Phương thức │
│──────────────┼───────────┼─────────────│
│ Nguyễn Văn An│ 08:30     │ 📸 Ảnh     │
│ Trần Thị Mai │ 08:35     │ 📍 GPS ⚠️  │
│ Lê Hoàng Nam │ 08:42     │ 🔢 PIN  ⚠️ │
│                                     │
│ ⚠️ = Check-in không qua ảnh        │
└─────────────────────────────────────┘
```

---

## 🔧 IMPLEMENTATION CHECKLIST

### Phase 1: Core Fallback Logic
- [ ] Thêm `checkInMethod` vào `CheckInRecord` type
- [ ] Tạo utility: `haversineDistance()`
- [ ] T tạo utility: `generateShiftPin()`
- [ ] Xây dựng `CameraFallbackHandler` component
- [ ] Xây dựng `GPSCheckIn` component
- [ ] Xây dựng `PinCheckIn` component

### Phase 2: UI/UX
- [ ] Cập nhật `CheckInCheckOut` component
- [ ] Thêm modal chọn fallback
- [ ] Thêm thông báo lỗi thân thiện
- [ ] Thêm nút "Dùng phương án dự phòng" sau 2 lần fail

### Phase 3: Data & Admin
- [ ] Cập nhật `CheckInRecord` type với `checkInMethod`
- [ ] Cập nhật Admin Dashboard hiển thị phương thức
- [ ] Thêm filter theo phương thức check-in
- [ ] Thêm thống kê check-in theo phương thức

### Phase 4: Testing
- [ ] Test camera fail trên thiết bị thấp
- [ ] Test GPS accuracy trong/rời bán kính
- [ ] Test PIN generation & validation
- [ ] Test UX flow fallback

---

## 📝 NOTES

- **Bán kính GPS**: 100m là hợp lý cho quán cà phê. Có thể điều chỉnh theo vị trí thực tế.
- **Mã PIN**: Thay đổi mỗi ca để tránh reuse. Có thể tích hợp QR code chứa PIN.
- **Bảo mật**: PIN được hash trước khi lưu. GPS coordinates chỉ lưu khi check-in thành công.
- **Offline**: Fallback GPS vẫn hoạt động offline (GPS không cần internet). PIN cần server validation.
