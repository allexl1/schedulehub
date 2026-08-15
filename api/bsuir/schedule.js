import { resolveLessonsForDate, normalizeLesson } from ‘../../src/utils/scheduleResolver.js’;

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

async function getRedisCache(key) {
const { url, token } = getRedisCredentials();
if (!url || !token) return null;

try {
const res = await fetch(`${url}/get/${key}`, {
headers: { Authorization: `Bearer ${token}` }
});
const data = await res.json();
return data.result ? JSON.parse(data.result) : null;
} catch {
return null;
}
}

async function setRedisCache(key, value, ttlSeconds = 86400) {
const { url, token } = getRedisCredentials();
if (!url || !token) return;

try {
await fetch(`${url}/set/${key}/${encodeURIComponent(JSON.stringify(value))}?ex=${ttlSeconds}`, {
headers: { Authorization: `Bearer ${token}` }
});
} catch {
// Fail silently
}
}

// Fallback mock schedule if BSUIR API blocks Vercel IPs and Redis is empty
const MOCK_SCHEDULE = {
studentGroupDto: { name: ‘150501’ },
schedules: {},
todaySchedules: [
{
subject: ‘Computer Networks’,
lessonTypeAbbrev: ‘Lecture’,
auditories: [‘201-4’],
employees: [{ fio: ‘Ivanov A.A.’ }],
startLessonTime: ‘09:00’,
endLessonTime: ‘10:20’
}
]
};

async function fetchCurrentWeek() {
try {
const res = await fetch(
‘https://iis.bsuir.by/api/v1/schedule/current-week’,
{
headers: {
Accept: ‘application/json’
}
}
);

```
if (!res.ok) {
  return null;
}

const value = await res.json();

return typeof value === 'number'
  ? value
  : parseInt(value, 10);
```

} catch {
return null;
}
}

export default async function handler(req, res) {
res.setHeader(‘Cache-Control’, ‘s-maxage=86400, stale-while-revalidate=86400’);

const group = req.query.group;
if (!group) {
return res.status(400).json({ success: false, error: ‘Missing required group parameter’ });
}
const cacheKey = `schedule:${group}`;

let rawSchedule = null;
let isFromCache = false;
let isFallback = false;
let debugMessage = null;

// 1. Try BSUIR IIS API
try {
const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), 15000);

```
const bsuirRes = await fetch(`https://iis.bsuir.by/api/v1/schedule?studentGroup=${encodeURIComponent(group)}`, {
  signal: controller.signal,
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'ru,en;q=0.9',
    'Referer': 'https://iis.bsuir.by/'
  }
});
clearTimeout(timeout);
```

if (bsuirRes.ok) {
rawSchedule = await bsuirRes.json();
// Only cache responses that actually contain lesson data, so a
// transient BSUIR glitch never poisons the cache with an empty schedule.
if (rawSchedule.schedules && Object.keys(rawSchedule.schedules).length > 0) {
await setRedisCache(cacheKey, rawSchedule, 86400);
}
} else {
const errorText = await bsuirRes.text();
debugMessage = {
status: bsuirRes.status,
body: errorText.substring(0, 1500)
};
}
} catch (err) {
debugMessage = `BSUIR connection failed: ${err.message}`;
}

// 2. Try Upstash Redis Cache
if (!rawSchedule) {
const cached = await getRedisCache(cacheKey);
// Don’t trust a cached entry with no real lesson data — treat it the
// same as “no cache available” so we fall through to mock data with
// an honest fallback flag, rather than silently serving an empty
// schedule that looks identical to “no classes today”.
if (cached && cached.schedules && Object.keys(cached.schedules).length > 0) {
rawSchedule = cached;
isFromCache = true;
}
}

// 3. Fallback to Mock Data (prevents 500/empty errors when Vercel IPs are geoblocked)
if (!rawSchedule) {
rawSchedule = MOCK_SCHEDULE;
isFallback = true;
}

const currentWeek = await fetchCurrentWeek();

const hasRealSchedule = rawSchedule.schedules && Object.keys(rawSchedule.schedules).length > 0;
const todayLessonsRaw = hasRealSchedule
? resolveLessonsForDate(rawSchedule.schedules, new Date(), currentWeek || 1, 0)
: [];
const todayLessons = todayLessonsRaw.map(normalizeLesson);
const nextLesson = todayLessons.length > 0 ? { …todayLessons[0] } : null;

// Honest freshness signal: the frontend should treat “fallback” data
// (mock, or a cache we refused to trust) differently from a real,
// genuinely empty schedule — they render the same list length but mean
// very different things to the user.
const isStale = isFallback || (isFromCache && debugMessage != null);

return res.status(200).json({
success: true,
cached: isFromCache,
fallback: isFallback,
stale: isStale,
debug: debugMessage,
data: {
studentGroup: rawSchedule.studentGroupDto?.name || group,
schedules: rawSchedule.schedules || {},
todaySchedules: todayLessons,
exams: rawSchedule.exams || [],
currentWeek: currentWeek || 1,
nextLesson: nextLesson
}
});
}