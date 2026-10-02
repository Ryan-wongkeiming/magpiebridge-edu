'use client'

import { useEffect, useState } from 'react'
import VideoPlayer from '@/components/video-player'

interface LessonPreviewProps {
  lesson: any
  /** Called as a video is watched, with the furthest point reached. */
  onProgress?: (info: {
    watchedSeconds: number
    durationSeconds: number
    percent: number
  }) => void
  /** Furthest point already recorded, used to resume and show progress. */
  initialWatchedSeconds?: number
}

/**
 * Convert a stored contentUrl into a route that serves the file through a
 * presigned GET URL. The storage bucket is private, so the raw contentUrl is
 * not directly readable. Uploaded files live under `uploads/...`; external
 * URLs (YouTube, Google Drive, etc.) are left untouched.
 */
function fileAccessUrl(contentUrl: string): string {
  if (contentUrl.includes('/uploads/')) {
    const key = contentUrl.split('/uploads/')[1]
    return `/api/files/${encodeURIComponent(key)}`
  }
  return contentUrl
}

export default function LessonPreview({
  lesson,
  onProgress,
  initialWatchedSeconds = 0,
}: LessonPreviewProps) {
  const [renderedContent, setRenderedContent] = useState('')

  useEffect(() => {
    // Simple markdown rendering for preview
    if (lesson.contentType === 'text' && lesson.content) {
      // Convert markdown to HTML for preview
      const html = lesson.content
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/^# (.*$)/gm, '<h2>$1</h2>')
        .replace(/^- (.*$)/gm, '<li>$1</li>')
        .replace(/(<li>.*<\/li>)+/g, '<ul>$&</ul>')
        .replace(/\n/g, '<br>')
      setRenderedContent(html)
    }
  }, [lesson])

  if (lesson.contentType === 'video' && lesson.contentUrl) {
    return (
      <VideoPlayer
        url={lesson.contentUrl}
        title={lesson.title}
        onProgress={onProgress}
        initialWatchedSeconds={initialWatchedSeconds}
      />
    )
  }

  if (lesson.contentType === 'document' && lesson.contentUrl) {
    return (
      <div className="bg-gray-100 rounded-lg p-8 text-center">
        <div className="text-4xl mb-4">📄</div>
        <h3 className="text-lg font-medium mb-2">Document</h3>
        <p className="text-gray-600 mb-4">This lesson contains a document.</p>
        <a 
          href={fileAccessUrl(lesson.contentUrl)} 
          target="_blank" 
          rel="noopener noreferrer"
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200"
        >
          Open Document
        </a>
      </div>
    )
  }

  if (lesson.contentType === 'image' && lesson.contentUrl) {
    return (
      <div className="bg-gray-100 rounded-lg p-8 text-center">
        <div className="text-4xl mb-4">🖼️</div>
        <h3 className="text-lg font-medium mb-2">Image</h3>
        <p className="text-gray-600 mb-4">This lesson contains an image.</p>
        <img 
          src={fileAccessUrl(lesson.contentUrl)} 
          alt={lesson.title}
          className="max-w-full h-auto rounded-lg mb-4"
        />
        <p className="text-xs text-muted-foreground">
          {lesson.contentUrl.split('/').pop()}
        </p>
      </div>
    )
  }

  if (lesson.contentType === 'external' && lesson.contentUrl) {
    return (
      <div className="bg-gray-100 rounded-lg p-8 text-center">
        <div className="text-4xl mb-4">🔗</div>
        <h3 className="text-lg font-medium mb-2">External Resource</h3>
        <p className="text-gray-600 mb-4">This lesson contains an external resource.</p>
        <a 
          href={lesson.contentUrl} 
          target="_blank" 
          rel="noopener noreferrer"
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200"
        >
          Open Resource
        </a>
      </div>
    )
  }

  return (
    <div className="prose max-w-none">
      <h1 className="text-2xl font-bold mb-4">{lesson.title}</h1>
      {lesson.contentType === 'text' && renderedContent ? (
        <div dangerouslySetInnerHTML={{ __html: renderedContent }} />
      ) : (
        <p className="text-gray-500 italic">No content available for preview.</p>
      )}
    </div>
  )
}