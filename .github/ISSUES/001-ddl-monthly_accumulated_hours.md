---
title: "DDL: Thêm monthly_accumulated_hours vào users"
---

# DDL: Thêm `monthly_accumulated_hours` vào bảng `users`

Mô tả:

- Bổ sung cột `monthly_accumulated_hours NUMERIC(6,2)` vào bảng `users` để lưu tổng số giờ làm tích lũy trong tháng cho mỗi nhân viên.

Acceptance Criteria:

- Cột mới tồn tại trong database (PostgreSQL / Supabase).
- API và backend có thể đọc/ghi trường này.
- Có hướng dẫn DDL (ALTER TABLE ...) kèm ví dụ migration.

Tasks:

- Thêm migration SQL: `ALTER TABLE users ADD COLUMN monthly_accumulated_hours NUMERIC(6,2) DEFAULT 0;`
- Cập nhật ORM models (nếu có) để map trường mới.
- Viết migration rollback.

Priority: High

Assignee: TBD
