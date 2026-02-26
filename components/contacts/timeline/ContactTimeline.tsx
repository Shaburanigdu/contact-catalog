'use client'

import { useEffect, useState, useRef } from 'react'
import { TimelineItem } from '@/types/timeline'
import { TimelineMessage } from './TimelineMessage'
import { TimelineInput } from './TimelineInput'
import { ScrollArea } from '@/components/ui/scroll-area'
import { api } from '@/lib/api-client'
import { Loader2 } from 'lucide-react'

interface ContactTimelineProps {
  contactId: string
  contactName: string
  contactAvatar?: string
}

export function ContactTimeline({ contactId, contactName, contactAvatar }: ContactTimelineProps) {
  const [items, setItems] = useState<TimelineItem[]>([])
  const [loading, setLoading] = useState(true)
  const scrollRef = useRef<HTMLDivElement>(null)

  const fetchTimeline = async () => {
    setLoading(true)
    try {
      const result = await api.get<{ success: boolean; data: TimelineItem[] }>(
        `/api/contacts/${contactId}/timeline`
      )
      if (result.success) {
        setItems([...result.data].reverse())
      }
    } catch (error) {
      console.error('Failed to fetch timeline:', error)
    } finally {
      setLoading(false)
    }
  }

  // Скролл вниз при загрузке и обновлении
  useEffect(() => {
    if (!loading && scrollRef.current) {
      const scrollArea = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]')
      if (scrollArea) {
        scrollArea.scrollTop = scrollArea.scrollHeight
      }
    }
  }, [items, loading])

  useEffect(() => {
    fetchTimeline()
  }, [contactId])

  const handleNewItem = () => {
    fetchTimeline()
  }

  return (
    <div className="flex flex-col h-[600px] border rounded-lg bg-white shadow-sm">
      <div className="p-4 border-b">
        <h3 className="font-semibold text-lg">Лента воспоминаний</h3>
      </div>
      <ScrollArea ref={scrollRef} className="flex-1 p-4">
        {loading ? (
          <div className="flex justify-center items-center h-full">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : items.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            Пока нет записей. Добавьте фото, заметку или напоминание.
          </div>
        ) : (
          <div className="space-y-4">
            {items.map((item) => (
              <TimelineMessage
                key={item.id}
                item={item}
                contactName={contactName}
                contactAvatar={contactAvatar}
              />
            ))}
          </div>
        )}
      </ScrollArea>
      <TimelineInput contactId={contactId} onNewItem={handleNewItem} />
    </div>
  )
}