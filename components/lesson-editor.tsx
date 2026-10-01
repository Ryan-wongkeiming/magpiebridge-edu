'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import VideoPlayer from '@/components/video-player'

interface LessonEditorProps {
  lesson: any
  onSave: (lesson: any) => void
  onCancel: () => void
}

interface VideoInfo {
  provider: string
  embedUrl: string | null
  watchUrl: string | null
  canEmbed: boolean
  reason?: string
  playlistId?: string
  metadata: {
    title?: string
    authorName?: string
    provider?: string
    thumbnailUrl?: string
    durationSeconds?: number
  }
}

export default function LessonEditor({ lesson, onSave, onCancel }: LessonEditorProps) {
  const [title, setTitle] = useState(lesson.title)
  const [contentType, setContentType] = useState(lesson.contentType || 'text')
  const [content, setContent] = useState(lesson.content || '')
  const [contentUrl, setContentUrl] = useState(lesson.contentUrl || '')
  const [required, setRequired] = useState(lesson.required)
  const [estimatedDuration, setEstimatedDuration] = useState(lesson.estimatedDuration || '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [videoInfo, setVideoInfo] = useState<VideoInfo | null>(null)
  const [checking, setChecking] = useState(false)

  const isVideo = contentType === 'video'

  // Debounced lookup so the instructor sees the result while typing or pasting.
  useEffect(() => {
    if (!isVideo || !contentUrl || contentUrl.length < 12) {
      setVideoInfo(null)
      setChecking(false)
      return
    }

    const timer = setTimeout(async () => {
      try {
        setChecking(true)
        const response = await fetch(
          `/api/video/metadata?url=${encodeURIComponent(contentUrl)}`
        )
        if (response.ok) {
          setVideoInfo(await response.json())
        } else {
          setVideoInfo(null)
        }
      } catch {
        setVideoInfo(null)
      } finally {
        setChecking(false)
      }
    }, 600)

    return () => clearTimeout(timer)
  }, [contentUrl, isVideo])

  const handleSave = async () => {
    if (isVideo && videoInfo && !videoInfo.canEmbed && !videoInfo.watchUrl) {
      setError('That video address could not be read. Check the URL and try again.')
      return
    }

    try {
      setSaving(true)
      setError('')

      // Prefer the canonical watch URL so the stored value is stable even if
      // the instructor pasted a short or embed-style link.
      const urlToStore = isVideo && videoInfo?.watchUrl ? videoInfo.watchUrl : contentUrl

      const response = await fetch(`/api/lessons/${lesson.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          content,
          contentType,
          contentUrl: urlToStore,
          required,
          estimatedDuration: estimatedDuration ? parseInt(estimatedDuration) : null,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        onSave(data)
      } else {
        setError(data.error || 'Failed to save lesson')
      }
    } catch (err) {
      setError('Failed to save lesson')
    } finally {
      setSaving(false)
    }
  }

  const applySuggestedTitle = () => {
    if (videoInfo?.metadata.title) {
      setTitle(videoInfo.metadata.title)
    }
  }

  const applySuggestedDuration = () => {
    const seconds = videoInfo?.metadata.durationSeconds
    if (seconds) {
      setEstimatedDuration(String(Math.max(1, Math.round(seconds / 60))))
    }
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <div className="flex">
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">{error}</h3>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Lesson Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          {isVideo && videoInfo?.metadata.title && videoInfo.metadata.title !== title && (
            <button
              type="button"
              onClick={applySuggestedTitle}
              className="mt-1 text-sm text-indigo-600 hover:underline"
            >
              Use the video&apos;s own title: “{videoInfo.metadata.title}”
            </button>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Content Type</label>
          <select
            value={contentType}
            onChange={(e) => setContentType(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="text">Text</option>
            <option value="video">Video</option>
            <option value="document">Document</option>
            <option value="external">External Resource</option>
          </select>
        </div>

        {contentType === 'text' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Lesson Content</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={15}
              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
              placeholder="Enter your lesson content here..."
            />
            <p className="mt-1 text-sm text-gray-500">
              You can use Markdown syntax for formatting.
            </p>
          </div>
        )}

        {(contentType === 'video' || contentType === 'document' || contentType === 'external') && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {contentType === 'video'
                ? 'Video URL'
                : contentType === 'document'
                  ? 'Document URL'
                  : 'Resource URL'}
            </label>
            <input
              type="text"
              value={contentUrl}
              onChange={(e) => setContentUrl(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder={
                contentType === 'video'
                  ? 'https://www.youtube.com/watch?v=...'
                  : `Enter the ${contentType} URL`
              }
            />
            <p className="mt-1 text-sm text-gray-500">
              {contentType === 'video'
                ? 'Paste a YouTube or Vimeo link exactly as it appears in your browser. It will be converted for playback automatically.'
                : contentType === 'document'
                  ? 'Enter a Google Drive, Dropbox, or other document URL'
                  : 'Enter the external resource URL'}
            </p>

            {isVideo && checking && (
              <p className="mt-2 text-sm text-gray-500">Checking the video link…</p>
            )}

            {isVideo && videoInfo && !checking && (
              <div
                className={
                  videoInfo.canEmbed
                    ? 'mt-3 rounded-md border border-green-200 bg-green-50 p-3 text-sm'
                    : 'mt-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm'
                }
              >
                {videoInfo.canEmbed ? (
                  <>
                    <p className="font-medium text-green-800">
                      Ready to play inside the platform.
                    </p>
                    <p className="mt-1 text-green-700">
                      Source: {videoInfo.provider}
                      {videoInfo.metadata.authorName
                        ? ` · ${videoInfo.metadata.authorName}`
                        : ''}
                      {videoInfo.playlistId ? ' · includes a playlist' : ''}
                    </p>
                  </>
                ) : (
                  <>
                    <p className="font-medium text-amber-800">Cannot be embedded.</p>
                    <p className="mt-1 text-amber-700">
                      {videoInfo.reason ?? 'This source does not allow embedding.'}
                    </p>
                  </>
                )}
              </div>
            )}

            {isVideo && videoInfo?.canEmbed && (
              <div className="mt-4">
                <p className="mb-2 text-sm font-medium text-gray-700">Preview</p>
                <VideoPlayer url={contentUrl} title={title} />
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Required</label>
            <div className="flex items-center">
              <input
                type="checkbox"
                checked={required}
                onChange={(e) => setRequired(e.target.checked)}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              />
              <span className="ml-2 text-sm text-gray-600">
                Learners must complete this lesson
              </span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Estimated Duration (minutes)
            </label>
            <input
              type="number"
              value={estimatedDuration}
              onChange={(e) => setEstimatedDuration(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="e.g., 15"
            />
            {isVideo && videoInfo?.metadata.durationSeconds ? (
              <button
                type="button"
                onClick={applySuggestedDuration}
                className="mt-1 text-sm text-indigo-600 hover:underline"
              >
                Use the video&apos;s length: {Math.round(videoInfo.metadata.durationSeconds / 60)}{' '}
                minutes
              </button>
            ) : null}
          </div>
        </div>
      </div>

      <div className="flex justify-end space-x-3">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={saving || checking}>
          {saving ? 'Saving...' : 'Save Lesson'}
        </Button>
      </div>
    </div>
  )
}
