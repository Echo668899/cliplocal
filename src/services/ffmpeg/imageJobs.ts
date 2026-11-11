export function buildContactSheetArgs(
  input: string,
  output: string,
  opts: { interval: number; columns: number; width: number },
): string[] {
  // Select frames every N seconds and tile into a contact sheet
  return [
    '-hide_banner',
    '-y',
    '-i',
    input,
    '-vf',
    `fps=1/${Math.max(0.5, opts.interval)},scale=${opts.width}:-1,tile=${opts.columns}x${opts.columns}`,
    '-frames:v',
    '1',
    output,
  ]
}

export function buildImageSequenceArgs(
  pattern: string,
  output: string,
  fps = 24,
): string[] {
  return [
    '-hide_banner',
    '-y',
    '-framerate',
    String(fps),
    '-i',
    pattern,
    '-c:v',
    'libx264',
    '-pix_fmt',
    'yuv420p',
    '-movflags',
    '+faststart',
    output,
  ]
}

export function buildExtractTrackArgs(
  input: string,
  output: string,
  map: string,
  codecCopy = true,
): string[] {
  const args = ['-hide_banner', '-y', '-i', input, '-map', map]
  if (codecCopy) args.push('-c', 'copy')
  else args.push('-c:v', 'libx264', '-c:a', 'aac')
  args.push(output)
  return args
}
