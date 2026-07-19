import type { ReadinessLevel, SetProgress } from "../types/interview";

export interface ReviewInfo {
  due: boolean;
  label: string;
  intervalDays: number;
  daysSinceLastStudy: number | null;
}

const DAY_MS = 24 * 60 * 60 * 1000;
const BASE_INTERVALS = [1, 3, 7, 14, 30, 60] as const;

export function toLocalDateKey(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function startOfLocalDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

export function daysBetweenLocalDates(fromIso: string, to = new Date()): number {
  const from = new Date(fromIso);
  if (Number.isNaN(from.getTime())) return 0;
  return Math.max(0, Math.floor((startOfLocalDay(to) - startOfLocalDay(from)) / DAY_MS));
}

export function getStudyCount(progress: SetProgress | undefined, questionId: string): number {
  return progress?.questionStats?.[questionId]?.studyCount ?? 0;
}

export function getReviewIntervalDays(studyCount: number, readiness?: ReadinessLevel): number {
  if (studyCount <= 0) return 0;
  const base = BASE_INTERVALS[Math.min(studyCount - 1, BASE_INTERVALS.length - 1)];

  if (readiness === 1) return 0;
  if (readiness === 2) return Math.max(1, Math.round(base * 0.5));
  if (readiness === 4) return Math.max(1, Math.round(base * 1.35));
  if (readiness === 5) return Math.max(1, Math.round(base * 1.8));
  return base;
}

export function getReviewInfo(progress: SetProgress | undefined, questionId: string, now = new Date()): ReviewInfo {
  const stat = progress?.questionStats?.[questionId];
  const readiness = progress?.readiness?.[questionId];
  const studyCount = stat?.studyCount ?? 0;

  if (!stat?.lastStudiedAt || studyCount === 0) {
    return {
      due: true,
      label: "미학습",
      intervalDays: 0,
      daysSinceLastStudy: null,
    };
  }

  const intervalDays = getReviewIntervalDays(studyCount, readiness);
  const daysSinceLastStudy = daysBetweenLocalDates(stat.lastStudiedAt, now);
  const remainingDays = intervalDays - daysSinceLastStudy;

  if (remainingDays <= 0) {
    return {
      due: true,
      label: "오늘 복습",
      intervalDays,
      daysSinceLastStudy,
    };
  }

  return {
    due: false,
    label: `${remainingDays}일 후 복습`,
    intervalDays,
    daysSinceLastStudy,
  };
}

export function isDueForReview(progress: SetProgress | undefined, questionId: string, now = new Date()): boolean {
  return getReviewInfo(progress, questionId, now).due;
}

export function getRecentStudyTotal(progress: SetProgress | undefined, days: number, now = new Date()): number {
  const counts = progress?.dailyStudyCounts ?? {};
  let total = 0;

  for (let offset = 0; offset < days; offset += 1) {
    const date = new Date(now);
    date.setDate(now.getDate() - offset);
    total += counts[toLocalDateKey(date)] ?? 0;
  }

  return total;
}

export function getRecentStudySeconds(progress: SetProgress | undefined, days: number, now = new Date()): number {
  const seconds = progress?.dailyStudySeconds ?? {};
  let total = 0;

  for (let offset = 0; offset < days; offset += 1) {
    const date = new Date(now);
    date.setDate(now.getDate() - offset);
    total += seconds[toLocalDateKey(date)] ?? 0;
  }

  return total;
}

export function formatStudyDuration(totalSeconds: number): string {
  if (totalSeconds <= 0) return "0분";
  if (totalSeconds < 60) return "<1분";
  const minutes = Math.round(totalSeconds / 60);
  if (minutes < 60) return `${minutes}분`;
  const hours = minutes / 60;
  return `${Number.isInteger(hours) ? hours.toFixed(0) : hours.toFixed(1)}시간`;
}
