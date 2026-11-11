const urls = new Set<string>()

export function createManagedObjectUrl(blob: Blob): string {
  const url = URL.createObjectURL(blob)
  urls.add(url)
  return url
}

export function revokeManagedObjectUrl(url: string) {
  if (urls.has(url)) {
    URL.revokeObjectURL(url)
    urls.delete(url)
  }
}

export function clearAllObjectUrls() {
  for (const url of urls) URL.revokeObjectURL(url)
  urls.clear()
}
