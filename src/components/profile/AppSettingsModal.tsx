import React, { useState } from 'react';
import type { UserProfile, ThemeMode, FeedViewMode } from '../../types/user';
import { loadAppSettings, saveAppSettings, type AppSettings } from '../../lib/storage';
import { triggerHaptic, isMaxPlatform } from '../../lib/maxBridge';
import { X, Moon, Sun, Monitor, Bell, Vibrate, RotateCcw, Trash2, Info, LayoutList, LayoutGrid, Check } from 'lucide-react';
import './ProfileScreen.css';

interface AppSettingsModalProps {
  profile: UserProfile;
  onUpdateProfile: (updated: UserProfile) => void;
  onRestartOnboarding: () => void;
  onClose: () => void;
}

export const AppSettingsModal: React.FC<AppSettingsModalProps> = ({
  profile,
  onUpdateProfile,
  onRestartOnboarding,
  onClose,
}) => {
  const [settings, setSettings] = useState<AppSettings>(() => loadAppSettings());
  const [showConfirmReset, setShowConfirmReset] = useState(false);
  const [cacheCleared, setCacheCleared] = useState(false);

  const handleThemeChange = (mode: ThemeMode) => {
    triggerHaptic('selection');
    onUpdateProfile({
      ...profile,
      themeMode: mode,
    });
  };

  const handleFeedViewChange = (mode: FeedViewMode) => {
    triggerHaptic('selection');
    onUpdateProfile({
      ...profile,
      feedViewMode: mode,
    });
  };

  const toggleHaptic = () => {
    const updated = saveAppSettings({ hapticEnabled: !settings.hapticEnabled });
    setSettings(updated);
    if (updated.hapticEnabled) {
      triggerHaptic('light');
    }
  };

  const toggleNotifications = () => {
    triggerHaptic('selection');
    const updated = saveAppSettings({ notificationsEnabled: !settings.notificationsEnabled });
    setSettings(updated);
  };

  const handleClearCache = () => {
    triggerHaptic('medium');
    try {
      // Очищаем только кэши событий, не трогая профиль
      Object.keys(localStorage).forEach((key) => {
        if (key.startsWith('max_cached_events_v2_')) {
          localStorage.removeItem(key);
        }
      });
      setCacheCleared(true);
      setTimeout(() => setCacheCleared(false), 2500);
    } catch (e) {
      console.error(e);
    }
  };

  const handleConfirmReset = () => {
    triggerHaptic('heavy');
    onRestartOnboarding();
    onClose();
  };

  return (
    <div className="profile-modal-overlay" onClick={onClose}>
      <div className="profile-modal-card air-modal" onClick={(e) => e.stopPropagation()}>
        <div className="air-modal-header">
          <div className="air-modal-title-group">
            <h3 className="air-modal-title">Настройки приложения</h3>
            <p className="air-modal-subtitle">Параметры интерфейса и работы бота</p>
          </div>
          <button className="air-modal-close" onClick={onClose} aria-label="Закрыть">
            <X size={20} />
          </button>
        </div>

        <div className="air-settings-content">
          {/* 1. Тема оформления */}
          <div className="air-settings-group">
            <label className="air-group-label">Тема оформления</label>
            <div className="air-segment-grid air-segment-3">
              <button
                type="button"
                className={`air-segment-btn ${(!profile.themeMode || profile.themeMode === 'auto') ? 'active' : ''}`}
                onClick={() => handleThemeChange('auto')}
              >
                <Monitor size={16} />
                <span>Как в MAX</span>
              </button>

              <button
                type="button"
                className={`air-segment-btn ${profile.themeMode === 'light' ? 'active' : ''}`}
                onClick={() => handleThemeChange('light')}
              >
                <Sun size={16} />
                <span>Светлая</span>
              </button>

              <button
                type="button"
                className={`air-segment-btn ${profile.themeMode === 'dark' ? 'active' : ''}`}
                onClick={() => handleThemeChange('dark')}
              >
                <Moon size={16} />
                <span>Тёмная</span>
              </button>
            </div>
          </div>

          {/* 2. Вид ленты событий */}
          <div className="air-settings-group">
            <label className="air-group-label">Отображение афиши</label>
            <div className="air-segment-grid air-segment-2">
              <button
                type="button"
                className={`air-segment-btn ${profile.feedViewMode !== 'compact' ? 'active' : ''}`}
                onClick={() => handleFeedViewChange('full')}
              >
                <LayoutGrid size={16} />
                <span>Постеры (фото)</span>
              </button>

              <button
                type="button"
                className={`air-segment-btn ${profile.feedViewMode === 'compact' ? 'active' : ''}`}
                onClick={() => handleFeedViewChange('compact')}
              >
                <LayoutList size={16} />
                <span>Компактно</span>
              </button>
            </div>
          </div>

          {/* 3. Интерактивные переключатели */}
          <div className="air-settings-group">
            <label className="air-group-label">Системные функции</label>
            
            <div className="air-settings-list">
              <div className="air-switch-row" onClick={toggleHaptic}>
                <div className="air-switch-info">
                  <div className="air-switch-icon-wrap">
                    <Vibrate size={18} />
                  </div>
                  <div>
                    <div className="air-switch-title">Тактильный отклик (Haptic)</div>
                    <div className="air-switch-desc">Вибрация при нажатии на кнопки и свайпах</div>
                  </div>
                </div>
                <div className={`air-toggle ${settings.hapticEnabled ? 'checked' : ''}`}>
                  <div className="air-toggle-thumb" />
                </div>
              </div>

              <div className="air-switch-row" onClick={toggleNotifications}>
                <div className="air-switch-info">
                  <div className="air-switch-icon-wrap">
                    <Bell size={18} />
                  </div>
                  <div>
                    <div className="air-switch-title">Напоминания о событиях</div>
                    <div className="air-switch-desc">Уведомлять за 2 часа до начала выбранного мероприятия</div>
                  </div>
                </div>
                <div className={`air-toggle ${settings.notificationsEnabled ? 'checked' : ''}`}>
                  <div className="air-toggle-thumb" />
                </div>
              </div>
            </div>
          </div>

          {/* 4. Очистка и сброс */}
          <div className="air-settings-group">
            <label className="air-group-label">Управление данными</label>
            
            <div className="air-action-buttons">
              <button
                type="button"
                className="air-btn-secondary"
                onClick={handleClearCache}
                disabled={cacheCleared}
              >
                {cacheCleared ? <Check size={16} color="#2ed573" /> : <Trash2 size={16} />}
                <span>{cacheCleared ? 'Кэш событий очищен' : 'Очистить кэш афиши'}</span>
              </button>

              {!showConfirmReset ? (
                <button
                  type="button"
                  className="air-btn-danger-ghost"
                  onClick={() => setShowConfirmReset(true)}
                >
                  <RotateCcw size={16} />
                  <span>Пройти онбординг заново</span>
                </button>
              ) : (
                <div className="air-confirm-box">
                  <p>Сбросить анкету и пройти выбор города и интересов с нуля?</p>
                  <div className="air-confirm-actions">
                    <button
                      type="button"
                      className="air-btn-danger"
                      onClick={handleConfirmReset}
                    >
                      Да, сбросить
                    </button>
                    <button
                      type="button"
                      className="air-btn-cancel"
                      onClick={() => setShowConfirmReset(false)}
                    >
                      Отмена
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 5. Инфо о приложении */}
          <div className="air-app-info-footer">
            <Info size={14} />
            <span>MAX Events Bot v2.4 • Платформа MAX Mini Apps • {isMaxPlatform() ? 'MAX Bridge Active' : 'Web Sandbox'}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
