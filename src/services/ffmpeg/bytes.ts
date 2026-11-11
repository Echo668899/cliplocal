/** Normalize ffmpeg output bytes for Blob construction under strict TS DOM types. */
export function toBlobPart(data: Uint8Array): BlobPart {
  const copy = new Uint8Array(data.byteLength)
  copy.set(data)
  return copy
}

export function bytesToBlob(data: Uint8Array, type?: string): Blob {
  return new Blob([toBlobPart(data)], type ? { type } : undefined)
}
