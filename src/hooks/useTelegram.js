import { useEffect, useState } from 'react';

export function useTelegram() {
  const [tg, setTg] = useState(null);
  const [user, setUser] = useState(null);

  useEffect(() => {
    if (window.Telegram?.WebApp) {
      const webapp = window.Telegram.WebApp;
      webapp.ready();
      webapp.expand(); // Auto-expand to full height inside Telegram
      
      setTg(webapp);
      if (webapp.initDataUnsafe?.user) {
        setUser(webapp.initDataUnsafe.user);
      }
    }
  }, []);

  // Native Haptic Feedback Helpers
  const triggerHaptic = (style = 'light') => {
    if (tg?.HapticFeedback) {
      tg.HapticFeedback.impactOccurred(style); // 'light' | 'medium' | 'heavy' | 'rigid' | 'soft'
    }
  };

  const triggerNotification = (type = 'success') => {
    if (tg?.HapticFeedback) {
      tg.HapticFeedback.notificationOccurred(type); // 'error' | 'success' | 'warning'
    }
  };

  const closeApp = () => {
    if (tg) tg.close();
  };

  return {
    tg,
    user,
    colorScheme: tg?.colorScheme || 'dark',
    triggerHaptic,
    triggerNotification,
    closeApp
  };
}
