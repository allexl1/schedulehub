import assert from "node:assert/strict";

import {
  resolveLessonsForDate,
  getAcademicWeekForDateMondayBased,
  getNextLesson
} from "../src/utils/scheduleResolver.js";

const schedules = {
  "Понедельник": [
    {
      subject: "Common",
      subjectFullName: "Common Lesson",
      lessonTypeAbbrev: "ЛК",
      startLessonTime: "09:00",
      endLessonTime: "10:20",
      weekNumber: [1, 2, 3, 4],
      numSubgroup: 0,
      auditories: [],
      employees: []
    },
    {
      subject: "Subgroup 1",
      subjectFullName: "Subgroup 1 Lesson",
      lessonTypeAbbrev: "ПЗ",
      startLessonTime: "10:40",
      endLessonTime: "12:00",
      weekNumber: [1, 3],
      numSubgroup: 1,
      auditories: [],
      employees: []
    },
    {
      subject: "Subgroup 2",
      subjectFullName: "Subgroup 2 Lesson",
      lessonTypeAbbrev: "ПЗ",
      startLessonTime: "10:40",
      endLessonTime: "12:00",
      weekNumber: [1, 3],
      numSubgroup: 2,
      auditories: [],
      employees: []
    },
    {
      subject: "Week 2 Only",
      subjectFullName: "Week 2 Only",
      lessonTypeAbbrev: "ПЗ",
      startLessonTime: "13:00",
      endLessonTime: "14:20",
      weekNumber: [2],
      numSubgroup: 0,
      auditories: [],
      employees: []
    }
  ]
};

const referenceDate = new Date(2026, 7, 17, 12, 0);

const week1Monday = new Date(
  2026,
  7,
  17,
  9,
  0
);

const week2Monday = new Date(
  2026,
  7,
  24,
  9,
  0
);

assert.equal(
  getAcademicWeekForDateMondayBased(
    week1Monday,
    1,
    referenceDate
  ),
  1,
  "Current Monday should resolve to week 1"
);

assert.equal(
  getAcademicWeekForDateMondayBased(
    week2Monday,
    1,
    referenceDate
  ),
  2,
  "One week later should resolve to week 2"
);

const allWeek1 =
  resolveLessonsForDate(
    schedules,
    week1Monday,
    1,
    "all",
    { referenceDate }
  );

assert.deepEqual(
  allWeek1.map(lesson => lesson.subject),
  [
    "Common",
    "Subgroup 1",
    "Subgroup 2"
  ],
  "all should contain common + both subgroups"
);

const subgroup1 =
  resolveLessonsForDate(
    schedules,
    week1Monday,
    1,
    1,
    { referenceDate }
  );

assert.deepEqual(
  subgroup1.map(lesson => lesson.subject),
  [
    "Common",
    "Subgroup 1"
  ],
  "subgroup 1 should contain common + subgroup 1"
);

const subgroup2 =
  resolveLessonsForDate(
    schedules,
    week1Monday,
    1,
    2,
    { referenceDate }
  );

assert.deepEqual(
  subgroup2.map(lesson => lesson.subject),
  [
    "Common",
    "Subgroup 2"
  ],
  "subgroup 2 should contain common + subgroup 2"
);

const week2 =
  resolveLessonsForDate(
    schedules,
    week2Monday,
    2,
    "all",
    { referenceDate }
  );

assert.deepEqual(
  week2.map(lesson => lesson.subject),
  ["Common", "Week 2 Only"],
  "week 2 should exclude week 1/3 subgroup lessons"
);

const sorted =
  resolveLessonsForDate(
    schedules,
    week1Monday,
    1,
    "all",
    { referenceDate }
  );

assert.ok(
  sorted[0].startLessonTime <=
    sorted[1].startLessonTime,
  "Lessons should be sorted by start time"
);

const next =
  getNextLesson(
    schedules,
    week1Monday,
    week1Monday,
    "all",
    1,
    new Date(2026, 7, 17, 8, 30)
  );

assert.equal(
  next?.subject,
  "Common",
  "Next lesson should be the first lesson before classes begin"
);

const nextAfterFirst =
  getNextLesson(
    schedules,
    week1Monday,
    week1Monday,
    "all",
    1,
    new Date(2026, 7, 17, 9, 30)
  );

assert.equal(
  nextAfterFirst?.subject,
  "Subgroup 1",
  "Next lesson should skip an already-started lesson"
);

console.log(
  "All scheduleResolver tests passed."
);