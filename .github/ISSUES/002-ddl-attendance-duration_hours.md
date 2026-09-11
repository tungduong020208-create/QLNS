# DDL: Thêm `duration_hours` vào bảng `attendance_logs`

Mô tả:

- Bổ sung cột `duration_hours NUMERIC(4,2)` vào bảng `attendance_logs` để lưu thời lượng giờ của từng ca khi Check-out.

Acceptance Criteria:

- Cột `duration_hours` tồn tại và được cập nhật khi nhân viên Check-out.
- Migration có xử lý giá trị null và precision phù hợp.

Tasks:

- Thêm migration SQL: `ALTER TABLE attendance_logs ADD COLUMN duration_hours NUMERIC(4,2);`
- Cập nhật logic Check-out để tính và ghi trường này.
- Viết migration rollback.

Priority: High

Assignee: TBD
