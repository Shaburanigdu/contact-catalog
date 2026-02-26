// types/timeline.ts
export interface TimelineMedia {
  id: string;
  type: 'media';
  mediaType: string; // 'image', 'video', 'audio', 'document'
  url: string;
  thumbnailUrl?: string;
  caption?: string;
  fileName: string;
  fileSize: number;
  createdAt: string;
}

export interface TimelineNote {
  id: string;
  type: 'note';
  content: string;
  createdAt: string;
}

export interface TimelineReminder {
  id: string;
  type: 'reminder';
  title: string;
  description?: string;
  dueAt: string;
  createdAt: string;
}

export type TimelineItem = TimelineMedia | TimelineNote | TimelineReminder;