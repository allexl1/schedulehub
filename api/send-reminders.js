function getRedisCredentials() {
  const url = process.env.UPSTASH_KV_REST_API_URL ||
              process.env.UPSTASH_URL_REST_API_URL || 
              process.env.UPSTASH_URL_REST_URL || 
              process.env.UPSTASH_REDIS_REST_URL || 
              process.env.KV_REST_API_URL;

  const token = process.env.UPSTASH_KV_REST_API_TOKEN ||
                process.env.UPSTASH_URL_REST_API_TOKEN || 
                process.env.UPSTASH_URL_REST_TOKEN || 
                process.env.UPSTASH_REDIS_REST_TOKEN || 
                process.env.KV_REST_API_TOKEN;

  return { url, token };
}

async function redisSMembers(key) {
  const { url, token } = getRedisCredentials();
  if (!url || !token) return [];
  try {
    const res = await fetch(`${url}/smembers/${key}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    return data.result || [];
  } catch (e) {
    return [];
  }
}

async function sendTelegramMessage(chatId, text) {
  const token = process.env.BOT_TOKEN;
  if (!token) return;

  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: text,
      parse_mode: 'HTML'
    })
  });
}

export default async function handler(req, res) {
  const authHeader = req.headers.authorization;
  const querySecret = req.query.secret;
  const expectedSecret = process.env.CRON_SECRET;
  const HARDCODED_SECRET = 'schedulehub_secret_9988';

  // Accept hardcoded secret or Vercel system CRON_SECRET
  const isAuthorized = 
    querySecret === HARDCODED_SECRET ||
    querySecret === expectedSecret ||
    authHeader === `Bearer ${HARDCODED_SECRET}` ||
    (expectedSecret && authHeader === `Bearer ${expectedSecret}`);

  if (!isAuthorized) {
    return res.status(401).json({ error: 'Unauthorized: Invalid CRON_SECRET' });
  }

  try {
    const host = req.headers.host;
    const protocol = host.includes('localhost') ? 'http' : 'https';
    
    const scheduleRes = await fetch(`${protocol}://${host}/api/bsuir/schedule?group=150501`);
    const scheduleData = await scheduleRes.json();

    if (!scheduleData.success || !scheduleData.data?.nextLesson) {
      return res.status(200).json({ status: 'No upcoming lesson found' });
    }

    const next = scheduleData.data.nextLesson;
    
    if (next.startsInMinutes >= 10 && next.startsInMinutes <= 20) {
      const subscribers = await redisSMembers('bot:subscribers');

      const message = `⏰ <b>Class Reminder — Starts in ~15 mins</b>\n\n` +
                      `📖 <b>${next.subject}</b> (${next.type})\n` +
                      `📍 Room: <b>${next.room}</b>\n` +
                      `👨‍🏫 Teacher: ${next.teacher}\n` +
                      `🕒 Time: ${next.time}`;

      for (const chatId of subscribers) {
        await sendTelegramMessage(chatId, message);
      }

      return res.status(200).json({ 
        success: true, 
        sentToCount: subscribers.length,
        lesson: next.subject 
      });
    }

    return res.status(200).json({ 
      status: 'No 15-minute alert needed right now', 
      startsInMinutes: next.startsInMinutes 
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
