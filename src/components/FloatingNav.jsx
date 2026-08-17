import React from 'react';

import Icon from './common/Icon';
import { useLanguage } from '../context/LanguageContext';

export default function FloatingNav({
  activeTab,
  setActiveTab
}) {
  const { t } = useLanguage();

  const navItems = [
    {
      id: 'home',
      label:
        t('nav.home') !== 'nav.home'
          ? t('nav.home')
          : 'Home',
      icon: 'home'
    },
    {
      id: 'schedule',
      label:
        t('nav.schedule') !== 'nav.schedule'
          ? t('nav.schedule')
          : 'Schedule',
      icon: 'schedule'
    },
    {
      id: 'teachers',
      label:
        t('nav.teachers') !== 'nav.teachers'
          ? t('nav.teachers')
          : 'Teachers',
      icon: 'teachers'
    },
    {
      id: 'settings',
      label:
        t('nav.settings') !== 'nav.settings'
          ? t('nav.settings')
          : 'Settings',
      icon: 'settings'
    }
  ];

  return (
    <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[calc(100%-32px)] max-w-[408px] liquid-glass rounded-full p-1.5 flex justify-around items-center z-50">
      {navItems.map(item => {
        const isActive =
          activeTab === item.id;

        return (
          <button
            key={item.id}
            type="button"
            onClick={() =>
              setActiveTab(item.id)
            }
            className="flex flex-col items-center justify-center flex-1 py-1.5 px-1 rounded-full transition-all duration-200"
            style={{
              color: isActive
                ? 'var(--nav-active)'
                : 'var(--nav-inactive)',
              transform: isActive
                ? 'scale(1.05)'
                : 'scale(1)'
            }}
            aria-label={item.label}
            aria-current={
              isActive
                ? 'page'
                : undefined
            }
          >
            <Icon
              name={item.icon}
              className="w-5 h-5 mb-0.5"
            />

            <span className="text-[10px] font-semibold tracking-tight">
              {item.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}