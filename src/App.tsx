import React, { useState, useEffect, useCallback, useMemo } from 'react';
import type { UserProfile } from './types/user';
import type { EventItem, UserEventStatus } from './types/event';
import { OnboardingModal } from './components/onboarding/OnboardingModal';
import { AppLoadingScreen } from './components/onboarding/AppLoadingScreen';
import { TabBar, type TabId } from './components/navigation/TabBar';
import { FlugerScreen } from './components/fluger/FlugerScreen';
import { EventsScreen } from './components/events/EventsScreen';
import { EventMap } from './components/map/EventMap';
import { SocialScreen } from './components/social/SocialScreen';
import { ProfileScreen } from './components/profile/ProfileScreen';
import { EventDetailModal } from './components/events/EventDetailModal';
import { initMaxBridge, getMaxUser, applyThemeAndPalette, subscribeToThemeChange } from './lib/maxBridge';
import { fetchEvents } from './lib/api';
import {
  loadStoredProfile,
  saveStoredProfile,
  loadEventStatuses,
  saveEventStatus,
  loadStoredCustomEvents,
  fetchAndApplyUserCloudData,
  subscribeToSyncStatus,
} from './lib/storage';
import { DEFAULT_CITY, CITIES, type City } from './data/cities';
import { detectUserLocation } from './lib/geolocation';

export default function App() {
  const [profile, setProfile] = useState<UserProfile | null>(() => loadStoredProfile());
  const [activeTab, setActiveTab] = useState<TabId>('map');
  const [events, setEvents] = useState<EventItem[]>([]);
  const [eventStatuses, setEventStatuses] = useState<Record<string, Partial<UserEventStatus>>>(() =>
    loadEventStatuses()
  );
  const [selectedEvent, setSelectedEvent] = useState<EventItem | null>(null);
  const [isAppLoading, setIsAppLoading] = useState(true);
  const [isMapReady, setIsMapReady] = useState(false);
  const [isEventsLoaded, setIsEventsLoaded] = useState(false);

  // Навигационные ссылки между экранами
  const [chatEventId, setChatEventId] = useState<string | null>(null);
  const [showRegModalInProfile, setShowRegModalInProfile] = useState(false);

  // Инициализация темы и палитры
  useEffect(() => {
    applyThemeAndPalette(profile?.themeMode || 'auto');

    const unsubscribe = subscribeToThemeChange(() => {
      applyThemeAndPalette(profile?.themeMode || 'auto');
    });

    return unsubscribe;
  }, [profile?.themeMode]);

  // Инициализация MAX Bridge, геолокации и синхронизации данных аккаунта
  useEffect(() => {
    initMaxBridge();

    // 1. Двусторонняя синхронизация с аккаунтом MAX через MAX Bridge
    // Позволяет получить данные пользователя с любой другой платформы (iOS / Android / Desktop / Web)
    fetchAndApplyUserCloudData().then((res) => {
      if (res.data?.profile) {
        setProfile(res.data.profile);
      }
      if (res.data?.eventStatuses) {
        setEventStatuses(res.data.eventStatuses);
      }
    });

    // Слушатель фоновой синхронизации аккаунта
    const unsubSync = subscribeToSyncStatus((_status, cloudData) => {
      if (cloudData?.profile) {
        setProfile((prev) => ({ ...(prev || {}), ...cloudData.profile }));
      }
      if (cloudData?.eventStatuses) {
        setEventStatuses((prev) => ({ ...(prev || {}), ...cloudData.eventStatuses }));
      }
    });

    // Если профиль уже сохранён, но фото ещё нет — пробуем обновить из MAX
    const maxUser = getMaxUser();
    if (maxUser?.photo_url) {
      setProfile((prev) => {
        if (!prev) return prev;
        if (!prev.avatarUrl) {
          const updated = { ...prev, avatarUrl: maxUser.photo_url };
          saveStoredProfile(updated);
          return updated;
        }
        return prev;
      });
    }

    // Автоматическое определение города по геолокации при запуске
    detectUserLocation(5000).then((res) => {
      if (res && res.city) {
        setProfile((prev) => {
          if (!prev) return prev;
          if (prev.citySlug !== res.city.slug) {
            const updated = { ...prev, citySlug: res.city.slug };
            saveStoredProfile(updated);
            return updated;
          }
          return prev;
        });
      }
    }).catch(() => {});

    return () => {
      unsubSync();
    };
  }, []);


  // Загрузка событий города при смене города в профиле
  const currentCitySlug = profile?.citySlug || DEFAULT_CITY.slug;
  const currentCity = useMemo(() => {
    return CITIES.find((c) => c.slug === currentCitySlug) || DEFAULT_CITY;
  }, [currentCitySlug]);

  const loadCityEvents = useCallback(async (slug: string) => {
    try {
      const items = await fetchEvents(slug);
      const customItems = loadStoredCustomEvents();
      const merged = [...customItems, ...items.filter((it) => !customItems.some((c) => c.id === it.id))];
      setEvents(merged);
      setIsEventsLoaded(true);
    } catch (e) {
      console.error('Failed to load events:', e);
      const customItems = loadStoredCustomEvents();
      setEvents(customItems);
      setIsEventsLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (profile?.onboardingCompleted) {
      loadCityEvents(currentCitySlug);
    }
  }, [profile?.onboardingCompleted, currentCitySlug, loadCityEvents]);

  // Завершение онбординга
  const handleOnboardingComplete = (newProfile: UserProfile) => {
    setProfile(newProfile);
    saveStoredProfile(newProfile);
    setIsMapReady(false);
    setIsEventsLoaded(false);
    setIsAppLoading(true);
    loadCityEvents(newProfile.citySlug);
  };

  // Обновление профиля
  const handleUpdateProfile = (updated: UserProfile) => {
    setProfile(updated);
    saveStoredProfile(updated);
    if (updated.citySlug !== profile?.citySlug) {
      loadCityEvents(updated.citySlug);
    }
  };

  // Переключение статусов (Сохранённые, Хочу пойти, Посещено)
  const handleToggleStatus = (eventId: string, key: 'saved' | 'wantToAttend' | 'attended') => {
    const currentVal = Boolean(eventStatuses[eventId]?.[key]);
    const updated = saveEventStatus(eventId, key, !currentVal);
    setEventStatuses({ ...updated });
  };

  const isSaved = useCallback((id: string) => Boolean(eventStatuses[id]?.saved), [eventStatuses]);
  const isWantToAttend = useCallback(
    (id: string) => Boolean(eventStatuses[id]?.wantToAttend),
    [eventStatuses]
  );
  const isAttended = useCallback(
    (id: string) => Boolean(eventStatuses[id]?.attended),
    [eventStatuses]
  );

  // Добавление созданного пользователем события
  const handleEventCreated = (newEvent: EventItem) => {
    setEvents((prev) => [newEvent, ...prev.filter((e) => e.id !== newEvent.id)]);
    // Автор сразу добавляется в "Хочу пойти"
    const updated = saveEventStatus(newEvent.id, 'wantToAttend', true);
    setEventStatuses({ ...updated });
  };


  // Статистика для экрана профиля
  const stats = useMemo(() => {
    let saved = 0;
    let want = 0;
    let attended = 0;
    for (const id in eventStatuses) {
      if (eventStatuses[id].saved) saved++;
      if (eventStatuses[id].wantToAttend) want++;
      if (eventStatuses[id].attended) attended++;
    }
    const customCount = events.filter((e) => e.isCustom && (e.authorId === profile?.id || e.authorId === 'me')).length;
    return { saved, want, attended, customCount };
  }, [eventStatuses, events, profile]);

  // Переход в чат события
  const handleOpenChat = (eventId: string) => {
    setChatEventId(eventId);
    setActiveTab('social');
  };

  // Переход в профиль для заполнения формы регистрации
  const handleOpenProfileForRegistration = () => {
    setShowRegModalInProfile(true);
    setActiveTab('profile');
  };

  // Если онбординг ещё не пройден
  if (!profile || !profile.onboardingCompleted) {
    return (
      <OnboardingModal
        initialProfile={profile}
        onComplete={handleOnboardingComplete}
      />
    );
  }

  return (
    <div className="app-container">
      {/* Полноэкранная страница загрузки приложения в стиле онбординга (пока фоном прогружаются карта и события) */}
      {isAppLoading && (
        <AppLoadingScreen
          cityName={currentCity.name}
          eventsCount={events.length}
          isReady={isMapReady && isEventsLoaded}
          minDurationMs={2600}
          onFinished={() => setIsAppLoading(false)}
        />
      )}

      {/* 5 Экранов приложения */}
      {activeTab === 'fluger' && (
        <FlugerScreen
          events={events}
          profile={profile}
          onSelectEvent={setSelectedEvent}
          onToggleStatus={handleToggleStatus}
          isSaved={isSaved}
          isWantToAttend={isWantToAttend}
        />
      )}

      {activeTab === 'events' && (
        <EventsScreen
          events={events}
          profile={profile}
          onUpdateCity={(newCity) => handleUpdateProfile({ ...profile, citySlug: newCity })}
          onToggleStatus={handleToggleStatus}
          isSaved={isSaved}
          isWantToAttend={isWantToAttend}
          isAttended={isAttended}
          onOpenChat={handleOpenChat}
          onOpenProfileForRegistration={handleOpenProfileForRegistration}
        />
      )}

      {activeTab === 'map' && (
        <EventMap
          events={events}
          citySlug={profile.citySlug}
          onSelectEvent={setSelectedEvent}
          onSelectCity={(selectedCity) => {
            if (selectedCity.slug !== profile.citySlug) {
              handleUpdateProfile({ ...profile, citySlug: selectedCity.slug });
            }
          }}
          onMapReady={() => setIsMapReady(true)}
        />
      )}

      {activeTab === 'social' && (
        <SocialScreen
          events={events}
          profile={profile}
          onEventCreated={handleEventCreated}
          onSelectEvent={setSelectedEvent}
          initialChatEventId={chatEventId}
          onClearInitialChat={() => setChatEventId(null)}
          isWantToAttend={isWantToAttend}
          isAttended={isAttended}
          onToggleStatus={handleToggleStatus}
        />
      )}

      {activeTab === 'profile' && (
        <ProfileScreen
          profile={profile}
          onUpdateProfile={handleUpdateProfile}
          onRestartOnboarding={() => setProfile(null)}
          savedCount={stats.saved}
          wantCount={stats.want}
          attendedCount={stats.attended}
          customEventsCount={stats.customCount}
          showRegModalDirectly={showRegModalInProfile}
          onCloseRegModalDirectly={() => setShowRegModalInProfile(false)}
        />
      )}

      {/* Модалка детального просмотра события (если открыта из Флюгера, Карты или Социалки) */}
      {selectedEvent && (
        <EventDetailModal
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
          profile={profile}
          isSaved={isSaved(selectedEvent.id)}
          isWantToAttend={isWantToAttend(selectedEvent.id)}
          onToggleSaved={() => handleToggleStatus(selectedEvent.id, 'saved')}
          onToggleWant={() => handleToggleStatus(selectedEvent.id, 'wantToAttend')}
          onOpenChat={handleOpenChat}
          onOpenProfileForRegistration={handleOpenProfileForRegistration}
        />
      )}

      {/* Нижний таббар MAX */}
      <TabBar activeTab={activeTab} onChange={setActiveTab} />
    </div>
  );
}
