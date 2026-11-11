import { useEffect, useMemo, useRef, useState, type PointerEvent } from 'react'
import { formatDuration, parseTimeInput } from '@/services/ffmpeg/mediaInfo'
import { useProjectStore } from '@/workspace/projectStore'
import styles from './Timeline.module.css'

export function Timeline() {
  const project = useProjectStore((s) => s.history.present)
  const setSelection = useProjectStore((s) => s.setSelection)
  const setLoopSelection = useProjectStore((s) => s.setLoopSelection)
  const trackRef = useRef<HTMLDivElement>(null)
  const [dragging, setDragging] = useState<'start' | 'end' | 'range' | null>(null)

  const clip = project.clips[0]
  const asset = clip ? project.assets[clip.assetId] : null
  const duration = asset?.duration ?? 0
  const { start, end } = project.selection

  const leftPct = duration ? (start / duration) * 100 : 0
  const widthPct = duration ? ((end - start) / duration) * 100 : 0

  const marks = useMemo(() => {
    if (!duration) return []
    const step = duration > 60 ? 10 : duration > 20 ? 5 : 1
    const out: number[] = []
    for (let t = 0; t <= duration; t += step) out.push(t)
    return out
  }, [duration])

  const timeFromClientX = (clientX: number) => {
    const el = trackRef.current
    if (!el || !duration) return 0
    const rect = el.getBoundingClientRect()
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width))
    return ratio * duration
  }

  const onPointerDown = (which: 'start' | 'end' | 'range') => (e: PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    setDragging(which)
  }

  const onPointerMove = (e: PointerEvent) => {
    if (!dragging || !duration) return
    const t = timeFromClientX(e.clientX)
    if (dragging === 'start') setSelection(Math.min(t, end - 0.05), end)
    if (dragging === 'end') setSelection(start, Math.max(t, start + 0.05))
    if (dragging === 'range') {
      const span = end - start
      let nextStart = t - span / 2
      nextStart = Math.max(0, Math.min(nextStart, duration - span))
      setSelection(nextStart, nextStart + span)
    }
  }

  const onPointerUp = () => setDragging(null)

  if (!asset) {
    return <div className={styles.empty}>Timeline appears after you choose a video.</div>
  }

  return (
    <div className={styles.root}>
      <div className={styles.toolbar}>
        <label className={styles.loop}>
          <input
            type="checkbox"
            checked={project.loopSelection}
            onChange={(e) => setLoopSelection(e.target.checked)}
          />
          Loop selection
        </label>
        <div className={styles.times}>
          <TimeField
            label="Start"
            value={start}
            onCommit={(v) => setSelection(v, end)}
          />
          <TimeField
            label="End"
            value={end}
            onCommit={(v) => setSelection(start, v)}
          />
          <span className={styles.duration}>{formatDuration(end - start)}</span>
        </div>
      </div>

      <div
        ref={trackRef}
        className={styles.track}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <div className={styles.rail} />
        {marks.map((t) => (
          <span key={t} className={styles.mark} style={{ left: `${(t / duration) * 100}%` }}>
            {formatDuration(t)}
          </span>
        ))}
        <div
          className={styles.range}
          style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
          onPointerDown={onPointerDown('range')}
        >
          <button
            type="button"
            className={`${styles.handle} ${styles.start}`}
            aria-label="Selection start"
            onPointerDown={onPointerDown('start')}
          />
          <button
            type="button"
            className={`${styles.handle} ${styles.end}`}
            aria-label="Selection end"
            onPointerDown={onPointerDown('end')}
          />
        </div>
      </div>
    </div>
  )
}

function TimeField({
  label,
  value,
  onCommit,
}: {
  label: string
  value: number
  onCommit: (v: number) => void
}) {
  const [text, setText] = useState(value.toFixed(3))
  const [focused, setFocused] = useState(false)
  useEffect(() => {
    if (!focused) setText(value.toFixed(3))
  }, [value, focused])
  return (
    <label className={styles.timeField}>
      <span>{label}</span>
      <input
        value={text}
        onFocus={() => {
          setFocused(true)
          setText(value.toFixed(3))
        }}
        onChange={(e) => setText(e.target.value)}
        onBlur={() => {
          setFocused(false)
          const parsed = parseTimeInput(text)
          if (parsed != null) onCommit(parsed)
          else setText(value.toFixed(3))
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
        }}
        inputMode="decimal"
      />
    </label>
  )
}
