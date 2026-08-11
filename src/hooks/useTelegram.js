import { useEffect, useState } from 'react';

export function useTelegram() {
  const [tg, setTg] = useState(null);
  const [user, setUser] = useState(null);

  useEffect(() => {
    if (window.Telegram?.WebApp) {
      const webapp = window.Telegram.WebApp;
      webapp.ready();
      webapp.expand();
      setTg(webapp);
      if (webapp.initDataUnsafe?.user) {
        setUser(webapp.initDataUnsafe.user);
      }
    }
  }, []);

  const triggerHaptic = (style = 'light') => {
    if (tg?.HapticFeedback) {
      tg.HapticFeedback.impactOccurred(style);
    }
  };

  return { tg, user, triggerHaptic };
}
