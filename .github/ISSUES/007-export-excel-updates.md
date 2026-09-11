# Deliverable: Export Excel Updates

Yêu cầu:

- Thêm cột "Tổng số giờ làm trong tháng (Giờ)" lấy từ `monthly_accumulated_hours`.
- Thêm cột "Tiến độ Đánh giá tuần" (ví dụ: `5/5 - Hoàn thành` hoặc `2/5 - Thiếu`).
- Định dạng số thập phân `0.00` cho cột giờ.
- Highlight hàng màu đỏ nếu chưa đủ 5 lượt đánh giá.

Acceptance Criteria:

- File Excel xuất ra có các cột mới và định dạng như mô tả.
- Dữ liệu khớp với DB.

Tasks:

- Cập nhật module export để lấy thêm trường từ DB.
- Thêm formatting & conditional formatting.
- Viết test xuất file mẫu và xác nhận nội dung.

Priority: Medium

Assignee: TBD
