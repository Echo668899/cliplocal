# FFmpeg wasm cores

Run `npm run ffmpeg:copy` (also runs on `postinstall`) to populate:

- `core/` from `@ffmpeg/core@0.12.10`
- `core-mt/` from `@ffmpeg/core-mt@0.12.10`

These files are intentionally not committed (large wasm). Cloudflare Pages has a 25 MiB per-file limit — use the R2 proxy in `functions/ffmpeg/` for production hosting of the cores.
