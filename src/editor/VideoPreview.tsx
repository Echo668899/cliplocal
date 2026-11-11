import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'
import { previewStyle } from '@/services/ffmpeg/argBuilder'
import { useProjectStore } from '@/workspace/projectStore'
import styles from './VideoPreview.module.css'

export type VideoPreviewHandle = {
  getVideo: () => HTMLVideoElement | null
}

export const VideoPreview = forwardRef<VideoPreviewHandle>(function VideoPreview(_, ref) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const project = useProjectStore((s) => s.history.present)
  const clip = project.clips[0]
  const asset = clip ? project.assets[clip.assetId] : null
  const { start, end } = project.selection

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

  useEffect(() => {
    const video = videoRef.current
    if (!video || !asset) return
    if (video.currentTime < start || video.currentTime > end) {
      video.currentTime = start
    }
  }, [asset, start, end])

  if (!asset) {
    return (
      <div className={styles.empty}>
        <p>Choose a video to preview</p>
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
          preload="metadata"
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
