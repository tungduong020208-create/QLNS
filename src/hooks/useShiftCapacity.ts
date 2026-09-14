/**
 * useShiftCapacity — số người tối đa từng (ngày, ca).
 *
 * Nghiệp vụ (mục 3 & 7): mỗi ca/ngày có max riêng — mặc định theo
 * SHIFT_CAPACITY_DEFAULTS (Sáng 3, Chiều 3, Tối 3), quản lý chỉnh được
 * TỪNG Ô (date, shift) mà không ảnh hưởng các ngày khác.
 *
 * Store chỉ chứa các ô ĐÃ CHỈNH KHÁC mặc định (override) — vì vậy:
 *  - đọc trống = "toàn bộ dùng mặc định" (không cần seed data);
 *  - trả về mặc định = xóa override, store không phình theo thời gian.
 *
 * Engine tự xếp (autoSchedule) và UI nhân viên cùng đọc hàm
 * getCapacityForDate() này →frontend "authoritative check" dùng đúng
 * con số mà backend sẽ enforce (điều kiện tiên quyết để chống race).
 */

import { ShiftCapacityOverride } from '../types';
import {
  STORAGE_KEY_SHIFT_CAPACITY_OVERRIDES,
  SHIFT_CAPACITY_DEFAULTS,
  SHIFT_NAME_TO_SLOT,
} from '../utils/constants';
import { usePersistentState } from './usePersistentState';

/** Max của một (ngày, ca): override nếu có, ngược lại mặc định theo ca. */
export function getCapacityForDate(
  overrides: ShiftCapacityOverride[],
  date: string,
  shiftName: string
): number {
  const override = overrides.find((o) => o.date === date && o.shiftName === shiftName);
  if (override) return override.maxCapacity;
  const slot = SHIFT_NAME_TO_SLOT[shiftName];
  return slot ? SHIFT_CAPACITY_DEFAULTS[slot] : SHIFT_CAPACITY_DEFAULTS.morning;
}

export function useShiftCapacity() {
  const [capacityOverrides, setCapacityOverrides] = usePersistentState<ShiftCapacityOverride[]>(
    STORAGE_KEY_SHIFT_CAPACITY_OVERRIDES,
    []
  );

  /**
   * Quản lý đặt max của một ô. Gán đúng giá trị mặc định → xóa override
   * (store chỉ giữ cái lệch chuẩn).
   */
  const setCapacityForDate = (date: string, shiftName: string, maxCapacity: number) => {
    const slot = SHIFT_NAME_TO_SLOT[shiftName];
    const isDefault = slot ? maxCapacity === SHIFT_CAPACITY_DEFAULTS[slot] : false;

    setCapacityOverrides((prev) => {
      if (isDefault) {
        return prev.filter((o) => !(o.date === date && o.shiftName === shiftName));
      }
      const exists = prev.some((o) => o.date === date && o.shiftName === shiftName);
      if (exists) {
        return prev.map((o) =>
          o.date === date && o.shiftName === shiftName ? { ...o, maxCapacity } : o
        );
      }
      return [...prev, { date, shiftName, maxCapacity }];
    });
  };

  return { capacityOverrides, setCapacityForDate, getCapacityForDate };
}
