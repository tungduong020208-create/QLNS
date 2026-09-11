# AiiCafe HR — Điểm danh Wi-Fi văn phòng & Geofencing GPS (IP-First, Bán kính 50m)

> **Liên quan:** mở rộng `docs/checkin-fallback-spec.md` (fallback GPS/PIN) và `src/utils/ipCheck.ts`, `src/components/screens/WifiConfigScreen.tsx`, `src/components/CheckInCheckOut.tsx`.
> **Điểm khác biệt cốt lõi so với spec cũ:** thứ tự ưu tiên mới là **Wi-Fi/IP trước → GPS sau**, bán kính mặc định giảm **100m → 50m**, thêm SSID/BSSID, nhật ký chi tiết mọi lần thử (thành công/thất bại).

---

## 1. PHẠM VI & YÊU CẦU CỐT LÕI

### 1.1 Thiết lập vị trí mặc định (Admin Config)

Admin có **1 màn hình cấu hình duy nhất** lưu các thông tin sau:

| Nhóm | Trường | Bắt buộc | Ghi chú |
|---|---|---|---|
| Wi-Fi | IP công khai (Public IP) | ✅ | IP router do ISP cấp; hỗ trợ **CIDR** (VD `117.4.56.0/24`) để chống IP động |
| Wi-Fi | Dải mạng nội bộ (Local Subnet) | ✅ | VD `192.168.1.0/24` — đã có trong `WifiConfig` hiện tại |
| Wi-Fi | SSID | ⭕ | Tên mạng Wi-Fi (VD `AiiCafe-Office`) |
| Wi-Fi | BSSID (MAC của Access Point) | ⭕ | VD `AA:BB:CC:DD:EE:FF` — hỗ trợ nhiều AP |
| GPS | Kinh độ (Longitude) | ✅ | VD `106.7009` |
| GPS | Vĩ độ (Latitude) | ✅ | VD `10.7769` |
| GPS | Bán kính cho phép (m) | ✅ | **Mặc định: 50m**. Giới hạn cho phép: 20–500m |

- Nút **"Lấy vị trí hiện tại"** tự điền lat/lng khi Admin đứng tại văn phòng.
- Nút **"Tự động lấy Public IP / Local IP hiện tại"** đã tồn tại trong `WifiConfigScreen.tsx` — giữ nguyên.
- Mọi thay đổi ghi audit: `lastUpdated`, `updatedBy`.

> ⚠️ **Giới hạn kỹ thuật (quan trọng):** Trình duyệt web **không đọc được SSID/BSSID** (API đã bị Chrome loại bỏ vì lý do privacy). Các trường này chỉ có hiệu lực trên **app native (Android/iOS)**. Trên web, định danh chính = Public IP + Local Subnet; SSID/BSSID lưu để app native dùng sau. Spec thiết kế theo mô hình "progressive": web dùng cái có được, native dùng đủ.

### 1.2 Logic Check-in / Check-out (User)

- **Điều kiện 1 — IP/Wifi (ưu tiên cao nhất):** Thiết bị truy cập đúng IP Wi-Fi công ty (Public IP khớp whitelist **hoặc** Local IP nằm trong subnet nội bộ) → **Cho phép Check-in/Check-out ngay lập tức**, không yêu cầu GPS.
- **Điều kiện 2 — GPS / Geofencing (fallback):** Khi Điều kiện 1 thất bại (dùng 4G/5G, hoặc Wi-Fi khác, hoặc IP đã đổi), hệ thống tự động kiểm tra GPS:
  - Khoảng cách hiện tại → tọa độ văn phòng **≤ bán kính (mặc định 50m)** → Cho phép.
  - Khoảng cách **> bán kính** → Chặn và nảy thông báo lỗi (xem §5.4 danh sách thông báo).
- Check-in và Check-out dùng **chung một luồng xác thực** — không có ngoại lệ riêng.

---

## 2. USER STORIES & ACCEPTANCE CRITERIA

### US-01 — Nhân viên check-in bằng Wi-Fi văn phòng
> **As a** nhân viên, **I want to** check-in/check-out ngay khi điện thoại kết nối Wi-Fi công ty, **So that** tôi không phải chờ GPS xác định vị trí.

**Acceptance Criteria:**

| # | Kịch bản | Kết quả mong đợi |
|---|---|---|
| AC-1.1 | ✅ Thiết bị nối Wi-Fi VP, Public IP khớp whitelist | Cho phép ngay (< 3s), `verificationMethod = 'wifi'`, **không** popup xin quyền vị trí |
| AC-1.2 | ✅ Public IP không khớp (IP động đã đổi) nhưng Local IP nằm trong subnet nội bộ | Vẫn cho phép (chạm 1 trong 2 điều kiện Wi-Fi) + ghi `riskFlag: PUBLIC_IP_MISMATCH` |
| AC-1.3 | ❌ Wi-Fi VP nhưng local subnet cũng không khớp (mạng khách) | Chuyển sang luồng GPS (US-02) |
| AC-1.4 | ✅ Check-out khi nối Wi-Fi VP | Chỉ cho phép khi đang có session check-in mở |
| AC-1.5 | ❌ Chưa cấu hình IP nào trong hệ thống | Chặn với thông báo "Quản trị viên chưa cấu hình vị trí làm việc" (khác với hành vi bỏ qua của bản hiện tại — xem §6) |

### US-02 — Nhân viên check-in bằng GPS khi dùng 4G/5G
> **As a** nhân viên dùng dữ liệu di động, **I want to** điểm danh khi tôi đang ở trong văn phòng, **So that** tôi không bị chặn chỉ vì không nối Wi-Fi.

**Acceptance Criteria:**

| # | Kịch bản | Kết quả mong đợi |
|---|---|---|
| AC-2.1 | ✅ 4G/5G, khoảng cách ≤ 50m | Cho phép, `verificationMethod = 'gps'`, lưu tọa độ + khoảng cách |
| AC-2.2 | ❌ 4G/5G, khoảng cách > 50m | Chặn, hiển thị đúng thông báo: **"Bạn đang ở quá xa vị trí làm việc (>50m). Vui lòng di chuyển lại gần hoặc kết nối Wifi công ty"** (kèm khoảng cách thực tế: "…(cách X m)") |
| AC-2.3 | ❌ GPS tắt | Chặn + hướng dẫn bật GPS (AC-5.1) |
| AC-2.4 | ❌ Không cấp quyền vị trí | Chặn + hướng dẫn cấp quyền (AC-5.2) |
| AC-2.5 | ⚠️ Độ chính xác GPS (accuracy) > 100m | Không dùng tọa độ này; yêu cầu thử lại tối đa 2 lần, sau đó đưa vào hàng chờ duyệt |
| AC-2.6 | ✅ Bán kính được Admin đổi thành 100m | Điều kiện chặn theo giá trị cấu hình mới, thông báo hiển thị đúng số (>100m) |

### US-03 — Admin thiết lập vị trí văn phòng
> **As a** Quản trị viên, **I want to** lưu cấu hình Wi-Fi và tọa độ văn phòng một lần, **So that** toàn bộ nhân viên được xác thực theo cùng một chuẩn.

**Acceptance Criteria:**

| # | Kịch bản | Kết quả mong đợi |
|---|---|---|
| AC-3.1 | ✅ Nhập đủ Wi-Fi (IP/subnet) + GPS (lat/lng/radius) và lưu | Lưu thành công, màn hình xác nhận, ghi `updatedBy`/`lastUpdated` |
| AC-3.2 | ❌ Nhập lat/lng sai định dạng (VD lat = 200) | Chặn lưu, báo lỗi trường cụ thể |
| AC-3.3 | ❌ Nhập radius ngoài 20–500m | Chặn lưu, gợi ý giá trị hợp lệ |
| AC-3.4 | ✅ Bấm "Lấy vị trí hiện tại" khi đứng tại VP | Tự điền lat/lng từ `navigator.geolocation`, Admin xác nhận trước khi lưu |
| AC-3.5 | ✅ Thêm nhiều BSSID (nhiều AP văn phòng) | Danh sách BSSID dạng chips, thêm/xóa từng mục |
| AC-3.6 | ❌ Nhân viên cố truy cập màn hình cấu hình | Ẩn/khóa với role `employee` (màn hình chỉ render cho `manager`) |

### US-04 — Admin giám sát nhật ký & xử lý sự cố
> **As a** Quản trị viên, **I want to** xem mọi lần thử điểm danh (kể cả thất bại) kèm IP, tọa độ, khoảng cách, **So that** tôi phát hiện gian lận và xử lý khi hệ thống nhầm lẫn.

**Acceptance Criteria:**

| # | Kịch bản | Kết quả mong đợi |
|---|---|---|
| AC-4.1 | ✅ Xem danh sách log | Mỗi dòng: nhân viên, thời gian, loại (in/out), method (wifi/gps), IP kết nối, khoảng cách GPS, trạng thái ✅/❌/⚠️ |
| AC-4.2 | ✅ Lọc theo trạng thái + phương thức + ngày | Bộ lọc hoạt động chính xác |
| AC-4.3 | ⚠️ Log có `riskFlag` (Fake GPS/VPN) | Hiển thị cờ cảnh báo + nút "Duyệt tay" (approve/reject) |
| AC-4.4 | ✅ Nhận cảnh báo IP động | Khi ≥1 nhân viên có local subnet khớp nhưng public IP sai → thông báo "Public IP có thể đã thay đổi" + nút cập nhật 1-click |

---

## 3. LUỒNG XỬ LÝ (BUSINESS LOGIC FLOW)

### 3.1 Thứ tự ưu tiên: Wi-Fi/IP trước → GPS sau

```
Nhân viên bấm "Check-in / Check-out"
        │
        ▼
┌──────────────────────────────────────────────┐
│ BƯỚC 1 — ĐIỀU KIỆN 1: KIỂM TRA WI-FI/IP      │
│ (parallel: fetch Public IP + Local IP)       │
└───────────────┬──────────────────────────────┘
                │
        ┌───────┴────────┐
        │ Public IP ∈    │
        │ whitelist HOẶC │─── KHÔNG ────┐
        │ Local IP ∈     │              │
        │ subnet nội bộ  │              │
        └───────┬────────┘              │
            CÓ  │                       ▼
                │        ┌──────────────────────────────────┐
                │        │ BƯỚC 2 — ĐIỀU KIỆN 2: GPS        │
                │        │ Xin quyền + getCurrentPosition() │
                │        └───────────────┬──────────────────┘
                │                        │
                │                 ┌──────┴────────┐
                │                 │ Lấy được GPS, │── KHÔNG ──▶ CHẶN
                │                 │ accuracy tốt? │   (GPS_OFF / PERMISSION_DENIED /
                │                 └──────┬────────┘    GPS_TIMEOUT / LOW_ACCURACY)
                │                   CÓ   │
                │                        ▼
                │        ┌──────────────────────────────┐
                │        │ dist = haversine(gps, office)│
                │        └──────────────┬───────────────┘
                │              dist ≤ radius (50m)   dist > radius
                │               ┌────────┴─────────┬───────────────┐
                │               ▼                  ▼               │
                │        ✅ CHO PHÉP       ❌ CHẶN (TOO_FAR)      │
                │        method='gps'      "Bạn đang ở quá xa    │
                │               │           vị trí làm việc     │
                ▼               ▼           (>50m)..."          │
        ✅ CHO PHÉP NGAY ───────────────────────────────────────┘
        method='wifi'
        (không cần GPS)
```

### 3.2 Pseudocode (khớp cấu trúc `ipCheck.ts` hiện có)

```typescript
async function verifyAttendance(
  type: 'checkin' | 'checkout'
): Promise<VerificationOutcome> {
  // ── ĐIỀU KIỆN 1: Wi-Fi/IP (ưu tiên) ──
  const office = getOfficeLocation();          // gộp WifiConfig + geo config
  if (office.wifi.publicIPs.length === 0 && office.wifi.localSubnets.length === 0) {
    return BLOCK('CONFIG_MISSING');            // Admin chưa cấu hình
  }

  const [publicIP, localIP] = await Promise.all([fetchPublicIP(), fetchLocalIP()]);
  const publicOK = publicIP && isIPAllowed(publicIP, office.wifi.publicIPs);
  const localOK  = localIP && isLocalIPAllowed(localIP, office.wifi.localSubnets);

  if (publicOK || localOK) {
    return ALLOW('wifi', {
      network: { publicIP, localIP },
      riskFlags: publicOK && localOK ? [] : ['PUBLIC_IP_MISMATCH'],
    });
  }
  // Wi-Fi thất bại → KHÔNG chặn vội, rơi xuống GPS

  // ── ĐIỀU KIỆN 2: GPS / Geofencing ──
  const gps = await getGpsOrError();           // trả về reason nếu tắt/mất quyền/timeout
  if (!gps.ok) return BLOCK(gps.reason);       // GPS_OFF | PERMISSION_DENIED | GPS_TIMEOUT

  if (gps.accuracy > MAX_ACCURACY_M) {         // MAX_ACCURACY_M = 100
    return BLOCK('LOW_ACCURACY');              // sau 2 lần thử → đưa hàng chờ duyệt
  }

  const distance = haversineDistance(gps.lat, gps.lng, office.geo.latitude, office.geo.longitude);

  if (distance <= office.geo.radiusMeters) {
    return ALLOW('gps', { gps: { ...gps, distanceMeters: Math.round(distance) } });
  }

  return BLOCK('TOO_FAR', {
    gps: { ...gps, distanceMeters: Math.round(distance) },
    message: `Bạn đang ở quá xa vị trí làm việc (>${office.geo.radiusMeters}m — cách ${Math.round(distance)}m). Vui lòng di chuyển lại gần hoặc kết nối Wifi công ty`,
  });
}
```

### 3.3 Bảng quyết định tổng hợp

| Tình huống thực tế | Wi-Fi/IP | GPS | Kết quả | Method ghi log | Cờ rủi ro |
|---|---|---|---|---|---|
| Đứng trong VP, nối Wi-Fi VP | ✅ khớp | bỏ qua | ✅ Cho phép | `wifi` | — |
| Wi-Fi VP, ISP vừa đổi IP | ❌ | bỏ qua | ✅ Cho phép | `wifi` | `PUBLIC_IP_MISMATCH` |
| Nối Wi-Fi khách của quán khác subnet | ❌ | — | → sang GPS | — | — |
| 4G/5G, đứng trong VP (≤50m) | ❌ | ✅ | ✅ Cho phép | `gps` | — |
| 4G/5G, đang ở nhà (>50m) | ❌ | ❌ | ❌ Chặn `TOO_FAR` | `gps` (failed) | — |
| 4G/5G, GPS tắt | ❌ | ❌ | ❌ Chặn `GPS_OFF` | — (failed) | — |
| Wi-Fi VP + Fake GPS ở xa | ✅ | — | ✅ Cho phép (IP là định danh chính) | `wifi` | — |
| 4G/5G + Fake GPS "đặt" trong VP | ❌ | ⚠️ | ⚠️ Cờ `SUSPECTED_FAKE_GPS`, hàng chờ duyệt | `gps` (flagged) | `SUSPECTED_FAKE_GPS` |

> Ghi chú: Check-in và Check-out dùng **đúng bảng quyết định này**.

---

## 4. DATA SCHEMA

### 4.1 Cấu hình văn phòng `OfficeLocation` (Admin Config)

Mở rộng từ `WifiConfig` hiện có trong `src/utils/ipCheck.ts` (backwards-compatible: các field cũ giữ nguyên tên):

```typescript
export interface OfficeLocation {
  id: string;                       // 'office-main'
  name: string;                     // 'AiiCafe — Văn phòng Quận 1'

  wifi: {
    publicIPs: string[];            // ← allowedPublicIPs hiện có; hỗ trợ CIDR
    localSubnets: string[];         // ← allowedLocalSubnets hiện có (VD 192.168.1.0/24)
    ssids: string[];                // MỚI — chỉ dùng trên app native
    bssids: string[];               // MỚI — MAC các AP, chỉ dùng trên app native
  };

  geo: {                            // MỚI
    latitude: number;               //   -90..90
    longitude: number;              //   -180..180
    radiusMeters: number;           //   mặc định 50, giới hạn 20..500
  };

  fallback: {
    gpsEnabled: boolean;            // ← fallbackEnabled hiện có (GPS/PIN khi mất mạng)
  };

  lastUpdated: string;              // ISO timestamp
  updatedBy: string;                // tên Admin
}
```

**Lưu trữ phase hiện tại (frontend-only):** mở rộng key `STORAGE_KEY_WIFI_CONFIG` (`aiicafe_wifi_config`) — merge với default để không vỡ dữ liệu cũ. Khi có backend: bảng `office_locations` (1 row active).

### 4.2 Nhật ký điểm danh `AttendanceLog`

Ghi **mọi lần thử** — thành công lẫn thất bại (yêu cầu "Trạng thái thành công/thất bại"):

```typescript
export type VerificationMethod = 'wifi' | 'gps';
export type AttendanceStatus = 'success' | 'failed' | 'flagged';   // flagged = chờ Admin duyệt
export type FailReason =
  | 'TOO_FAR'              // GPS > bán kính
  | 'GPS_OFF'              // tắt GPS / thiết bị không hỗ trợ
  | 'PERMISSION_DENIED'    // không cấp quyền vị trí
  | 'GPS_TIMEOUT'          // quá 10s không lấy được vị trí
  | 'LOW_ACCURACY'         // accuracy > 100m
  | 'CONFIG_MISSING'       // Admin chưa cấu hình
  | 'NO_ACTIVE_SESSION';   // check-out khi chưa check-in
export type RiskFlag =
  | 'PUBLIC_IP_MISMATCH' | 'SUSPECTED_FAKE_GPS' | 'SUSPECTED_VPN'
  | 'IMPOSSIBLE_TRAVEL' | 'MANUAL_APPROVED' | 'MANUAL_REJECTED';

export interface AttendanceLog {
  id: string;                       // UUID
  userId: string;
  type: 'checkin' | 'checkout';
  timestamp: number;                // unix ms
  status: AttendanceStatus;

  verificationMethod: VerificationMethod;        // null khi failed trước khi xác thực

  network: {                        // "IP kết nối"
    connectionType: 'wifi' | 'cellular' | 'unknown';
    publicIP?: string | null;       // IP công khai thời điểm điểm danh
    localIP?: string | null;        // IP nội bộ (WebRTC)
    ssid?: string;                  // native only
    bssid?: string;                 // native only
  };

  gps?: {                           // "Tọa độ GPS thời điểm check-in"
    latitude: number;
    longitude: number;
    accuracy: number;               // mét (từ GeolocationPosition)
    distanceMeters?: number;        // "Khoảng cách tính toán" (Haversine, làm tròn m)
  };

  failReason?: FailReason;
  riskFlags?: RiskFlag[];
  reviewedBy?: string;              // Admin duyệt tay (nếu flagged)
  reviewedAt?: string;
  deviceId?: string;                // định danh thiết bị (khóa chống share-account sau này)
}
```

**Map sang loại hiện có:** `CheckInRecord` trong `src/types.ts` giữ vai trò hiển thị cho nhân viên; `AttendanceLog` là bản ghi audit đầy đủ hơn, lưu tại key mới `aiicafe_attendance_logs` (không đụng `aiicafe_attendance_records` để không vỡ ManagerDashboard).

### 4.3 Schema SQL (khi lên backend)

```sql
CREATE TABLE office_locations (
  id            UUID PRIMARY KEY,
  name          VARCHAR(120) NOT NULL,
  public_ips    INET[] NOT NULL DEFAULT '{}',
  local_subnets CIDR[] NOT NULL DEFAULT '{}',
  ssids         TEXT[] NOT NULL DEFAULT '{}',
  bssids        MACADDR[] NOT NULL DEFAULT '{}',
  latitude      DOUBLE PRECISION NOT NULL CHECK (latitude  BETWEEN  -90 AND  90),
  longitude     DOUBLE PRECISION NOT NULL CHECK (longitude BETWEEN -180 AND 180),
  radius_meters INT NOT NULL DEFAULT 50 CHECK (radius_meters BETWEEN 20 AND 500),
  gps_enabled   BOOLEAN NOT NULL DEFAULT TRUE,
  updated_by    UUID REFERENCES users(id),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE attendance_logs (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES users(id),
  type                VARCHAR(10) NOT NULL CHECK (type IN ('checkin','checkout')),
  timestamp           TIMESTAMPTZ NOT NULL DEFAULT now(),
  status              VARCHAR(10) NOT NULL CHECK (status IN ('success','failed','flagged')),
  verification_method VARCHAR(10) CHECK (verification_method IN ('wifi','gps')),
  connection_type     VARCHAR(10) CHECK (connection_type IN ('wifi','cellular','unknown')),
  public_ip           INET,
  local_ip            INET,
  ssid                TEXT,
  bssid               MACADDR,
  gps_latitude        DOUBLE PRECISION,
  gps_longitude       DOUBLE PRECISION,
  gps_accuracy_m      DOUBLE PRECISION,
  distance_m          DOUBLE PRECISION,       -- khoảng cách Haversine đã tính
  fail_reason         VARCHAR(30),
  risk_flags          TEXT[] NOT NULL DEFAULT '{}',
  device_id           TEXT,
  reviewed_by         UUID REFERENCES users(id),
  reviewed_at         TIMESTAMPTZ
);
CREATE INDEX idx_att_logs_user_time ON attendance_logs (user_id, timestamp DESC);
CREATE INDEX idx_att_logs_status    ON attendance_logs (status) WHERE status = 'flagged';
```

> **Privacy:** tọa độ GPS chi tiết chỉ dùng cho audit, retention tối đa 90 ngày, sau đó anonymize (giữ `distance_m`, xóa lat/lng).

---

## 5. XỬ LÝ NGOẠI LỆ & BẢO MẬT (EDGE CASES & SECURITY)

### 5.1 Bảng ngoại lệ — hành vi thống nhất

| # | Trường hợp | Cách phát hiện | Hành vi | Thông báo hiển thị |
|---|---|---|---|---|
| E-01 | Tắt GPS | `GeolocationPositionError` `POSITION_UNAVAILABLE` hoặc API không tồn tại | Chặn, vẫn thử Wi-Fi trước như thường | "Vui lòng bật GPS (Vị trí) trên thiết bị để điểm danh khi không kết nối Wi-Fi công ty." |
| E-02 | Không cấp quyền vị trí | `PERMISSION_DENIED` | Chặn; hướng dẫn mở Site settings | "Bạn chưa cấp quyền truy cập vị trí. Vui lòng bật quyền vị trí cho ứng dụng/trình duyệt trong Cài đặt." |
| E-03 | Lấy GPS quá 10s | `TIMEOUT` | Thử lại 1 lần tự động → chặn | "Hết thời gian xác định vị trí. Vui lòng thử lại." |
| E-04 | Tín hiệu GPS yếu | `accuracy > 100m` | Không cho phép bằng tọa độ này; 2 lần thử → `flagged` chờ duyệt | "Tín hiệu GPS không đủ chính xác. Vui lòng ra vị trí thoáng và thử lại." |
| E-05 | Fake GPS (mock location) | Native: `Location.isFromMockProvider` / mock-location setting. Web: heuristic §5.2 | Không chặn cứng ngay → `flagged` + thông báo chờ duyệt | "Phát hiện dấu hiệu vị trí không hợp lệ. Điểm danh của bạn đang chờ quản lý xác nhận." |
| E-06 | Bật VPN | Server-side: Public IP thuộc ASN datacenter/VPN (MaxMind, IPQualityScore) **và** IP-geo cách GPS > 50km | GPS trong bán kính vẫn cho phép nhưng gắn `SUSPECTED_VPN`; IP-geo khác + GPS ngoài bán kính → chặn `TOO_FAR` bình thường | (theo kịch bản tương ứng) |
| E-07 | IP động ISP đổi | Public IP mismatch + Local subnet match (E-08) hoặc nhiều user cùng lệch | Vẫn chấm theo Wi-Fi qua subnet + cảnh báo Admin (§5.3) | — |
| E-08 | Wi-Fi đúng subnet nội bộ, Public IP sai | `PUBLIC_IP_MISMATCH` | Cho phép (đủ 1 trong 2) + gắn cờ cho Admin review | — |
| E-09 | Check-out khi chưa check-in | Không tìm thấy session mở | Chặn | "Bạn chưa check-in trong hôm nay." |
| E-10 | Admin chưa cấu hình | Whitelist rỗng + geo rỗng | Chặn (đổi so với hiện tại đang bỏ qua) | "Quản trị viên chưa cấu hình vị trí làm việc. Vui lòng liên hệ quản lý." |

### 5.2 Chống Fake GPS trên Web (heuristic — web không đọc được mock flag)

1. **Kiểm tra chéo IP-geolocation (server-side):** geoIP của Public IP (dịch vụ MaxMind/IP-API) cách tọa độ GPS thiết bị > 50km → nghi vấn.
2. **IMPOSSIBLE_TRAVEL:** khoảng cách giữa 2 lần điểm danh liên tiếp của cùng user chia thời gian > 300 km/h → cờ.
3. **Độ chính xác phi thực tế:** `accuracy = 0` hoặc độ chính xác giữa nhiều lần đọc liên tiếp giống nhau một cách phi thực tế → cờ nhẹ.
4. **Nhiều user cùng 1 tọa độ thập phân tuyệt đối giống nhau** trong ngày → cờ gian lận nhóm.

Quy tắc chung: heuristic **không tự chặn**, chỉ `flagged` → hàng chờ duyệt của Admin (tránh trừng phạt oan do nhiễu GPS).

### 5.3 Phương án dự phòng khi Wi-Fi bị đổi IP động

| Lớp phòng thủ | Cơ chế |
|---|---|
| 1. CIDR thay vì IP đơn | Admin whitelist dải ISP (VD `/24`) — thay đổi 1octet cuối không ảnh hưởng |
| 2. Local subnet là chốt chặn 2 | Router nội bộ hiếm khi đổi dải LAN; thiết bị đúng Wi-Fi VP luôn match subnet → điểm danh không gián đoạn dù Public IP đổi |
| 3. Cảnh báo chủ động cho Admin | Khi log ghi `PUBLIC_IP_MISMATCH` từ ≥ 2 user khác nhau trong 1 giờ → notification: "Public IP có thể đã thay đổi thành X. Cập nhật?" — nút cập nhật 1-click (reuse nút "Tự động lấy Public IP hiện tại" trong `WifiConfigScreen`) |
| 4. Auto-suggest (không auto-apply) | Thu thập public IP mới từ các thiết bị có subnet hợp lệ; nếu ≥ N thiết bị đồng thuận → gợi ý Admin xác nhận. **Không tự đổi whitelist** để tránh kẻ xấu khai thác |
| 5. GPS là lối thoát tạm thời | Trong thời gian chờ Admin cập nhật IP, nhân viên tại VP vẫn check-in được qua GPS ≤ 50m (Điều kiện 2) |

### 5.4 Danh sách thông báo lỗi chuẩn (message keys)

| Key | Nội dung (VI) |
|---|---|
| `MSG_TOO_FAR` | "Bạn đang ở quá xa vị trí làm việc (>50m). Vui lòng di chuyển lại gần hoặc kết nối Wifi công ty" *(50m thay bằng `radiusMeters` cấu hình; hiển thị thêm "(cách X m)")* |
| `MSG_GPS_OFF` | "Vui lòng bật GPS (Vị trí) trên thiết bị để điểm danh khi không kết nối Wi-Fi công ty." |
| `MSG_PERMISSION_DENIED` | "Bạn chưa cấp quyền truy cập vị trí. Vui lòng bật quyền vị trí trong Cài đặt." |
| `MSG_GPS_TIMEOUT` | "Hết thời gian xác định vị trí. Vui lòng thử lại." |
| `MSG_LOW_ACCURACY` | "Tín hiệu GPS không đủ chính xác. Vui lòng ra vị trí thoáng và thử lại." |
| `MSG_FLAGGED` | "Phát hiện dấu hiệu vị trí không hợp lệ. Điểm danh của bạn đang chờ quản lý xác nhận." |
| `MSG_NO_SESSION` | "Bạn chưa check-in trong hôm nay." |
| `MSG_NO_CONFIG` | "Quản trị viên chưa cấu hình vị trí làm việc. Vui lòng liên hệ quản lý." |
| `MSG_WIFI_ONLY` | "Vui lòng kết nối Wi-Fi công ty để điểm danh." *(khi Admin tắt GPS fallback)* |

### 5.5 Nguyên tắc bảo mật khác

- **Xác thực 2 lớp client + server:** khoảng cách GPS và IP phải được **tính lại ở server** khi có backend — client chỉ thu thập dữ liệu thô (client-side JS có thể bị giả mạo).
- **Không xin GPS khi không cần:** nếu Wi-Fi khớp → không gọi `getCurrentPosition` (tiết kiệm pin + privacy).
- **Chống replay:** log kèm `timestamp` do server cấp; từ chối request lệch > 5 phút.
- **Audit bất biến:** không ai (kể cả Admin) được sửa/xóa `attendance_logs` — chỉ được review/approve.

---

## 6. GHI CHÚ TÍCH HỢP VỚI CODEBASE HIỆN TẠI

| Thành phần hiện có | Thay đổi cần thiết |
|---|---|
| `src/utils/ipCheck.ts` → `WifiConfig` | Thêm `ssids`, `bssids`, geo block; đổi mặc định bán kính tham chiếu 100m → **50m** |
| `src/utils/checkin.ts` → `DEFAULT_STORE.radius = 100` | Đổi thành 50, hoặc đọc từ `OfficeLocation` thay vì hằng số |
| `src/components/screens/WifiConfigScreen.tsx` | Thêm section "Vị trí văn phòng" (lat/lng/radius + nút lấy vị trí hiện tại) + chips SSID/BSSID |
| `src/components/CheckInCheckOut.tsx` | Thay luồng Wi-Fi→block bằng luồng Wi-Fi→GPS mới (`verifyAttendance`); đổi thông báo `TOO_FAR` theo §5.4 |
| Hành vi "chưa cấu hình thì cho phép" trong `validateWifiConnection` | Đổi thành **chặn** với `MSG_NO_CONFIG` (an toàn hơn, xem E-10) |
| `src/types.ts` → `CheckInRecord` | Giữ nguyên cho UI nhân viên; thêm `AttendanceLog` song song cho audit |

---

## 7. TEST CASES (kiểm nghiệm AC)

| TC | Bước | Kết quả kỳ vọng | AC liên quan |
|---|---|---|---|
| TC-01 | Nối Wi-Fi VP → bấm Check-in | Cho phép ≤ 3s, không popup GPS, log method=`wifi` | AC-1.1 |
| TC-02 | Tắt Wi-Fi, dùng 4G tại VP → Check-in | Cho phép, log method=`gps`, distance ≤ 50 | AC-2.1 |
| TC-03 | 4G ở xa > 50m → Check-in | Chặn + đúng `MSG_TOO_FAR`, log status=`failed` | AC-2.2 |
| TC-04 | 4G + GPS tắt → Check-in | Chặn + `MSG_GPS_OFF` | E-01 |
| TC-05 | 4G + từ chối quyền vị trí | Chặn + `MSG_PERMISSION_DENIED` | E-02 |
| TC-06 | Admin nhập radius = 10 | Không cho lưu, báo lỗi 20–500 | AC-3.3 |
| TC-07 | ISP đổi IP, subnet không đổi → Check-in qua Wi-Fi VP | Cho phép + cờ `PUBLIC_IP_MISMATCH`, Admin nhận cảnh báo | E-07/E-08 |
| TC-08 | Mock location đặt tại VP (4G) | `flagged`, vào hàng chờ Admin | E-05 |
| TC-09 | Check-out khi chưa check-in | Chặn + `MSG_NO_SESSION` | E-09 |
| TC-10 | Chưa cấu hình gì → Check-in | Chặn + `MSG_NO_CONFIG` | E-10 |

---

## 8. IMPLEMENTATION CHECKLIST

**Phase 1 — Data & Config (Admin)**
- [ ] Thêm type `OfficeLocation`, `AttendanceLog` vào `src/types.ts`
- [ ] Thêm storage key `aiicafe_attendance_logs` vào `src/utils/constants.ts`; default radius 50
- [ ] Mở rộng `WifiConfigScreen.tsx`: section tọa độ + SSID/BSSID + validate 20–500m

**Phase 2 — Verification Engine**
- [ ] Tạo `src/utils/attendanceVerify.ts` với `verifyAttendance()` theo §3.2 (Wi-Fi trước → GPS sau)
- [ ] Đổi `MSG_TOO_FAR` + các message keys §5.4 trong `CheckInCheckOut.tsx`
- [ ] Đổi hành vi E-10 (chưa cấu hình → chặn)

**Phase 3 — Logging & Admin View**
- [ ] Ghi `AttendanceLog` cho mọi lần thử (success/failed/flagged)
- [ ] Màn hình Admin: bảng log + filter + hàng chờ duyệt + cảnh báo IP động

**Phase 4 — Security & Native (sau)**
- [ ] Server-side re-verification khi có backend (tính lại distance, geoIP cross-check VPN)
- [ ] App native: đọc SSID/BSSID + mock-location detection

**Phase 5 — Testing**
- [ ] Unit test `verifyAttendance` (bảng quyết định §3.3)
- [ ] Unit test Haversine + biên radius (= 50m cho phép, 50.0001m chặn)
- [ ] TC-01 → TC-10 trên thiết bị thật

---

## 9. NOTES

- **Tại sao Wi-Fi ưu tiên hơn GPS:** IP nhanh hơn, tốn ít pin hơn, và ổn định hơn trong nhà (GPS trong tòa nhà hay lệch 30–100m). GPS chỉ là lớp dự phòng cho 4G/5G.
- **50m so với 100m cũ:** 50m đủ chặt cho văn phòng trong tòa nhà; nếu GPS indoor nhiễu khiến nhân viên bị chặn oan, Admin có thể tăng lên 80–100m trong cấu hình — spec không hardcode.
- **Web vs Native:** web không đọc được SSID/BSSID là giới hạn nền tảng, không phải hạn chế thiết kế. Luồng web dùng IP + GPS; native nâng cấp lên đủ 3 tín hiệu khi ra mắt app.
