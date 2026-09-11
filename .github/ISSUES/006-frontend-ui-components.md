# Deliverable: Frontend UI Components & Props

Components cần cập nhật/ thêm:

- `CheckInCheckOut.tsx`
  - Thêm StatCard: "Giờ làm tích lũy tháng này: [X] giờ" (prop: `monthlyAccumulatedHours`).

- `PeerReviewScreen.tsx`
  - Thêm Progress Bar hiển thị `count/5` và cảnh báo nếu `<5` trước Chủ Nhật.

- `ShiftRegistrationScreen.tsx`
  - Thêm Tab/Modal "Gửi lịch học" (props: `weekStartDate`, `busySlots`, submit handler).

- `ManagerSchedulePlanner.tsx`
  - Tại ma trận xếp ca, highlight ô trùng `busySlots` với lớp CSS cảnh báo và nhãn "Bận học".

Acceptance Criteria:

- UI phản hồi realtime sau khi submit lịch học.
- Các component có unit tests (snapshot/interaction).

Tasks:

- Thiết kế UI nhỏ, cập nhật props & state flow.
- Viết unit tests cho components.

Priority: High

Assignee: TBD
