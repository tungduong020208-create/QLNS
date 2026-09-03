const fs = require('fs');
let d = fs.readFileSync('src/data/initialData.ts', 'utf8');

// Add handover data before the export
const handoverData = `
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
`;

// Insert before export const INITIAL_EVIDENCES
d = d.replace('export const INITIAL_EVIDENCES', handoverData + '\nexport const INITIAL_EVIDENCES');
fs.writeFileSync('src/data/initialData.ts', d);
console.log('Handover data added!');
