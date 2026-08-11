import { useEffect, useState } from 'react';

export function useTelegram() {
  const [tg, setTg] = useState(null);
  const [user, setUser] = useState(null);
  const [colorScheme, setColorScheme] = useState('dark');

  useEffect(() => {
    if (window.Telegram?.WebApp) {
      const webapp = window.Telegram.WebApp;
      webapp.ready();
      webapp.expand();
      
      setTg(webapp);
      setColorScheme(webapp.colorScheme || 'dark');

      if (webapp.initDataUnsafe?.user) {
        setUser(webapp.initDataUnsafe.user);
      }

      // Listen for dynamic theme changes from Telegram
      const handleThemeChange = () => {
        setColorScheme(webapp.colorScheme || 'dark');
      };

      webapp.onEvent('themeChanged', handleThemeChange);
      return () => webapp.offEvent('themeChanged', handleThemeChange);
    }
  }, []);

  const triggerHaptic = (style = 'light') => {
    if (tg?.HapticFeedback) {
      tg.HapticFeedback.impactOccurred(style);
    }
  };

  return { tg, user, colorScheme, triggerHaptic };
}
