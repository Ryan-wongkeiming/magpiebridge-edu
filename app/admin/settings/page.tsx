'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface Setting {
  key: string
  category: string
  label: string
  description: string
  type: 'string' | 'number' | 'boolean'
  value: string | number | boolean
}

const CATEGORY_LABELS: Record<string, string> = {
  general: 'General',
  learning: 'Learning',
  certificates: 'Certificates',
  notifications: 'Notifications',
}

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<Setting[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const router = useRouter()
  const { data: session, status } = useSession()

  useEffect(() => {
    if (status === 'loading') return

    if (!session?.user?.roles?.includes('admin')) {
      router.push('/dashboard')
      return
    }

    fetchSettings()
  }, [session, status])

  const fetchSettings = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/settings')
      const data = await response.json()

      if (response.ok) {
        setSettings(data.settings)
        setCategories(data.categories)
      } else {
        setError(data.error || 'Failed to load settings')
      }
    } catch (err) {
      setError('Failed to load settings')
    } finally {
      setLoading(false)
    }
  }

  const updateValue = (key: string, value: string | number | boolean) => {
    setSettings((prev) => prev.map((s) => (s.key === key ? { ...s, value } : s)))
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      setError('')
      setMessage('')

      const payload: Record<string, string | number | boolean> = {}
      for (const s of settings) payload[s.key] = s.value

      const response = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await response.json()

      if (response.ok) {
        setSettings(data.settings)
        setMessage(`Saved ${data.updated} setting${data.updated === 1 ? '' : 's'}.`)
      } else {
        setError(data.error || 'Failed to save settings')
      }
    } catch (err) {
      setError('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  if (status === 'loading' || loading) {
    return <div className="container py-8">Loading settings…</div>
  }

  return (
    <div className="container py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Platform Settings</h1>
        <p className="text-muted-foreground mt-1">
          Configure how the platform behaves. Changes apply immediately.
        </p>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-4 text-sm text-red-800">{error}</div>
      )}
      {message && (
        <div className="rounded-md bg-green-50 p-4 text-sm text-green-800">{message}</div>
      )}

      {categories.map((category) => (
        <Card key={category}>
          <CardHeader>
            <CardTitle>{CATEGORY_LABELS[category] ?? category}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {settings
              .filter((s) => s.category === category)
              .map((setting) => (
                <div key={setting.key} className="space-y-2">
                  <Label htmlFor={setting.key}>{setting.label}</Label>
                  <p className="text-sm text-muted-foreground">{setting.description}</p>

                  {setting.type === 'boolean' ? (
                    <div className="flex items-center gap-3">
                      <input
                        id={setting.key}
                        type="checkbox"
                        checked={Boolean(setting.value)}
                        onChange={(e) => updateValue(setting.key, e.target.checked)}
                        className="h-4 w-4"
                      />
                      <span className="text-sm">
                        {setting.value ? 'Enabled' : 'Disabled'}
                      </span>
                    </div>
                  ) : (
                    <Input
                      id={setting.key}
                      type={setting.type === 'number' ? 'number' : 'text'}
                      value={String(setting.value)}
                      onChange={(e) =>
                        updateValue(
                          setting.key,
                          setting.type === 'number'
                            ? Number(e.target.value)
                            : e.target.value
                        )
                      }
                      className="max-w-md"
                    />
                  )}
                </div>
              ))}
          </CardContent>
        </Card>
      ))}

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? 'Saving…' : 'Save settings'}
        </Button>
      </div>
    </div>
  )
}
