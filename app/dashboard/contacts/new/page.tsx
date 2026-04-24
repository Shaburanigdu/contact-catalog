'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Save,
  Loader2,
  Home,
  X,
  Plus,
  Upload,
  Tag as TagIcon,
  Palette,
  Settings,
} from 'lucide-react';
import { api } from '@/lib/api-client';
import { RelationshipTypeCombobox } from '@/components/contacts/RelationshipTypeCombobox'; // <-- импорт


interface Tag {
  id: string;
  name: string;
  color: string;
  is_system: boolean;
}

interface ContactFormData {
  first_name: string;
  last_name: string;
  middle_name: string;
  nickname: string;
  email: string;
  phone: string;
  phone_secondary: string;
  website: string;
  gender: string;
  date_of_birth: string;
  country: string;
  city: string;
  address: string;
  postal_code: string;
  company: string;
  job_title: string;
  department: string;
  relationship_type: string;
  relationship_level: string;
  trust_level: string;
  how_we_met: string;
  met_date: string;
  met_location: string;
  personal_notes: string;
  interests: string[];
  important_facts: string[];
  avatar_url: string;
  tags: string[];
}

interface TagsResponse {
  success: boolean;
  data?: { tags: Tag[] };
  error?: string;
}

interface CreateTagResponse {
  success: boolean;
  data?: { tag: Tag };
  error?: string;
}

interface CreateContactResponse {
  success: boolean;
  data?: any;
  error?: string;
}

const COLOR_PALETTE = [
  { value: '#3B82F6', textColor: 'white' },  // blue-600
  { value: '#EF4444', textColor: 'white' },  // red-500
  { value: '#10B981', textColor: 'white' },  // emerald-500
  { value: '#F59E0B', textColor: 'black' },  // amber-500
  { value: '#8B5CF6', textColor: 'white' },  // violet-500
  { value: '#EC4899', textColor: 'white' },  // pink-500
  { value: '#6366F1', textColor: 'white' },  // indigo-500
  { value: '#14B8A6', textColor: 'black' },  // teal-500
  { value: '#F97316', textColor: 'black' },  // orange-500
  { value: '#84CC16', textColor: 'black' },  // lime-500
  { value: '#06B6D4', textColor: 'black' },  // cyan-500
  { value: '#059669', textColor: 'white' },  // green-600
  { value: '#D946EF', textColor: 'white' },  // fuchsia-500
  { value: '#0EA5E9', textColor: 'white' },  // sky-500
  { value: '#64748B', textColor: 'white' },  // slate-500
];

export default function NewContactPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [showNewTagForm, setShowNewTagForm] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState(COLOR_PALETTE[0].value);
  const [interestInput, setInterestInput] = useState('');
  const [factInput, setFactInput] = useState('');

  const [formData, setFormData] = useState<ContactFormData>({
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
    relationship_type: 'Друг',
    relationship_level: '5',
    trust_level: '5',
    how_we_met: '',
    met_date: '',
    met_location: '',
    personal_notes: '',
    interests: [],
    important_facts: [],
    avatar_url: '',
    tags: [],
  });

  useEffect(() => {
    fetchTags();
  }, []);

  const fetchTags = async () => {
    try {
      const result = await api.get<TagsResponse>('/api/tags');
      if (result.success) {
        setAvailableTags(result.data?.tags || []);
      }
    } catch (error) {
      console.error('Error fetching tags:', error);
      // Заглушка с тестовыми данными
      setAvailableTags([
        { id: '1', name: 'Семья', color: '#EF4444', is_system: true },
        { id: '2', name: 'Друзья', color: '#3B82F6', is_system: true },
        { id: '3', name: 'Коллеги', color: '#10B981', is_system: true },
        { id: '4', name: 'Важные', color: '#F59E0B', is_system: true },
        { id: '5', name: 'Хобби', color: '#8B5CF6', is_system: false },
        { id: '6', name: 'Спорт', color: '#EC4899', is_system: false },
      ]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingAvatar(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();
      if (result.success) {
        setFormData(prev => ({ ...prev, avatar_url: result.data.url }));
      }
    } catch (error) {
      console.error('Error uploading avatar:', error);
      alert('Ошибка при загрузке фото');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleTagToggle = (tagId: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.includes(tagId)
        ? prev.tags.filter(id => id !== tagId)
        : [...prev.tags, tagId]
    }));
  };

  const createNewTag = async () => {
    if (!newTagName.trim()) return;

    try {
      const result = await api.post<CreateTagResponse>('/api/tags', {
        name: newTagName,
        color: newTagColor,
      });
      if (result.success && result.data) {
        const newTag = result.data.tag;
        setAvailableTags(prev => [...prev, newTag]);
        setFormData(prev => ({ ...prev, tags: [...prev.tags, newTag.id] }));
        setNewTagName('');
        setShowNewTagForm(false);
      } else {
        throw new Error(result.error || 'Ошибка при создании тега');
      }
    } catch (error) {
      console.error('Error creating tag:', error);
      alert(error instanceof Error ? error.message : 'Ошибка при создании тега');
    }
  };

  const addInterest = () => {
    if (interestInput.trim()) {
      setFormData(prev => ({
        ...prev,
        interests: [...prev.interests, interestInput.trim()]
      }));
      setInterestInput('');
    }
  };

  const removeInterest = (index: number) => {
    setFormData(prev => ({
      ...prev,
      interests: prev.interests.filter((_, i) => i !== index)
    }));
  };

  const addFact = () => {
    if (factInput.trim()) {
      setFormData(prev => ({
        ...prev,
        important_facts: [...prev.important_facts, factInput.trim()]
      }));
      setFactInput('');
    }
  };

  const removeFact = (index: number) => {
    setFormData(prev => ({
      ...prev,
      important_facts: prev.important_facts.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const result = await api.post<CreateContactResponse>('/api/contacts', {
        ...formData,
        relationship_level: formData.relationship_level ? parseInt(formData.relationship_level) : null,
        trust_level: formData.trust_level ? parseInt(formData.trust_level) : null,
        interests: formData.interests,
        important_facts: formData.important_facts,
      });

      if (!result.success) {
        throw new Error(result.error || 'Ошибка при создании контакта');
      }

      alert('Контакт успешно создан!');
      router.push('/dashboard/contacts');
      router.refresh();
    } catch (error) {
      console.error('Error creating contact:', error);
      alert(error instanceof Error ? error.message : 'Не удалось создать контакт');
    } finally {
      setLoading(false);
    }
  };

  const getTextColor = (bgColor: string) => {
    const r = parseInt(bgColor.slice(1, 3), 16);
    const g = parseInt(bgColor.slice(3, 5), 16);
    const b = parseInt(bgColor.slice(5, 7), 16);
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness > 128 ? 'black' : 'white';
  };

  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4">
            <Link
              href="/dashboard"
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors p-2 rounded-lg hover:bg-gray-100"
              title="На главную"
            >
              <Home size={25} />
              <span className="hidden sm:inline">{/*На главную*/}</span>
            </Link>
            <Link
              href="/dashboard/contacts"
              className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800"
            >
              <ArrowLeft size={20} />
              Назад к контактам
            </Link>
          </div>
        </div>
        <h1 className="text-2xl md:text-3xl font-bold">Создание нового контакта</h1>
        <p className="text-gray-600 mt-2">Заполните подробную информацию о контакте</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8 bg-white p-6 rounded-lg shadow">
        {/* Основная информация */}
        <div>
          <h3 className="text-lg font-medium mb-4">Основная информация</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium mb-2">
                Имя <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="first_name"
                value={formData.first_name}
                onChange={handleChange}
                required
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Иван"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Фамилия</label>
              <input
                type="text"
                name="last_name"
                value={formData.last_name}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Иванов"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Отчество</label>
              <input
                type="text"
                name="middle_name"
                value={formData.middle_name}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Иванович"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Псевдоним</label>
              <input
                type="text"
                name="nickname"
                value={formData.nickname}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Ваня"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Пол</label>
              <select
                name="gender"
                value={formData.gender}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Не указан</option>
                <option value="male">Мужской</option>
                <option value="female">Женский</option>
                <option value="other">Другой</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Дата рождения</label>
              <input
                type="date"
                name="date_of_birth"
                value={formData.date_of_birth}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Контактная информация */}
        <div>
          <h3 className="text-lg font-medium mb-4">Контактная информация</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium mb-2">Email</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="ivan@example.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Телефон</label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="+7 (999) 123-45-67"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Доп. телефон</label>
              <input
                type="tel"
                name="phone_secondary"
                value={formData.phone_secondary}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="+7 (999) 765-43-21"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Веб-сайт</label>
              <input
                type="url"
                name="website"
                value={formData.website}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="https://example.com"
              />
            </div>
          </div>
        </div>

        {/* Адрес и работа */}
        <div>
          <h3 className="text-lg font-medium mb-4">Адрес и работа</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium mb-2">Страна</label>
              <input
                type="text"
                name="country"
                value={formData.country}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Россия"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Город</label>
              <input
                type="text"
                name="city"
                value={formData.city}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Москва"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Адрес</label>
              <input
                type="text"
                name="address"
                value={formData.address}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="ул. Примерная, д. 1"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Почтовый индекс</label>
              <input
                type="text"
                name="postal_code"
                value={formData.postal_code}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="123456"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Компания</label>
              <input
                type="text"
                name="company"
                value={formData.company}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="ООО Пример"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Должность</label>
              <input
                type="text"
                name="job_title"
                value={formData.job_title}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Менеджер"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Отдел</label>
              <input
                type="text"
                name="department"
                value={formData.department}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Отдел продаж"
              />
            </div>
          </div>
        </div>

        {/* Отношения и знакомство */}
        <div>
          <h3 className="text-lg font-medium mb-4">Отношения и знакомство</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium mb-2">Тип отношений</label>
              <RelationshipTypeCombobox
                value={formData.relationship_type}
                onChange={(value) => setFormData(prev => ({ ...prev, relationship_type: value }))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Уровень отношений (1-10)</label>
              <input
                type="range"
                name="relationship_level"
                min="1"
                max="10"
                value={formData.relationship_level}
                onChange={handleChange}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-600">
                <span>1</span>
                <span>5</span>
                <span>10</span>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Уровень доверия (1-10)</label>
              <input
                type="range"
                name="trust_level"
                min="1"
                max="10"
                value={formData.trust_level}
                onChange={handleChange}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-600">
                <span>1</span>
                <span>5</span>
                <span>10</span>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Как познакомились</label>
              <input
                type="text"
                name="how_we_met"
                value={formData.how_we_met}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="В университете"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Дата знакомства</label>
              <input
                type="date"
                name="met_date"
                value={formData.met_date}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Место знакомства</label>
              <input
                type="text"
                name="met_location"
                value={formData.met_location}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Москва, университет"
              />
            </div>
          </div>
        </div>

        {/* Теги */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium">Теги</h3>
            <Link
              href="/dashboard/tags"
              className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
            >
              <Settings className="h-4 w-4" />
              Управление тегами
            </Link>
          </div>
          <div className="mb-4">
            <div className="flex flex-wrap gap-2 mb-3">
              {formData.tags.map(tagId => {
                const tag = availableTags.find(t => t.id === tagId);
                if (!tag) return null;
                const textColor = getTextColor(tag.color);
                return (
                  <div
                    key={tag.id}
                    className="inline-flex items-center px-3 py-1 rounded-full text-sm transition-all"
                    style={{ 
                      backgroundColor: tag.color,
                      color: textColor
                    }}
                  >
                    <TagIcon size={12} className="mr-1" />
                    {tag.name}
                    <button
                      type="button"
                      className="ml-2 hover:opacity-80"
                      onClick={() => handleTagToggle(tag.id)}
                    >
                      <X size={12} />
                    </button>
                  </div>
                );
              })}
            </div>
            
            <div className="space-y-3">
              <label className="block text-sm font-medium">Выберите теги:</label>
              <div className="flex flex-wrap gap-2">
                {availableTags.map(tag => {
                  const textColor = getTextColor(tag.color);
                  const isSelected = formData.tags.includes(tag.id);
                  return (
                    <button
                      type="button"
                      key={tag.id}
                      onClick={() => handleTagToggle(tag.id)}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                        isSelected ? 'ring-2 ring-offset-2 ring-blue-500' : ''
                      }`}
                      style={{ 
                        backgroundColor: tag.color,
                        color: textColor
                      }}
                    >
                      <TagIcon size={14} />
                      {tag.name}
                    </button>
                  );
                })}
              </div>
            </div>
            
            <button
              type="button"
              onClick={() => setShowNewTagForm(!showNewTagForm)}
              className="mt-4 flex items-center gap-2 text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              <Plus size={16} />
              {showNewTagForm ? 'Скрыть форму создания тега' : 'Создать новый тег'}
            </button>
            
            {showNewTagForm && (
              <div className="mt-4 p-4 border border-gray-200 rounded-lg bg-gray-50">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Название тега <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={newTagName}
                      onChange={(e) => setNewTagName(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2"
                      placeholder="Название тега"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Цвет тега <span className="text-red-500">*</span>
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {COLOR_PALETTE.map(color => (
                        <button
                          type="button"
                          key={color.value}
                          onClick={() => setNewTagColor(color.value)}
                          className={`w-8 h-8 rounded-full transition-transform ${
                            newTagColor === color.value ? 'ring-2 ring-offset-2 ring-blue-500 scale-110' : ''
                          }`}
                          style={{ backgroundColor: color.value }}
                          title={color.value}
                        />
                      ))}
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <Palette size={16} className="text-gray-500" />
                      <span className="text-sm text-gray-600">Выбран: {newTagColor}</span>
                    </div>
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={createNewTag}
                    disabled={!newTagName.trim()}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    <Plus size={16} />
                    Создать тег
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowNewTagForm(false);
                      setNewTagName('');
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100"
                  >
                    Отмена
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Интересы и важные факты */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium mb-2">Интересы</label>
            <div className="space-y-2">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={interestInput}
                  onChange={(e) => setInterestInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addInterest())}
                  className="flex-1 border border-gray-300 rounded-lg px-4 py-2"
                  placeholder="Добавить интерес"
                />
                <button
                  type="button"
                  onClick={addInterest}
                  className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg"
                >
                  Добавить
                </button>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {formData.interests.map((interest, index) => (
                  <div
                    key={index}
                    className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                  >
                    {interest}
                    <button
                      type="button"
                      className="ml-2 hover:text-blue-600"
                      onClick={() => removeInterest(index)}
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Важные факты</label>
            <div className="space-y-2">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={factInput}
                  onChange={(e) => setFactInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addFact())}
                  className="flex-1 border border-gray-300 rounded-lg px-4 py-2"
                  placeholder="Добавить важный факт"
                />
                <button
                  type="button"
                  onClick={addFact}
                  className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg"
                >
                  Добавить
                </button>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {formData.important_facts.map((fact, index) => (
                  <div
                    key={index}
                    className="inline-flex items-center px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-sm"
                  >
                    {fact}
                    <button
                      type="button"
                      className="ml-2 hover:text-amber-600"
                      onClick={() => removeFact(index)}
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Аватар и заметки */}
        <div>
          <h3 className="text-lg font-medium mb-4">Фото и заметки</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium mb-2">Фото контакта</label>
              <div className="space-y-4">
                {formData.avatar_url && (
                  <div className="relative w-32 h-32">
                    <img
                      src={formData.avatar_url}
                      alt="Аватар"
                      className="w-full h-full object-cover rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, avatar_url: '' }))}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                    >
                      <X size={16} />
                    </button>
                  </div>
                )}
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg cursor-pointer">
                    <Upload size={18} />
                    Загрузить фото
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarUpload}
                      className="hidden"
                    />
                  </label>
                  {uploadingAvatar && (
                    <div className="flex items-center gap-2 text-gray-600">
                      <Loader2 className="animate-spin" size={18} />
                      Загрузка...
                    </div>
                  )}
                </div>
                <input
                  type="text"
                  name="avatar_url"
                  value={formData.avatar_url}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2"
                  placeholder="Или введите URL фото"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Личные заметки</label>
              <textarea
                name="personal_notes"
                value={formData.personal_notes}
                onChange={handleChange}
                rows={4}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Ваши личные заметки об этом человеке..."
              />
            </div>
          </div>
        </div>

        {/* Кнопки формы */}
        <div className="flex justify-end gap-4 pt-6 border-t">
          <Link
            href="/dashboard/contacts"
            className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Отмена
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin" size={20} />
                Создание...
              </>
            ) : (
              <>
                <Save size={20} />
                Создать контакт
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}