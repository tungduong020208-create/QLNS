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
 *
 * NEVER auto-prompts: sampling only happens when geolocation permission is
 * already 'granted'. Calling getCurrentPosition while the permission is still
 * 'prompt' makes the host webview show the "Allow geolocation?" dialog on
 * every screen mount (reported as permission-dialog spam) — the prompt must
 * only ever be triggered by an explicit user action (the check-in flow).
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
    let perm: PermissionStatus | null = null;

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

    // Auto-sample only when permission is already granted (checked below);
    // otherwise show a passive status and wait — the 'change' listener below
    // picks up the moment the user grants (e.g. via the check-in flow's prompt).
    // NOTE: no unconditional lookup() here — that was the prompt-spam source.
    const onPermChange = () => {
      if (cancelled) return;
      if (perm?.state === 'granted') lookup();
    };

    if (navigator.permissions?.query) {
      navigator.permissions
        .query({ name: 'geolocation' as PermissionName })
        .then((status) => {
          if (cancelled) return;
          perm = status;
          if (status.state === 'granted') {
            lookup();
          } else if (status.state === 'denied') {
            setState({ address: 'Quyền vị trí bị từ chối — hãy cấp quyền trong cài đặt', coords: null, ready: true });
          } else {
            setState({ address: 'Chưa cấp quyền vị trí', coords: null, ready: true });
          }
          status.addEventListener('change', onPermChange);
        })
        .catch(() => {
          // Permissions API unavailable — fall back to the legacy auto lookup
          lookup();
        });
    } else {
      lookup();
    }

    return () => {
      cancelled = true;
      perm?.removeEventListener('change', onPermChange);
    };
  }, []);

  return state;
}
