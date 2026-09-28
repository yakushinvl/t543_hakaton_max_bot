import React, { useState, useRef } from 'react';
import type { CreateEventPayload } from '../../types/social';
import type { EventItem } from '../../types/event';
import type { UserProfile } from '../../types/user';
import { getAllEventCategories } from '../../config/categories.config';
import { CITIES } from '../../data/cities';
import { createCustomEvent } from '../../lib/api';
import { triggerHaptic } from '../../lib/maxBridge';
import {
  X,
  Calendar,
  Clock,
  MapPin,
  Image as ImageIcon,
  Plus,
  Sparkles,
  Upload,
  Link as LinkIcon,
  Tag,
  Lock,
} from 'lucide-react';
import './SocialScreen.css';

interface CreateEventModalProps {
  onClose: () => void;
  onCreated: (event: EventItem) => void;
  profile: UserProfile | null;
}

// Популярные готовые фото по тематикам
const PRESET_COVERS = [
  { id: 'party', label: 'Вечеринка', url: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=600&auto=format&fit=crop&q=80' },
  { id: 'concert', label: 'Музыка', url: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&auto=format&fit=crop&q=80' },
  { id: 'quiz', label: 'Квиз / Игры', url: 'https://images.unsplash.com/photo-1511578314322-379afb476865?w=600&auto=format&fit=crop&q=80' },
  { id: 'sport', label: 'Спорт / Йога', url: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=600&auto=format&fit=crop&q=80' },
  { id: 'walk', label: 'Прогулка', url: 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=600&auto=format&fit=crop&q=80' },
  { id: 'food', label: 'Кафе / Бранч', url: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=600&auto=format&fit=crop&q=80' },
  { id: 'cinema', label: 'Кино', url: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=600&auto=format&fit=crop&q=80' },
  { id: 'education', label: 'Митап / Лекция', url: 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=600&auto=format&fit=crop&q=80' },
];

export const CreateEventModal: React.FC<CreateEventModalProps> = ({
  onClose,
  onCreated,
  profile,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const categories = getAllEventCategories();
  const [category, setCategory] = useState(categories[0]?.id || 'concert');

  const [date, setDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  });
  const [time, setTime] = useState('19:00');
  const [place, setPlace] = useState('');

  // Фотографии
  const [selectedPhotos, setSelectedPhotos] = useState<string[]>([PRESET_COVERS[0].url]);
  const [photoInputUrl, setPhotoInputUrl] = useState('');
  const [showUrlInput, setShowUrlInput] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [loading, setLoading] = useState(false);

  const city = CITIES.find((c) => c.slug === profile?.citySlug) || CITIES[0];

  // Добавление фото из пресетов
  const handleSelectPreset = (url: string) => {
    triggerHaptic('selection');
    if (!selectedPhotos.includes(url)) {
      setSelectedPhotos((prev) => [...prev, url]);
    } else {
      // Сделать главной (первой)
      setSelectedPhotos((prev) => [url, ...prev.filter((p) => p !== url)]);
    }
  };

  // Удаление фото
  const handleRemovePhoto = (urlToRemove: string) => {
    triggerHaptic('light');
    setSelectedPhotos((prev) => prev.filter((p) => p !== urlToRemove));
  };

  // Загрузка фото с устройства
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          triggerHaptic('light');
          setSelectedPhotos((prev) => [reader.result as string, ...prev]);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Добавление фото по URL
  const handleAddPhotoByUrl = () => {
    if (photoInputUrl.trim()) {
      triggerHaptic('light');
      setSelectedPhotos((prev) => [photoInputUrl.trim(), ...prev]);
      setPhotoInputUrl('');
      setShowUrlInput(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !place.trim()) {
      alert('Пожалуйста, заполните название и место встречи!');
      return;
    }

    setLoading(true);
    triggerHaptic('medium');

    const eventDate = new Date(`${date}T${time}:00`);
    const mainCover = selectedPhotos[0] || PRESET_COVERS[0].url;

    // Свои мероприятия всегда закрытые (доступны только по реферальной ссылке)
    const payload: CreateEventPayload = {
      title: title.trim(),
      description: description.trim() || 'Встреча единомышленников, организованная пользователем через MAX.',
      category,
      date: eventDate.toISOString(),
      time,
      place: place.trim(),
      lon: city.lon + (Math.random() - 0.5) * 0.03,
      lat: city.lat + (Math.random() - 0.5) * 0.03,
      citySlug: city.slug,
      isPrivate: true, // Всегда только по ссылке
      requiresRegistration: false,
      image: mainCover,
      images: selectedPhotos,
      price: 'Только по приглашению',
    };

    try {
      const created = await createCustomEvent(payload, {
        id: profile?.id || 'me',
        name: profile?.name || 'Организатор',
      });
      triggerHaptic('success');
      onCreated(created);
      onClose();
    } catch {
      alert('Ошибка при создании встречи. Попробуйте еще раз.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="social-modal-overlay" onClick={onClose}>
      <div className="social-modal-sheet" onClick={(e) => e.stopPropagation()}>
        {/* Заголовок */}
        <div className="modal-header-light">
          <div>
            <span className="create-badge-pill">
              <Sparkles size={13} />
              <span>Своё мероприятие</span>
            </span>
            <h3 className="modal-title-light">Создать встречу</h3>
          </div>
          <button className="btn-close-light" onClick={onClose} aria-label="Закрыть">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="create-event-clean-form">
          {/* Фотки мероприятия */}
          <div className="form-clean-section">
            <div className="section-label-row">
              <label className="clean-label">
                <ImageIcon size={14} />
                <span>Фотографии встречи</span>
              </label>
              <span className="clean-hint">{selectedPhotos.length} выбрано</span>
            </div>

            {/* Галерея выбранных фото */}
            <div className="photos-preview-strip">
              {selectedPhotos.map((url, idx) => (
                <div key={idx} className="photo-thumb-wrap">
                  <img src={url} alt={`Фото ${idx + 1}`} className="photo-thumb-img" />
                  {idx === 0 && <span className="photo-main-tag">Обложка</span>}
                  <button
                    type="button"
                    className="btn-remove-photo"
                    onClick={() => handleRemovePhoto(url)}
                    aria-label="Удалить фото"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}

              {/* Кнопка добавления фото */}
              <button
                type="button"
                className="btn-add-photo-chip"
                onClick={() => fileInputRef.current?.click()}
                title="Загрузить фото"
              >
                <Upload size={16} />
                <span>Загрузить</span>
              </button>

              <button
                type="button"
                className="btn-add-photo-chip secondary"
                onClick={() => setShowUrlInput(!showUrlInput)}
                title="Вставить ссылку на картинку"
              >
                <LinkIcon size={14} />
                <span>Ссылка</span>
              </button>
            </div>

            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleFileUpload}
            />

            {showUrlInput && (
              <div className="photo-url-row">
                <input
                  type="url"
                  className="clean-input url-input"
                  placeholder="Вставьте ссылку на изображение (URL)..."
                  value={photoInputUrl}
                  onChange={(e) => setPhotoInputUrl(e.target.value)}
                />
                <button
                  type="button"
                  className="btn-apply-url"
                  onClick={handleAddPhotoByUrl}
                  disabled={!photoInputUrl.trim()}
                >
                  <Plus size={16} />
                </button>
              </div>
            )}

            {/* Быстрые готовые темы обложек */}
            <div className="preset-covers-row">
              <span className="preset-row-title">Популярные темы:</span>
              <div className="preset-pills-scroll">
                {PRESET_COVERS.map((preset) => (
                  <button
                    type="button"
                    key={preset.id}
                    className={`preset-pill ${selectedPhotos.includes(preset.url) ? 'active' : ''}`}
                    onClick={() => handleSelectPreset(preset.url)}
                  >
                    <span>{preset.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Название */}
          <div className="form-clean-section">
            <label className="clean-label">Название мероприятия *</label>
            <input
              type="text"
              className="clean-input"
              placeholder="Например: Квиз по кино в пабе или Утренняя пробежка"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          {/* Категория */}
          <div className="form-clean-section">
            <label className="clean-label">
              <Tag size={14} />
              <span>Категория</span>
            </label>
            <select
              className="clean-select"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.emoji} {cat.label}
                </option>
              ))}
            </select>
          </div>

          {/* Дата и время */}
          <div className="form-clean-row">
            <div className="form-clean-section">
              <label className="clean-label">
                <Calendar size={14} />
                <span>Дата</span>
              </label>
              <input
                type="date"
                className="clean-input"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>

            <div className="form-clean-section">
              <label className="clean-label">
                <Clock size={14} />
                <span>Время</span>
              </label>
              <input
                type="time"
                className="clean-input"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Место */}
          <div className="form-clean-section">
            <label className="clean-label">
              <MapPin size={14} />
              <span>Место встречи *</span>
            </label>
            <input
              type="text"
              className="clean-input"
              placeholder="Лофт, парк, кафе или точный адрес"
              value={place}
              onChange={(e) => setPlace(e.target.value)}
              required
            />
          </div>

          {/* Описание */}
          <div className="form-clean-section">
            <label className="clean-label">Описание встречи</label>
            <textarea
              className="clean-textarea"
              placeholder="Расскажите о формате, программе, что взять с собой..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          {/* Информация о доступе по реферальной ссылке */}
          <div className="referral-highlight-box">
            <div className="ref-hl-icon">
              <Lock size={18} />
            </div>
            <div className="ref-hl-text">
              <strong>Доступ только по реферальной ссылке</strong>
              <p>
                Ваши мероприятия не попадают в общую афишу и открыты исключительно по персональной ссылке.
                Друзья подключаются к встрече и её чату по вашему приглашению.
              </p>
            </div>
          </div>

          {/* Кнопка создания */}
          <button type="submit" className="btn-submit-clean-event" disabled={loading}>
            <Sparkles size={18} />
            <span>{loading ? 'Создаём встречу...' : 'Создать встречу по ссылке'}</span>
          </button>
        </form>
      </div>
    </div>
  );
};
