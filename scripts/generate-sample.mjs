/**
 * Generates a short self-hosted sample MP4 with burnt-in timecode-like text
 * using system ffmpeg when available. Falls back to skipping if ffmpeg missing.
 */
import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const outDir = join(root, 'public', 'samples')
const out = join(outDir, 'sample-60s.mp4')
mkdirSync(outDir, { recursive: true })

if (existsSync(out)) {
  console.log('Sample already exists:', out)
  process.exit(0)
}

const check = spawnSync('ffmpeg', ['-version'], { encoding: 'utf8' })
if (check.status !== 0) {
  console.warn('ffmpeg CLI not found; skipping sample generation')
  process.exit(0)
}

const args = [
  '-y',
  '-f', 'lavfi', '-i', 'testsrc=size=1280x720:rate=30:duration=60',
  '-f', 'lavfi', '-i', 'sine=frequency=880:sample_rate=44100:duration=60',
  '-vf', "drawtext=text='%{pts\\:hms}':x=40:y=40:fontsize=36:fontcolor=white:box=1:boxcolor=black@0.5",
  '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-shortest',
  out,
]
const result = spawnSync('ffmpeg', args, { encoding: 'utf8' })
if (result.status !== 0) {
  console.warn('Sample generation failed:', result.stderr?.slice(-400))
  process.exit(0)
}
console.log('Wrote', out)
