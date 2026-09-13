# Backend Plan — Từ localStorage đến Multi-Device Thật

> **Bối cảnh:** App đang dùng localStorage làm database — dữ liệu tồn tại trong
> *một trình duyệt, trên một thiết bị*. Quản lý không thể thấy nhân viên
> check-in từ thiết bị khác. Đây là trần kiến trúc, không phá được bằng code
> client. Tài liệu này là lộ trình phá trần, tối ưu cho: sinh viên, chi phí 0đ,
> giá trị học tập cao.
>
> **Cơ sở cho kế hoạch này:** các domain đã được tách thành custom hooks
> (`useAuth`, `useEvidences`, `useAttendance`, `useNotifications`, `useShifts`,
> `useScheduling`, `useSocial`, `useReviews`) — mỗi hook là **điểm mổ duy nhất**
> để cắm data source thật. Đó chính là lý do refactor hooks phải làm trước.

---

## 1. Chọn Supabase hay Firebase?

| Tiêu chí | **Supabase** ✅ | Firebase |
|---|---|---|
| Database | **PostgreSQL thật** — SQL, JOIN, constraint, view | NoSQL (Firestore) — không JOIN, query limit |
| Auth | Builtin + dễ hiểu, session JWT | Builtin, mạnh nhưng lệch hệ sinh thái Google |
| Realtime | Postgres Changes (subscription theo bảng) | Native snapshot listeners (mượt hơn) |
| Bảo mật phân quyền | **RLS (Row Level Security)** — policy ngay trong DB, đúng bài toán "manager thấy mọi thứ, employee chỉ thấy của mình" | Security Rules — ngôn ngữ riêng, dễ sai khéo |
| File storage (ảnh minh chứng) | Có, free 1GB | Có, free 5GB |
| Free tier | 2 projects, 500MB DB, 50k MAU, **pause sau 1 tuần không hoạt động** ⚠️ | Spark plan, 1GB storage, 50k đọc/ngày — **không pause** ✅ |
| Học được gì | **SQL + RLS + REST/Realtime** — kỹ năng chuyển nghề trực tiếp | Nền tảng Google, NoSQL thinking |
| Trải nghiệm DX cho người mới | Dashboard thuần SQL, code sinh sẵn | Console nhiều wizard, dễ dùng nhưng hộp đen hơn |

**Khuyến nghị: Supabase.** Lý do quyết định không phải tính năng mà là *giá trị
học tập*: data của bạn đã có hình dạng quan hệ rõ ràng (`users`, `evidences`
tham chiếu `employeeId`, `checkin_records` theo ngày) — đặt vào Postgres là
tự nhiên nhất; RLS policy là bài học bảo mật DB thật mà Firebase không dạy
tương đương. Chấp nhận nhược điểm pause-sau-1-tuần bằng cách dev đều tay hoặc
ping project cuối tuần.

Firebase chỉ thắng khi bạn cần realtime mượt + không bao giờ bị pause + chấp
nhận NoSQL. Nếu sau này cần "hồ sơ làm giàu" (tìm kiếm, báo cáo phức tạp),
Postgres giữ giá trị dài hạn hơn.

---

## 2. Schema design (PostgreSQL)

> Nguyên tắc: **mỗi localStorage key hiện tại = 1 bảng**. Giữ nguyên tên miền
> dữ liệu → logic trong hooks đổi "đọc ghi chỗ khác" mà không đổi hình dạng.

```sql
-- ════════ AUTH & USERS ════════
-- supabase.auth.users là source of truth cho đăng nhập.
-- Bảng public này là hồ sơ nghiệp vụ, id = auth.users.id
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  employee_code text unique not null,        -- 'NV-2023-045'
  name text not null,
  role text not null check (role in ('employee','manager')) default 'employee',
  avatar_url text,
  email text,
  phone text,
  is_active boolean not null default true,   -- ← isAccountActive hiện tại
  created_at timestamptz not null default now()
);

-- Trigger: tạo profile tự động khi signup
create function public.handle_new_user() returns trigger
language plpgsql security definer as $$
begin
  insert into public.profiles (id, employee_code, name, role)
  values (new.id, new.raw_user_meta_data->>'employee_code',
          coalesce(new.raw_user_meta_data->>'name','Nhân viên mới'),
          coalesce(new.raw_user_meta_data->>'role','employee'));
  return new;
end; $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ════════ EVIDENCES (minh chứng) ════════
create table public.evidences (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.profiles(id),
  title text not null,
  description text,
  image_url text,                            -- Storage path, thay base64 30KB
  status text not null default 'pending'
    check (status in ('pending','good','bad')),
  points int not null default 0,
  manager_note text,
  reviewed_by uuid references public.profiles(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

-- ════════ ATTENDANCE (check-in/out) ════════
create table public.attendance_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id),
  check_in_at timestamptz not null,
  check_out_at timestamptz,
  hours_worked numeric(5,2),                 -- server tính từ 2 timestamp!
  check_in_method text not null
    check (check_in_method in ('photo','gps','pin','toggle')),
  check_in_address text,
  -- Dữ liệu validation ghi tại thời điểm check-in (chống sửa sau)
  check_in_ip text,                          -- server đọc từ request
  check_in_lat numeric(9,6), check_in_lon numeric(9,6),
  check_in_gps_accuracy numeric(6,1),
  geofence_distance_m int                    -- server tính so với tọa độ cửa hàng
);

-- ════════ NOTIFICATIONS ════════
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id),  -- người NHẬN
  title text not null,
  message text not null,
  type text not null check (type in ('reward','penalty','pending','system')),
  category text not null default 'management',
  read boolean not null default false,
  created_at timestamptz not null default now()
);

-- ════════ SHIFTS & SCHEDULING ════════
create table public.shifts (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.profiles(id),
  date date not null,
  shift_name text not null,
  start_time time not null,
  end_time time not null,
  status text not null default 'scheduled'
    check (status in ('scheduled','completed','cancelled'))
);

create table public.shift_registrations (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.profiles(id),
  week_start date not null,                  -- thứ 2 của tuần
  days jsonb not null,                       -- {monday:'morning',...} khớp type hiện tại
  status text not null default 'pending'
    check (status in ('pending','approved','rejected')),
  created_at timestamptz not null default now(),
  unique (employee_id, week_start)
);

create table public.study_schedules (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.profiles(id),
  week_start date not null,
  days jsonb not null,
  unique (employee_id, week_start)
);

create table public.manual_assignments (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.profiles(id),
  week_start date not null,
  days jsonb not null,
  published_by uuid references public.profiles(id),
  unique (employee_id, week_start)
);

-- ════════ SOCIAL (bảng tin) ════════
create table public.post_reactions (
  user_id uuid not null references public.profiles(id),
  post_id uuid not null,
  type text not null check (type in ('like','love','haha','sad','angry','cry')),
  created_at timestamptz not null default now(),
  primary key (user_id, post_id)             -- 1 reaction/user/post, đúng luật hiện tại
);

create table public.post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null,
  user_id uuid not null references public.profiles(id),
  content text not null,
  created_at timestamptz not null default now()
);

-- ════════ PEER REVIEWS ════════
create table public.peer_reviews (
  id uuid primary key default gen_random_uuid(),
  evaluator_id uuid not null references public.profiles(id),
  target_id uuid not null references public.profiles(id),
  answers jsonb not null,                    -- [{criteriaId, stars}]
  avg_score numeric(3,1) not null,
  comment text,
  month_key text not null,                   -- 'YYYY-MM' cho dedup theo tháng
  created_at timestamptz not null default now(),
  unique (evaluator_id, target_id, month_key)
);

-- ════════ INDEXES cho query hot ════════
create index idx_evidences_employee on public.evidences(employee_id, status);
create index idx_attendance_user_date on public.attendance_records(user_id, check_in_at desc);
create index idx_notifications_user on public.notifications(user_id, read, created_at desc);
```

### RLS — nơi phân quyền thật sự sống (cái localStorage không bao giờ làm được)

```sql
alter table public.profiles enable row level security;
alter table public.evidences enable row level security;
alter table public.attendance_records enable row level security;
alter table public.notifications enable row level security;
-- (tương tự cho các bảng còn lại)

-- Helper: role của người đang gọi
create function public.is_manager() returns boolean
language sql stable security definer as $$
  select exists (select 1 from public.profiles
                 where id = auth.uid() and role = 'manager');
$$;

-- profiles: ai cũng đọc được danh sách (app cần hiện tên/ảnh), chỉ tự sửa mình
create policy "profiles readable" on public.profiles for select using (true);
create policy "profiles self update" on public.profiles for update
  using (auth.uid() = id) with check (auth.uid() = id);
create policy "manager manages profiles" on public.profiles for all
  using (public.is_manager());

-- evidences: employee chỉ thấy/ghi của mình; manager thấy tất, được duyệt
create policy "employee own evidences" on public.evidences for all
  using (auth.uid() = employee_id) with check (auth.uid() = employee_id);
create policy "manager all evidences" on public.evidences for all
  using (public.is_manager());

-- attendance: employee chỉ được INSERT (không sửa/xóa — chống sửa giờ công!)
create policy "employee insert attendance" on public.attendance_records
  for insert with check (auth.uid() = user_id);
create policy "manager read attendance" on public.attendance_records
  for select using (public.is_manager());

-- notifications: chỉ người nhận thấy, chỉ hệ thống/manager tạo
create policy "own notifications" on public.notifications
  for select using (auth.uid() = user_id);
create policy "manager creates notifications" on public.notifications
  for insert with check (public.is_manager());
```

> **Bài học cốt lõi:** với localStorage, "phân quyền" chỉ là `if` trong code
> client — ai mở DevTools là qua mặt. Với RLS, **chính database** từ chối row
> không thuộc quyền: employee viết SQL trực tiếp cũng chỉ thấy được của mình.
> Đây là ranh giới bảo mật thật đầu tiên của app.

---

## 3. Kiến trúc migrate: cắm data source vào hooks

```
┌─────────────────────────── App.tsx (routing + orchestration) ───────────────────────────┐
│                                                                                         │
│   hooks/*                    ┌──────────────────┐                                       │
│   useEvidences()  ──────────▶│   data layer     │        data layer = 1 module          │
│   useAttendance() ──────────▶│  ┌────────────┐  │        trả cùng interface,            │
│   useAuth()       ──────────▶│  │ localStorage│ │ ◀── 2 implementation:               │
│   ...                        │  └────────────┘  │        • localStore (hiện tại)        │
│                              │  ┌────────────┐  │        • supabase (mới)               │
│                              │  │  supabase  │  │                                       │
│                              │  └────────────┘  │                                       │
│                              └──────────────────┘                                       │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

Nguyên tắc vàng: **screens không bao giờ biết data đến từ đâu.** App.tsx cũng
không. Chỉ hooks biết. Migrate = đổi implementation bên trong từng hook, mỗi
lần một hook, ship được ngay sau mỗi lần.

Ví dụ `useEvidences` sau migrate (pattern chung cho mọi hook):

```ts
export function useEvidences() {
  const [evidences, setEvidences] = useState<EvidenceItem[]>([]);
  const [syncing, setSyncing] = useState(true);

  // 1) Load lần đầu
  useEffect(() => {
    supabase.from('evidences').select('*').order('created_at', { ascending: false })
      .then(({ data }) => { setEvidences(data ?? []); setSyncing(false); });
  }, []);

  // 2) Realtime subscription — thay thế hoàn toàn "AO VỊNH real-time" giả
  useEffect(() => {
    const channel = supabase.channel('evidences-live')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'evidences' },
        (payload) => applyRealtimeChange(setEvidences, payload))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const submitEvidence = async (input: SubmitEvidenceInput) => {
    const { data, error } = await supabase.from('evidences')
      .insert({ ...input, employee_id: userId }).select().single();
    if (error) throw error;          // caller hiển thị toast lỗi
    // KHÔNG setEvidences ở đây — realtime event sẽ tự đưa row về mọi client
  };

  const reviewEvidence = async (decision: ReviewDecision) => {
    const { error } = await supabase.from('evidences').update({
      status: decision.status, points: decision.points,
      manager_note: decision.note, reviewed_by: userId,
      reviewed_at: new Date().toISOString(),
    }).eq('id', decision.evidenceId);
    if (error) throw error;
  };

  return { evidences, syncing, submitEvidence, reviewEvidence };
}
```

Notice 2 điều: **return shape không đổi** so với hiện tại → App.tsx và mọi
screen không phải sửa. Và notification/threshold (xử lý chéo domain) vẫn ở
App.tsx — chỉ đổi từ "push local array" thành "insert row, listener tự nhận".

---

## 4. Roadmap theo phase (mỗi phase ship được, không big-bang)

### Phase 0 — Dọn đường (nửa buổi)
- [ ] Gom mọi handler async-hóa: handlers trong App return Promise để caller
      có thể chờ/hiện loading
- [ ] Định nghĩa `SubmitEvidenceInput`, `ReviewDecision`... (input types) tách
      khỏi row types — chuẩn bị cho việc id/created_at do server sinh
- [ ] Quyết định seeded data nào giữ (INITIAL_USERS biến thành SQL seed)
- **DoD:** mọi mutate path đều async-safe; test thủ công localStorage vẫn pass.

### Phase 1 — Supabase auth thay localStorage auth (1 buổi)
- [ ] Tạo project Supabase, chạy migration SQL ở mục 2 (bảng profiles trước)
- [ ] `npm i @supabase/supabase-js`; env: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
      (anon key là public — KHÔNG phải secret; bảo mật nằm ở RLS)
- [ ] `useAuth` chuyển nội bộ sang `supabase.auth` (signUp/signInWithPassword/
      onAuthStateChange). `login()` vẫn cùng signature — App.tsx gần như không đổi
- [ ] LoginScreen: đổi default password 'aiicafe' thành invite qua email
      (Supabase gửi mail sẵn)
- **DoD:** đăng nhập thật, refresh tab vẫn giữ session, **2 trình duyệt = 2
  user riêng biệt cùng lúc** — lần đầu tiên thật sự vượt localStorage.
- ⚠️ Client-side login lockout mình vừa build bị supersedes bởi rate limit
  server-side của Supabase auth — giữ code như UX guardrail, xóa trách nhiệm
  bảo mật khỏi client.

### Phase 2 — profiles + notifications (1 buổi)
- [ ] Migrate `useAuth.users` → bảng `profiles`; `useNotifications` → bảng
      notifications (có realtime → badge cập nhật mượt)
- [ ] AddEmployeeModal gọi `supabase.auth.admin` QUA Edge Function
      (client không giữ service key — function check `is_manager()` trước)
- **DoD:** manager tạo tài khoản từ máy mình, nhân viên nhận mail, đăng nhập
  từ máy họ — luồng onboarding thật đầu tiên.

### Phase 3 — evidences (bụi ăn tiền nhất, 1 buổi)
- [ ] Bảng evidences + Storage bucket cho ảnh (thay base64 30KB hiện tại)
- [ ] `useEvidences` theo pattern ở mục 3 (load + realtime + insert/update)
- [ ] ImageCompress giữ lại, upload lên Storage thay vì base64 vào localStorage
- **DoD:** nhân viên nộp minh chứng từ điện thoại → **dashboard quản lý hiện
  ngay** mà không chạm máy nhau. Đây là khoảnh khắc "app thật" đầu tiên.

### Phase 4 — attendance + geofence server-side (1 buổi)
- [ ] Bảng attendance_records; giờ công do **server tính** từ 2 timestamp
      (không tin client)
- [ ] Edge Function `record-checkin`: nhận request → đọc IP nguồn của request
      (chống giả IP client) → so với whitelist trong DB → tính geofence distance
      → INSERT. Client chỉ gửi raw GPS + method
- [ ] Đây là lúc OFFICE_WIFI trong client chỉ còn display name
- **DoD:** check-in cheat-resistant: giờ công và vị trí do server chấm.

### Phase 5 — shifts/scheduling/social/peer-review (1-2 buổi, làm máy móc theo pattern)
- [ ] Các bảng còn lại, hooks tương tự — không có gì mới về mặt khái niệm
- [ ] Xóa dần localStorage layer khi từng hook xong (giữ localStore impl làm
  offline fallback nếu muốn, hoặc xóa hẳn cho đơn giản)
- **DoD:** localStorage không còn dữ liệu nghiệp vụ nào; xóa được 20+ key.

### Phase 6 — polish & phòng xá (linh hoạt)
- [ ] Export xlsx đổi sang đọc từ Supabase (query server, hạn chế client giữ data)
- [ ] Audit log bảng riêng cho các quyết định manager (duyệt, sửa ca, khóa TK)
- [ ] Bật Supabase Auth email templates tiếng Việt
- [ ] Deploy: Vercel/Netlify free + domain

---

## 5. Free tier — con số phải nắm

| Hạn chế | Supabase free | Thực tế của app |
|---|---|---|
| DB size | 500MB | 10 nhân viên x 1 năm ≈ vài MB — dư sức |
| Bandwidth | 5GB/tháng | Ảnh 30KB x 50 ảnh/ngày ≈ 45MB/tháng — dư sức |
| MAU | 50,000 | 10 người — dư sức |
| **Project pause** | **1 tuần không hoạt động** | ⚠️ Rủi ro thực duy nhất: ping project cuối tuần (cron cá nhân hoặc thói quen) |
| Edge Functions | 500K invocations | Dư sức |
| Realtime messages | 2M/tháng | Dư sức |

Kết luận: duy nhất pause là rủi ro thật, còn lại free tier là vô hạn so với
quy mô quán cafe.

---

## 6. Rủi ro & cách né

1. **Big-bang migration chết chóc** → kế hoạch này cố ý mỗi phase một hook,
   ship được ngay. Không bao giờ ở trạng thái "nửa localStorage nửa Supabase
   mà không chạy được".
2. **Service key lộ trong client** → KHÔNG BAO GIỜ dùng `supabase.auth.admin`
   trực tiếp từ client. Mọi thao tác admin đi qua Edge Function check quyền.
3. **Data shape drift giữa client type và SQL** → giữ types.ts là nguồn duy
   nhất, sinh type SQL bằng `supabase gen types` mỗi khi đổi schema.
4. **Đặt mã NV vào email login** → dùng email thật (hoặc generated
   `code@aiicafe.vn`), employee_code là trường tra cứu riêng.
5. **Quên RLS trên bảng mới** → checklist: `enable row level security` +
   tối thiểu 1 policy cho MỖI bảng mới, viết trong migration file cùng lúc
   với create table.

---

## 7. Definition of Done của cả hành trình

- Hai thiết bị khác nhau thấy cùng dữ liệu trong < 2s (realtime)
- Nhân viên A không đọc được dữ liệu của nhân viên B **kể cả tự viết fetch**
  (RLS chặn ở DB, không phải ở UI)
- Check-in record có giờ công do server tính, IP do server đọc
- Không một key nghiệp vụ nào còn trong localStorage
- Free tier không tốn một đồng

> **Bước tiếp theo ngay hôm nay (30 phút):** tạo project Supabase → chạy phần
> SQL mục 2 (chỉ profiles + trigger) → đăng ký 2 user test → mở 2 trình duyệt
> đăng nhập 2 user. Lúc đó app đã "multi-device" trước khi viết một dòng
> migrate nào — cảm giác đích đến trước khi đi đường.
