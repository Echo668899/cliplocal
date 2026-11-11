import { cpSync, mkdirSync, existsSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

function copyCore(pkg, destName) {
  const src = join(root, 'node_modules', '@ffmpeg', pkg, 'dist', 'esm')
  const dest = join(root, 'public', 'ffmpeg', destName)
  if (!existsSync(src)) {
    console.error(`Missing ${src}. Run npm install first.`)
    process.exit(1)
  }
  mkdirSync(dest, { recursive: true })
  cpSync(src, dest, { recursive: true })
  for (const file of ['ffmpeg-core.js', 'ffmpeg-core.wasm', 'ffmpeg-core.worker.js']) {
    const p = join(dest, file)
    if (existsSync(p)) {
      const mb = (statSync(p).size / (1024 * 1024)).toFixed(2)
      console.log(`  ${destName}/${file}: ${mb} MiB`)
    }
  }
}

console.log('Copying FFmpeg cores to public/ffmpeg …')
copyCore('core', 'core')
copyCore('core-mt', 'core-mt')
console.log('Done.')
console.log('Note: Cloudflare Pages free tier limits files to 25 MiB. Use R2 + functions/ffmpeg proxy for production cores.')
