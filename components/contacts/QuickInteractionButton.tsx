'use client';

import { useState } from 'react';
import { api } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, TrendingUp, Shield } from 'lucide-react';
import { InteractionTypeCombobox } from './InteractionTypeCombobox';

interface QuickInteractionButtonProps {
  contactId: string;
  onSuccess?: () => void;
}

export function QuickInteractionButton({ contactId, onSuccess }: QuickInteractionButtonProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    interaction_type_id: '',
    duration_minutes: '',
    mood_before: '3',
    mood_after: '3',
    importance: '2',
    relationship_level_delta: 0,
    trust_level_delta: 0,
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleDeltaChange = (field: 'relationship_level_delta' | 'trust_level_delta', delta: number) => {
    setFormData(prev => ({ ...prev, [field]: Math.max(-5, Math.min(5, prev[field] + delta)) }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post(`/api/contacts/${contactId}/interactions`, {
        title: formData.title || 'Взаимодействие',
        description: formData.description,
        started_at: new Date().toISOString(),
        interaction_type_id: formData.interaction_type_id || null,
        duration_minutes: formData.duration_minutes ? parseInt(formData.duration_minutes) : null,
        mood_before: parseInt(formData.mood_before),
        mood_after: parseInt(formData.mood_after),
        importance: parseInt(formData.importance),
        relationship_level_delta: formData.relationship_level_delta,
        trust_level_delta: formData.trust_level_delta,
      });
      setOpen(false);
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error(error);
      alert('Ошибка при сохранении');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          + Отметить активность
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Новое взаимодействие</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Тип взаимодействия</Label>
              <InteractionTypeCombobox
                value={formData.interaction_type_id}
                onChange={(val) => setFormData(prev => ({ ...prev, interaction_type_id: val }))}
              />
            </div>
            <div>
              <Label>Длительность (минут)</Label>
              <Input type="number" name="duration_minutes" value={formData.duration_minutes} onChange={handleChange} placeholder="Необязательно" />
            </div>
          </div>

          <div>
            <Label>Заголовок</Label>
            <Input name="title" value={formData.title} onChange={handleChange} placeholder="Например: Звонок, Встреча..." />
          </div>

          <div>
            <Label>Описание / Заметки</Label>
            <Textarea name="description" value={formData.description} onChange={handleChange} rows={3} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Настроение до (1-10)</Label>
              <Input type="range" min="1" max="10" name="mood_before" value={formData.mood_before} onChange={handleChange} />
              <div className="text-center text-sm">{formData.mood_before}</div>
            </div>
            <div>
              <Label>Настроение после (1-10)</Label>
              <Input type="range" min="1" max="10" name="mood_after" value={formData.mood_after} onChange={handleChange} />
              <div className="text-center text-sm">{formData.mood_after}</div>
            </div>
            <div>
              <Label>Важность (1-3)</Label>
              <Input type="range" min="1" max="3" name="importance" value={formData.importance} onChange={handleChange} />
              <div className="text-center text-sm">{formData.importance}</div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2 border-t">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-4 w-4" />
                <Label>Изменение уровня отношений</Label>
              </div>
              <div className="flex items-center gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => handleDeltaChange('relationship_level_delta', -1)}>-1</Button>
                <span className="font-bold w-8 text-center">{formData.relationship_level_delta}</span>
                <Button type="button" variant="outline" size="sm" onClick={() => handleDeltaChange('relationship_level_delta', 1)}>+1</Button>
                <Button type="button" variant="outline" size="sm" onClick={() => handleDeltaChange('relationship_level_delta', -formData.relationship_level_delta)}>Сброс</Button>
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Shield className="h-4 w-4" />
                <Label>Изменение уровня доверия</Label>
              </div>
              <div className="flex items-center gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => handleDeltaChange('trust_level_delta', -1)}>-1</Button>
                <span className="font-bold w-8 text-center">{formData.trust_level_delta}</span>
                <Button type="button" variant="outline" size="sm" onClick={() => handleDeltaChange('trust_level_delta', 1)}>+1</Button>
                <Button type="button" variant="outline" size="sm" onClick={() => handleDeltaChange('trust_level_delta', -formData.trust_level_delta)}>Сброс</Button>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Отмена</Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Сохранить
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}