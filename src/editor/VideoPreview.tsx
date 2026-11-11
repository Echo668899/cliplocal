import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'
import { previewStyle } from '@/services/ffmpeg/argBuilder'
import { useProjectStore } from '@/workspace/projectStore'
import styles from './VideoPreview.module.css'

export type VideoPreviewHandle = {
  getVideo: () => HTMLVideoElement | null
}

type Props = {
  onPickFiles?: (files: File[]) => void
}

export const VideoPreview = forwardRef<VideoPreviewHandle, Props>(function VideoPreview(
  { onPickFiles },
  ref,
) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const project = useProjectStore((s) => s.history.present)
  const scrubTime = useProjectStore((s) => s.scrubTime)
  const clip = project.clips[0]
  const asset = clip ? project.assets[clip.assetId] : null
  const { start, end } = project.selection
  const prevStart = useRef(start)
  const prevEnd = useRef(end)

  useImperativeHandle(ref, () => ({
    getVideo: () => videoRef.current,
  }))

  useEffect(() => {
    const video = videoRef.current
    if (!video || !asset) return
    const onTimeUpdate = () => {
      if (!project.loopSelection) return
      if (video.currentTime >= end - 0.04) {
        video.currentTime = start
        void video.play().catch(() => undefined)
      }
    }
    video.addEventListener('timeupdate', onTimeUpdate)
    return () => video.removeEventListener('timeupdate', onTimeUpdate)
  }, [asset, start, end, project.loopSelection])

  // Follow timeline scrub / selection changes in both directions
  useEffect(() => {
    const video = videoRef.current
    if (!video || !asset) return

    let target: number
    if (typeof scrubTime === 'number') {
      target = scrubTime
    } else {
      const startChanged = Math.abs(start - prevStart.current) > 0.001
      const endChanged = Math.abs(end - prevEnd.current) > 0.001
      if (endChanged && !startChanged) target = end
      else target = start
    }
    prevStart.current = start
    prevEnd.current = end

    const clamped = Math.max(0, Math.min(target, asset.duration ?? target))
    if (Math.abs(video.currentTime - clamped) > 0.03) {
      try {
        video.currentTime = clamped
      } catch {
        /* ignore seek errors while metadata loads */
      }
    }
  }, [asset, start, end, scrubTime])

  if (!asset) {
    return (
      <div
        className={styles.wrap}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault()
          const files = e.dataTransfer.files
          if (files?.length) onPickFiles?.(Array.from(files))
        }}
      >
        <button
          type="button"
          className={styles.empty}
          onClick={() => fileInputRef.current?.click()}
          title="Choose a video from this device"
        >
          <span className={styles.emptyTitle}>Choose a video</span>
          <span className="muted">Click here or drop a file to start editing</span>
          <span className={`btn btn-primary ${styles.emptyCta}`}>Choose video</span>
        </button>
        <input
          ref={fileInputRef}
          className="sr-only"
          type="file"
          accept="video/*,audio/*,image/*,.srt,.vtt,.ass"
          onChange={(e) => {
            const files = e.target.files
            if (files?.length) onPickFiles?.(Array.from(files))
            e.target.value = ''
          }}
        />
      </div>
    )
  }

  const style = clip ? previewStyle(clip.transform, clip.color) : {}
  const aspect = clip?.transform.aspect ?? 'free'
  const stageStyle =
    aspect === 'free' && asset.width && asset.height
      ? { aspectRatio: `${asset.width} / ${asset.height}` }
      : undefined

  return (
    <div className={styles.wrap}>
      <div className={styles.stage} data-aspect={aspect} style={stageStyle}>
        <video
          ref={videoRef}
          className={styles.video}
          src={asset.objectUrl}
          style={style}
          controls
          playsInline
          preload="auto"
        />
        {clip?.texts.map((t) => (
          <div
            key={t.id}
            className={styles.overlayText}
            style={{
              left: t.x,
              top: t.y,
              fontSize: t.fontSize,
              color: t.color,
              opacity: t.opacity,
            }}
          >
            {t.text}
          </div>
        ))}
      </div>
      <div className={styles.meta}>
        <span>{asset.name}</span>
        <span className="dim mono">
          {asset.width && asset.height ? `${asset.width}×${asset.height}` : '—'}
          {asset.duration != null ? ` · ${asset.duration.toFixed(2)}s` : ''}
        </span>
      </div>
      <p className="dim" style={{ fontSize: '0.8rem' }}>
        Press ? for keyboard shortcuts. Color/crop preview is approximate — export uses FFmpeg.
      </p>
    </div>
  )
})
