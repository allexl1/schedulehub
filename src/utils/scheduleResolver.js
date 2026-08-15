export const RUSSIAN_DAYS = [
'\u0412\u043E\u0441\u043A\u0440\u0435\u0441\u0435\u043D\u044C\u0435',
'\u041F\u043E\u043D\u0435\u0434\u0435\u043B\u044C\u043D\u0438\u043A',
'\u0412\u0442\u043E\u0440\u043D\u0438\u043A',
'\u0421\u0440\u0435\u0434\u0430',
'\u0427\u0435\u0442\u0432\u0435\u0440\u0433',
'\u041F\u044F\u0442\u043D\u0438\u0446\u0430',
'\u0421\u0443\u0431\u0431\u043E\u0442\u0430'
];
export function getDayName(date = new Date()) {
return RUSSIAN_DAYS[date.getDay()];
}
export function filterLessons(lessons = [], currentWeek = 1, subgroup = 0) {
const sub = Number(subgroup) || 0;
const week = Number(currentWeek) || 1;
return (lessons || []).filter((lesson) => {
const matchWeek = !lesson.weekNumber || lesson.weekNumber.length === 0 || lesson.weekNumber.includes(week);
const matchSub = !lesson.numSubgroup || lesson.numSubgroup === 0 || sub === 0 || lesson.numSubgroup === sub;
return matchWeek && matchSub;
}).sort((a, b) => (a.startLessonTime || '').localeCompare(b.startLessonTime || ''));
}
export function getTodayLessons(schedules = {}, currentWeek = 1, subgroup = 0, date = new Date()) {
const dayName = getDayName(date);
const daySchedule = schedules ? schedules[dayName] || [] : [];
return filterLessons(daySchedule, currentWeek, subgroup);
}
export function getNextLesson(todayLessons = [], date = new Date()) {
if (!todayLessons || todayLessons.length === 0) return null;
const nowTime = date.toTimeString().slice(0, 5);
return todayLessons.find((l) => (l.endLessonTime || l.startLessonTime || '') > nowTime) || null;
}
export function resolveSchedule(raw = {}, currentWeek = 1, subgroup = 0, date = new Date()) {
const schedules = raw.schedules || {};
const exams = raw.exams || [];
const studentGroup = raw.studentGroupDto || raw.studentGroup || null;
const todaySchedules = getTodayLessons(schedules, currentWeek, subgroup, date);
const nextLesson = getNextLesson(todaySchedules, date);
return {
studentGroup,
schedules,
todaySchedules,
exams,
currentWeek: Number(currentWeek) || 1,
nextLesson
};
}
