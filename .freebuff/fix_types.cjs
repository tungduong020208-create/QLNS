const fs = require('fs');

// Add ShiftHandover types to types.ts
let t = fs.readFileSync('src/types.ts', 'utf8');
const handoverTypes = `

export interface HandoverTask {
  id: string;
  title: string;
  completed: boolean;
  completedBy?: string;
  completedAt?: string;
}

export interface ShiftHandover {
  id: string;
  shiftName: string;           // "Ca sáng" | "Ca chiều" | "Ca tối"
  shiftTime: string;           // "07:00 - 12:00"
  fromEmployee: User;
  toEmployee: User;
  date: string;
  dateString: string;
  status: 'pending' | 'confirmed' | 'completed';
  checklist: HandoverTask[];
  notes: string;
  previousNotes?: string;      // Ghi chú từ ca trước
  confirmedAt?: string;
  handoverPhoto?: string;      // Ảnh bàn giao
}`;
t = t.replace('export type ActiveTab', handoverTypes + '\n\nexport type ActiveTab');
fs.writeFileSync('src/types.ts', t);
console.log('Types added!');
