function getRedisCredentials() {
  const url = process.env.UPSTASH_URL_REST_API_URL || 
              process.env.UPSTASH_URL_REST_URL || 
              process.env.UPSTASH_REDIS_REST_URL || 
              process.env.KV_REST_API_URL;

  const token = process.env.UPSTASH_URL_REST_API_TOKEN || 
                process.env.UPSTASH_URL_REST_TOKEN || 
                process.env.UPSTASH_REDIS_REST_TOKEN || 
                process.env.KV_REST_API_TOKEN;

  return { url, token };
}

async function redisSAdd(key, member) {
  const { url, token } = getRedisCredentials();
  if (!url || !token) return;
  try {
    await fetch(`${url}/sadd/${key}/${encodeURIComponent(member)}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
  } catch (e) {
    console.error('Redis SADD error:', e);
  }
}

async function sendTelegramMessage(chatId, text, replyMarkup = null) {
  const token = process.env.BOT_TOKEN;
  if (!token) return;

  const payload = {
    chat_id: chatId,
    text: text,
    parse_mode: 'HTML'
  };
  if (replyMarkup) {
    payload.reply_markup = replyMarkup;
  }

  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(200).send('ScheduleHub Telegram Webhook Active');
  }

  try {
    const update = req.body;
    if (!update || !update.message) {
      return res.status(200).json({ ok: true });
    }

    const message = update.message;
    const chatId = message.chat.id;
    const text = message.text || '';
    const webAppUrl = `https://${req.headers.host}`;

    // Auto-subscribe user to Redis notification set
    await redisSAdd('bot:subscribers', String(chatId));

    if (text.startsWith('/start')) {
      const welcomeText = `👋 <b>Welcome to ScheduleHub!</b>\n\nYour companion for BSUIR schedules, exams, and teacher lookup.\n\nTap below to open your interactive schedule dashboard.`;
      const keyboard = {
        inline_keyboard: [[
          { text: '📅 Open ScheduleHub', web_app: { url: webAppUrl } }
        ]]
      };
      await sendTelegramMessage(chatId, welcomeText, keyboard);
    } else if (text.startsWith('/schedule')) {
      const keyboard = {
        inline_keyboard: [[
          { text: '⚡ View Schedule', web_app: { url: webAppUrl } }
        ]]
      };
      await sendTelegramMessage(chatId, '📅 Tap below to open your timetable:', keyboard);
    } else {
      const keyboard = {
        inline_keyboard: [[
          { text: '🚀 Launch ScheduleHub', web_app: { url: webAppUrl } }
        ]]
      };
      await sendTelegramMessage(chatId, 'Tap below to launch ScheduleHub:', keyboard);
    }

    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return res.status(200).json({ ok: true });
  }
}
