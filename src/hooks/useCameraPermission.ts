import { useCallback, useState } from 'react';

export type CameraPermissionState = 'unknown' | 'granted' | 'denied' | 'unavailable';

export interface CameraPermission {
  state: CameraPermissionState;
  /** True right after a probe is started and has not settled yet. */
  probing: boolean;
  /** Request permission via a real getUserMedia call. Resolves to the final state. */
  probe: () => Promise<CameraPermissionState>;
}

/**
 * useCameraPermission — isolates the browser permission dance.
 *
 * The component used to mix this into its flow logic; as a hook it can be
 * reused by the review/checkout screens and stays out of the reducer's way.
 * `probe()` opens a throwaway stream purely to trigger (or confirm) the
 * browser permission prompt, then releases it immediately — the camera UI
 * itself is opened later by the camera component.
 */
export function useCameraPermission(): CameraPermission {
  const [state, setState] = useState<CameraPermissionState>('unknown');
  const [probing, setProbing] = useState(false);

  const probe = useCallback(async (): Promise<CameraPermissionState> => {
    setProbing(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach((t) => t.stop());
      setState('granted');
      return 'granted';
    } catch (err: unknown) {
      const next: CameraPermissionState =
        err instanceof DOMException && err.name === 'NotAllowedError' ? 'denied' : 'unavailable';
      setState(next);
      return next;
    } finally {
      setProbing(false);
    }
  }, []);

  return { state, probing, probe };
}
