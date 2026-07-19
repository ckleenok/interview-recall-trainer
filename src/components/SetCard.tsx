import type { PracticeMode, QuestionSet, QuestionType, QuestionTypeFilter, SetProgress } from "../types/interview";
import { QUESTION_STRUCTURES } from "../utils/questionStructure";
import {
  formatStudyDuration,
  getRecentStudySeconds,
  getRecentStudyTotal,
  getStudyCount,
  isDueForReview,
  toLocalDateKey,
} from "../utils/studySchedule";

interface SetCardProps {
  questionSet: QuestionSet;
  progress?: SetProgress;
  questionTypeFilter: QuestionTypeFilter;
  onStart: (mode: PracticeMode, start: "resume" | "new") => void;
  onDelete?: () => void;
}

function formatDate(date?: string): string {
  if (!date) return "아직 없음";
  return new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(date));
}

function countType(questionSet: QuestionSet, type: QuestionType): number {
  return questionSet.questions.filter((question) => question.questionType === type).length;
}

function formatShortDate(date: Date): string {
  return new Intl.DateTimeFormat("ko-KR", { month: "numeric", day: "numeric" }).format(date);
}

function getDailyItems(progress?: SetProgress): Array<{ date: string; label: string; count: number; seconds: number }> {
  const today = new Date();
  return Array.from({ length: 7 }, (_, index) => {
    const offset = 6 - index;
    const date = new Date(today);
    date.setDate(today.getDate() - offset);
    const key = toLocalDateKey(date);
    return {
      date: key,
      label: offset === 0 ? "오늘" : formatShortDate(date),
      count: progress?.dailyStudyCounts?.[key] ?? 0,
      seconds: progress?.dailyStudySeconds?.[key] ?? 0,
    };
  });
}

export function SetCard({ questionSet, progress, questionTypeFilter, onStart, onDelete }: SetCardProps) {
  const filteredQuestions =
    questionTypeFilter === "all"
      ? questionSet.questions
      : questionSet.questions.filter((question) => question.questionType === questionTypeFilter);
  const filteredQuestionIds = new Set(filteredQuestions.map((question) => question.id));
  const sequentialIndex = Math.min((progress?.sequentialIndex ?? 0) + 1, Math.max(filteredQuestions.length, 1));
  const randomIndex = Math.min((progress?.randomIndex ?? 0) + 1, Math.max(filteredQuestions.length, 1));
  const lowReadinessCount = Object.entries(progress?.readiness ?? {}).filter(
    ([questionId, readiness]) => readiness <= 2 && filteredQuestionIds.has(questionId),
  ).length;
  const dueReviewCount = filteredQuestions.filter(
    (question) => getStudyCount(progress, question.id) > 0 && isDueForReview(progress, question.id),
  ).length;
  const reviewCount = filteredQuestions.filter(
    (question) =>
      (getStudyCount(progress, question.id) > 0 && isDueForReview(progress, question.id)) ||
      (progress?.readiness?.[question.id] ?? 5) <= 2,
  ).length;
  const totalStudyCount = Object.values(progress?.questionStats ?? {}).reduce((sum, stat) => sum + stat.studyCount, 0);
  const todayStudyCount = getRecentStudyTotal(progress, 1);
  const weekStudyCount = getRecentStudyTotal(progress, 7);
  const todayStudySeconds = getRecentStudySeconds(progress, 1);
  const weekStudySeconds = getRecentStudySeconds(progress, 7);
  const dailyItems = getDailyItems(progress);
  const maxDailyCount = Math.max(1, ...dailyItems.map((item) => item.count));
  const maxDailySeconds = Math.max(1, ...dailyItems.map((item) => item.seconds));
  const selectedCountText =
    questionTypeFilter === "all"
      ? "전체 유형"
      : `${QUESTION_STRUCTURES[questionTypeFilter].displayType} 선택`;

  return (
    <article className="setCard">
      <div>
        <h2>{questionSet.name}</h2>
        <p>
          질문 {questionSet.questions.length}개 · 마지막 학습 {formatDate(progress?.lastStudiedAt)}
        </p>
        <p>
          Why {countType(questionSet, "why")} · What {countType(questionSet, "what")} · How {countType(questionSet, "how")}
        </p>
        <p>
          {selectedCountText} {filteredQuestions.length}개 · 순차 {sequentialIndex}/{filteredQuestions.length}
          {progress?.randomOrder ? ` · 랜덤 ${randomIndex}/${filteredQuestions.length}` : ""}
          {` · 낮은 readiness ${lowReadinessCount}개`}
        </p>
        <p>
          누적 학습 {totalStudyCount}회 · 오늘 {todayStudyCount}문항/{formatStudyDuration(todayStudySeconds)} · 최근 7일{" "}
          {weekStudyCount}문항/{formatStudyDuration(weekStudySeconds)} · 오늘 복습 {dueReviewCount}개
        </p>
        <div className="studyChart" aria-label="지난 7일 일자별 학습 문항수와 학습 시간">
          {dailyItems.map((item) => (
            <div className="studyChartDay" key={item.date}>
              <span className="studyChartLabel">{item.label}</span>
              <div className="studyBars">
                <span
                  className="studyBar countBar"
                  style={{ height: `${Math.max(6, (item.count / maxDailyCount) * 58)}px` }}
                  title={`${item.label} ${item.count}문항`}
                />
                <span
                  className="studyBar timeBar"
                  style={{ height: `${Math.max(6, (item.seconds / maxDailySeconds) * 58)}px` }}
                  title={`${item.label} ${formatStudyDuration(item.seconds)}`}
                />
              </div>
              <span className="studyChartValue">{item.count}문항</span>
              <span className="studyChartValue">{formatStudyDuration(item.seconds)}</span>
            </div>
          ))}
        </div>
        <div className="studyChartLegend" aria-hidden="true">
          <span><i className="legendCount" />문항수</span>
          <span><i className="legendTime" />학습시간</span>
        </div>
      </div>
      <div className="setActions">
        <button type="button" onClick={() => onStart("sequential", "resume")} disabled={filteredQuestions.length === 0}>
          이어하기
        </button>
        <button type="button" onClick={() => onStart("sequential", "new")} disabled={filteredQuestions.length === 0}>
          순차 연습
        </button>
        <button type="button" onClick={() => onStart("random", "new")} disabled={filteredQuestions.length === 0}>
          랜덤 연습
        </button>
        <button type="button" onClick={() => onStart("review", "new")} disabled={reviewCount === 0}>
          복습 필요
        </button>
        {onDelete ? (
          <button className="ghost danger" type="button" onClick={onDelete}>
            삭제
          </button>
        ) : null}
      </div>
    </article>
  );
}
