import React from 'react';
import Icon from './common/Icon';

export default function FloatingNav({ activeTab, setActiveTab }) {
  const navItems = [
    { id: 'home', label: 'Home', icon: 'home' },
    { id: 'schedule', label: 'Schedule', icon: 'schedule' },
    { id: 'teachers', label: 'Teachers', icon: 'teachers' },
    { id: 'exams', label: 'Exams', icon: 'exams' },
    { id: 'settings', label: 'Settings', icon: 'settings' },
  ];

  return (
    <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[calc(100%-32px)] max-w-[408px] liquid-glass rounded-full p-1.5 flex justify-around items-center z-50 shadow-2xl">
      {navItems.map((item) => {
        const isActive = activeTab === item.id;
        return (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`flex flex-col items-center justify-center flex-1 py-2 px-1 rounded-full transition-all duration-200 ${
              isActive ? 'text-[#2997ff] scale-105' : 'text-[#86868b] hover:text-[#f5f5f7]'
            }`}
          >
            <Icon name={item.icon} className="w-5 h-5 mb-0.5" />
            <span className={`text-[10px] font-semibold tracking-tight ${isActive ? 'text-[#2997ff]' : 'text-[#86868b]'}`}>
              {item.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
