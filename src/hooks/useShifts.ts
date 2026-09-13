/**
 * useShifts — published shift assignments ("Ca sáng/Chiều/Tối" rows).
 *
 * Owns: STORAGE_KEY_SHIFTS
 * When nothing is stored, generates a sensible default week (Mon–Fri,
 * morning shift for everyone, afternoon shift for alternating employees)
 * so the manager schedule screen is never empty on first run.
 */

import { User } from '../types';
import { INITIAL_USERS } from '../data/initialData';
import { STORAGE_KEY_SHIFTS } from '../utils/constants';
import { usePersistentState } from './usePersistentState';
import { Shift } from '../components/screens/ManagerScheduleScreen';

function buildDefaultShifts(): Shift[] {
  const today = new Date();
  const monday = new Date(today);
  const day = monday.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  monday.setDate(monday.getDate() + diff);

  const defaultShifts: Shift[] = [];
  const employees = INITIAL_USERS.filter(u => u.role !== 'manager');
  for (let i = 0; i < 5; i++) {
    const date = new Date(monday);
    date.setDate(monday.getDate() + i);
    const dateStr = date.toISOString().split('T')[0];
    employees.forEach((emp, idx) => {
      defaultShifts.push({
        id: `shift-default-m-${dateStr}-${emp.id}`,
        employeeId: emp.id,
        employeeName: emp.name,
        employeeAvatar: emp.avatar,
        date: dateStr,
        shiftName: 'Ca sáng',
        startTime: '07:00',
        endTime: '12:00',
        status: i < 3 ? 'completed' : 'scheduled',
      });
      if (idx % 2 === 0) {
        defaultShifts.push({
          id: `shift-default-a-${dateStr}-${emp.id}`,
          employeeId: emp.id,
          employeeName: emp.name,
          employeeAvatar: emp.avatar,
          date: dateStr,
          shiftName: 'Ca chiều',
          startTime: '13:00',
          endTime: '18:00',
          status: i < 3 ? 'completed' : 'scheduled',
        });
      }
    });
  }
  return defaultShifts;
}

export function useShifts() {
  const [shifts, setShifts] = usePersistentState<Shift[]>(STORAGE_KEY_SHIFTS, buildDefaultShifts());

  const addShift = (shift: Shift) => {
    setShifts(prev => [...prev, shift]);
  };

  const updateShift = (updatedShift: Shift) => {
    setShifts(prev => prev.map(s => s.id === updatedShift.id ? updatedShift : s));
  };

  const deleteShift = (shiftId: string) => {
    setShifts(prev => prev.filter(s => s.id !== shiftId));
  };

  return { shifts, addShift, updateShift, deleteShift };
}
