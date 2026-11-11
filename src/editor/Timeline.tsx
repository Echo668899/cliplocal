import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { formatDuration, parseTimeInput } from '@/services/ffmpeg/mediaInfo'
import { useProjectStore } from '@/workspace/projectStore'
import styles from './Timeline.module.css'

type DragKind = 'start' | 'end' | 'range'

export function Timeline() {
  const project = useProjectStore((s) => s.history.present)
  const setSelection = useProjectStore((s) => s.setSelection)
  const setScrubTime = useProjectStore((s) => s.setScrubTime)
  const setLoopSelection = useProjectStore((s) => s.setLoopSelection)
  const trackRef = useRef<HTMLDivElement>(null)
  const selectionRef = useRef(project.selection)
  const durationRef = useRef(0)
  const dragRef = useRef<{
    kind: DragKind
    pointerId: number
    originStart: number
    originEnd: number
    grabOffset: number
  } | null>(null)
  const [dragging, setDragging] = useState<DragKind | null>(null)

  const clip = project.clips[0]
  const asset = clip ? project.assets[clip.assetId] : null
  const duration = asset?.duration ?? 0
  const { start, end } = project.selection

  selectionRef.current = project.selection
  durationRef.current = duration

  const leftPct = duration ? (start / duration) * 100 : 0
  const widthPct = duration ? ((end - start) / duration) * 100 : 0

  const marks = useMemo(() => {
    if (!duration) return []
    const step = duration > 60 ? 10 : duration > 20 ? 5 : 1
    const out: number[] = []
    for (let t = 0; t <= duration; t += step) out.push(Number(t.toFixed(3)))
    return out
  }, [duration])

  const timeFromClientX = (clientX: number) => {
    const el = trackRef.current
    const dur = durationRef.current
    if (!el || !dur) return 0
    const rect = el.getBoundingClientRect()
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / Math.max(rect.width, 1)))
    return ratio * dur
  }

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const drag = dragRef.current
      if (!drag || e.pointerId !== drag.pointerId) return
      e.preventDefault()
      const dur = durationRef.current
      if (!dur) return
      const t = timeFromClientX(e.clientX)
      const minSpan = Math.min(0.05, Math.max(dur / 1000, 0.01))

      if (drag.kind === 'start') {
        const nextStart = Math.max(0, Math.min(t, drag.originEnd - minSpan))
        setSelection(nextStart, drag.originEnd, { recordHistory: false, scrubTo: nextStart })
      } else if (drag.kind === 'end') {
        const nextEnd = Math.min(dur, Math.max(t, drag.originStart + minSpan))
        setSelection(drag.originStart, nextEnd, { recordHistory: false, scrubTo: nextEnd })
      } else {
        const span = drag.originEnd - drag.originStart
        let nextStart = t - drag.grabOffset
        nextStart = Math.max(0, Math.min(nextStart, dur - span))
        setSelection(nextStart, nextStart + span, { recordHistory: false, scrubTo: nextStart })
      }
    }

    const onUp = (e: PointerEvent) => {
      const drag = dragRef.current
      if (!drag || e.pointerId !== drag.pointerId) return
      const { start: s, end: en } = selectionRef.current
      // Commit one history entry for the finished drag
      setSelection(s, en, { recordHistory: true, scrubTo: null })
      setScrubTime(null)
      dragRef.current = null
      setDragging(null)
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
    }
  }, [setSelection, setScrubTime])

  const beginDrag = (kind: DragKind, e: ReactPointerEvent) => {
    if (!duration) return
    e.preventDefault()
    e.stopPropagation()
    const t = timeFromClientX(e.clientX)
    const { start: s, end: en } = selectionRef.current
    dragRef.current = {
      kind,
      pointerId: e.pointerId,
      originStart: s,
      originEnd: en,
      grabOffset: kind === 'range' ? t - s : 0,
    }
    setDragging(kind)
    const scrubTo = kind === 'end' ? en : s
    setScrubTime(scrubTo)
    try {
      ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    } catch {
      /* ignore */
    }
  }

  if (!asset) {
    return <div className={styles.empty}>Timeline appears after you choose a video.</div>
  }

  return (
    <div className={styles.root}>
      <div className={styles.toolbar}>
        <label className={styles.loop} title="Replay only the selected range">
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
            onCommit={(v) => setSelection(v, end, { scrubTo: v })}
          />
          <TimeField
            label="End"
            value={end}
            onCommit={(v) => setSelection(start, v, { scrubTo: v })}
          />
          <span className={styles.duration} title="Selection length">
            {formatDuration(end - start)}
          </span>
        </div>
      </div>

      <div
        ref={trackRef}
        className={`${styles.track} ${dragging ? styles.dragging : ''}`}
        role="slider"
        aria-valuemin={0}
        aria-valuemax={duration}
        aria-valuenow={start}
        aria-label="Trim range"
        title="Drag the blue handles to set start and end. Drag the middle to move the selection."
        onPointerDown={(e) => {
          if ((e.target as HTMLElement).closest(`.${styles.range}`)) return
          if (!duration) return
          const t = timeFromClientX(e.clientX)
          const mid = (selectionRef.current.start + selectionRef.current.end) / 2
          if (t < mid) beginDrag('start', e)
          else beginDrag('end', e)
        }}
      >
        <div className={styles.rail} />
        {marks.map((t) => (
          <span key={t} className={styles.mark} style={{ left: `${(t / duration) * 100}%` }}>
            {formatDuration(t)}
          </span>
        ))}
        <div
          className={styles.range}
          style={{ left: `${leftPct}%`, width: `${Math.max(widthPct, 0.5)}%` }}
          onPointerDown={(e) => beginDrag('range', e)}
          title="Drag to move selection"
        >
          <button
            type="button"
            className={`${styles.handle} ${styles.start}`}
            aria-label="Selection start"
            title="Drag to set start time"
            onPointerDown={(e) => beginDrag('start', e)}
          />
          <button
            type="button"
            className={`${styles.handle} ${styles.end}`}
            aria-label="Selection end"
            title="Drag to set end time"
            onPointerDown={(e) => beginDrag('end', e)}
          />
        </div>
      </div>
      <p className="dim" style={{ fontSize: '0.8rem' }}>
        Drag the blue handles to trim. Preview follows forward and backward.
      </p>
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
    <label className={styles.timeField} title={`${label} time in seconds (or mm:ss.mmm)`}>
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
