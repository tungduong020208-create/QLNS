# TC-04: Excel Data Integrity

Steps:

1. Tạo nhiều attendance_logs cho tháng với các `duration_hours` khác nhau.
2. Chạy module export Excel cuối tháng.

Expected:

- Cột "Tổng số giờ làm trong tháng (Giờ)" khớp tổng cộng của `duration_hours` từ `attendance_logs` cho mỗi user.
- Định dạng số `0.00` và highlight đúng những user thiếu 5 lượt đánh giá.

Priority: High

Assignee: QA
