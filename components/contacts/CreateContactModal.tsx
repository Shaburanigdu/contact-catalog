'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Plus } from 'lucide-react';

interface CreateContactModalProps {
  onSuccess?: () => void;
  triggerButton?: React.ReactNode;
}

export default function CreateContactModal({ 
  onSuccess, 
  triggerButton 
}: CreateContactModalProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    middle_name: '',
    nickname: '',
    email: '',
    phone: '',
    phone_secondary: '',
    website: '',
    gender: '',
    date_of_birth: '',
    country: '',
    city: '',
    address: '',
    postal_code: '',
    company: '',
    job_title: '',
    department: '',
    relationship_type: 'friend',
    relationship_level: '5',
    trust_level: '5',
    how_we_met: '',
    met_date: '',
    met_location: '',
    personal_notes: '',
    interests: '',
    important_facts: '',
    avatar_url: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const addTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Подготовка данных
      const dataToSend = {
        ...formData,
        relationship_level: formData.relationship_level ? parseInt(formData.relationship_level) : null,
        trust_level: formData.trust_level ? parseInt(formData.trust_level) : null,
        tags: tags,
        interests: formData.interests ? JSON.parse(formData.interests) : null,
        important_facts: formData.important_facts ? JSON.parse(formData.important_facts) : null,
      };

      const response = await fetch('/api/contacts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dataToSend),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Ошибка при создании контакта');
      }

      toast({
        title: 'Контакт создан!',
        description: 'Контакт успешно добавлен в вашу базу.',
      });

      setOpen(false);
      setFormData({
        first_name: '',
        last_name: '',
        middle_name: '',
        nickname: '',
        email: '',
        phone: '',
        phone_secondary: '',
        website: '',
        gender: '',
        date_of_birth: '',
        country: '',
        city: '',
        address: '',
        postal_code: '',
        company: '',
        job_title: '',
        department: '',
        relationship_type: 'friend',
        relationship_level: '5',
        trust_level: '5',
        how_we_met: '',
        met_date: '',
        met_location: '',
        personal_notes: '',
        interests: '',
        important_facts: '',
        avatar_url: '',
      });
      setTags([]);

      // Обновляем страницу или вызываем callback
      if (onSuccess) {
        onSuccess();
      } else {
        router.refresh();
      }
    } catch (error) {
      console.error('Error creating contact:', error);
      toast({
        title: 'Ошибка',
        description: error instanceof Error ? error.message : 'Не удалось создать контакт',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {triggerButton || (
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Добавить контакт
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Создание нового контакта</DialogTitle>
          <DialogDescription>
            Заполните информацию о новом контакте. Поля, отмеченные *, обязательны для заполнения.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6 py-4">
          {/* Раздел 1: Основная информация */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Основная информация</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="first_name">Имя *</Label>
                <Input
                  id="first_name"
                  name="first_name"
                  value={formData.first_name}
                  onChange={handleChange}
                  required
                  placeholder="Иван"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="last_name">Фамилия</Label>
                <Input
                  id="last_name"
                  name="last_name"
                  value={formData.last_name}
                  onChange={handleChange}
                  placeholder="Иванов"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="middle_name">Отчество</Label>
                <Input
                  id="middle_name"
                  name="middle_name"
                  value={formData.middle_name}
                  onChange={handleChange}
                  placeholder="Иванович"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="nickname">Псевдоним</Label>
                <Input
                  id="nickname"
                  name="nickname"
                  value={formData.nickname}
                  onChange={handleChange}
                  placeholder="Ваня"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="gender">Пол</Label>
                <Select
                  value={formData.gender}
                  onValueChange={(value) => handleSelectChange('gender', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите пол" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Мужской</SelectItem>
                    <SelectItem value="female">Женский</SelectItem>
                    <SelectItem value="other">Другой</SelectItem>
                    <SelectItem value="prefer_not_to_say">Не указывать</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="date_of_birth">Дата рождения</Label>
              <Input
                id="date_of_birth"
                name="date_of_birth"
                type="date"
                value={formData.date_of_birth}
                onChange={handleChange}
              />
            </div>
          </div>

          {/* Раздел 2: Контактная информация */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Контактная информация</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="ivan@example.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Телефон</Label>
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="+7 (999) 123-45-67"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone_secondary">Дополнительный телефон</Label>
                <Input
                  id="phone_secondary"
                  name="phone_secondary"
                  type="tel"
                  value={formData.phone_secondary}
                  onChange={handleChange}
                  placeholder="+7 (999) 765-43-21"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="website">Веб-сайт</Label>
                <Input
                  id="website"
                  name="website"
                  type="url"
                  value={formData.website}
                  onChange={handleChange}
                  placeholder="https://example.com"
                />
              </div>
            </div>
          </div>

          {/* Раздел 3: Местоположение */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Местоположение</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="country">Страна</Label>
                <Input
                  id="country"
                  name="country"
                  value={formData.country}
                  onChange={handleChange}
                  placeholder="Россия"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="city">Город</Label>
                <Input
                  id="city"
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  placeholder="Москва"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="postal_code">Почтовый индекс</Label>
                <Input
                  id="postal_code"
                  name="postal_code"
                  value={formData.postal_code}
                  onChange={handleChange}
                  placeholder="123456"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="address">Адрес</Label>
              <Input
                id="address"
                name="address"
                value={formData.address}
                onChange={handleChange}
                placeholder="ул. Примерная, д. 1, кв. 2"
              />
            </div>
          </div>

          {/* Раздел 4: Работа */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Работа</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="company">Компания</Label>
                <Input
                  id="company"
                  name="company"
                  value={formData.company}
                  onChange={handleChange}
                  placeholder="ООО Пример"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="job_title">Должность</Label>
                <Input
                  id="job_title"
                  name="job_title"
                  value={formData.job_title}
                  onChange={handleChange}
                  placeholder="Менеджер"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="department">Отдел</Label>
                <Input
                  id="department"
                  name="department"
                  value={formData.department}
                  onChange={handleChange}
                  placeholder="Отдел продаж"
                />
              </div>
            </div>
          </div>

          {/* Раздел 5: Отношения */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Отношения</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="relationship_type">Тип отношений</Label>
                <Select
                  value={formData.relationship_type}
                  onValueChange={(value) => handleSelectChange('relationship_type', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите тип" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="friend">Друг</SelectItem>
                    <SelectItem value="family">Семья</SelectItem>
                    <SelectItem value="colleague">Коллега</SelectItem>
                    <SelectItem value="acquaintance">Знакомый</SelectItem>
                    <SelectItem value="business">Деловой партнер</SelectItem>
                    <SelectItem value="other">Другое</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="relationship_level">Уровень близости (1-10)</Label>
                <Select
                  value={formData.relationship_level}
                  onValueChange={(value) => handleSelectChange('relationship_level', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите уровень" />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => (
                      <SelectItem key={num} value={num.toString()}>{num}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="trust_level">Уровень доверия (1-10)</Label>
                <Select
                  value={formData.trust_level}
                  onValueChange={(value) => handleSelectChange('trust_level', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите уровень" />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => (
                      <SelectItem key={num} value={num.toString()}>{num}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Раздел 6: Знакомство */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Знакомство</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="how_we_met">Как познакомились</Label>
                <Textarea
                  id="how_we_met"
                  name="how_we_met"
                  value={formData.how_we_met}
                  onChange={handleChange}
                  placeholder="Расскажите, как вы познакомились..."
                  rows={3}
                />
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="met_date">Дата знакомства</Label>
                  <Input
                    id="met_date"
                    name="met_date"
                    type="date"
                    value={formData.met_date}
                    onChange={handleChange}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="met_location">Место знакомства</Label>
                  <Input
                    id="met_location"
                    name="met_location"
                    value={formData.met_location}
                    onChange={handleChange}
                    placeholder="Кафе, конференция, университет..."
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Раздел 7: Теги */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Теги</h3>
            <div className="space-y-2">
              <div className="flex gap-2">
                <Input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  placeholder="Добавить тег"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addTag();
                    }
                  }}
                />
                <Button type="button" onClick={addTag} variant="outline">
                  Добавить
                </Button>
              </div>
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {tags.map(tag => (
                    <div
                      key={tag}
                      className="flex items-center gap-1 bg-secondary text-secondary-foreground px-3 py-1 rounded-full text-sm"
                    >
                      <span>{tag}</span>
                      <button
                        type="button"
                        onClick={() => removeTag(tag)}
                        className="ml-1 text-xs hover:text-destructive"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Раздел 8: Заметки */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Заметки</h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="personal_notes">Личные заметки</Label>
                <Textarea
                  id="personal_notes"
                  name="personal_notes"
                  value={formData.personal_notes}
                  onChange={handleChange}
                  placeholder="Ваши личные заметки о человеке..."
                  rows={4}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="interests">Интересы (JSON)</Label>
                  <Textarea
                    id="interests"
                    name="interests"
                    value={formData.interests}
                    onChange={handleChange}
                    placeholder='["спорт", "кино", "путешествия"]'
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="important_facts">Важные факты (JSON)</Label>
                  <Textarea
                    id="important_facts"
                    name="important_facts"
                    value={formData.important_facts}
                    onChange={handleChange}
                    placeholder='{"аллергия": "на арахис", "любимый_цвет": "синий"}'
                    rows={3}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Раздел 9: Аватар */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Аватар</h3>
            <div className="space-y-2">
              <Label htmlFor="avatar_url">URL аватара</Label>
              <Input
                id="avatar_url"
                name="avatar_url"
                type="url"
                value={formData.avatar_url}
                onChange={handleChange}
                placeholder="https://example.com/avatar.jpg"
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Отмена
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {loading ? 'Создание...' : 'Создать контакт'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}