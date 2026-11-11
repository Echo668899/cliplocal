export type ToolMeta = {
  slug: string
  title: string
  h1: string
  description: string
  accept?: string
  multiple?: boolean
  steps?: string[]
}

export const TOOLS: ToolMeta[] = [
  {
    slug: 'trim',
    title: 'Trim video online',
    h1: 'Trim a video',
    description: 'Choose start and end times, preview the selection, and export a shorter MP4 on this device.',
    steps: ['Choose a video', 'Set start and end', 'Export or open in editor'],
  },
  {
    slug: 'compress',
    title: 'Compress video',
    h1: 'Compress a video',
    description: 'Lower bitrate or resolution to shrink file size. Target size is estimated before export.',
    steps: ['Choose a video', 'Pick CRF or target size', 'Compress and download'],
  },
  {
    slug: 'merge',
    title: 'Merge videos',
    h1: 'Merge videos',
    description: 'Combine multiple local clips into one file. Optionally unify resolution and frame rate.',
    steps: ['Choose two or more videos', 'Optionally unify size/fps', 'Merge and download'],
  },
  {
    slug: 'mute',
    title: 'Mute video',
    h1: 'Remove audio from a video',
    description: 'Export a silent copy while keeping the picture. Fast path copies video when compatible.',
  },
  {
    slug: 'extract-audio',
    title: 'Extract audio',
    h1: 'Extract audio from video',
    description: 'Pull the soundtrack into MP3, AAC, or WAV without uploading.',
  },
  {
    slug: 'add-subtitles',
    title: 'Add subtitles',
    h1: 'Add subtitles to a video',
    description: 'Import SRT/VTT/ASS, adjust timing, burn in text, then export from the editor.',
  },
  {
    slug: 'video-to-gif',
    title: 'Video to GIF',
    h1: 'Convert video to GIF',
    description: 'Pick a short range and export an animated GIF with palette optimization.',
  },
  {
    slug: 'crop',
    title: 'Crop & reframe',
    h1: 'Crop and reframe',
    description: 'Crop freely or lock to 16:9, 9:16, 1:1, or 4:5. Fit with pad or fill by cropping.',
  },
  {
    slug: 'speed',
    title: 'Change speed',
    h1: 'Change video speed',
    description: 'Speed up, slow down, or reverse a clip, then export a new file.',
  },
  {
    slug: 'rotate',
    title: 'Rotate & flip',
    h1: 'Rotate or flip a video',
    description: 'Fix orientation with 90° steps or mirror the frame horizontally or vertically.',
  },
  {
    slug: 'screenshot',
    title: 'Screenshot from video',
    h1: 'Capture a frame',
    description: 'Grab a still image at an exact timestamp from your local video.',
  },
  {
    slug: 'probe',
    title: 'Media info (ffprobe)',
    h1: 'Inspect media info',
    description: 'Read duration, size, codecs, streams, and metadata with a local FFmpeg probe.',
  },
  {
    slug: 'contact-sheet',
    title: 'Thumbnail contact sheet',
    h1: 'Make a thumbnail sheet',
    description: 'Sample frames at an interval and tile them into a single PNG contact sheet.',
  },
  {
    slug: 'strip-metadata',
    title: 'Strip metadata',
    h1: 'Remove clearable metadata',
    description: 'Copy streams into a new file with map_metadata -1 on this device.',
  },
  {
    slug: 'resize',
    title: 'Resize video',
    h1: 'Resize a video',
    description: 'Change width and height, then continue in the editor to export.',
  },
  {
    slug: 'convert',
    title: 'Convert video format',
    h1: 'Convert container or codec',
    description: 'Change output container settings in the editor Export panel, then export locally.',
  },
  {
    slug: 'add-music',
    title: 'Add music to video',
    h1: 'Add background music',
    description: 'Attach a local audio file as BGM, set volumes, then export from the editor.',
  },
  {
    slug: 'reverse',
    title: 'Reverse video',
    h1: 'Reverse a video',
    description: 'Play a clip backwards and export the reversed result.',
  },
]

export function getTool(slug: string) {
  return TOOLS.find((t) => t.slug === slug)
}
