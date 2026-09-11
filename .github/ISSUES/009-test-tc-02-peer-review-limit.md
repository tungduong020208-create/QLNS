# TC-02: Peer Review Limit (5 lượt/tuần)

Steps:

1. User thực hiện 5 lượt đánh giá khác nhau trong cùng tuần.
2. Gọi `GET /api/peer-reviews/weekly-status` giữa tuần và sau lượt cuối.

Expected:

- Progress Bar tăng từ 0 → 5.
- `GET /api/peer-reviews/weekly-status` trả `{ count: 5, target: 5 }`.
- Nếu `<5` vào cuối tuần, hệ thống gửi reminder.

Priority: High

Assignee: QA
