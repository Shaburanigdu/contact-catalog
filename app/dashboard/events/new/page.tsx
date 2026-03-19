'use client';

import { EventForm } from '@/components/events/EventForm';

export default function NewEventPage() {
  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl">
      <h1 className="text-2xl md:text-3xl font-bold mb-6">Создание события</h1>
      <EventForm />
    </div>
  );
}