import React, { useState } from 'react';
import type { UserProfile, RegistrationData, ProfilePersonaType } from '../../types/user';
import { getGenderOptions, PROFILE_PRESETS } from '../../types/user';
import { getInterestById } from '../../data/interests';
import { CITIES } from '../../data/cities';
import { RegistrationFormModal } from './RegistrationFormModal';
import { EditProfileModal } from './EditProfileModal';
import { AppSettingsModal } from './AppSettingsModal';
import { switchOrCreatePersonaProfile } from '../../lib/storage';
import { triggerHaptic } from '../../lib/maxBridge';
import {
  Pencil,
  Settings,
  Heart,
  BookmarkCheck,
  Calendar,
  Users,
  MapPin,
  CheckCircle2,
  FileText,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import './ProfileScreen.css';

interface ProfileScreenProps {
  profile: UserProfile;
  onUpdateProfile: (updated: UserProfile) => void;
  onRestartOnboarding: () => void;
  savedCount: number;
  wantCount: number;
  attendedCount: number;
  customEventsCount: number;
  showRegModalDirectly?: boolean;
  onCloseRegModalDirectly?: () => void;
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({
  profile,
  onUpdateProfile,
  onRestartOnboarding,
  savedCount,
  wantCount,
  attendedCount,
  customEventsCount,
  showRegModalDirectly,
  onCloseRegModalDirectly,
}) => {
  const [showEditModal, setShowEditModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showRegModal, setShowRegModal] = useState(showRegModalDirectly || false);

  React.useEffect(() => {
    if (showRegModalDirectly) {
      setShowRegModal(true);
    }
  }, [showRegModalDirectly]);

  const cityName = CITIES.find((c) => c.slug === profile.citySlug)?.name || 'Город';
  const genderOpt = getGenderOptions(profile.ageGroup).find((g) => g.value === profile.gender);
  const isRegFilled = Boolean(profile.registrationData?.fullName && profile.registrationData?.phone);

  const activeProfileType: ProfilePersonaType = profile.profileType || 'personal';
  const currentPreset = PROFILE_PRESETS.find((p) => p.type === activeProfileType) || PROFILE_PRESETS[0];

  const handleSaveRegData = (data: RegistrationData) => {
    onUpdateProfile({
      ...profile,
      registrationData: data,
    });
  };

  const handleSelectPersona = (type: ProfilePersonaType) => {
    if (type === activeProfileType) return;
    triggerHaptic('selection');
    const { profile: switchedProfile } = switchOrCreatePersonaProfile(type, profile);
    onUpdateProfile(switchedProfile);
  };

  return (
    <div className="air-profile-screen">
      {/* 1. Верхний бар с заголовком и 2 кнопками в правом верхнем углу */}
      <header className="air-top-bar">
        <div className="air-top-left">
          <span className="air-title">Профиль</span>
          <span className="air-status-dot" title="Онлайн в MAX" />
        </div>

        <div className="air-top-actions">
          {/* Кнопка-карандаш: Настройка профиля */}
          <button
            type="button"
            className="air-icon-btn"
            onClick={() => {
              triggerHaptic('light');
              setShowEditModal(true);
            }}
            aria-label="Редактировать профиль"
            title="Настроить профиль"
          >
            <Pencil size={20} />
          </button>

          {/* Кнопка-шестерёнка: Настройки приложения */}
          <button
            type="button"
            className="air-icon-btn"
            onClick={() => {
              triggerHaptic('light');
              setShowSettingsModal(true);
            }}
            aria-label="Настройки приложения"
            title="Настройки приложения"
          >
            <Settings size={20} />
          </button>
        </div>
      </header>

      {/* 2. Hero-блок пользователя (Воздушный, без серых подложек) */}
      <section className="air-hero-section">
        <div className="air-avatar-container" onClick={() => setShowEditModal(true)}>
          {profile.avatarUrl ? (
            <img src={profile.avatarUrl} alt={profile.name} className="air-avatar-image" />
          ) : (
            <div className="air-avatar-fallback">
              {profile.avatarEmoji ? (
                <span className="air-avatar-emoji">{profile.avatarEmoji}</span>
              ) : (
                <span className="air-avatar-letter">{profile.name ? profile.name[0].toUpperCase() : 'U'}</span>
              )}
            </div>
          )}
          <span className="air-avatar-badge" title={`Режим: ${currentPreset.name}`}>
            {currentPreset.emoji}
          </span>
        </div>

        <div className="air-hero-details">
          <h1 className="air-user-name">{profile.name}</h1>
          
          {profile.statusText ? (
            <p className="air-user-status">{profile.statusText}</p>
          ) : (
            <p className="air-user-status air-status-placeholder">
              {currentPreset.description}
            </p>
          )}

          <div className="air-meta-row">
            <span className="air-meta-item">
              <MapPin size={12} /> {cityName}
            </span>
            <span className="air-meta-separator">•</span>
            <span className="air-meta-item">{profile.ageGroup} лет</span>
            <span className="air-meta-separator">•</span>
            <span className="air-meta-item">
              {genderOpt?.icon} {genderOpt?.label}
            </span>
          </div>
        </div>
      </section>

      {/* 3. Продуманные профили: Persona Switcher */}
      <section className="air-persona-section">
        <div className="air-section-title-row">
          <div className="air-section-title-wrap">
            <Sparkles size={15} className="air-sparkle-icon" />
            <span className="air-section-title">Режим профиля</span>
          </div>
          <span className="air-persona-hint-badge">{currentPreset.badge}</span>
        </div>

        <div className="air-persona-pills">
          {PROFILE_PRESETS.map((preset) => {
            const isActive = preset.type === activeProfileType;
            return (
              <button
                key={preset.type}
                type="button"
                className={`air-persona-pill ${isActive ? 'active' : ''}`}
                onClick={() => handleSelectPersona(preset.type)}
              >
                <span className="air-persona-emoji">{preset.emoji}</span>
                <span className="air-persona-label">{preset.name}</span>
              </button>
            );
          })}
        </div>

        <p className="air-persona-desc">
          {activeProfileType === 'personal' && 'События и рекомендации по вашим персональным предпочтениям.'}
          {activeProfileType === 'family' && 'Подборка для семейного отдыха: 0+, 6+, мастер-классы, цирк и парки.'}
          {activeProfileType === 'friends' && 'Движ для компании: квизы, стендапы, вечеринки, бары и фестивали.'}
          {activeProfileType === 'date' && 'Уютные места, живой джаз, вечерние выставки и камерные театры.'}
        </p>
      </section>

      {/* 4. Воздушная статистика в один ряд (Air Stats Strip) */}
      <section className="air-stats-strip">
        <div className="air-stat-cell">
          <div className="air-stat-icon-wrap air-icon-red">
            <Heart size={16} />
          </div>
          <span className="air-stat-value">{savedCount}</span>
          <span className="air-stat-label">Сохранено</span>
        </div>

        <div className="air-stat-divider" />

        <div className="air-stat-cell">
          <div className="air-stat-icon-wrap air-icon-blue">
            <BookmarkCheck size={16} />
          </div>
          <span className="air-stat-value">{wantCount}</span>
          <span className="air-stat-label">Хочу пойти</span>
        </div>

        <div className="air-stat-divider" />

        <div className="air-stat-cell">
          <div className="air-stat-icon-wrap air-icon-green">
            <Calendar size={16} />
          </div>
          <span className="air-stat-value">{attendedCount}</span>
          <span className="air-stat-label">Посетил</span>
        </div>

        <div className="air-stat-divider" />

        <div className="air-stat-cell">
          <div className="air-stat-icon-wrap air-icon-purple">
            <Users size={16} />
          </div>
          <span className="air-stat-value">{customEventsCount}</span>
          <span className="air-stat-label">Встречи</span>
        </div>
      </section>

      {/* 5. Интересы текущего профиля (Облако на чистом фоне) */}
      <section className="air-interests-section">
        <div className="air-section-title-row">
          <span className="air-section-title">
            Интересы ({profile.interests.length})
          </span>
          <button
            type="button"
            className="air-link-btn"
            onClick={() => {
              triggerHaptic('light');
              setShowEditModal(true);
            }}
          >
            Изменить
          </button>
        </div>

        <div className="air-interests-cloud">
          {profile.interests.map((id) => {
            const item = getInterestById(id);
            if (!item) return null;
            return (
              <span key={id} className="air-interest-tag" style={{ '--tag-color': item.color } as React.CSSProperties}>
                <span className="air-tag-emoji">{item.emoji}</span>
                <span className="air-tag-text">{item.label}</span>
              </span>
            );
          })}
        </div>
      </section>

      {/* 6. Быстрая запись на события (Чистая строка Cell) */}
      <section className="air-reg-section">
        <div
          className="air-reg-row"
          onClick={() => {
            triggerHaptic('light');
            setShowRegModal(true);
          }}
        >
          <div className="air-reg-left">
            <div className="air-reg-icon-wrap">
              <FileText size={18} />
            </div>
            <div className="air-reg-text-wrap">
              <div className="air-reg-heading">Быстрая запись на события</div>
              <div className="air-reg-subtext">
                {isRegFilled
                  ? `${profile.registrationData.fullName} • ${profile.registrationData.phone}`
                  : 'Заполните ФИО и телефон для записи в 1 клик'}
              </div>
            </div>
          </div>

          <div className="air-reg-right">
            {isRegFilled ? (
              <span className="air-reg-status-done">
                <CheckCircle2 size={14} /> Заполнено
              </span>
            ) : (
              <span className="air-reg-status-action">
                Заполнить <ChevronRight size={14} />
              </span>
            )}
          </div>
        </div>
      </section>

      {/* Модалки */}
      {showEditModal && (
        <EditProfileModal
          profile={profile}
          onSave={onUpdateProfile}
          onClose={() => setShowEditModal(false)}
        />
      )}

      {showSettingsModal && (
        <AppSettingsModal
          profile={profile}
          onUpdateProfile={onUpdateProfile}
          onRestartOnboarding={onRestartOnboarding}
          onClose={() => setShowSettingsModal(false)}
        />
      )}

      {showRegModal && (
        <RegistrationFormModal
          initialData={profile.registrationData}
          onSave={handleSaveRegData}
          onClose={() => {
            setShowRegModal(false);
            onCloseRegModalDirectly?.();
          }}
        />
      )}
    </div>
  );
};
