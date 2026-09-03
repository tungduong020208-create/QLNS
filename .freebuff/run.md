# Run Doc — Preview Setup

## Reproduce Uncommitted Artifacts
- No `.env` or `.env.local` file is required; the app works with placeholder values from `.env.example`.
- Dependencies are already installed in `node_modules/`.

## How to Run the Server
- Start Vite dev server on port 3000:
  ```
  npm run dev
  ```
  (This runs `vite --port=3000 --host=0.0.0.0`)
- Vite auto-selects port 3004 when 3000–3003 are occupied.
- Server logs go to `.freebuff/preview-*.log`.
