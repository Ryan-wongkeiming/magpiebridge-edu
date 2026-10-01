# MagpieBridge-Edu Lesson Content Editing Implementation

Date: 2026-09-22  
Author: Grok  
Job: NEXT-010  
Output path: outputs/LESSON_CONTENT_REPORT_2026-09-22.md

---

## 1. Overview

This document describes the lesson content editing features implementation for MagpieBridge-Edu. The lesson content editor allows instructors and admins to create rich, engaging lesson content with support for text, images, videos, and other multimedia elements.

## 2. Current Authentication Setup

The application uses Auth.js/NextAuth.js with:
- Email/password authentication via credentials provider
- OAuth providers (Google, Microsoft) as planned extensions
- Database-backed sessions
- Role-based access control

## 3. Lesson Content Editing Workflow

### Access Lesson Editor
1. Instructor or admin navigates to course editor
2. User selects a lesson to edit
3. System loads lesson content in the editor
4. User can switch between content types (text, video, document)

### Edit Text Content
1. User types or pastes content in the rich text editor
2. User can format text with bold, italic, lists, links, etc.
3. User can insert images and files
4. Changes are saved automatically or on demand

### Add Multimedia Content
1. User selects "Video" or "Document" content type
2. User provides URL or uploads file
3. System validates and stores content reference
4. Preview is displayed in the editor

### Preview and Publish
1. User clicks "Preview" to see lesson as learners will
2. User reviews content for accuracy and presentation
3. User saves or publishes the lesson
4. Lesson becomes available to enrolled learners

## 4. Implementation Details

### Database Schema Integration

The existing database schema includes the Lesson model with support for multiple content types:

#### Lesson Model
```prisma
model Lesson {
  id              String   @id @default(cuid())
  moduleId        String
  title           String
  content         String?  // Lesson content (Markdown, HTML, etc.)
  contentType     String   @default("text") // text, video, document, etc.
  contentUrl      String?  // URL for external content or file reference
  sortOrder       Int
  required        Boolean  @default(true)
  estimatedDuration Int?   // in minutes
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  module          Module   @relation(fields: [moduleId], references: [id], onDelete: Cascade)
  lessonProgress  LessonProgress[]
}
```

### API Routes

#### Get Lesson Endpoint
`GET /api/lessons/[id]`

```typescript
// app/api/lessons/[id]/route.ts
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authConfig } from '@/auth.config'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authConfig)
    
    const lesson = await prisma.lesson.findUnique({
      where: { id: params.id },
      include: {
        module: {
          include: {
            course: true
          }
        }
      }
    })
    
    if (!lesson) {
      return NextResponse.json({ error: 'Lesson not found' }, { status: 404 })
    }
    
    // Check if user can view this lesson
    const canView = lesson.module.course.status === 'published' || 
      (session?.user && (
        lesson.module.course.authorId === session.user.id ||
        lesson.module.course.managerId === session.user.id ||
        session.user.roles?.includes('admin')
      ))
    
    if (!canView) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    
    return NextResponse.json(lesson)
  } catch (error) {
    console.error('Get lesson error:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authConfig)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const lesson = await prisma.lesson.findUnique({
      where: { id: params.id },
      include: {
        module: {
          include: {
            course: true
          }
        }
      }
    })
    
    if (!lesson) {
      return NextResponse.json({ error: 'Lesson not found' }, { status: 404 })
    }
    
    // Check if user can edit this lesson
    const canEdit = lesson.module.course.authorId === session.user.id ||
      lesson.module.course.managerId === session.user.id ||
      session.user.roles?.includes('admin')
    
    if (!canEdit) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    
    const { title, content, contentType, contentUrl, required, estimatedDuration } = await request.json()
    
    const updatedLesson = await prisma.lesson.update({
      where: { id: params.id },
      data: {
        title,
        content,
        contentType,
        contentUrl,
        required,
        estimatedDuration,
        updatedAt: new Date()
      }
    })
    
    return NextResponse.json(updatedLesson)
  } catch (error) {
    console.error('Update lesson error:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
```

### Frontend Components

#### Lesson Editor Component
`components/lesson-editor.tsx`

```typescript
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'

interface LessonEditorProps {
  lesson: any
  onSave: (lesson: any) => void
  onCancel: () => void
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

  const handleSave = async () => {
    try {
      setSaving(true)
      const response = await fetch(`/api/lessons/${lesson.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          content,
          contentType,
          contentUrl,
          required,
          estimatedDuration: estimatedDuration ? parseInt(estimatedDuration) : null
        })
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
              {contentType === 'video' ? 'Video URL' : 
               contentType === 'document' ? 'Document URL' : 
               'Resource URL'}
            </label>
            <input
              type="url"
              value={contentUrl}
              onChange={(e) => setContentUrl(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder={`Enter the ${contentType} URL`}
            />
            <p className="mt-1 text-sm text-gray-500">
              {contentType === 'video' ? 'Enter a YouTube, Vimeo, or other video URL' : 
               contentType === 'document' ? 'Enter a Google Drive, Dropbox, or other document URL' : 
               'Enter the external resource URL'}
            </p>
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Estimated Duration (minutes)</label>
            <input
              type="number"
              value={estimatedDuration}
              onChange={(e) => setEstimatedDuration(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="e.g., 15"
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end space-x-3">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save Lesson'}
        </Button>
      </div>
    </div>
  )
}
```

#### Rich Text Editor Component
`components/rich-text-editor.tsx`

```typescript
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'

interface RichTextEditorProps {
  value: string
  onChange: (value: string) => void
}

export default function RichTextEditor({ value, onChange }: RichTextEditorProps) {
  const [content, setContent] = useState(value)

  const handleBold = () => {
    const selection = window.getSelection()
    if (selection && selection.toString()) {
      const selectedText = selection.toString()
      const newText = `${content.substring(0, selection.anchorOffset)}**${selectedText}**${content.substring(selection.focusOffset)}`
      setContent(newText)
      onChange(newText)
    }
  }

  const handleItalic = () => {
    const selection = window.getSelection()
    if (selection && selection.toString()) {
      const selectedText = selection.toString()
      const newText = `${content.substring(0, selection.anchorOffset)}*${selectedText}*${content.substring(selection.focusOffset)}`
      setContent(newText)
      onChange(newText)
    }
  }

  const handleHeading = () => {
    const selection = window.getSelection()
    if (selection && selection.toString()) {
      const selectedText = selection.toString()
      const newText = `${content.substring(0, selection.anchorOffset)}# ${selectedText}${content.substring(selection.focusOffset)}`
      setContent(newText)
      onChange(newText)
    }
  }

  const handleList = () => {
    const lines = content.split('\n')
    const newText = lines.map(line => `- ${line}`).join('\n')
    setContent(newText)
    onChange(newText)
  }

  return (
    <div className="border rounded-md">
      <div className="flex border-b bg-gray-50 p-2">
        <Button variant="ghost" size="sm" onClick={handleBold} title="Bold">
          <strong>B</strong>
        </Button>
        <Button variant="ghost" size="sm" onClick={handleItalic} title="Italic">
          <em>I</em>
        </Button>
        <Button variant="ghost" size="sm" onClick={handleHeading} title="Heading">
          H
        </Button>
        <Button variant="ghost" size="sm" onClick={handleList} title="Bullet List">
          •
        </Button>
      </div>
      <textarea
        value={content}
        onChange={(e) => {
          setContent(e.target.value)
          onChange(e.target.value)
        }}
        rows={15}
        className="w-full rounded-md border-0 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
        placeholder="Enter your content here..."
      />
      <div className="bg-gray-50 p-2 text-xs text-gray-500">
        Supports Markdown syntax. Use **bold**, *italic*, # heading, - list items.
      </div>
    </div>
  )
}
```

#### Lesson Preview Component
`components/lesson-preview.tsx`

```typescript
'use client'

import { useEffect, useState } from 'react'

interface LessonPreviewProps {
  lesson: any
}

export default function LessonPreview({ lesson }: LessonPreviewProps) {
  const [renderedContent, setRenderedContent] = useState('')

  useEffect(() => {
    // Simple markdown rendering for preview
    if (lesson.contentType === 'text' && lesson.content) {
      // Convert markdown to HTML for preview
      let html = lesson.content
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
      <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden">
        <iframe 
          src={lesson.contentUrl} 
          className="w-full h-full"
          title={lesson.title}
          allowFullScreen
        />
      </div>
    )
  }

  if (lesson.contentType === 'document' && lesson.contentUrl) {
    return (
      <div className="bg-gray-100 rounded-lg p-8 text-center">
        <div className="text-4xl mb-4">📄</div>
        <h3 className="text-lg font-medium mb-2">Document</h3>
        <p className="text-gray-600 mb-4">This lesson contains a document.</p>
        <a 
          href={lesson.contentUrl} 
          target="_blank" 
          rel="noopener noreferrer"
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200"
        >
          Open Document
        </a>
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
```

### Frontend Pages

#### Lesson Editor Page
`app/lessons/[id]/edit/page.tsx`

```typescript
'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import LessonEditor from '@/components/lesson-editor'
import LessonPreview from '@/components/lesson-preview'

export default function LessonEditorPage() {
  const [lesson, setLesson] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState('edit') // 'edit' or 'preview'
  const router = useRouter()
  const params = useParams()
  const { data: session, status } = useSession()

  useEffect(() => {
    if (status === 'loading') return
    
    if (!session) {
      router.push('/login')
      return
    }
    
    fetchLesson()
  }, [session, status])

  const fetchLesson = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/lessons/${params.id}`)
      const data = await response.json()
      
      if (response.ok) {
        setLesson(data)
      } else {
        setError(data.error || 'Failed to fetch lesson')
      }
    } catch (err) {
      setError('Failed to fetch lesson')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = (updatedLesson) => {
    setLesson(updatedLesson)
    // Show success message or redirect as needed
  }

  const handleCancel = () => {
    router.push(`/courses/${lesson?.module?.courseId}/edit`)
  }

  if (status === 'loading') {
    return <div className="flex justify-center items-center h-screen">Loading...</div>
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  if (!lesson) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Lesson Not Found</h2>
          <Button onClick={() => router.back()}>Go Back</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Editing: {lesson.title}</h1>
          <p className="text-gray-600 mt-1">
            Course: {lesson.module?.course?.title} • Module: {lesson.module?.title}
          </p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={() => setActiveTab(activeTab === 'edit' ? 'preview' : 'edit')}>
            {activeTab === 'edit' ? 'Preview' : 'Edit'}
          </Button>
          <Button onClick={handleCancel}>Back to Course</Button>
        </div>
      </div>

      {error && (
        <div className="mb-6 rounded-md bg-red-50 p-4">
          <div className="flex">
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">{error}</h3>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow">
        <div className="border-b">
          <nav className="flex">
            <button
              className={`py-4 px-6 text-sm font-medium ${
                activeTab === 'edit'
                  ? 'border-b-2 border-indigo-500 text-indigo-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setActiveTab('edit')}
            >
              Edit Content
            </button>
            <button
              className={`py-4 px-6 text-sm font-medium ${
                activeTab === 'preview'
                  ? 'border-b-2 border-indigo-500 text-indigo-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setActiveTab('preview')}
            >
              Preview
            </button>
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'edit' ? (
            <LessonEditor 
              lesson={lesson} 
              onSave={handleSave} 
              onCancel={handleCancel} 
            />
          ) : (
            <LessonPreview lesson={lesson} />
          )}
        </div>
      </div>
    </div>
  )
}
```

### Utility Functions

#### Content Processing Utilities
`lib/content-utils.ts`

```typescript
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
```

## 5. Security Considerations

### Content Sanitization
- Sanitize user-provided content to prevent XSS attacks
- Validate URLs for external content
- Escape HTML entities in text content

### Role-Based Access Control
- Only instructors and admins can edit lesson content
- Course ownership determines edit permissions
- Session validation on all content editing operations

### Data Validation
- Input validation on all API endpoints
- File type and size restrictions for uploads
- Proper error handling without revealing sensitive information

## 6. Database Integration

### Content Storage
1. Text content stored directly in the `content` field
2. External content URLs stored in the `contentUrl` field
3. Content type stored in the `contentType` field

### Content Updates
1. Changes are saved to the database on user action
2. Automatic saving can be implemented with debouncing
3. Version history can be added for content tracking

## 7. Testing

### Unit Tests
- Content processing and sanitization functions
- URL validation and content type detection
- API endpoint responses

### Integration Tests
- Full lesson editing workflow
- Content type switching
- Preview functionality
- Role-based access control

### Manual Testing
- End-to-end content editing experience
- Cross-browser compatibility
- Mobile responsiveness
- Accessibility validation

## 8. Customization Options

### Editor Extensions
- Rich text editor with toolbar
- Image and file upload support
- Code snippet highlighting
- Mathematical equation editor

### Content Types
- Interactive quizzes and assessments
- Embedded slideshows
- Audio content
- Downloadable resources

### Advanced Features
- Content versioning and history
- Collaborative editing
- Content scheduling
- Personalized learning paths

## 9. Troubleshooting

### Common Issues

1. **Content Not Saving**
   - Check network connectivity
   - Verify database connectivity
   - Check for validation errors

2. **Preview Not Rendering**
   - Check content format
   - Verify URLs are accessible
   - Check browser console for errors

3. **Permission Denied**
   - Check user roles
   - Verify course ownership
   - Ensure proper session management

### Debugging Steps
1. Check server logs
2. Verify database records
3. Test API endpoints individually
4. Validate user permissions
5. Check environment variables

## 10. Next Steps

After implementing lesson content editing features:

1. **Test Content Editing Workflow**: Verify all content types work correctly
2. **Implement Rich Text Editor**: Add a full-featured rich text editor
3. **Add Media Upload Support**: Implement file uploads for images and documents
4. **Enhance Preview Functionality**: Add more sophisticated content previews
5. **Implement Content Analytics**: Add basic content engagement tracking

This lesson content editing implementation provides instructors and admins with the tools they need to create engaging, multimedia-rich educational content, enhancing the overall learning experience in MagpieBridge-Edu.