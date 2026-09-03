import { PeerReviewCriteria, PeerReviewSubmission } from '../types';

export const PEER_REVIEW_CRITERIA: PeerReviewCriteria[] = [
  {
    id: 'criteria-1',
    question: 'Làm việc nhóm & hỗ trợ đồng nghiệp',
    category: 'Kỹ năng mềm',
    options: ['Rất tốt', 'Tốt', 'Trung bình', 'Cần cải thiện'],
  },
  {
    id: 'criteria-2',
    question: 'Tinh thần trách nhiệm & thái độ',
    category: 'Thái độ',
    options: ['Rất tốt', 'Tốt', 'Trung bình', 'Cần cải thiện'],
  },
  {
    id: 'criteria-3',
    question: 'Chất lượng & hiệu quả công việc',
    category: 'Chuyên môn',
    options: ['Xuất sắc', 'Tốt', 'Đạt yêu cầu', 'Chưa đạt'],
  },
];

export const INITIAL_PEER_REVIEWS: PeerReviewSubmission[] = [
  {
    id: 'pr-1',
    evaluatorId: 'usr-1',
    evaluatorName: 'Nguyễn Văn An',
    evaluatorAvatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuATc96PI_QxRNeqbgaOpVyfvItajNFsw8ki0yuiwSOpCEjVgFnCd7XhRtZhEgwryLhDFvCXb7xDfPmY8secUhxCxUbPUdeV9JUGScKv3k9udnBsyloc_XYHdMPj1hMZ9pCoY-kJvCmvQ-IKznod4Y2FmP5gsE-Wphla8ErGufFCIgg27a6tsnGcPBt0-e5M4c_oJ2_b5zzGVnvcwQDCgAHj7njLHkzYd_CPmBECGLiFQNINkDZxViIO',
    targetId: 'usr-3',
    targetName: 'Nguyễn Thị Mai',
    targetAvatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAJALCKhG3wOJcDAoYOhNPfG_ZJAa3PY6C9kEzD00zWOT1Ks9SqXcJDYVKP83AcgbFQQ2nXv9KADzeQgVFyASdfJhLiw3GBzduIKVGtrADDCa74ZREY2A5D0S3h2OCG8EJshH78ytQSXG5ssTQSDm70o1nB5TJ9-gXn2nhy1ORyYCJu6PhVj7_TMcTxlIKVTgFrPLnCeM67ZwuajvFnQ_rh0AeStr_DQ7jFHlFitHXyuoM-KpsN7Iac',
    answers: [
      { criteriaId: 'criteria-1', answer: 'Rất tốt' },
      { criteriaId: 'criteria-2', answer: 'Rất tốt' },
      { criteriaId: 'criteria-3', answer: 'Xuất sắc' },
    ],
    comment: 'Mai luôn hỗ trợ đồng nghiệp rất nhiệt tình',
    submittedAt: '2026-09-02T10:30:00',
    dateString: '2026-09-02',
  },
  {
    id: 'pr-2',
    evaluatorId: 'usr-3',
    evaluatorName: 'Nguyễn Thị Mai',
    evaluatorAvatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAJALCKhG3wOJcDAoYOhNPfG_ZJAa3PY6C9kEzD00zWOT1Ks9SqXcJDYVKP83AcgbFQQ2nXv9KADzeQgVFyASdfJhLiw3GBzduIKVGtrADDCa74ZREY2A5D0S3h2OCG8EJshH78ytQSXG5ssTQSDm70o1nB5TJ9-gXn2nhy1ORyYCJu6PhVj7_TMcTxlIKVTgFrPLnCeM67ZwuajvFnQ_rh0AeStr_DQ7jFHlFitHXyuoM-KpsN7Iac',
    targetId: 'usr-1',
    targetName: 'Nguyễn Văn An',
    targetAvatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuATc96PI_QxRNeqbgaOpVyfvItajNFsw8ki0yuiwSOpCEjVgFnCd7XhRtZhEgwryLhDFvCXb7xDfPmY8secUhxCxUbPUdeV9JUGScKv3k9udnBsyloc_XYHdMPj1hMZ9pCoY-kJvCmvQ-IKznod4Y2FmP5gsE-Wphla8ErGufFCIgg27a6tsnGcPBt0-e5M4c_oJ2_b5zzGVnvcwQDCgAHj7njLHkzYd_CPmBECGLiFQNINkDZxViIO',
    answers: [
      { criteriaId: 'criteria-1', answer: 'Tốt' },
      { criteriaId: 'criteria-2', answer: 'Rất tốt' },
      { criteriaId: 'criteria-3', answer: 'Tốt' },
    ],
    comment: 'Văn An rất nghiêm túc trong công việc',
    submittedAt: '2026-09-01T14:20:00',
    dateString: '2026-09-01',
  },
  {
    id: 'pr-3',
    evaluatorId: 'usr-4',
    evaluatorName: 'Lê Hoàng Nam',
    evaluatorAvatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDMGc0qdI6jsnRkAdviGDc3ViHqQe9QYOtjfWck9WHBklIGHxr1DtQKlX-q58uzWaPxG9hxhIGu3UHhH4UasDlR5VfoM5gtVSlswC_dkKwu44ZcuIMXZ6ncaRud3-cDdBGwhhn4-8Gqo7MSi3q_tCVKQzfE1Z1pvQrzzhYJg58LN6MLie8WhJnOSJ6goBG021mWkr6oSjlRbUtrAucgHrYJs5HyTP2UGlvkWjGYUscJha4qG7j8c-Qj',
    targetId: 'usr-5',
    targetName: 'Phạm Thị Hương',
    targetAvatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAJALCKhG3wOJcDAoYOhNPfG_ZJAa3PY6C9kEzD00zWOT1Ks9SqXcJDYVKP83AcgbFQQ2nXv9KADzeQgVFyASdfJhLiw3GBzduIKVGtrADDCa74ZREY2A5D0S3h2OCG8EJshH78ytQSXG5ssTQSDm70o1nB5TJ9-gXn2nhy1ORyYCJu6PhVj7_TMcTxlIKVTgFrPLnCeM67ZwuajvFnQ_rh0AeStr_DQ7jFHlFitHXyuoM-KpsN7Iac',
    answers: [
      { criteriaId: 'criteria-1', answer: 'Tốt' },
      { criteriaId: 'criteria-2', answer: 'Trung bình' },
      { criteriaId: 'criteria-3', answer: 'Tốt' },
    ],
    submittedAt: '2026-09-02T16:45:00',
    dateString: '2026-09-02',
  },
];
