import React, { useState } from 'react';
import type { UserProfile, AgeGroup, Gender, ProfilePersonaType } from '../../types/user';
import { getGenderOptions, PROFILE_PRESETS } from '../../types/user';
import { CITIES } from '../../data/cities';
import { AppleWatchGrid } from '../onboarding/AppleWatchGrid';
import { triggerHaptic } from '../../lib/maxBridge';
import { X, Check, MapPin, Smile } from 'lucide-react';
import './ProfileScreen.css';

interface EditProfileModalProps {
  profile: UserProfile;
  onSave: (updated: UserProfile) => void;
  onClose: () => void;
}

const AGE_GROUPS: AgeGroup[] = ['6-11', '12-15', '16-21', '22-29', '30-44', '45-59', '60+'];

const POPULAR_EMOJIS = ['👤', '🌟', '🎨', '🚀', '🎸', '👨‍👩‍👧', '🎉', '🍷', '🌿', '🕶️', '⚡', '☕'];

export const EditProfileModal: React.FC<EditProfileModalProps> = ({
  profile,
  onSave,
  onClose,
}) => {
  const [name, setName] = useState(profile.name || '');
  const [statusText, setStatusText] = useState(profile.statusText || '');
  const [profileType, setProfileType] = useState<ProfilePersonaType>(profile.profileType || 'personal');
  const [citySlug, setCitySlug] = useState(profile.citySlug || 'msk');
  const [ageGroup, setAgeGroup] = useState<AgeGroup>(profile.ageGroup);
  const [gender, setGender] = useState<Gender>(profile.gender);
  const [interests, setInterests] = useState<string[]>(profile.interests || []);
  const [avatarEmoji, setAvatarEmoji] = useState(profile.avatarEmoji || '👤');

  const handleAgeSelect = (age: AgeGroup) => {
    setAgeGroup(age);
    triggerHaptic('selection');
    const options = getGenderOptions(age);
    if (!options.some((o) => o.value === gender)) {
      setGender(options[0].value);
    }
  };

  const handlePresetSelect = (presetType: ProfilePersonaType) => {
    triggerHaptic('selection');
    setProfileType(presetType);
    const preset = PROFILE_PRESETS.find((p) => p.type === presetType);
    if (preset) {
      setAvatarEmoji(preset.emoji);
      if (!statusText || PROFILE_PRESETS.some((p) => p.description === statusText)) {
        setStatusText(preset.description);
      }
    }
  };

  const toggleInterest = (id: string) => {
    setInterests((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    triggerHaptic('success');
    onSave({
      ...profile,
      name: name.trim() || 'Пользователь',
      statusText: statusText.trim(),
      profileType,
      citySlug,
      ageGroup,
      gender,
      avatarEmoji,
      interests: interests.length > 0 ? interests : ['exhibition', 'walk'],
    });
    onClose();
  };

  return (
    <div className="profile-modal-overlay" onClick={onClose}>
      <div className="profile-modal-card air-modal edit-card" onClick={(e) => e.stopPropagation()}>
        <div className="air-modal-header">
          <div className="air-modal-title-group">
            <h3 className="air-modal-title">Настройка профиля</h3>
            <p className="air-modal-subtitle">Имя, роль, аватар и параметры подбора событий</p>
          </div>
          <button className="air-modal-close" onClick={onClose} aria-label="Закрыть">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSave} className="air-edit-form">
          {/* Режим профиля */}
          <div className="air-form-group">
            <label className="air-form-label">Тип профиля (роль)</label>
            <div className="air-role-pills">
              {PROFILE_PRESETS.map((preset) => (
                <button
                  key={preset.type}
                  type="button"
                  className={`air-role-pill ${profileType === preset.type ? 'active' : ''}`}
                  onClick={() => handlePresetSelect(preset.type)}
                >
                  <span className="air-role-emoji">{preset.emoji}</span>
                  <span className="air-role-name">{preset.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Имя и статус */}
          <div className="air-form-group">
            <label className="air-form-label">Имя в профиле</label>
            <input
              type="text"
              className="air-text-input"
              placeholder="Как вас зовут"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="air-form-group">
            <label className="air-form-label">Статус или «О себе»</label>
            <input
              type="text"
              className="air-text-input"
              placeholder="Например: Ищу компанию на выставки и квизы"
              value={statusText}
              onChange={(e) => setStatusText(e.target.value)}
            />
          </div>

          {/* Выбор эмодзи-аватарки */}
          <div className="air-form-group">
            <label className="air-form-label">
              <Smile size={14} /> Иконка / Аватар профиля
            </label>
            <div className="air-emoji-grid">
              {POPULAR_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  className={`air-emoji-btn ${avatarEmoji === emoji ? 'active' : ''}`}
                  onClick={() => {
                    triggerHaptic('selection');
                    setAvatarEmoji(emoji);
                  }}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          {/* Город */}
          <div className="air-form-group">
            <label className="air-form-label">
              <MapPin size={14} /> Город поиска событий
            </label>
            <select
              className="air-select-input"
              value={citySlug}
              onChange={(e) => setCitySlug(e.target.value)}
            >
              {CITIES.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Возраст */}
          <div className="air-form-group">
            <label className="air-form-label">Возрастная категория</label>
            <div className="edit-age-chips">
              {AGE_GROUPS.map((a) => (
                <button
                  key={a}
                  type="button"
                  className={`edit-age-chip ${ageGroup === a ? 'active' : ''}`}
                  onClick={() => handleAgeSelect(a)}
                >
                  {a} лет
                </button>
              ))}
            </div>
          </div>

          {/* Пол */}
          <div className="air-form-group">
            <label className="air-form-label">Пол ({ageGroup} лет)</label>
            <div className="edit-gender-options">
              {getGenderOptions(ageGroup).map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  className={`edit-gender-chip ${gender === opt.value ? 'active' : ''}`}
                  onClick={() => {
                    triggerHaptic('selection');
                    setGender(opt.value);
                  }}
                >
                  <span>{opt.icon}</span>
                  <span>{opt.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Сетка интересов */}
          <div className="air-form-group">
            <div className="air-form-group-head">
              <label className="air-form-label">Интересы для этого профиля</label>
              <span className="air-selected-badge">{interests.length} выбрано</span>
            </div>
            <AppleWatchGrid
              selectedInterests={interests}
              onToggle={toggleInterest}
            />
          </div>

          {/* Кнопка сохранения */}
          <button type="submit" className="air-btn-primary air-save-btn">
            <Check size={18} />
            <span>Сохранить профиль</span>
          </button>
        </form>
      </div>
    </div>
  );
};
