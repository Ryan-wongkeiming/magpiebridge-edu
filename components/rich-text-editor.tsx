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