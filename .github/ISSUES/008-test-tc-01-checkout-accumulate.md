# TC-01: Check-out & Accumulate

Steps:

1. Tạo user test với `monthly_accumulated_hours = 0`.
2. Thực hiện check-in và check-out trong một ca có độ dài 4.5 giờ.
3. Gọi `POST /api/attendance/checkout`.

Expected:

- `attendance_logs.duration_hours` = 4.50.
- `users.monthly_accumulated_hours` tăng lên 4.50.
- UI `CheckInCheckOut` và `Manager` hiển thị 4.50 giờ.

Priority: High

Assignee: QA
