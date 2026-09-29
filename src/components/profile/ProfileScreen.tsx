import React, { useState } from 'react';
import type { UserProfile } from '../../types/user';
import { getGenderOptions } from '../../types/user';
import { getInterestById } from '../../data/interests';
import { CITIES } from '../../data/cities';
import { EditProfileModal } from './EditProfileModal';
import { AppSettingsModal } from './AppSettingsModal';
import { triggerHaptic, getMaxPlatform, getMaxUser } from '../../lib/maxBridge';

import {
  Pencil,
  Settings,
  Heart,
  BookmarkCheck,
  Calendar,
  Users,
  MapPin,
  ChevronRight,
} from 'lucide-react';
import './ProfileScreen.css';
import { EmojiIcon } from '../icons/EmojiIcon';

interface ProfileScreenProps {
  profile: UserProfile;
  onUpdateProfile: (updated: UserProfile) => void;
  onRestartOnboarding: () => void;
  savedCount: number;
  wantCount: number;
  attendedCount: number;
  customEventsCount: number;
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({
  profile,
  onUpdateProfile,
  onRestartOnboarding,
  savedCount,
  wantCount,
  attendedCount,
  customEventsCount,
}) => {
  const [showEditModal, setShowEditModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  const cityName = CITIES.find((c) => c.slug === profile.citySlug)?.name || 'Город';
  const genderOpt = getGenderOptions(profile.ageGroup).find((g) => g.value === profile.gender);

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

      {/* 2. Hero-блок пользователя (Воздушный, без лишних подложек) */}
      <section className="air-hero-section">
        <div className="air-avatar-container" onClick={() => setShowEditModal(true)}>
          {profile.avatarUrl ? (
            <img src={profile.avatarUrl} alt={profile.name} className="air-avatar-image" />
          ) : (
            <div className="air-avatar-fallback">
              {profile.avatarEmoji ? (
                <span className="air-avatar-emoji"><EmojiIcon e={profile.avatarEmoji} /></span>
              ) : (
                <span className="air-avatar-letter">{profile.name ? profile.name[0].toUpperCase() : 'U'}</span>
              )}
            </div>
          )}
        </div>

        <div className="air-hero-details">
          <h1 className="air-user-name">{profile.name}</h1>

          {profile.statusText ? (
            <p className="air-user-status">{profile.statusText}</p>
          ) : (
            <p className="air-user-status air-status-placeholder">
              Исследую события и город ✨
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
              {genderOpt && <EmojiIcon e={genderOpt.icon} />} {genderOpt?.label}
            </span>
          </div>

          <div className="air-max-account-chip" title="Данные профиля и событий сохранены относительно аккаунта MAX">
            <span className="air-max-account-dot" />
            <span>Аккаунт MAX{getMaxUser()?.username ? ` (@${getMaxUser()?.username})` : ''}</span>
            <span className="air-max-platform-tag">{getMaxPlatform().toUpperCase()}</span>
          </div>
        </div>
      </section>

      {/* 3. Воздушная статистика в один ряд (Air Stats Strip) */}
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

      {/* 4. Интересы пользователя (Облако на чистом фоне) */}
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
                <span className="air-tag-emoji"><EmojiIcon e={item.emoji} /></span>
                <span className="air-tag-text">{item.label}</span>
              </span>
            );
          })}
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
    </div>
  );
};
