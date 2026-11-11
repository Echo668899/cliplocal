/**
 * Cloudflare Pages rejects files > ~25 MiB. Remove wasm from dist so the
 * SPA can deploy; serve cores from R2 via functions/ffmpeg/[[path]].js.
 */
import { existsSync, readdirSync, unlinkSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const distFfmpeg = join(dirname(fileURLToPath(import.meta.url)), '..', 'dist', 'ffmpeg')
if (!existsSync(distFfmpeg)) {
  console.error('dist/ffmpeg missing — run npm run build first')
  process.exit(1)
}

let removed = 0
for (const dir of ['core', 'core-mt']) {
  const folder = join(distFfmpeg, dir)
  if (!existsSync(folder)) continue
  for (const file of readdirSync(folder)) {
    if (file.endsWith('.wasm')) {
      unlinkSync(join(folder, file))
      removed++
      console.log('Removed', `${dir}/${file}`)
    }
  }
}

writeFileSync(
  join(distFfmpeg, 'HOSTING.txt'),
  'Wasm cores intentionally omitted for Cloudflare Pages size limits. Upload cores to R2 and bind FFMPEG_BUCKET (see wrangler.toml + functions/ffmpeg).\n',
)
console.log(`Done. Removed ${removed} wasm file(s).`)
