import { Redis } from '@upstash/redis';
import { resolveSchedule } from '../../src/utils/scheduleResolver.js';
const redis = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
? Redis.fromEnv()
: null;
const CACHE_TTL = 86400;
async function fetchWithTimeout(url, timeoutMs = 6000) {
const controller = new AbortController();
const timer = setTimeout(() => controller.abort(), timeoutMs);
try {
const res = await fetch(url, {
signal: controller.signal,
headers: { Accept: 'application/json' }
});
if (!res.ok) throw new Error('HTTP ' + res.status);
return await res.json();
} finally {
clearTimeout(timer);
}
}
export default async function handler(req, res) {
const group = String(req.query.group || req.query.studentGroup || '053503').trim();
const subgroup = Number(req.query.subgroup) || 0;
const cacheKey = 'bsuir:schedule:' + group;
let rawSchedule = null;
let currentWeek = 1;
let cached = false;
let stale = false;
let fallback = false;
let debug = '';
try {
const [schedRes, weekRes] = await Promise.all([
fetchWithTimeout('https://iis.bsuir.by/api/v1/schedule?studentGroup=' + encodeURIComponent(group)),
fetchWithTimeout('https://iis.bsuir.by/api/v1/schedule/current-week').catch)(() => 1)
]);
rawSchedule = schedRes;
currentWeek = Number(weekRes) || 1;
const hasData = rawSchedule && rawSchedule.schedules && Object.keys(rawSchedule.schedules).length > 0;
if (hasData && redis) {
await redis.set(cacheKey, JSON.stringify({ rawSchedule, currentWeek }), { ex: CACHE_TTL }).catch(() => {});
}
} catch (err) {
debug = err.message || 'fetch_failed';
if (redis) {
try {
const cachedData = await redis.get(cacheKey);
const parsed = typeof cachedData === 'string' ? JSON.parse(cachedData) : cachedData;
if (parsed && parsed.rawSchedule) {
rawSchedule = parsed.rawSchedule;
currentWeek = parsed.currentWeek || 1;
cached = true;
stale = true;
}
} catch (cacheErr) {
debug += ' | cache_err: ' + cacheErr.message;
}
}
if (!rawSchedule) {
fallback = true;
rawSchedule = {
studentGroupDto: { name: group },
schedules: {},
exams: []
};
currentWeek = 1;
}
}
const resolved = resolveSchedule(rawSchedule, currentWeek, subgroup);
return res.status(200).json({
success: true,
cached,
fallback,
stale,
debug: debug || 'ok',
data: resolved
});
}
