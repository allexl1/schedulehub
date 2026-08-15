function getWeekNumber(entry) {
  return (
    entry?.weekNumber ??
    entry?.week ??
    entry?.weekNum ??
    entry?.weekNumberDto?.weekNumber ??
    null
  );
}

function getDayName(entry) {
  return (
    entry?.day ??
    entry?.dayName ??
    entry?.weekDay ??
    entry?.weekday ??
    null
  );
}

function getSubgroup(entry) {
  return (
    entry?.subgroup ??
    entry?.subgroupNumber ??
    entry?.subGroup ??
    0
  );
}

function matchesSubgroup(lesson, subgroup) {
  const lessonSubgroup = Number(getSubgroup(lesson));

  // 0 means the lesson applies to everyone.
  if (!lessonSubgroup) return true;

  return lessonSubgroup === Number(subgroup);
}

export function resolveLessonsForWeekday(
  schedules = {},
  dayName,
  subgroup = 1
) {
  const results = [];

  Object.entries(schedules).forEach(([weekKey, weekSchedule]) => {
    const weekNumber =
      Number(weekKey) ||
      Number(weekSchedule?.weekNumber) ||
      Number(weekSchedule?.week) ||
      1;

    const lessons = Array.isArray(weekSchedule)
      ? weekSchedule
      : weekSchedule?.lessons ||
        weekSchedule?.schedule ||
        [];

    lessons.forEach((lesson) => {
      const lessonDay = getDayName(lesson);

      if (
        lessonDay === dayName &&
        matchesSubgroup(lesson, subgroup)
      ) {
        results.push({
          ...lesson,
          weekNumber
        });
      }
    });
  });

  return results;
}

export function resolveLessonsForDate(
  schedules = {},
  date,
  currentWeek = 1,
  subgroup = 1
) {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const dayName = days[date.getDay()];

  return resolveLessonsForWeekday(
    schedules,
    dayName,
    subgroup
  ).filter((lesson) => {
    const lessonWeek = Number(lesson.weekNumber);

    if (!lessonWeek) return true;

    return lessonWeek === Number(currentWeek);
  });
}

export function normalizeLesson(lesson = {}) {
  return {
    ...lesson,

    id:
      lesson.id ??
      `${lesson.subject || 'lesson'}-${lesson.time || ''}-${lesson.room || ''}`,

    subject:
      lesson.subject ??
      lesson.name ??
      'Untitled lesson',

    type:
      lesson.type ??
      lesson.lessonTypeAbbrev ??
      'Lecture',

    room:
      lesson.room ??
      lesson.auditory ??
      lesson.auditories?.join(', ') ??
      '',

    teacher:
      lesson.teacher ??
      lesson.employees?.map((employee) => employee.fio).join(', ') ??
      '',

    time:
      lesson.time ??
      (
        lesson.startLessonTime && lesson.endLessonTime
          ? `${lesson.startLessonTime} - ${lesson.endLessonTime}`
          : ''
      )
  };
}