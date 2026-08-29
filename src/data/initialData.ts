import { User, EvidenceItem, NotificationItem, WeeklyData } from '../types';

export const INITIAL_USERS: User[] = [
  {
    id: 'usr-1',
    name: 'Nguyễn Văn An',
    employeeCode: 'NV-2023-045',
    department: 'Quầy pha chế',
    role: 'employee',
    avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuATc96PI_QxRNeqbgaOpVyfvItajNFsw8ki0yuiwSOpCEjVgFnCd7XhRtZhEgwryLhDFvCXb7xDfPmY8secUhxCxUbPUdeV9JUGScKv3k9udnBsyloc_XYHdMPj1hMZ9pCoY-kJvCmvQ-IKznod4Y2FmP5gsE-Wphla8ErGufFCIgg27a6tsnGcPBt0-e5M4c_oJ2_b5zzGVnvcwQDCgAHj7njLHkzYd_CPmBECGLiFQNINkDZxViIO',
    email: 'an.nguyen@enterprisehr.vn',
    phone: '0912 345 678',
  },
  {
    id: 'usr-2',
    name: 'Trần Văn Hùng',
    employeeCode: 'NV-2021-002',
    department: 'Quản lý cửa hàng',
    role: 'manager',
    avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCTZm94XPugvSJ8tyw5QSSjxQFcMX31EVCkRsrrXlRcB4qihB12c2w4ZmPct956-VEA4trgGFnrCGJXz87RUOQAxvJVmHj4K7sa5EoI4-oueSKUcczxwan8ew63rD4tumTT2J5Uy9yRjNGhaM4Tp8lLpzj750mfOpUmnmNRHkLKZ9w6GCICX-nrrhbTD0R4UTL60wI0dUQ55jl9lBmbXV5_lg6WPSys1wE1KRrE4SQHR-ib9RfTlaXT',
    email: 'hung.tran@enterprisehr.vn',
    phone: '0988 765 432',
  },
  {
    id: 'usr-3',
    name: 'Nguyễn Thị Mai',
    employeeCode: 'NV-2023-088',
    department: 'Khu vực phục vụ',
    role: 'employee',
    avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAJALCKhG3wOJcDAoYOhNPfG_ZJAa3PY6C9kEzD00zWOT1Ks9SqXcJDYVKP83AcgbFQQ2nXv9KADzeQgVFyASdfJhLiw3GBzduIKVGtrADDCa74ZREY2A5D0S3h2OCG8EJshH78ytQSXG5ssTQSDm70o1nB5TJ9-gXn2nhy1ORyYCJu6PhVj7_TMcTxlIKVTgFrPLnCeM67ZwuajvFnQ_rh0AeStr_DQ7jFHlFitHXyuoM-KpsN7Iac',
    email: 'mai.nguyen@enterprisehr.vn',
    phone: '0903 112 233',
  },
  {
    id: 'usr-4',
    name: 'Lê Hoàng Nam',
    employeeCode: 'NV-2022-019',
    department: 'Kho nguyên liệu',
    role: 'employee',
    avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDMGc0qdI6jsnRkAdviGDc3ViHqQe9QYOtjfWck9WHBklIGHxr1DtQKlX-q58uzWaPxG9hxhIGu3UHhH4UasDlR5VfoM5gtVSlswC_dkKwu44ZcuIMXZ6ncaRud3-cDdBGwhhn4-8Gqo7MSi3q_tCVKQzfE1Z1pvQrzzhYJg58LN6MLie8WhJnOSJ6goBG021mWkr6oSjlRbUtrAucgHrYJs5HyTP2UGlvkWjGYUscJha4qG7j8c-Qj',
    email: 'nam.le@enterprisehr.vn',
    phone: '0934 556 778',
  }
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
    department: 'Phòng Kinh Doanh',
    issue: '2 lần "Chưa tốt"',
    avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAsUD-emr2_t2f7yznByylFsPaIeVErKaiY24B87xHF_Y3FPz03OKsfw4zmjKyqQrzUKBazmPO0Aka4b5hSr2DquoevW8fB4tf8CNc2O4i8GF-U5uf2hUCx5mzdTJhzGAsd5vDCjEsERzAPznQvtr_Ej395oVYxpBoVQvQxHwCmyAd7MUvKy2YYeiD5bGqrYd4dIVEPXvGNXofiaHSynPZ3_eEiDAhR-Afr-gzPv9K2naAuGuDTKwmK',
    notes: 'Trễ hạn nộp báo cáo tuần 2 lần liên tiếp'
  },
  {
    id: 'att-2',
    name: 'Trần Thị B',
    department: 'Phòng Kỹ Thuật',
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
