# DDL: Tạo/Cập nhật bảng `weekly_peer_reviews`

Schema đề xuất:

```
CREATE TABLE weekly_peer_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  week_start_date DATE NOT NULL,
  evaluator_id UUID REFERENCES users(id),
  target_id UUID REFERENCES users(id),
  scores JSONB,
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

Mô tả:

- Dùng để theo dõi lượt đánh giá theo tuần, phục vụ quy tắc 5 lượt/tuần.

Acceptance Criteria:

- Bảng tồn tại và API ghi nhận lượt đánh giá tuần.

Tasks:

- Tạo migration.
- Cập nhật service ghi/kiểm tra trùng target trong cùng tuần.

Priority: High

Assignee: TBD
