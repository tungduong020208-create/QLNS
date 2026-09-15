import { useEffect, useState } from 'react';

export interface CurrentLocationState {
  /** Reverse-geocoded address (or "lat, lon" fallback) for display. */
  address: string;
  /** Raw coordinates of the latest fix, if any. Display only. */
  coords: { lat: number; lon: number } | null;
  /** True once the first lookup has settled (success or failure). */
  ready: boolean;
}

/**
 * useCurrentLocation — display-only geolocation.
 *
 * IMPORTANT: this hook is NOT the gate. The business rules for whether an
 * employee may check in live in `resolveAttendanceGate` (a pure, tested
 * function). This hook only feeds the on-card readout (address + coords),
 * mirroring the original component's behavior: it never blocks anything.
 *
 * Runs once on mount; listens for permission changes so the address
 * refreshes if the user flips location access while the screen is open.
 */
export function useCurrentLocation(): CurrentLocationState {
  const [state, setState] = useState<CurrentLocationState>({
    address: '',
    coords: null,
    ready: false,
  });

  useEffect(() => {
    if (!('geolocation' in navigator)) {
      setState({ address: 'Thiết bị không hỗ trợ định vị', coords: null, ready: true });
      return;
    }

    let cancelled = false;

    const lookup = () => {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          if (cancelled) return;
          const { latitude, longitude } = pos.coords;
          let display = `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
          try {
            const res = await fetch(
              `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&accept-language=vi`
            );
            const data = await res.json();
            const named = data?.display_name?.split(',').slice(0, 3).join(',');
            if (named) display = named;
          } catch {
            // offline / rate-limited → keep the coordinate fallback
          }
          if (!cancelled) {
            setState({ address: display, coords: { lat: latitude, lon: longitude }, ready: true });
          }
        },
        () => {
          if (!cancelled) setState({ address: 'Không thể lấy vị trí', coords: null, ready: true });
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    };

    lookup();

    // Re-resolve if the user flips the permission switch mid-session.
    if (navigator.permissions?.query) {
      let perm: PermissionStatus | null = null;
      const onPermChange = () => lookup();
      navigator.permissions
        .query({ name: 'geolocation' as PermissionName })
        .then((status) => {
          perm = status;
          perm.addEventListener('change', onPermChange);
        })
        .catch(() => {
          /* some browsers reject the query — non-fatal */
        });
      return () => {
        cancelled = true;
        perm?.removeEventListener('change', onPermChange);
      };
    }

    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
