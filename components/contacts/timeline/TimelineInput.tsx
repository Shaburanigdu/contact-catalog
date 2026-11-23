'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Paperclip, Send, Bell, X } from 'lucide-react'
import { DatePicker } from '@/components/ui/date-picker'
import { api } from '@/lib/api-client'
import { toast } from '@/components/ui/toast'
import { REPEAT_OPTIONS } from '@/lib/recurrence'

interface TimelineInputProps {
  contactId: string
  onNewItem: () => void
}

export function TimelineInput({ contactId, onNewItem }: TimelineInputProps) {
  const [message, setMessage] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [uploading, setUploading] = useState(false)
  const [showReminder, setShowReminder] = useState(false)
  const [reminderTitle, setReminderTitle] = useState('')
  const [reminderDate, setReminderDate] = useState<Date>()
  const [reminderRepeat, setReminderRepeat] = useState<string>('none')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files))
    }
  }

  const removeFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index))
  }

  const uploadFiles = async (): Promise<string[]> => {
    if (files.length === 0) return []
    setUploading(true)
    try {
      const uploadedUrls: string[] = []
      for (const file of files) {
        const formData = new FormData()
        formData.append('file', file)
        const uploadRes = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
          credentials: 'include',
        })
        if (!uploadRes.ok) throw new Error('Upload failed')
        const uploadData = await uploadRes.json()
        if (uploadData.success) {
          await api.post(`/api/contacts/${contactId}/media`, {
            url: uploadData.data.url,
            thumbnailUrl: uploadData.data.thumbnailUrl,
            fileName: uploadData.data.fileName,
            mimeType: uploadData.data.mimeType,
            size: uploadData.data.size,
            caption: message || '',
          })
          uploadedUrls.push(uploadData.data.url)
        }
      }
      return uploadedUrls
    } catch (error) {
      console.error('Error uploading files:', error)
      toast.error('Ошибка при загрузке файлов')
      return []
    } finally {
      setUploading(false)
    }
  }

  const handleSendMessage = async () => {
    if (!message.trim() && files.length === 0 && !showReminder) return

    try {
      if (files.length > 0) {
        await uploadFiles()
        setFiles([])
        setMessage('')
        onNewItem()
      } else if (showReminder && reminderTitle && reminderDate) {
        await api.post(`/api/contacts/${contactId}/reminders`, {
          title: reminderTitle,
          description: message,
          due_at: reminderDate.toISOString(),
          repeat: reminderRepeat,
        })
        setShowReminder(false)
        setReminderTitle('')
        setReminderDate(undefined)
        setReminderRepeat('none')
        setMessage('')
        onNewItem()
        toast.success('Напоминание создано')
      } else if (message.trim()) {
        await api.post(`/api/contacts/${contactId}/notes`, {
          content: message,
        })
        setMessage('')
        onNewItem()
      }
    } catch (error) {
      toast.error('Ошибка при отправке')
    }
  }

  return (
    <div className="border-t p-4 space-y-2 bg-gray-50 rounded-b-lg">
      {/* Предпросмотр файлов */}
      {files.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {files.map((file, index) => (
            <div key={index} className="relative bg-muted p-1 rounded flex items-center gap-1 pr-6">
              <span className="text-xs truncate max-w-[150px]">{file.name}</span>
              <button
                onClick={() => removeFile(index)}
                className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full p-0.5 hover:bg-destructive/90 transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Форма создания напоминания */}
      {showReminder && (
        <div className="space-y-2 p-3 border rounded bg-white">
          <Input
            placeholder="Название напоминания"
            value={reminderTitle}
            onChange={(e) => setReminderTitle(e.target.value)}
          />
          <DatePicker
            date={reminderDate}
            onSelect={setReminderDate}
            placeholder="Выберите дату"
          />
          <select
            aria-label="Повтор"
            value={reminderRepeat}
            onChange={(e) => setReminderRepeat(e.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            {REPEAT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Поле ввода и кнопки */}
      <div className="flex gap-2">
        <Textarea
          placeholder="Напишите заметку или подпись к медиа..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="min-h-[60px] resize-none"
        />
        <div className="flex flex-col gap-1">
          <input
            type="file"
            multiple
            accept="image/*"
            className="hidden"
            ref={fileInputRef}
            onChange={handleFileChange}
          />
          <Button
            variant="outline"
            size="icon"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="hover:bg-accent"
          >
            <Paperclip className="h-4 w-4" />
          </Button>
          <Button
            variant={showReminder ? 'default' : 'outline'}
            size="icon"
            onClick={() => setShowReminder(!showReminder)}
            className={showReminder ? 'bg-primary text-primary-foreground' : ''}
          >
            <Bell className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            onClick={handleSendMessage}
            disabled={uploading || (!message.trim() && files.length === 0 && !(showReminder && reminderTitle && reminderDate))}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}