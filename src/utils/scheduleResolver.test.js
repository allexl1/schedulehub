import {
  getAcademicWeekForDate,
  resolveLessonsForDate
} from './scheduleResolver';

function date(value) {
  const [year, month, day] = value
    .split('-')
    .map(Number);

  return new Date(
    year,
    month - 1,
    day
  );
}

const schedule = {
  Понедельник: [
    {
      id: 'monday-week-1',
      subject: 'Week 1 Monday',
      startLessonTime: '09:00',
      endLessonTime: '10:20',
      weekNumber: 1,
      numSubgroup: 0
    },
    {
      id: 'monday-week-2',
      subject: 'Week 2 Monday',
      startLessonTime: '11:00',
      endLessonTime: '12:20',
      weekNumber: 2,
      numSubgroup: 0
    }
  ],

  Вторник: [
    {
      id: 'tuesday-all-weeks',
      subject: 'Every Week',
      startLessonTime: '10:10',
      endLessonTime: '11:30',
      weekNumber: 0,
      numSubgroup: 0
    }
  ],

  Среда: [
    {
      id: 'subgroup-1',
      subject: 'Subgroup 1',
      startLessonTime: '09:00',
      endLessonTime: '10:20',
      weekNumber: 1,
      numSubgroup: 1
    },
    {
      id: 'subgroup-2',
      subject: 'Subgroup 2',
      startLessonTime: '09:00',
      endLessonTime: '10:20',
      weekNumber: 1,
      numSubgroup: 2
    }
  ],

  Четверг: [
    {
      id: 'date-specific',
      subject: 'Date Specific',
      startLessonTime: '13:00',
      endLessonTime: '14:20',
      weekNumber: 1,
      dateLesson: '2026-09-03'
    }
  ],

  Пятница: [
    {
      id: 'date-range',
      subject: 'Date Range',
      startLessonTime: '15:00',
      endLessonTime: '16:20',
      weekNumber: 1,
      startLessonDate: '2026-09-04',
      endLessonDate: '2026-09-18'
    }
  ]
};

describe('scheduleResolver', () => {
  test('September 1 is academic week 1', () => {
    expect(
      getAcademicWeekForDate(
        date('2026-09-01'),
        date('2026-09-01')
      )
    ).toBe(1);
  });

  test('September 7 moves to academic week 2', () => {
    expect(
      getAcademicWeekForDate(
        date('2026-09-07'),
        date('2026-09-01')
      )
    ).toBe(2);
  });

  test('September 14 moves to academic week 3', () => {
    expect(
      getAcademicWeekForDate(
        date('2026-09-14'),
        date('2026-09-01')
      )
    ).toBe(3);
  });

  test('September 21 moves to academic week 4', () => {
    expect(
      getAcademicWeekForDate(
        date('2026-09-21'),
        date('2026-09-01')
      )
    ).toBe(4);
  });

  test('September 28 starts the cycle again at week 1', () => {
    expect(
      getAcademicWeekForDate(
        date('2026-09-28'),
        date('2026-09-01')
      )
    ).toBe(1);
  });

  test('resolves the real BSUIR weekday keys', () => {
    const lessons =
      resolveLessonsForDate(
        schedule,
        date('2026-09-01'),
        1,
        'all',
        {
          referenceDate: date('2026-09-01')
        }
      );

    expect(lessons).toHaveLength(1);
    expect(lessons[0].subject).toBe(
      'Week 1 Monday'
    );
  });

  test('filters lessons by academic week', () => {
    const lessons =
      resolveLessonsForDate(
        schedule,
        date('2026-09-07'),
        2,
        'all',
        {
          referenceDate: date('2026-09-01')
        }
      );

    expect(lessons).toHaveLength(1);
    expect(lessons[0].subject).toBe(
      'Week 2 Monday'
    );
  });

  test('always-week lessons survive every academic week', () => {
    const lessons =
      resolveLessonsForDate(
        schedule,
        date('2026-09-08'),
        2,
        'all',
        {
          referenceDate: date('2026-09-01')
        }
      );

    expect(lessons).toHaveLength(1);
    expect(lessons[0].subject).toBe(
      'Every Week'
    );
  });

  test('subgroup 1 receives subgroup 1 lesson', () => {
    const lessons =
      resolveLessonsForDate(
        schedule,
        date('2026-09-02'),
        1,
        1,
        {
          referenceDate: date('2026-09-01')
        }
      );

    expect(lessons).toHaveLength(1);
    expect(lessons[0].subject).toBe(
      'Subgroup 1'
    );
  });

  test('subgroup 2 receives subgroup 2 lesson', () => {
    const lessons =
      resolveLessonsForDate(
        schedule,
        date('2026-09-02'),
        1,
        2,
        {
          referenceDate: date('2026-09-01')
        }
      );

    expect(lessons).toHaveLength(1);
    expect(lessons[0].subject).toBe(
      'Subgroup 2'
    );
  });

  test('dateLesson overrides recurring availability', () => {
    const matching =
      resolveLessonsForDate(
        schedule,
        date('2026-09-03'),
        1,
        'all',
        {
          referenceDate: date('2026-09-01')
        }
      );

    const nonMatching =
      resolveLessonsForDate(
        schedule,
        date('2026-09-10'),
        1,
        'all',
        {
          referenceDate: date('2026-09-01')
        }
      );

    expect(
      matching.some(
        lesson =>
          lesson.subject ===
          'Date Specific'
      )
    ).toBe(true);

    expect(
      nonMatching.some(
        lesson =>
          lesson.subject ===
          'Date Specific'
      )
    ).toBe(false);
  });

  test('date ranges are inclusive', () => {
    const first =
      resolveLessonsForDate(
        schedule,
        date('2026-09-04'),
        1,
        'all',
        {
          referenceDate: date('2026-09-01')
        }
      );

    const last =
      resolveLessonsForDate(
        schedule,
        date('2026-09-18'),
        1,
        'all',
        {
          referenceDate: date('2026-09-01')
        }
      );

    expect(
      first.some(
        lesson =>
          lesson.subject ===
          'Date Range'
      )
    ).toBe(true);

    expect(
      last.some(
        lesson =>
          lesson.subject ===
          'Date Range'
      )
    ).toBe(true);
  });

  test('lessons outside a date range are excluded', () => {
    const lessons =
      resolveLessonsForDate(
        schedule,
        date('2026-09-25'),
        1,
        'all',
        {
          referenceDate: date('2026-09-01')
        }
      );

    expect(
      lessons.some(
        lesson =>
          lesson.subject ===
          'Date Range'
      )
    ).toBe(false);
  });
});