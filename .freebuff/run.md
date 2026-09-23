# Run Doc — Preview Setup

## Reproduce Uncommitted Artifacts
- Copy `.env.example` → `.env.local` and fill the REAL office Wi-Fi values
  (public IP, LAN subnet). `.env.local` is gitignored — never commit it.
  The app still runs without it (RFC 5737 placeholder fallbacks in
  `src/utils/constants.ts`), but the Wi-Fi attendance check won't pass.
- If `GEMINI_API_KEY` is needed later, it also lives in `.env.local`.
- Dependencies are already installed in `node_modules/`.

## How to Run the Server
- Start Vite dev server on port 3000:
  ```
  npm run dev
  ```
  (This runs `vite --port=3000 --host=0.0.0.0`)
- Vite reads `.env*` at STARTUP ONLY — restart the server after editing `.env.local`.
- Vite auto-selects the next free port (3004+) when 3000–3003 are occupied.
- Server logs go to `.freebuff/preview-*.log` (stdout) and `.freebuff/preview-*.log.err` (stderr).
- Current port: 3000 (was free this run).
- The PowerShell `Start-Process` detach recipe DOES start the server, but the
  command never returns in this shell — run it with a ~40s timeout and expect
  the timeout, then verify via the log file + `netstat -ano | findstr :3000`.
- Windows PID for register_preview: from `netstat -ano` (LISTENING on the
  chosen port), confirm alive with `Get-Process -Id <pid>`.
- Note: `preview_screenshot` may fail with "capturePage returned an empty
  image" on this app; `preview_snapshot` (accessibility tree) works fine for
  verifying the render.
