'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Loader2, Plus, Trash2, Users } from 'lucide-react';
import { api } from '@/lib/api-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface ContactSummary {
  id: string;
  first_name: string;
  last_name: string | null;
  avatar_url: string | null;
}

interface Relationship {
  id: string;
  relationshipType: string;
  notes: string | null;
  contact: ContactSummary;
}

const SUGGESTED_TYPES = ['Супруг(а)', 'Брат/сестра', 'Родитель', 'Ребёнок', 'Друг', 'Коллега', 'Партнёр'];

function fullName(c: ContactSummary) {
  return [c.first_name, c.last_name].filter(Boolean).join(' ');
}

function Avatar({ contact }: { contact: ContactSummary }) {
  if (contact.avatar_url) {
    return <img src={contact.avatar_url} alt="" className="h-9 w-9 rounded-full object-cover" />;
  }
  return (
    <div className="h-9 w-9 rounded-full bg-blue-100 flex items-center justify-center text-sm font-semibold text-blue-600">
      {contact.first_name?.[0]}
      {contact.last_name?.[0]}
    </div>
  );
}

export function ContactRelationships({ contactId, contactName }: { contactId: string; contactName: string }) {
  const [items, setItems] = useState<Relationship[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  // dialog state
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ContactSummary[]>([]);
  const [target, setTarget] = useState<ContactSummary | null>(null);
  const [type, setType] = useState('');
  const [reciprocal, setReciprocal] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    try {
      const res = await api.get<{ success: boolean; data: Relationship[] }>(
        `/api/contacts/${contactId}/relationships`
      );
      if (res.success) setItems(res.data);
    } catch (e) {
      console.error('Failed to load relationships:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contactId]);

  // Debounced contact search inside the dialog
  useEffect(() => {
    if (!open || target) return;
    const handle = setTimeout(async () => {
      try {
        const params = new URLSearchParams({ limit: '8' });
        if (query.trim()) params.set('search', query.trim());
        const res = await api.get<{ success: boolean; data: { contacts: ContactSummary[] } }>(
          `/api/contacts?${params}`
        );
        if (res.success) setResults(res.data.contacts.filter((c) => c.id !== contactId));
      } catch (e) {
        console.error('Contact search failed:', e);
      }
    }, 250);
    return () => clearTimeout(handle);
  }, [query, open, target, contactId]);

  const resetDialog = () => {
    setQuery('');
    setResults([]);
    setTarget(null);
    setType('');
    setReciprocal('');
    setError(null);
  };

  const save = async () => {
    if (!target || !type.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await api.post(`/api/contacts/${contactId}/relationships`, {
        targetContactId: target.id,
        relationshipType: type.trim(),
        reciprocalRelationship: reciprocal.trim() || null,
      });
      setOpen(false);
      resetDialog();
      await load();
    } catch (e: any) {
      setError(e?.message || 'Не удалось сохранить связь');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (relationshipId: string) => {
    if (!confirm('Удалить эту связь?')) return;
    try {
      await api.delete(`/api/contacts/${contactId}/relationships?relationshipId=${relationshipId}`);
      setItems((prev) => prev.filter((r) => r.id !== relationshipId));
    } catch (e) {
      console.error('Failed to delete relationship:', e);
    }
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-gray-500" />
            Связи
          </CardTitle>
          <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Добавить
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
            </div>
          ) : items.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-2">
              Пока нет связей с другими контактами.
            </p>
          ) : (
            <ul className="divide-y">
              {items.map((r) => (
                <li key={r.id} className="flex items-center gap-3 py-2">
                  <Avatar contact={r.contact} />
                  <div className="flex-1 min-w-0">
                    <Link
                      href={`/dashboard/contacts/${r.contact.id}`}
                      className="font-medium text-sm hover:underline truncate block"
                    >
                      {fullName(r.contact)}
                    </Link>
                    <p className="text-xs text-gray-500">{r.relationshipType}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-red-500 hover:text-red-700"
                    onClick={() => remove(r.id)}
                    aria-label="Удалить связь"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={open}
        onOpenChange={(v) => {
          setOpen(v);
          if (!v) resetDialog();
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Новая связь для «{contactName}»</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Контакт</Label>
              {target ? (
                <div className="flex items-center gap-3 rounded-md border p-2">
                  <Avatar contact={target} />
                  <span className="flex-1 text-sm font-medium">{fullName(target)}</span>
                  <Button variant="ghost" size="sm" onClick={() => setTarget(null)}>
                    Изменить
                  </Button>
                </div>
              ) : (
                <>
                  <Input
                    autoFocus
                    placeholder="Начните вводить имя"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                  <div className="max-h-48 overflow-y-auto rounded-md border divide-y">
                    {results.length === 0 ? (
                      <p className="p-2 text-sm text-gray-500">Ничего не найдено</p>
                    ) : (
                      results.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          className="flex w-full items-center gap-3 p-2 text-left hover:bg-gray-50"
                          onClick={() => setTarget(c)}
                        >
                          <Avatar contact={c} />
                          <span className="text-sm">{fullName(c)}</span>
                        </button>
                      ))
                    )}
                  </div>
                </>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="rel-type">
                Кем {target ? fullName(target) : 'он(а)'} приходится контакту «{contactName}»
              </Label>
              <Input
                id="rel-type"
                list="relationship-suggestions"
                placeholder="Например: сестра"
                value={type}
                onChange={(e) => setType(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="rel-reciprocal">Обратная связь (необязательно)</Label>
              <Input
                id="rel-reciprocal"
                list="relationship-suggestions"
                placeholder="Например: брат"
                value={reciprocal}
                onChange={(e) => setReciprocal(e.target.value)}
              />
            </div>
            <datalist id="relationship-suggestions">
              {SUGGESTED_TYPES.map((t) => (
                <option key={t} value={t} />
              ))}
            </datalist>

            {error && <p className="text-sm text-red-600">{error}</p>}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Отмена
            </Button>
            <Button onClick={save} disabled={!target || !type.trim() || saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Сохранить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
