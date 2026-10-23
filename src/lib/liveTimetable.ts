/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * LECTRA Real-Time University Timetable Engine
 */

import { TimetableEntry } from '../types';

export type DayOfWeek = 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';

export const DAYS_ORDER: DayOfWeek[] = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

export interface ZonedTimeInfo {
  date: Date;
  dayName: DayOfWeek;
  formattedDate: string; // e.g. "Friday, 23 October 2026"
  timeString: string;    // "HH:MM"
  timeStringWithSeconds: string; // "HH:MM:SS"
  hours: number;
  minutes: number;
  seconds: number;
}

export interface LiveClassItem extends TimetableEntry {
  status: 'Upcoming' | 'In Progress' | 'Ended';
  countdownLabel?: string;
  isNextUpcoming?: boolean;
}

export interface TimetableScheduleState {
  currentDayName: DayOfWeek;
  formattedCurrentDate: string;
  currentTimeString: string;
  isSimulatedTime: boolean;
  timeZone: string;

  // Active view mode
  viewMode: 'TODAY_ACTIVE' | 'NEXT_DAY_TRANSITION' | 'NO_CLASSES_SCHEDULED' | 'EMPTY_TIMETABLE';
  
  // Header display texts
  superHeading: string;       // e.g. "UNIVERSITY TIMETABLE"
  mainHeading: string;        // e.g. "TODAY'S CLASSES — FRIDAY, 23 OCTOBER 2026"
  statusBadge: string;        // e.g. "3 classes remaining"
  noticeMessage?: string;     // e.g. "Today's classes are complete."

  // The active classes to display in chronological order
  activeClasses: LiveClassItem[];

  // Classes that ended today (kept in history, never deleted)
  endedClassesToday: LiveClassItem[];

  // All classes originally scheduled for today
  allScheduledToday: LiveClassItem[];

  // Information about the next scheduled teaching day
  nextAcademicDay?: {
    dayName: DayOfWeek;
    formattedDate: string;
    classes: LiveClassItem[];
    isTomorrow: boolean;
    daysAhead: number;
  };

  // Next scheduled class preview (if viewing next day or empty state)
  nextScheduledClassPreview?: LiveClassItem & { dayName: DayOfWeek };
}

/**
 * Parses and returns zoned time information
 */
export function getZonedTime(baseDate: Date, timeZone: string = 'Africa/Nairobi'): ZonedTimeInfo {
  try {
    const formatter = new Intl.DateTimeFormat('en-GB', {
      timeZone,
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });

    const parts = formatter.formatToParts(baseDate);
    const getPart = (type: string) => parts.find((p) => p.type === type)?.value || '';

    const weekdayStr = getPart('weekday') as DayOfWeek;
    const dayStr = getPart('day');
    const monthStr = getPart('month');
    const yearStr = getPart('year');
    const hourStr = getPart('hour');
    const minuteStr = getPart('minute');
    const secondStr = getPart('second');

    const dayName: DayOfWeek = (DAYS_ORDER.includes(weekdayStr) ? weekdayStr : 'Friday') as DayOfWeek;
    const formattedDate = `${dayName}, ${dayStr} ${monthStr} ${yearStr}`;
    const timeString = `${hourStr.padStart(2, '0')}:${minuteStr.padStart(2, '0')}`;
    const timeStringWithSeconds = `${timeString}:${secondStr.padStart(2, '0')}`;

    return {
      date: baseDate,
      dayName,
      formattedDate,
      timeString,
      timeStringWithSeconds,
      hours: parseInt(hourStr, 10) || 0,
      minutes: parseInt(minuteStr, 10) || 0,
      seconds: parseInt(secondStr, 10) || 0,
    };
  } catch (err) {
    // Fallback using standard Date methods
    const dayName = DAYS_ORDER[baseDate.getDay()];
    const formattedDate = baseDate.toLocaleDateString('en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    const timeString = `${String(baseDate.getHours()).padStart(2, '0')}:${String(baseDate.getMinutes()).padStart(2, '0')}`;
    return {
      date: baseDate,
      dayName: dayName as DayOfWeek,
      formattedDate,
      timeString,
      timeStringWithSeconds: `${timeString}:00`,
      hours: baseDate.getHours(),
      minutes: baseDate.getMinutes(),
      seconds: baseDate.getSeconds(),
    };
  }
}

/**
 * Calculates countdown string from current time to target HH:MM
 */
export function calculateCountdown(currentHH: number, currentMM: number, targetTimeStr: string): string {
  const [targetH, targetM] = targetTimeStr.split(':').map(Number);
  const diffMinutes = (targetH * 60 + targetM) - (currentHH * 60 + currentMM);

  if (diffMinutes <= 0) return 'Starting now';
  if (diffMinutes < 60) return `Starts in ${diffMinutes}m`;
  const hours = Math.floor(diffMinutes / 60);
  const mins = diffMinutes % 60;
  return `Starts in ${hours}h ${mins > 0 ? `${mins}m` : ''}`;
}

/**
 * Evaluates real-time timetable lifecycle and computes active/upcoming/ended classes
 */
export function computeLiveTimetableState(
  timetable: TimetableEntry[],
  currentDate: Date,
  timeZone: string = 'Africa/Nairobi',
  isSimulatedTime: boolean = false
): TimetableScheduleState {
  const timeInfo = getZonedTime(currentDate, timeZone);
  const { dayName: todayName, formattedDate: todayFormattedDate, timeString: currentTime } = timeInfo;

  if (!timetable || timetable.length === 0) {
    return {
      currentDayName: todayName,
      formattedCurrentDate: todayFormattedDate,
      currentTimeString: currentTime,
      isSimulatedTime,
      timeZone,
      viewMode: 'EMPTY_TIMETABLE',
      superHeading: 'UNIVERSITY TIMETABLE',
      mainHeading: `TODAY'S CLASSES — ${todayFormattedDate.toUpperCase()}`,
      statusBadge: 'No timetable loaded',
      activeClasses: [],
      endedClassesToday: [],
      allScheduledToday: [],
    };
  }

  // 1. Get all classes scheduled for today, sorted chronologically by startTime
  const todayEntries = timetable
    .filter((entry) => entry.day === todayName && !entry.isCancelled)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  // Determine status for all classes scheduled for today
  const evaluatedTodayClasses: LiveClassItem[] = todayEntries.map((cls) => {
    let status: 'Upcoming' | 'In Progress' | 'Ended' = 'Upcoming';

    // Check if class has ended (at or after scheduled endTime)
    if (currentTime >= cls.endTime) {
      status = 'Ended';
    } else if (currentTime >= cls.startTime && currentTime < cls.endTime) {
      status = 'In Progress';
    } else {
      status = 'Upcoming';
    }

    return {
      ...cls,
      status,
      venue: cls.venue || 'Venue not provided',
    };
  });

  // Active classes for today: only 'Upcoming' or 'In Progress'. Ended classes are automatically removed!
  const activeClassesToday = evaluatedTodayClasses.filter((c) => c.status !== 'Ended');
  const endedClassesToday = evaluatedTodayClasses.filter((c) => c.status === 'Ended');

  // Mark the next upcoming class
  const nextUpcoming = activeClassesToday.find((c) => c.status === 'Upcoming');
  if (nextUpcoming) {
    nextUpcoming.isNextUpcoming = true;
    nextUpcoming.countdownLabel = calculateCountdown(timeInfo.hours, timeInfo.minutes, nextUpcoming.startTime);
  }

  // 2. Find the next academic day with recorded classes
  const dayOrder: DayOfWeek[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const currentDayIdx = dayOrder.indexOf(todayName);

  let nextAcademicDayInfo: TimetableScheduleState['nextAcademicDay'] = undefined;

  for (let i = 1; i <= 7; i++) {
    const candidateDayName = dayOrder[(currentDayIdx + i) % 7];
    const candidateClasses = timetable
      .filter((t) => t.day === candidateDayName && !t.isCancelled)
      .sort((a, b) => a.startTime.localeCompare(b.startTime));

    if (candidateClasses.length > 0) {
      // Calculate calendar date of candidate day
      const candidateDate = new Date(currentDate);
      candidateDate.setDate(candidateDate.getDate() + i);
      const candidateZoned = getZonedTime(candidateDate, timeZone);

      nextAcademicDayInfo = {
        dayName: candidateDayName,
        formattedDate: candidateZoned.formattedDate,
        isTomorrow: i === 1,
        daysAhead: i,
        classes: candidateClasses.map((c) => ({
          ...c,
          status: 'Upcoming',
          venue: c.venue || 'Venue not provided',
        })),
      };
      break;
    }
  }

  // Next scheduled class preview
  const nextScheduledClassPreview = nextAcademicDayInfo?.classes[0]
    ? { ...nextAcademicDayInfo.classes[0], dayName: nextAcademicDayInfo.dayName }
    : undefined;

  // 3. Determine View Mode:
  // Case A: Today has active classes (classes still ahead or in progress)
  if (todayEntries.length > 0 && activeClassesToday.length > 0) {
    const inProgressCount = activeClassesToday.filter((c) => c.status === 'In Progress').length;
    const remainingCount = activeClassesToday.length;

    let badge = `${remainingCount} ${remainingCount === 1 ? 'class' : 'classes'} remaining`;
    if (inProgressCount > 0) {
      badge = `1 in progress • ${remainingCount} remaining`;
    }

    return {
      currentDayName: todayName,
      formattedCurrentDate: todayFormattedDate,
      currentTimeString: currentTime,
      isSimulatedTime,
      timeZone,
      viewMode: 'TODAY_ACTIVE',
      superHeading: todayFormattedDate,
      mainHeading: "TODAY'S CLASSES",
      statusBadge: badge,
      activeClasses: activeClassesToday,
      endedClassesToday,
      allScheduledToday: evaluatedTodayClasses,
      nextAcademicDay: nextAcademicDayInfo,
      nextScheduledClassPreview,
    };
  }

  // Case B: All scheduled classes for today have ended -> AUTOMATIC NEXT-DAY TRANSITION!
  if (todayEntries.length > 0 && activeClassesToday.length === 0) {
    if (nextAcademicDayInfo) {
      const isTomorrow = nextAcademicDayInfo.isTomorrow;
      const nextClassesCount = nextAcademicDayInfo.classes.length;

      return {
        currentDayName: todayName,
        formattedCurrentDate: todayFormattedDate,
        currentTimeString: currentTime,
        isSimulatedTime,
        timeZone,
        viewMode: 'NEXT_DAY_TRANSITION',
        superHeading: nextAcademicDayInfo.formattedDate,
        mainHeading: 'NEXT CLASSES',
        statusBadge: `${nextClassesCount} ${nextClassesCount === 1 ? 'class' : 'classes'} scheduled ${isTomorrow ? 'tomorrow' : `on ${nextAcademicDayInfo.dayName}`}`,
        noticeMessage: "Today's classes are complete.",
        activeClasses: nextAcademicDayInfo.classes,
        endedClassesToday,
        allScheduledToday: evaluatedTodayClasses,
        nextAcademicDay: nextAcademicDayInfo,
        nextScheduledClassPreview,
      };
    }
  }

  // Case C: Today had NO classes scheduled at all
  if (todayEntries.length === 0) {
    if (nextAcademicDayInfo) {
      return {
        currentDayName: todayName,
        formattedCurrentDate: todayFormattedDate,
        currentTimeString: currentTime,
        isSimulatedTime,
        timeZone,
        viewMode: 'NO_CLASSES_SCHEDULED',
        superHeading: todayFormattedDate,
        mainHeading: "TODAY'S CLASSES",
        statusBadge: `No classes scheduled today • Next teaching day: ${nextAcademicDayInfo.dayName}`,
        noticeMessage: `No classes scheduled for ${todayName}.`,
        activeClasses: nextAcademicDayInfo.classes,
        endedClassesToday: [],
        allScheduledToday: [],
        nextAcademicDay: nextAcademicDayInfo,
        nextScheduledClassPreview,
      };
    }
  }

  // Fallback
  return {
    currentDayName: todayName,
    formattedCurrentDate: todayFormattedDate,
    currentTimeString: currentTime,
    isSimulatedTime,
    timeZone,
    viewMode: 'NO_CLASSES_SCHEDULED',
    superHeading: todayFormattedDate,
    mainHeading: "TODAY'S CLASSES",
    statusBadge: 'No classes scheduled',
    activeClasses: [],
    endedClassesToday: [],
    allScheduledToday: [],
    nextAcademicDay: nextAcademicDayInfo,
    nextScheduledClassPreview,
  };
}
