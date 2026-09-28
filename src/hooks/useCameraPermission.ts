import { useCallback, useState } from 'react';

export type CameraPermissionState = 'unknown' | 'granted' | 'denied' | 'unavailable' | 'timeout';

export interface CameraPermission {
  state: CameraPermissionState;
  /** True right after a probe is started and has not settled yet. */
  probing: boolean;
  /**
   * Request permission via a real getUserMedia call. Resolves to the final
   * state. A prompt left unanswered (or a webview that swallows it) resolves
   * to 'timeout' instead of hanging the caller forever.
   */
  probe: () => Promise<CameraPermissionState>;
}

/**
 * How long to wait for the browser's media-permission prompt before giving
 * up and reporting 'timeout'. Long enough for a human to read the dialog,
 * short enough that the employee is not staring at a frozen flow.
 */
export const CAMERA_PROMPT_TIMEOUT_MS = 20_000;

/**
 * useCameraPermission — isolates the browser permission dance.
 *
 * The component used to mix this into its flow logic; as a hook it can be
 * reused by the review/checkout screens and stays out of the reducer's way.
 * `probe()` opens a throwaway stream purely to trigger (or confirm) the
 * browser permission prompt, then releases it immediately — the camera UI
 * itself is opened later by the camera component.
 *
 * Real-world finding (Freebuff embedded browser, 2026-09-26): the "Allow
 * media?" prompt can sit UNANSWERED forever, and getUserMedia() never
 * settles, freezing the check-in dialog with no feedback. The race below
 * turns that hang into an explicit 'timeout' state the UI can act on.
 */
export function useCameraPermission(): CameraPermission {
  const [state, setState] = useState<CameraPermissionState>('unknown');
  const [probing, setProbing] = useState(false);

  const probe = useCallback(async (): Promise<CameraPermissionState> => {
    setProbing(true);
    try {
      const stream = await Promise.race([
        navigator.mediaDevices.getUserMedia({ video: true }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new DOMException('Camera permission prompt timed out', 'TimeoutError')), CAMERA_PROMPT_TIMEOUT_MS)
        ),
      ]);
      stream.getTracks().forEach((t) => t.stop());
      setState('granted');
      return 'granted';
    } catch (err: unknown) {
      const next: CameraPermissionState =
        err instanceof DOMException && err.name === 'NotAllowedError'
          ? 'denied'
          : err instanceof DOMException && err.name === 'TimeoutError'
            ? 'timeout'
            : 'unavailable';
      setState(next);
      return next;
    } finally {
      setProbing(false);
    }
  }, []);

  return { state, probing, probe };
}
