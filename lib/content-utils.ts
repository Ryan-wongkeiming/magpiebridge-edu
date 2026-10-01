// Utility functions for processing lesson content

export function processMarkdown(markdown: string): string {
  // Convert markdown to HTML
  return markdown
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/^# (.*$)/gm, '<h2>$1</h2>')
    .replace(/^## (.*$)/gm, '<h3>$1</h3>')
    .replace(/^- (.*$)/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>)+/g, '<ul>$&</ul>')
    .replace(/\n/g, '<br>')
}

export function validateUrl(url: string): boolean {
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

export function detectContentType(url: string): string {
  if (!url) return 'text'
  
  const lowerUrl = url.toLowerCase()
  
  if (lowerUrl.includes('youtube.com') || lowerUrl.includes('youtu.be') || lowerUrl.includes('vimeo.com')) {
    return 'video'
  }
  
  if (lowerUrl.endsWith('.pdf') || lowerUrl.includes('drive.google.com') || lowerUrl.includes('dropbox.com')) {
    return 'document'
  }
  
  return 'external'
}