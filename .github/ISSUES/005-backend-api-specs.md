# Deliverable: Backend API Specs

Endpoints cần triển khai:

- `POST /api/attendance/checkout`
  - Tính `duration_hours` từ check-in/check-out timestamps.
  - Cập nhật `attendance_logs.duration_hours` và cộng vào `users.monthly_accumulated_hours`.

- `GET /api/attendance/monthly-summary`
  - Trả về danh sách users với `monthly_accumulated_hours` trong tháng hiện tại.

- `POST /api/student-schedules`
  - Tạo/Cập nhật bản ghi `student_schedules` cho user & week.

- `GET /api/student-schedules/manager-view`
  - Trả về busy_slots của toàn bộ nhân viên cho tuần yêu cầu.

- `GET /api/peer-reviews/weekly-status`
  - Trả `{ count: X, target: 5 }` cho user hiện tại.

- `POST /api/peer-reviews/submit`
  - Ghi đánh giá mới; validate không duplicate `target_id` trong cùng tuần.

Acceptance Criteria:

- Có OpenAPI/Swagger spec hoặc Postman collection.
- Các endpoint có tests cơ bản (unit/integration).

Tasks:

- Viết Swagger spec.
- Implement endpoints + tests.

Priority: High

Assignee: TBD
