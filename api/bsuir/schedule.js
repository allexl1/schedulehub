const DAYS_MAP = ['воскресенье', 'понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота'];

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  const { group = '150501', subgroup = '1' } = req.query;

  try {
    const bsuirRes = await fetch(`https://iis.bsuir.by/api/v1/schedule?studentGroup=${group}`);
    
    if (!bsuirRes.ok) {
      return res.status(503).json({ success: false, error: 'BSUIR API HTTP 503', isStale: true });
    }

    const rawData = await bsuirRes.json();
    const currentWeek = rawData.currentWeekNumber || 1;
    
    // Determine today's day name in Russian (matching BSUIR API format)
    const now = new Date();
    const todayName = DAYS_MAP[now.getDay()];

    // Find today's schedule from BSUIR payload
    const todayRaw = rawData.schedules?.[todayName] || [];
    
    // Filter by week number and user subgroup (0 = entire group)
    const activeSubgroup = parseInt(subgroup, 10);
    const filteredLessons = todayRaw.filter(lesson => {
      const matchesWeek = !lesson.weekNumber || lesson.weekNumber.includes(currentWeek);
      const matchesSubgroup = lesson.numSubgroup === 0 || lesson.numSubgroup === activeSubgroup;
      return matchesWeek && matchesSubgroup;
    });

    // Normalize lessons for frontend consumption
    const todaySchedule = filteredLessons.map((lesson, idx) => {
      const teacher = lesson.employees?.[0] 
        ? `${lesson.employees[0].lastName} ${lesson.employees[0].firstName?.[0] || ''}.${lesson.employees[0].middleName?.[0] || ''}.`
        : 'Department Staff';

      const room = lesson.auditories?.[0] || 'TBD';

      return {
        id: String(idx + 1),
        subject: lesson.subject || 'Lesson',
        type: lesson.lessonTypeAbbrev || 'Class',
        time: `${lesson.startLessonTime} - ${lesson.endLessonTime}`,
        startTime: lesson.startLessonTime,
        endTime: lesson.endLessonTime,
        room: room,
        teacher: teacher,
        status: 'upcoming'
      };
    });

    // Identify next upcoming class based on current time
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    let nextLesson = null;

    for (const lesson of todaySchedule) {
      const [hours, mins] = lesson.startTime.split(':').map(Number);
      const lessonStartMinutes = hours * 60 + mins;

      if (lessonStartMinutes > currentMinutes) {
        nextLesson = {
          ...lesson,
          startsInMinutes: lessonStartMinutes - currentMinutes
        };
        lesson.status = 'next';
        break;
      } else {
        lesson.status = 'completed';
      }
    }

    return res.status(200).json({
      success: true,
      data: {
        student: { name: "Alex", group, subgroup: activeSubgroup, currentWeek },
        nextLesson: nextLesson || todaySchedule[todaySchedule.length - 1] || null,
        todaySchedule
      },
      fetchedAt: new Date().toISOString()
    });

  } catch (error) {
    return res.status(500).json({ success: false, error: error.message, isStale: true });
  }
}
