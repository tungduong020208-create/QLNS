/**
 * test-autoschedule — unit tests cho engine tự xếp lịch.
 *
 * Chạy: npx tsx scripts/test-autoschedule.ts
 * (Node thuần, không cần trình duyệt — cùng phong cách với test-attendance.ts)
 *
 * Phủ 4 nhóm luật của computeAutoSchedule + getSlotAvailability:
 *   A. Đọc availability — cùng nguồn số với engine khi enforce
 *   B. Xếp theo sức chứa — ai đăng ký trước được trước (first come first served)
 *   C. Resubmission — đăng ký lại KHÔNG bị chặn bởi ca cũ của chính mình
 *      (regression test cho bug: own auto rows bị đếm vào capacity)
 *   D. Cửa sổ tuần — tính đúng Thứ 2 → Chủ nhật (kiểm tra biên Sunday/keyboard TZ)
 */

import {
  computeAutoSchedule,
  getSlotAvailability,
} from '../src/utils/autoSchedule';
import {
  ShiftCapacityOverride,
  WeeklyShiftRegistration,
  DayShiftRegistration,
  ShiftSlot,
} from '../src/types';
import { Shift } from '../src/components/screens/ManagerScheduleScreen';

let passed = 0;
const failures: string[] = [];
function assert(name: string, cond: boolean) {
  if (cond) {
    passed++;
    console.log(`  ✓ ${name}`);
  } else {
    failures.push(name);
    console.log(`  ✗ ${name}`);
  }
}

// ─── Fixtures ───
const WEEK = '2026-03-02'; // Thứ 2

const day = (offset: number): string => {
  const d = new Date(WEEK + 'T00:00:00');
  d.setDate(d.getDate() + offset);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
};

let rowSeq = 0;
const mkShift = (
  employeeId: string,
  date: string,
  shiftName: string,
  extra?: Partial<Shift>
): Shift => ({
  id: `row-${++rowSeq}`,
  employeeId,
  employeeName: employeeId,
  employeeAvatar: '',
  date,
  shiftName,
  startTime: '06:30',
  endTime: '11:30',
  status: 'scheduled',
  ...extra,
});

const mkReg = (
  userId: string,
  selections: [number, ShiftSlot][]
): WeeklyShiftRegistration => ({
  id: `reg-${userId}-${WEEK}`,
  userId,
  userName: userId,
  userAvatar: '',
  weekStart: WEEK,
  year: 2026,
  weekNumber: 10,
  days: selections.map(
    ([offset, shift]): DayShiftRegistration => ({
      date: day(offset),
      dayLabel: 'T?',
      shift,
    })
  ),
  status: 'submitted',
  submittedAt: new Date().toISOString(),
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

/** Capacity resolver dùng override của test (mặc định 3/3/3 khi không override). */
const resolver = (overrides: ShiftCapacityOverride[] = []) => (date: string, shiftName: string) => {
  const o = overrides.find((x) => x.date === date && x.shiftName === shiftName);
  return o ? o.maxCapacity : 3;
};

const run = (
  shifts: Shift[],
  reg: WeeklyShiftRegistration,
  overrides: ShiftCapacityOverride[] = []
) => computeAutoSchedule(reg, shifts, reg.userName, '', undefined, resolver(overrides));

console.log('\n═══ A. getSlotAvailability — đọc cùng nguồn số với engine ═══');
{
  const d0 = day(0);
  const shifts = [
    mkShift('nv-a', d0, 'Ca sáng'),
    mkShift('nv-b', d0, 'Ca sáng'),
  ];
  const av = getSlotAvailability(shifts, d0, 'Ca sáng');
  assert('2/3 chỗ → taken=2, remaining=1', av.taken === 2 && av.remaining === 1 && !av.isFull);
  const full = getSlotAvailability([...shifts, mkShift('nv-c', d0, 'Ca sáng')], d0, 'Ca sáng');
  assert('3/3 chỗ → isFull=true', full.taken === 3 && full.isFull);
  const overridden = getSlotAvailability(
    shifts,
    d0,
    'Ca sáng',
    [{ date: d0, shiftName: 'Ca sáng', maxCapacity: 2 }]
  );
  assert('override max=2 → full dù chỉ 2 người', overridden.max === 2 && overridden.isFull);
  assert('ca hủy không tính vào taken', getSlotAvailability(
    [mkShift('nv-a', d0, 'Ca chiều', { status: 'cancelled' })], d0, 'Ca chiều'
  ).taken === 0);
}

console.log('\n═══ B. First come, first served — ca đầy thì chặn ═══');
{
  const d0 = day(0);
  // A đã chiếm chỗ đầy (3/3) trước.
  const full = [
    mkShift('nv-a', d0, 'Ca sáng', { id: 'shift-auto-nv-a', origin: 'auto' }),
    mkShift('nv-b', d0, 'Ca sáng', { origin: 'auto' }),
    mkShift('nv-c', d0, 'Ca sáng', { origin: 'auto' }),
  ];
  const result = run(full, mkReg('nv-d', [[0, 'morning']]));
  assert('ca đã đầy → conflict, không xếp', result.assignedCount === 0 && result.conflicts.length === 1);
  assert('conflict ghi đúng ngày + ca', result.conflicts[0]?.date === d0 && result.conflicts[0]?.shift === 'morning');
  assert('store không thay đổi khi bị chặn hoàn toàn', result.shifts.length === full.length);

  // Còn 1 chỗ: ai đến trước được trước.
  const almostFull = full.slice(0, 2);
  const ok = run(almostFull, mkReg('nv-d', [[0, 'morning']]));
  assert('còn 1/3 chỗ → xếp được', ok.assignedCount === 1 && ok.conflicts.length === 0);
  assert('sau xếp đúng 3 row (date, ca)', ok.shifts.filter(s => s.date === d0 && s.shiftName === 'Ca sáng').length === 3);
}

console.log('\n═══ C. Resubmission — ca cũ của CHÍNH MÌNH không chặn chính mình ═══');
{
  const d0 = day(0);
  // Trạng thái sau lần submit đầu: A + B + C đã chiếm đủ Ca sáng thứ 2.
  const store = [
    mkShift('nv-a', d0, 'Ca sáng', { id: 'shift-auto-nv-a', origin: 'auto' }),
    mkShift('nv-b', d0, 'Ca sáng', { origin: 'auto' }),
    mkShift('nv-c', d0, 'Ca sáng', { origin: 'auto' }),
  ];
  const reg = mkReg('nv-a', [[0, 'morning']]);

  const first = run(store, reg);
  assert('A đăng ký lại ca đầy bởi chính A + 2 người khác → vẫn xếp được (bug cũ: conflict)', first.assignedCount === 1 && first.conflicts.length === 0);
  assert('không nhân đôi row — tổng đúng 3 row cho (d0, Ca sáng)',
    first.shifts.filter(s => s.date === d0 && s.shiftName === 'Ca sáng').length === 3);
  assert('row cũ của A bị thay, không cộng dồn', first.shifts.length === 3);

  // Idempotent: submit lại lần nữa trên kết quả lần trước.
  const second = run(first.shifts, reg);
  assert('submit lần 3 vẫn ổn định (3 row, không dup)', second.assignedCount === 1 &&
    second.shifts.filter(s => s.date === d0 && s.shiftName === 'Ca sáng').length === 3);

  // Row MANUAL của manager không bị resubmission ghi đè.
  const withManual = [
    ...store,
    mkShift('nv-a', day(1), 'Ca chiều', { origin: 'manual' }),
  ];
  const res = run(withManual, mkReg('nv-a', [[0, 'morning'], [1, 'evening']]));
  assert('row manual của A được giữ nguyên', res.shifts.some(s => s.date === day(1) && s.shiftName === 'Ca chiều' && s.origin === 'manual'));
  assert('ngày đã có row manual → đăng ký thêm bị tính conflict (không double-book)', res.conflicts.some(c => c.date === day(1)));
}

console.log('\n═══ D. Cửa sổ tuần — Thứ 2 → Chủ nhật, biên đúng ═══');
{
  const sunday = day(6);
  const nextMonday = day(7);
  // Chủ nhật TRONG tuần: tính vào cửa sổ.
  const sundayStore = [mkShift('nv-b', sunday, 'Ca tối', { origin: 'auto' })];
  const r1 = run(sundayStore, mkReg('nv-a', [[6, 'evening']]), [
    { date: sunday, shiftName: 'Ca tối', maxCapacity: 1 },
  ]);
  assert('Chủ nhật nằm trong tuần → đếm capacity', r1.assignedCount === 0 && r1.conflicts.length === 1);

  // Thứ 2 TUẦN SAU: ngoài cửa sổ, không ảnh hưởng.
  const nextWeekStore = [mkShift('nv-b', nextMonday, 'Ca tối', { origin: 'auto' })];
  const r2 = run(nextWeekStore, mkReg('nv-a', [[6, 'evening']]), [
    { date: nextMonday, shiftName: 'Ca tối', maxCapacity: 1 },
  ]);
  assert('Thứ 2 tuần sau KHÔNG thuộc tuần đang đăng ký', r2.assignedCount === 1 && r2.conflicts.length === 0);
}

console.log('──────────────────────────────────────');
console.log(`Kết quả: ${passed} pass, ${failures.length} fail`);
if (failures.length) {
  console.log('Thất bại:');
  failures.forEach((f) => console.log(`  ✗ ${f}`));
  process.exit(1);
}
