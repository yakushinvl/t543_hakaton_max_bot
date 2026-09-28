import React from 'react';
import { Compass, CalendarDays, MapPin, Users, User } from 'lucide-react';
import { triggerHaptic } from '../../lib/maxBridge';
import './TabBar.css';

export type TabId = 'fluger' | 'events' | 'map' | 'social' | 'profile';

interface TabBarProps {
  activeTab: TabId;
  onChange: (tab: TabId) => void;
  unreadCount?: number;
}

const TABS: { id: TabId; label: string; icon: React.FC<{ size?: number; className?: string }> }[] = [
  { id: 'fluger', label: 'Флюгер', icon: Compass },
  { id: 'events', label: 'События', icon: CalendarDays },
  { id: 'map', label: 'Карта', icon: MapPin },
  { id: 'social', label: 'Социалка', icon: Users },
  { id: 'profile', label: 'Профиль', icon: User },
];

export const TabBar: React.FC<TabBarProps> = ({ activeTab, onChange, unreadCount }) => {
  const handleSelect = (tab: TabId) => {
    if (tab !== activeTab) {
      triggerHaptic('selection');
      onChange(tab);
    }
  };

  return (
    <nav className="max-tabbar">
      <div className="max-tabbar-inner">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              className={`max-tabbar-item ${isActive ? 'active' : ''}`}
              onClick={() => handleSelect(tab.id)}
              aria-label={tab.label}
            >
              <div className="max-tabbar-icon-wrap">
                <Icon size={24} className="max-tabbar-icon" />
                {tab.id === 'social' && unreadCount && unreadCount > 0 ? (
                  <span className="max-tabbar-badge">{unreadCount}</span>
                ) : null}
              </div>
              <span className="max-tabbar-label">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
