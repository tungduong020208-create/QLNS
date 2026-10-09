# Run Doc — Preview Setup

## Reproduce Uncommitted Artifacts
- Copy `.env.example` → `.env.local` and fill the REAL office Wi-Fi values
  (public IP, LAN subnet). `.env.local` is gitignored — never commit it.
  The app still runs without it (RFC 5737 placeholder fallbacks in
  `src/utils/constants.ts`), but the Wi-Fi attendance check won't pass.
- If `GEMINI_API_KEY` is needed later, it also lives in `.env.local`.
- Dependencies are already installed in `node_modules/`.

## How to Run the Server
- Start Vite dev server on port 3000 — use the DUAL-STACK override so
  `localhost` (IPv6 `::1` + IPv4) answers, which `register_preview` under
  `http://localhost:3000/` requires:
  ```
  npm run dev -- --host=::
  ```
  (npm appends after the script's `--host=0.0.0.0`; Vite takes the LAST
  `--host`, so the effective command is `vite --port=3000 --host=0.0.0.0
  --host=::` — verified working 2026-10-08: netstat shows BOTH `0.0.0.0:3000`
  and `[::]:3000`, and `localhost`, `[::1]`, `127.0.0.1` all return 200.)
- Plain `npm run dev` (IPv4-only `0.0.0.0`) still serves `127.0.0.1` and
  browsers fall back to it, BUT `[::1]` will not answer — so a
  `register_preview` with `http://localhost:3000/` FAILS its probe. Only use
  plain `npm run dev` if registering `http://127.0.0.1:3000/` instead.
- Vite reads `.env*` at STARTUP ONLY — restart the server after editing `.env.local`.
- Vite auto-selects the next free port (3004+) when 3000–3003 are occupied.
- Server logs go to `.freebuff/preview-*.log` (stdout) and `.freebuff/preview-*.log.err` (stderr).
- Current port: 3000 (was free this run; verified free again 2026-10-08).
- The PowerShell `Start-Process` detach recipe DOES start the server, but the
  command never returns in this shell — run it with a ~40s timeout and expect
  the timeout, then verify via the log file + `netstat -ano | findstr :3000`.
  (Re-confirmed 2026-10-08: 40s timeout hit, PID from netstat was alive.)
- Windows PID for register_preview: from `netstat -ano | grep LISTENING |
  grep ':<port>'`. Note: `Get-Process -Id <pid>` (and `tasklist`) may HANG in
  this shell — netstat + a `curl -s -o /dev/null -w '%{http_code}'` 200 check
  are the reliable liveness confirmation (verified 2026-09-24).
- register_preview: `http://localhost:3000/` WORKS when the server is started
  with `--host=::` (verified 2026-10-08). With IPv4-only binding it is
  REJECTED ("did not answer an HTTP request") because the tool probes IPv6
  `::1` — in that case register `http://127.0.0.1:3000/` instead (works
  first try, 2026-09-24 and 2026-10-08).
- Caution: a FAILED `register_preview` with `replace: true` can release the
  currently-registered server (observed 2026-10-08 — pid died, port freed).
  If that happens, restart the server detached and re-register.
- Note: `preview_screenshot` may fail with "no frames" on this app;
  `preview_snapshot` (accessibility tree) works fine for verifying the render
  (re-confirmed 2026-10-08 — screenshot still fails, snapshot works).
- Session behavior when verifying: the app enforces a 30-min sliding session
  with a 30s watchdog (src/utils/auth.ts). Opening the app in TWO live
  contexts (Preview panel + a `preview_open` browser tab) can cause the
  logged-out context to wipe the shared localStorage session → the logged-in
  tab bounces back to /login. If that happens: log in again via the
  "DEV — ĐĂNG NHẬP NHANH" buttons (★ Văn Hùng = manager) and continue.
  Not a server/app bug.
- Dev quick-login for verifying authed screens: `preview_click` ★ Văn Hùng
  → /admin/dashboard; schedule screen (ManagerScheduleScreen) at
  /admin/schedule. The "Xếp tự động tuần này" batch auto-schedule modal was
  verified working there on 2026-10-08.
