# DDL: Tạo bảng `student_schedules`

Schema đề xuất:

```
CREATE TABLE student_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  week_start_date DATE NOT NULL,
  busy_slots JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

Mô tả:

- `busy_slots` lưu mảng các khung: `{ day: 'Mon', shift: 'morning', note: '...' }`.

Acceptance Criteria:

- Bảng tồn tại và có index theo `(user_id, week_start_date)`.
- API có thể CRUD dữ liệu này.

Tasks:

- Tạo migration SQL và index.
- Định nghĩa schema trong ORM.

Priority: High

Assignee: TBD
