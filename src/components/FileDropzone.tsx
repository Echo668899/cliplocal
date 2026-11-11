import { useCallback, useState, type DragEvent } from 'react'
import styles from './FileDropzone.module.css'

type Props = {
  accept?: string
  multiple?: boolean
  label?: string
  hint?: string
  onFiles: (files: File[]) => void
  compact?: boolean
}

export function FileDropzone({
  accept = 'video/*,audio/*,image/*,.srt,.vtt,.ass',
  multiple = false,
  label = 'Choose video',
  hint = 'Or drop a file here',
  onFiles,
  compact,
}: Props) {
  const [dragging, setDragging] = useState(false)

  const handleFiles = useCallback(
    (list: FileList | null) => {
      if (!list?.length) return
      onFiles(Array.from(list))
    },
    [onFiles],
  )

  const onDrop = (e: DragEvent) => {
    e.preventDefault()
    setDragging(false)
    handleFiles(e.dataTransfer.files)
  }

  return (
    <div
      className={`${styles.zone} ${dragging ? styles.dragging : ''} ${compact ? styles.compact : ''}`}
      onDragEnter={(e) => {
        e.preventDefault()
        setDragging(true)
      }}
      onDragOver={(e) => e.preventDefault()}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
    >
      <label className={styles.label}>
        <input
          className="sr-only"
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={(e) => handleFiles(e.target.files)}
        />
        <span className={`btn btn-primary ${styles.cta}`}>{label}</span>
      </label>
      <p className={styles.hint}>{hint}</p>
    </div>
  )
}
