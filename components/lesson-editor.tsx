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

// Allowed upload types, mirrored from the server-side allow-list in
// app/api/upload/route.ts. Keep the two in sync.
const ALLOWED_UPLOAD_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'text/plain',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/csv',
  'text/xml',
]

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024

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

  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')

  const isVideo = contentType === 'video'
  const isUploadable = contentType === 'document' || contentType === 'image'

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

  const handleUpload = async (file: File) => {
    setUploading(true)
    setUploadError('')

    try {
      // Step 1: ask the server for a presigned PUT URL.
      const uploadResponse = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: file.name,
          contentType: file.type,
          fileSize: file.size,
        }),
      })

      const uploadData = await uploadResponse.json()
      if (!uploadResponse.ok) {
        throw new Error(uploadData.error || 'Failed to get upload URL')
      }

      // Step 2: PUT the file directly to storage using the presigned URL.
      const putResponse = await fetch(uploadData.uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
      })

      if (!putResponse.ok) {
        throw new Error('Failed to upload file to storage')
      }

      // Step 3: store the returned content URL on the lesson.
      setContentUrl(uploadData.contentUrl)
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!ALLOWED_UPLOAD_TYPES.includes(file.type)) {
      setUploadError(`File type ${file.type} is not allowed`)
      return
    }

    if (file.size > MAX_UPLOAD_BYTES) {
      setUploadError('File size exceeds the 10MB limit')
      return
    }

    handleUpload(file)
  }

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
            <option value="image">Image</option>
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

        {(contentType === 'video' || contentType === 'document' || contentType === 'image' || contentType === 'external') && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {contentType === 'video'
                ? 'Video URL'
                : contentType === 'document'
                  ? 'Document URL'
                  : contentType === 'image'
                    ? 'Image URL'
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
                  ? 'Enter a Google Drive, Dropbox, or other document URL, or upload a file below.'
                  : contentType === 'image'
                    ? 'Enter an image URL, or upload a file below.'
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

            {isUploadable && (
              <div className="mt-4 rounded-md border border-gray-200 p-4">
                <p className="mb-2 text-sm font-medium text-gray-700">Or upload a file</p>
                <input
                  type="file"
                  accept=".txt,.pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif,.webp,.csv,.xml"
                  onChange={handleFileChange}
                  disabled={uploading}
                  className="block w-full text-sm text-gray-600 file:mr-3 file:rounded-md file:border-0 file:bg-indigo-50 file:px-3 file:py-2 file:text-sm file:font-medium file:text-indigo-700 hover:file:bg-indigo-100"
                />
                {uploading && (
                  <p className="mt-2 text-sm text-gray-500">Uploading…</p>
                )}
                {uploadError && (
                  <p className="mt-2 text-sm text-red-600">{uploadError}</p>
                )}
                {contentUrl && !uploading && (
                  <p className="mt-2 text-sm text-gray-500">
                    Currently using: {contentUrl.split('/').pop()}
                  </p>
                )}
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
        <Button onClick={handleSave} disabled={saving || checking || uploading}>
          {saving ? 'Saving...' : 'Save Lesson'}
        </Button>
      </div>
    </div>
  )
}
