import type { MediaAsset } from '@/edit-graph/types'

export async function readMediaMetadata(file: File, objectUrl: string): Promise<Partial<MediaAsset>> {
  const kind = inferKind(file)
  if (kind === 'video' || kind === 'audio') {
    return readAvMetadata(objectUrl, kind)
  }
  if (kind === 'image') {
    return readImageMetadata(objectUrl)
  }
  return { kind, duration: 0 }
}

function inferKind(file: File): MediaAsset['kind'] {
  const t = file.type
  const name = file.name.toLowerCase()
  if (t.startsWith('video/') || /\.(mp4|webm|mov|mkv|avi|m4v)$/.test(name)) return 'video'
  if (t.startsWith('audio/') || /\.(mp3|wav|aac|m4a|ogg|flac)$/.test(name)) return 'audio'
  if (t.startsWith('image/') || /\.(png|jpe?g|webp|gif|bmp)$/.test(name)) return 'image'
  if (/\.(srt|vtt|ass)$/.test(name)) return 'subtitle'
  if (/\.(ttf|otf|woff2?)$/.test(name)) return 'font'
  return 'other'
}

function readAvMetadata(url: string, kind: 'video' | 'audio'): Promise<Partial<MediaAsset>> {
  return new Promise((resolve) => {
    const el = document.createElement(kind === 'video' ? 'video' : 'audio')
    el.preload = 'metadata'
    el.src = url
    const done = () => {
      resolve({
        kind,
        duration: Number.isFinite(el.duration) ? el.duration : 0,
        width: kind === 'video' ? (el as HTMLVideoElement).videoWidth || undefined : undefined,
        height: kind === 'video' ? (el as HTMLVideoElement).videoHeight || undefined : undefined,
        hasAudio: kind === 'audio' ? true : undefined,
        hasVideo: kind === 'video',
      })
      el.remove()
    }
    el.addEventListener('loadedmetadata', done, { once: true })
    el.addEventListener('error', () => {
      resolve({ kind, duration: 0 })
      el.remove()
    }, { once: true })
  })
}

function readImageMetadata(url: string): Promise<Partial<MediaAsset>> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      resolve({ kind: 'image', width: img.naturalWidth, height: img.naturalHeight, duration: 0 })
    }
    img.onerror = () => resolve({ kind: 'image', duration: 0 })
    img.src = url
  })
}

export function canBrowserPreview(mimeType: string, name: string): boolean {
  const lower = name.toLowerCase()
  if (mimeType.startsWith('video/')) {
    return /mp4|webm|ogg|quicktime/.test(mimeType) || /\.(mp4|webm|ogv|mov)$/.test(lower)
  }
  if (mimeType.startsWith('audio/')) {
    return /mpeg|mp3|wav|ogg|aac|mp4/.test(mimeType) || /\.(mp3|wav|ogg|aac|m4a)$/.test(lower)
  }
  if (mimeType.startsWith('image/')) return true
  return false
}

export function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00'
  const s = Math.floor(seconds % 60)
  const m = Math.floor((seconds / 60) % 60)
  const h = Math.floor(seconds / 3600)
  const pad = (n: number) => n.toString().padStart(2, '0')
  if (h > 0) return `${h}:${pad(m)}:${pad(s)}`
  return `${m}:${pad(s)}`
}

export function parseTimeInput(value: string): number | null {
  const v = value.trim()
  if (!v) return null
  if (/^\d+(\.\d+)?$/.test(v)) return Number(v)
  const parts = v.split(':').map(Number)
  if (parts.some((p) => Number.isNaN(p))) return null
  if (parts.length === 2) return parts[0] * 60 + parts[1]
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2]
  return null
}
