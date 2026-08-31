import { User, EvidenceItem, NotificationItem, WeeklyData, CustomerRating, ApprovalRequest, QRReview } from '../types';

export const INITIAL_USERS: User[] = [
  {
    id: 'usr-1',
    name: 'Nguyễn Văn An',
    employeeCode: 'NV-2023-045',
    department: 'Quầy pha chế',
    role: 'employee',
    avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuATc96PI_QxRNeqbgaOpVyfvItajNFsw8ki0yuiwSOpCEjVgFnCd7XhRtZhEgwryLhDFvCXb7xDfPmY8secUhxCxUbPUdeV9JUGScKv3k9udnBsyloc_XYHdMPj1hMZ9pCoY-kJvCmvQ-IKznod4Y2FmP5gsE-Wphla8ErGufFCIgg27a6tsnGcPBt0-e5M4c_oJ2_b5zzGVnvcwQDCgAHj7njLHkzYd_CPmBECGLiFQNINkDZxViIO',
    email: 'an.nguyen@coffeehouse.vn',
    phone: '0912 345 678',
  },
  {
    id: 'usr-2',
    name: 'Trần Văn Hùng',
    employeeCode: 'NV-2021-002',
    department: 'Quản lý cửa hàng',
    role: 'manager',
    avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCTZm94XPugvSJ8tyw5QSSjxQFcMX31EVCkRsrrXlRcB4qihB12c2w4ZmPct956-VEA4trgGFnrCGJXz87RUOQAxvJVmHj4K7sa5EoI4-oueSKUcczxwan8ew63rD4tumTT2J5Uy9yRjNGhaM4Tp8lLpzj750mfOpUmnmNRHkLKZ9w6GCICX-nrrhbTD0R4UTL60wI0dUQ55jl9lBmbXV5_lg6WPSys1wE1KRrE4SQHR-ib9RfTlaXT',
    email: 'hung.tran@coffeehouse.vn',
    phone: '0988 765 432',
  },
  {
    id: 'usr-3',
    name: 'Nguyễn Thị Mai',
    employeeCode: 'NV-2023-088',
    department: 'Khu vực phục vụ',
    role: 'employee',
    avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAJALCKhG3wOJcDAoYOhNPfG_ZJAa3PY6C9kEzD00zWOT1Ks9SqXcJDYVKP83AcgbFQQ2nXv9KADzeQgVFyASdfJhLiw3GBzduIKVGtrADDCa74ZREY2A5D0S3h2OCG8EJshH78ytQSXG5ssTQSDm70o1nB5TJ9-gXn2nhy1ORyYCJu6PhVj7_TMcTxlIKVTgFrPLnCeM67ZwuajvFnQ_rh0AeStr_DQ7jFHlFitHXyuoM-KpsN7Iac',
    email: 'mai.nguyen@coffeehouse.vn',
    phone: '0903 112 233',
  },
  {
    id: 'usr-4',
    name: 'Lê Hoàng Nam',
    employeeCode: 'NV-2022-019',
    department: 'Kho nguyên liệu',
    role: 'employee',
    avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDMGc0qdI6jsnRkAdviGDc3ViHqQe9QYOtjfWck9WHBklIGHxr1DtQKlX-q58uzWaPxG9hxhIGu3UHhH4UasDlR5VfoM5gtVSlswC_dkKwu44ZcuIMXZ6ncaRud3-cDdBGwhhn4-8Gqo7MSi3q_tCVKQzfE1Z1pvQrzzhYJg58LN6MLie8WhJnOSJ6goBG021mWkr6oSjlRbUtrAucgHrYJs5HyTP2UGlvkWjGYUscJha4qG7j8c-Qj',
    email: 'nam.le@coffeehouse.vn',
    phone: '0934 556 778',
  }
];


// Shift Handover data
export const INITIAL_HANDOVERS: any[] = [
  {
    id: 'HO-001',
    shiftName: 'Ca sáng',
    shiftTime: '07:00 - 12:00',
    fromEmployee: { id: 'user-1', name: 'Nguyễn Văn An', employeeCode: 'NV-2023-045', department: 'Quầy pha chế', role: 'employee', avatar: '', email: '' },
    toEmployee: { id: 'user-3', name: 'Nguyễn Thị Mai', employeeCode: 'NV-2023-078', department: 'Khu vực phục vụ', role: 'employee', avatar: '', email: '' },
    date: '2026-08-30',
    dateString: '2026-08-30T12:00:00',
    status: 'completed',
    checklist: [
      { id: 't1', title: 'Kiểm tra tồn quầy pha chế', completed: true, completedBy: 'Nguyễn Văn An', completedAt: '11:45' },
      { id: 't2', title: 'Báo cáo doanh thu ca sáng', completed: true, completedBy: 'Nguyễn Văn An', completedAt: '11:50' },
      { id: 't3', title: 'Vệ sinh máy pha cà phê', completed: true, completedBy: 'Nguyễn Văn An', completedAt: '11:55' },
      { id: 't4', title: 'Kiểm tra nguyên liệu cho ca chiều', completed: true, completedBy: 'Nguyễn Văn An', completedAt: '11:58' },
    ],
    notes: 'Doanh thu ca sáng: 4.200.000đ. Bánh croissant hết, cần nhập thêm. Máy pha cà phê hoạt động bình thường.',
    previousNotes: 'Ca tối hôm qua: Doanh thu 3.800.000đ. Hết syrô dâu.',
    confirmedAt: '12:02',
  },
  {
    id: 'HO-002',
    shiftName: 'Ca chiều',
    shiftTime: '12:00 - 18:00',
    fromEmployee: { id: 'user-3', name: 'Nguyễn Thị Mai', employeeCode: 'NV-2023-078', department: 'Khu vực phục vụ', role: 'employee', avatar: '', email: '' },
    toEmployee: { id: 'user-4', name: 'Lê Hoàng Nam', employeeCode: 'NV-2023-112', department: 'Kho nguyên liệu', role: 'employee', avatar: '', email: '' },
    date: '2026-08-30',
    dateString: '2026-08-30T18:00:00',
    status: 'pending',
    checklist: [
      { id: 't5', title: 'Kiểm tra tồn quầy pha chế', completed: true, completedBy: 'Nguyễn Thị Mai', completedAt: '17:40' },
      { id: 't6', title: 'Báo cáo doanh thu ca chiều', completed: false },
      { id: 't7', title: 'Dọn dẹp khu vực phục vụ', completed: false },
      { id: 't8', title: 'Kiểm tra kho nguyên liệu', completed: false },
    ],
    notes: '',
    previousNotes: 'Ca sáng: Doanh thu 4.200.000đ. Hết bánh croissant.',
    confirmedAt: undefined,
  },
  {
    id: 'HO-003',
    shiftName: 'Ca tối',
    shiftTime: '18:00 - 22:00',
    fromEmployee: { id: 'user-4', name: 'Lê Hoàng Nam', employeeCode: 'NV-2023-112', department: 'Kho nguyên liệu', role: 'employee', avatar: '', email: '' },
    toEmployee: { id: 'user-1', name: 'Nguyễn Văn An', employeeCode: 'NV-2023-045', department: 'Quầy pha chế', role: 'employee', avatar: '', email: '' },
    date: '2026-08-31',
    dateString: '2026-08-31T22:00:00',
    status: 'pending',
    checklist: [
      { id: 't9', title: 'Kiểm tra tồn quầy pha chế', completed: false },
      { id: 't10', title: 'Báo cáo doanh thu ca tối', completed: false },
      { id: 't11', title: 'Vệ sinh toàn bộ cửa hàng', completed: false },
      { id: 't12', title: 'Kiểm tra khóa cửa, đèn, máy lạnh', completed: false },
      { id: 't13', title: 'Đếm tiền và đóng quầy', completed: false },
    ],
    notes: '',
    previousNotes: 'Ca chiều: Doanh thu ước tính 5.000.000đ. Còn đủ nguyên liệu.',
    confirmedAt: undefined,
  },
];

export const INITIAL_EVIDENCES: EvidenceItem[] = [
  {
    id: 'ev-1',
    title: 'Sắp xếp quầy kệ',
    department: 'Khu vực phục vụ',
    timestamp: 'Hôm nay, 10:30 AM',
    dateString: '2026-08-28T10:30:00',
    imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBi1b_s5yyvTQOjMbVUSb30QgRhSanL4zJfOg1nwPJgmISFNk2srl_1xXRLwSSci327felTKkZ_rArylb8Ua0M3s7CCplqdZWbL7eyO3ktIeCst5cAI_UeXeqvDiJYzbCchy45htK223PdhXiPYGL5JkND94hf2t84mRZPtA50Zmkl2QU71AJGwzqpVE_T_WFEzi6wXAPNPtsWTQ_kz60mudJfdMpNjYT2ipQNfcvv5EiLa6H9DgMRX',
    description: 'Đã hoàn thành sắp xếp trưng bày toàn bộ quầy kệ tại khu vực A theo chuẩn 5S. Hàng hóa ngay ngắn, bảng giá đầy đủ và thẳng hàng.',
    status: 'good',
    points: 15,
    managerNote: 'Sắp xếp rất gọn gàng, đúng chuẩn quy định của công ty.',
    employeeId: 'usr-1',
    employeeName: 'Nguyễn Văn An',
    employeeAvatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuATc96PI_QxRNeqbgaOpVyfvItajNFsw8ki0yuiwSOpCEjVgFnCd7XhRtZhEgwryLhDFvCXb7xDfPmY8secUhxCxUbPUdeV9JUGScKv3k9udnBsyloc_XYHdMPj1hMZ9pCoY-kJvCmvQ-IKznod4Y2FmP5gsE-Wphla8ErGufFCIgg27a6tsnGcPBt0-e5M4c_oJ2_b5zzGVnvcwQDCgAHj7njLHkzYd_CPmBECGLiFQNINkDZxViIO',
    reviewedAt: 'Hôm nay, 11:00 AM',
    reviewedBy: 'Trần Văn Hùng'
  },
  {
    id: 'ev-2',
    title: 'Báo cáo kiểm kho',
    department: 'Kho nguyên liệu',
    timestamp: 'Hôm qua, 17:00 PM',
    dateString: '2026-08-27T17:00:00',
    imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCJ7GQ0vjWTjTnAMyBHl3kMbodRW9AkykufAorCoCC1zaGYfMgV7xoXaDy1z3f5U7X68pj3bBUFKLJlY9N9LQsmKUJQomGftyTsm37kVhkj5NS82x2cFQLLKsOyHpn9FmkKEakOSUVB_7Hv5upoGv7V7XWIiz9DRgVAL-EBCVHpJGp-V4W-aGPCobkZt4Q4mGgRQNhuOSe_LuZC5JLCRebJmVmUz4CJ4IpJg6gNqfnNnNB-ZyuSwJOy',
    description: 'Báo cáo đối soát số lượng tồn kho định kỳ ca chiều ngày 27/08. Đã kiểm đếm đầy đủ danh mục và ký biên bản xác nhận.',
    status: 'pending',
    points: 0,
    employeeId: 'usr-1',
    employeeName: 'Nguyễn Văn An',
    employeeAvatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuATc96PI_QxRNeqbgaOpVyfvItajNFsw8ki0yuiwSOpCEjVgFnCd7XhRtZhEgwryLhDFvCXb7xDfPmY8secUhxCxUbPUdeV9JUGScKv3k9udnBsyloc_XYHdMPj1hMZ9pCoY-kJvCmvQ-IKznod4Y2FmP5gsE-Wphla8ErGufFCIgg27a6tsnGcPBt0-e5M4c_oJ2_b5zzGVnvcwQDCgAHj7njLHkzYd_CPmBECGLiFQNINkDZxViIO'
  },
  {
    id: 'ev-3',
    title: 'Vệ sinh khu vực A',
    department: 'Khu vực phục vụ',
    timestamp: '12/10/2023',
    dateString: '2023-10-12T16:00:00',
    imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCm28U3XdZYpg0NNx8U9_qZ7tPrPKlDKnevFsygE_Gmea3qLX4ib0idFUWgbgTgZa5W5kvamgqs5YhKQGUAZbH3lHW2PN5fif6ShtiG2EHXlrkIflXWckARj8mRntA2yoCmO25OWKm_stdB-wFIH3LuceLywQ8ivtCVsHgy8sufYzdW7qv2HEnUDxtcHbKjd_H2BKsJrnNJdJtdpEbNCIqfi3wNP1Yt-RhiXaGRjaJUZU9FOmXZJIHq',
    description: 'Quầy pha chế chưa được vệ sinh sau ca làm, ly tách còn bẩn.',
    status: 'bad',
    points: -10,
    managerNote: 'Vi phạm quy định vệ sinh chung, chưa đổ rác trước khi kết thúc ca trực.',
    employeeId: 'usr-1',
    employeeName: 'Nguyễn Văn An',
    employeeAvatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuATc96PI_QxRNeqbgaOpVyfvItajNFsw8ki0yuiwSOpCEjVgFnCd7XhRtZhEgwryLhDFvCXb7xDfPmY8secUhxCxUbPUdeV9JUGScKv3k9udnBsyloc_XYHdMPj1hMZ9pCoY-kJvCmvQ-IKznod4Y2FmP5gsE-Wphla8ErGufFCIgg27a6tsnGcPBt0-e5M4c_oJ2_b5zzGVnvcwQDCgAHj7njLHkzYd_CPmBECGLiFQNINkDZxViIO',
    reviewedAt: '12/10/2023 18:30 PM',
    reviewedBy: 'Trần Văn Hùng'
  },
  {
    id: 'ev-4',
    title: 'Sắp xếp quầy kệ khu vực thời trang nam',
    department: 'Khu vực phục vụ',
    timestamp: 'Hôm nay, 08:30 AM',
    dateString: '2026-08-28T08:30:00',
    imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBpB7scRZnte0G7E7-Q93CRPbIrgFh07H33rh094uq_sxfAn16SN8cfjmtHw6RRH8JTP9azwKG2RtQu8soPqt3q5p1rmcNkIIrAtmY8XVAUHUzAPBY-15bWKauVDCC47lxzvCFzWqbrWHdn3bJT3LFj3aOlY_WLbpATZFv_sOpzZtgFmXgcP89y7-VKVqrVIPrb9AcohBjBjRC5X4pMafE__Qdg6pz0lL_OxqYZDiifJwEXgTGItmYB',
    description: 'Hoàn thành sắp xếp quầy kệ khu vực thời trang nam theo đúng layout mới của tháng. Đã vệ sinh sạch sẽ khu vực xung quanh.',
    status: 'pending',
    points: 0,
    employeeId: 'usr-3',
    employeeName: 'Nguyễn Thị Mai',
    employeeAvatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAJALCKhG3wOJcDAoYOhNPfG_ZJAa3PY6C9kEzD00zWOT1Ks9SqXcJDYVKP83AcgbFQQ2nXv9KADzeQgVFyASdfJhLiw3GBzduIKVGtrADDCa74ZREY2A5D0S3h2OCG8EJshH78ytQSXG5ssTQSDm70o1nB5TJ9-gXn2nhy1ORyYCJu6PhVj7_TMcTxlIKVTgFrPLnCeM67ZwuajvFnQ_rh0AeStr_DQ7jFHlFitHXyuoM-KpsN7Iac'
  },
  {
    id: 'ev-5',
    title: 'Báo cáo vệ sinh khu vực cuối ngày',
    department: 'Khu vực phục vụ',
    timestamp: 'Hôm qua, 17:45 PM',
    dateString: '2026-08-27T17:45:00',
    imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuD_59L-uzGVUrGJA7VYkMPgn-KSZ4alh_5rBpsFXwPMfzwPxncV04ew18FZeWcrNENiz5Kes53cixxJVWE7ZihWVv0Xedjvus1OtAws1eBeyK2IWQEe2Y3sRHJ7Pb5ZpVTANtBFh9RsHLN1HquQpqXHr7mFMitZu4-HBBA6QbhQ8oXz6wHsfkm3a_BN5EGWyC_90arsquRvqHvfwtFhC9V0100B32UqHgxQLnlV-XcC5CzGMYUfjjZe',
    description: 'Đã sắp xếp lại menu và lau bàn sạch sẽ.',
    status: 'pending',
    points: 0,
    employeeId: 'usr-2',
    employeeName: 'Trần Văn Hùng',
    employeeAvatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBocglPiPB7ft1oYV0nh9wm0z7A9YvMdWIwmnakEZzEbx5LYefJ076mJhQj8VbprouBiaTd0rH8t-OQU1Ed6jKnVNTcmWE1HZ2oDjG38KVn6MunNnfot5YzdLWQzELof-Vsab8JcxqQjG7e2CmJem0e-grcqp_AV9p4hi6N59b0uuAK0Ho0SsCGub71ba2RuMoZXUQJidLOO2H_yEK4t_AtJqPrxFSZGHJmSF71raeuvW_oZJ90fgmv'
  }
];

export const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'notif-1',
    title: 'Minh chứng đã được duyệt',
    message: 'Minh chứng "Sắp xếp quầy kệ" được đánh giá TỐT (+15 điểm).',
    time: '10 phút trước',
    read: false,
    type: 'reward'
  },
  {
    id: 'notif-2',
    title: 'Thưởng hiệu suất tuần',
    message: 'Bạn được cộng +50 điểm thưởng chuyên cần và tuân thủ tuần vừa qua.',
    time: '2 giờ trước',
    read: false,
    type: 'reward'
  },
  {
    id: 'notif-3',
    title: 'Nhắc nhở nộp báo cáo ca',
    message: 'Vui lòng hoàn thành nộp minh chứng kết ca trước 18:00.',
    time: '1 ngày trước',
    read: true,
    type: 'system'
  }
];

export const WEEKLY_CHART_DATA: WeeklyData[] = [
  { week: 'Tuần 1', percentage: 40, goodCount: 18, totalCount: 45, points: 650 },
  { week: 'Tuần 2', percentage: 60, goodCount: 30, totalCount: 50, points: 920 },
  { week: 'Tuần 3', percentage: 85, goodCount: 46, totalCount: 54, points: 1450, isCurrent: true },
  { week: 'Tuần 4', percentage: 70, goodCount: 35, totalCount: 50, points: 1100 }
];

export const ATTENTION_EMPLOYEES = [
  {
    id: 'att-1',
    name: 'Nguyễn Văn A',
    department: 'Khu vực kinh doanh',
    issue: '2 lần "Chưa tốt"',
    avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAsUD-emr2_t2f7yznByylFsPaIeVErKaiY24B87xHF_Y3FPz03OKsfw4zmjKyqQrzUKBazmPO0Aka4b5hSr2DquoevW8fB4tf8CNc2O4i8GF-U5uf2hUCx5mzdTJhzGAsd5vDCjEsERzAPznQvtr_Ej395oVYxpBoVQvQxHwCmyAd7MUvKy2YYeiD5bGqrYd4dIVEPXvGNXofiaHSynPZ3_eEiDAhR-Afr-gzPv9K2naAuGuDTKwmK',
    notes: 'Trễ hạn nộp báo cáo tuần 2 lần liên tiếp'
  },
  {
    id: 'att-2',
    name: 'Trần Thị B',
    department: 'Khu vực kỹ thuật',
    issue: '2 lần "Chưa tốt"',
    initialLetter: 'T',
    notes: 'Chưa hoàn thành dọn dẹp kho công cụ trước khi ra về'
  }
];

export const SAMPLE_EVIDENCE_PRESETS = [
  {
    title: 'Sắp xếp kệ hàng hóa siêu thị',
    url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBi1b_s5yyvTQOjMbVUSb30QgRhSanL4zJfOg1nwPJgmISFNk2srl_1xXRLwSSci327felTKkZ_rArylb8Ua0M3s7CCplqdZWbL7eyO3ktIeCst5cAI_UeXeqvDiJYzbCchy45htK223PdhXiPYGL5JkND94hf2t84mRZPtA50Zmkl2QU71AJGwzqpVE_T_WFEzi6wXAPNPtsWTQ_kz60mudJfdMpNjYT2ipQNfcvv5EiLa6H9DgMRX',
    dept: 'Khu vực phục vụ'
  },
  {
    title: 'Kiểm kê bàn giao tài liệu sổ sách',
    url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCJ7GQ0vjWTjTnAMyBHl3kMbodRW9AkykufAorCoCC1zaGYfMgV7xoXaDy1z3f5U7X68pj3bBUFKLJlY9N9LQsmKUJQomGftyTsm37kVhkj5NS82x2cFQLLKsOyHpn9FmkKEakOSUVB_7Hv5upoGv7V7XWIiz9DRgVAL-EBCVHpJGp-V4W-aGPCobkZt4Q4mGgRQNhuOSe_LuZC5JLCRebJmVmUz4CJ4IpJg6gNqfnNnNB-ZyuSwJOy',
    dept: 'Kho nguyên liệu'
  },
  {
    title: 'Trưng bày áo sơ mi nam theo layout',
    url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBpB7scRZnte0G7E7-Q93CRPbIrgFh07H33rh094uq_sxfAn16SN8cfjmtHw6RRH8JTP9azwKG2RtQu8soPqt3q5p1rmcNkIIrAtmY8XVAUHUzAPBY-15bWKauVDCC47lxzvCFzWqbrWHdn3bJT3LFj3aOlY_WLbpATZFv_sOpzZtgFmXgcP89y7-VKVqrVIPrb9AcohBjBjRC5X4pMafE__Qdg6pz0lL_OxqYZDiifJwEXgTGItmYB',
    dept: 'Khu vực phục vụ'
  },
  {
    title: 'Khu vực quầy pha chế gọn gàng cuối ngày',
    url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuD_59L-uzGVUrGJA7VYkMPgn-KSZ4alh_5rBpsFXwPMfzwPxncV04ew18FZeWcrNENiz5Kes53cixxJVWE7ZihWVv0Xedjvus1OtAws1eBeyK2IWQEe2Y3sRHJ7Pb5ZpVTANtBFh9RsHLN1HquQpqXHr7mFMitZu4-HBBA6QbhQ8oXz6wHsfkm3a_BN5EGWyC_90arsquRvqHvfwtFhC9V0100B32UqHgxQLnlV-XcC5CzGMYUfjjZe',
    dept: 'Khu vực phục vụ'
  }
];

export const INITIAL_CUSTOMER_RATINGS: CustomerRating[] = [
  {
    id: 'cr-1',
    employeeId: 'usr-1',
    customerName: 'Khách hàng Minh',
    rating: 'good',
    comment: 'Pha chế ngon, phục vụ nhiệt tình!',
    timestamp: 'Hôm nay, 09:15 AM',
    dateString: '2026-08-30T09:15:00'
  },
  {
    id: 'cr-2',
    employeeId: 'usr-1',
    customerName: 'Khách hàng Lan',
    rating: 'good',
    comment: 'Cà phê thơm, nhân viên dễ thương.',
    timestamp: 'Hôm nay, 10:30 AM',
    dateString: '2026-08-30T10:30:00'
  },
  {
    id: 'cr-3',
    employeeId: 'usr-1',
    customerName: 'Khách hàng Hùng',
    rating: 'good',
    comment: 'Không gian sạch sẽ.',
    timestamp: 'Hôm nay, 11:00 AM',
    dateString: '2026-08-30T11:00:00'
  },
  {
    id: 'cr-4',
    employeeId: 'usr-1',
    customerName: 'Khách hàng Trang',
    rating: 'good',
    timestamp: 'Hôm nay, 13:20 PM',
    dateString: '2026-08-30T13:20:00'
  },
  {
    id: 'cr-5',
    employeeId: 'usr-1',
    customerName: 'Khách hàng Long',
    rating: 'good',
    comment: 'Phục vụ nhanh.',
    timestamp: 'Hôm qua, 15:00 PM',
    dateString: '2026-08-29T15:00:00'
  },
  {
    id: 'cr-6',
    employeeId: 'usr-1',
    customerName: 'Khách hàng Thủy',
    rating: 'normal',
    comment: 'Bình thường.',
    timestamp: 'Hôm qua, 16:30 PM',
    dateString: '2026-08-29T16:30:00'
  },
  {
    id: 'cr-7',
    employeeId: 'usr-1',
    customerName: 'Khách hàng Linh',
    rating: 'good',
    comment: 'Tuyệt vời!',
    timestamp: '28/08, 09:00 AM',
    dateString: '2026-08-28T09:00:00'
  },
  {
    id: 'cr-8',
    employeeId: 'usr-3',
    customerName: 'Khách hàng Quỳnh',
    rating: 'good',
    comment: 'Đồ uống ngon.',
    timestamp: 'Hôm nay, 10:00 AM',
    dateString: '2026-08-30T10:00:00'
  },
  {
    id: 'cr-9',
    employeeId: 'usr-3',
    customerName: 'Khách hàng Đức',
    rating: 'good',
    timestamp: 'Hôm nay, 14:45 PM',
    dateString: '2026-08-30T14:45:00'
  },
];

export const INITIAL_APPROVAL_REQUESTS: ApprovalRequest[] = [
  {
    id: 'apr-1',
    type: 'shift_swap',
    title: 'Xin đổi ca chiều với ca sáng',
    description: 'Ngày 01/09, em có việc gia đình buổi chiều nên muốn đổi ca chiều (12-18h) với ca sáng (07-12h). Anh Nam đã đồng ý đổi.',
    employeeId: 'usr-1',
    employeeName: 'Nguyễn Văn An',
    employeeAvatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuATc96PI_QxRNeqbgaOpVyfvItajNFsw8ki0yuiwSOpCEjVgFnCd7XhRtZhEgwryLhDFvCXb7xDfPmY8secUhxCxUbPUdeV9JUGScKv3k9udnBsyloc_XYHdMPj1hMZ9pCoY-kJvCmvQ-IKznod4Y2FmP5gsE-Wphla8ErGufFCIgg27a6tsnGcPBt0-e5M4c_oJ2_b5zzGVnvcwQDCgAHj7njLHkzYd_CPmBECGLiFQNINkDZxViIO',
    date: 'Hôm nay, 09:15',
    dateString: '2026-08-31T09:15:00',
    status: 'pending',
    targetEmployee: 'Nam Lê',
    targetEmployeeId: 'usr-4',
    createdAt: '2026-08-31T09:15:00'
  },
  {
    id: 'apr-2',
    type: 'time_off',
    title: 'Xin nghỉ phép 1 ngày',
    description: 'Ngày 02/09 em cần nghỉ phép để đi khám bệnh. Em đã sắp xếp xong việc với ca chiều.',
    employeeId: 'usr-3',
    employeeName: 'Nguyễn Thị Mai',
    employeeAvatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAJALCKhG3wOJcDAoYOhNPfG_ZJAa3PY6C9kEzD00zWOT1Ks9SqXcJDYVKP83AcgbFQQ2nXv9KADzeQgVFyASdfJhLiw3GBzduIKVGtrADDCa74ZREY2A5D0S3h2OCG8EJshH78ytQSXG5ssTQSDm70o1nB5TJ9-gXn2nhy1ORyYCJu6PhVj7_TMcTxlIKVTgFrPLnCeM67ZwuajvFnQ_rh0AeStr_DQ7jFHlFitHXyuoM-KpsN7Iac',
    date: 'Hôm nay, 10:30',
    dateString: '2026-08-31T10:30:00',
    status: 'pending',
    createdAt: '2026-08-31T10:30:00'
  },
  {
    id: 'apr-3',
    type: 'overtime',
    title: 'Xin tăng ca thêm 2 tiếng',
    description: 'Tối nay ca tối (18-22h), em muốn tăng ca thêm đến 00h vì quán có buổi tiệc đặt trước. Em muốn nhận thêm thu nhập.',
    employeeId: 'usr-1',
    employeeName: 'Nguyễn Văn An',
    employeeAvatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuATc96PI_QxRNeqbgaOpVyfvItajNFsw8ki0yuiwSOpCEjVgFnCd7XhRtZhEgwryLhDFvCXb7xDfPmY8secUhxCxUbPUdeV9JUGScKv3k9udnBsyloc_XYHdMPj1hMZ9pCoY-kJvCmvQ-IKznod4Y2FmP5gsE-Wphla8ErGufFCIgg27a6tsnGcPBt0-e5M4c_oJ2_b5zzGVnvcwQDCgAHj7njLHkzYd_CPmBECGLiFQNINkDZxViIO',
    date: 'Hôm nay, 14:00',
    dateString: '2026-08-31T14:00:00',
    status: 'pending',
    createdAt: '2026-08-31T14:00:00'
  },
  {
    id: 'apr-4',
    type: 'other',
    title: 'Xin phép mang dụng cụ cá nhân',
    description: 'Em muốn mang máy pha cà phê cá nhân (dòng Delonghi) vào quán để trưng bày góc cà phê handmade. Máy sẽ đặt ở khu vực quầy pha chế.',
    employeeId: 'usr-3',
    employeeName: 'Nguyễn Thị Mai',
    employeeAvatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAJALCKhG3wOJcDAoYOhNPfG_ZJAa3PY6C9kEzD00zWOT1Ks9SqXcJDYVKP83AcgbFQQ2nXv9KADzeQgVFyASdfJhLiw3GBzduIKVGtrADDCa74ZREY2A5D0S3h2OCG8EJshH78ytQSXG5ssTQSDm70o1nB5TJ9-gXn2nhy1ORyYCJu6PhVj7_TMcTxlIKVTgFrPLnCeM67ZwuajvFnQ_rh0AeStr_DQ7jFHlFitHXyuoM-KpsN7Iac',
    date: 'Hôm qua, 16:20',
    dateString: '2026-08-30T16:20:00',
    status: 'approved',
    managerNote: 'Đồng ý, nhớ giữ vệ sinh khu vực quầy.',
    reviewedAt: 'Hôm qua, 17:00',
    reviewedBy: 'Trần Văn Hùng',
    createdAt: '2026-08-30T16:20:00'
  },
  {
    id: 'apr-5',
    type: 'shift_swap',
    title: 'Xin đổi ca sáng với ca tối',
    description: 'Ngày 03/09 em có lịch học上午 nên muốn đổi ca sáng (07-12h) với ca tối (18-22h). Em đã thống nhất với bạn Linh.',
    employeeId: 'usr-3',
    employeeName: 'Nguyễn Thị Mai',
    employeeAvatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAJALCKhG3wOJcDAoYOhNPfG_ZJAa3PY6C9kEzD00zWOT1Ks9SqXcJDYVKP83AcgbFQQ2nXv9KADzeQgVFyASdfJhLiw3GBzduIKVGtrADDCa74ZREY2A5D0S3h2OCG8EJshH78ytQSXG5ssTQSDm70o1nB5TJ9-gXn2nhy1ORyYCJu6PhVj7_TMcTxlIKVTgFrPLnCeM67ZwuajvFnQ_rh0AeStr_DQ7jFHlFitHXyuoM-KpsN7Iac',
    date: 'Hôm nay, 15:45',
    dateString: '2026-08-31T15:45:00',
    status: 'rejected',
    managerNote: 'Ca sáng 03/09 đã hết người. Xin chọn ngày khác.',
    reviewedAt: 'Hôm nay, 16:10',
    reviewedBy: 'Trần Văn Hùng',
    createdAt: '2026-08-31T15:45:00'
  },
];

export const INITIAL_QR_REVIEWS: QRReview[] = [
  {
    id: 'qr-1',
    employeeId: 'usr-1',
    employeeName: 'Nguyễn Văn An',
    employeeAvatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuATc96PI_QxRNeqbgaOpVyfvItajNFsw8ki0yuiwSOpCEjVgFnCd7XhRtZhEgwryLhDFvCXb7xDfPmY8secUhxCxUbPUdeV9JUGScKv3k9udnBsyloc_XYHdMPj1hMZ9pCoY-kJvCmvQ-IKznod4Y2FmP5gsE-Wphla8ErGufFCIgg27a6tsnGcPBt0-e5M4c_oJ2_b5zzGVnvcwQDCgAHj7njLHkzYd_CPmBECGLiFQNINkDZxViIO',
    customerName: 'Khách hàng Trang',
    stars: 5,
    comment: 'Cà phê rất ngon, nhân viên dễ thương!',
    timestamp: 'Hôm nay, 09:15',
    dateString: '2026-08-31T09:15:00',
    sentToGoogle: true
  },
  {
    id: 'qr-2',
    employeeId: 'usr-1',
    employeeName: 'Nguyễn Văn An',
    employeeAvatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuATc96PI_QxRNeqbgaOpVyfvItajNFsw8ki0yuiwSOpCEjVgFnCd7XhRtZhEgwryLhDFvCXb7xDfPmY8secUhxCxUbPUdeV9JUGScKv3k9udnBsyloc_XYHdMPj1hMZ9pCoY-kJvCmvQ-IKznod4Y2FmP5gsE-Wphla8ErGufFCIgg27a6tsnGcPBt0-e5M4c_oJ2_b5zzGVnvcwQDCgAHj7njLHkzYd_CPmBECGLiFQNINkDZxViIO',
    customerName: 'Khách hàng Hùng',
    stars: 4,
    comment: 'Không gian sạch sẽ, đồ uống tạm ổn.',
    timestamp: 'Hôm nay, 10:30',
    dateString: '2026-08-31T10:30:00',
    sentToGoogle: false
  },
  {
    id: 'qr-3',
    employeeId: 'usr-3',
    employeeName: 'Nguyễn Thị Mai',
    employeeAvatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAJALCKhG3wOJcDAoYOhNPfG_ZJAa3PY6C9kEzD00zWOT1Ks9SqXcJDYVKP83AcgbFQQ2nXv9KADzeQgVFyASdfJhLiw3GBzduIKVGtrADDCa74ZREY2A5D0S3h2OCG8EJshH78ytQSXG5ssTQSDm70o1nB5TJ9-gXn2nhy1ORyYCJu6PhVj7_TMcTxlIKVTgFrPLnCeM67ZwuajvFnQ_rh0AeStr_DQ7jFHlFitHXyuoM-KpsN7Iac',
    customerName: 'Khách hàng Lan',
    stars: 5,
    comment: 'Cà phê thơm ngon, nhân viên dễ thương!',
    timestamp: 'Hôm nay, 11:00',
    dateString: '2026-08-31T11:00:00',
    sentToGoogle: true
  },
  {
    id: 'qr-4',
    employeeId: 'usr-1',
    employeeName: 'Nguyễn Văn An',
    employeeAvatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuATc96PI_QxRNeqbgaOpVyfvItajNFsw8ki0yuiwSOpCEjVgFnCd7XhRtZhEgwryLhDFvCXb7xDfPmY8secUhxCxUbPUdeV9JUGScKv3k9udnBsyloc_XYHdMPj1hMZ9pCoY-kJvCmvQ-IKznod4Y2FmP5gsE-Wphla8ErGufFCIgg27a6tsnGcPBt0-e5M4c_oJ2_b5zzGVnvcwQDCgAHj7njLHkzYd_CPmBECGLiFQNINkDZxViIO',
    customerName: 'Khách hàng Minh',
    stars: 2,
    comment: 'Pha chế quá chậm, đợi 15 phút.',
    timestamp: 'Hôm nay, 13:20',
    dateString: '2026-08-31T13:20:00',
    sentToGoogle: false
  },
  {
    id: 'qr-5',
    employeeId: 'usr-3',
    employeeName: 'Nguyễn Thị Mai',
    employeeAvatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAJALCKhG3wOJcDAoYOhNPfG_ZJAa3PY6C9kEzD00zWOT1Ks9SqXcJDYVKP83AcgbFQQ2nXv9KADzeQgVFyASdfJhLiw3GBzduIKVGtrADDCa74ZREY2A5D0S3h2OCG8EJshH78ytQSXG5ssTQSDm70o1nB5TJ9-gXn2nhy1ORyYCJu6PhVj7_TMcTxlIKVTgFrPLnCeM67ZwuajvFnQ_rh0AeStr_DQ7jFHlFitHXyuoM-KpsN7Iac',
    customerName: 'Khách hàng Thủy',
    stars: 3,
    comment: 'Bình thường.',
    timestamp: 'Hôm nay, 14:45',
    dateString: '2026-08-31T14:45:00',
    sentToGoogle: false
  },
];
