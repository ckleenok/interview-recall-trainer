import type { PracticeMode, QuestionSet, SetProgress } from "../types/interview";

interface SetCardProps {
  questionSet: QuestionSet;
  progress?: SetProgress;
  onStart: (mode: PracticeMode, start: "resume" | "new") => void;
  onDelete?: () => void;
}

function formatDate(date?: string): string {
  if (!date) return "아직 없음";
  return new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(date));
}

export function SetCard({ questionSet, progress, onStart, onDelete }: SetCardProps) {
  const sequentialIndex = Math.min((progress?.sequentialIndex ?? 0) + 1, questionSet.questions.length);
  const randomIndex = Math.min((progress?.randomIndex ?? 0) + 1, questionSet.questions.length);
  const lowReadinessCount = Object.values(progress?.readiness ?? {}).filter((readiness) => readiness <= 2).length;

  return (
    <article className="setCard">
      <div>
        <h2>{questionSet.name}</h2>
        <p>
          질문 {questionSet.questions.length}개 · 마지막 학습 {formatDate(progress?.lastStudiedAt)}
        </p>
        <p>
          순차 {sequentialIndex}/{questionSet.questions.length}
          {progress?.randomOrder ? ` · 랜덤 ${randomIndex}/${questionSet.questions.length}` : ""}
          {` · 낮은 readiness ${lowReadinessCount}개`}
        </p>
      </div>
      <div className="setActions">
        <button type="button" onClick={() => onStart("sequential", "resume")}>
          이어하기
        </button>
        <button type="button" onClick={() => onStart("sequential", "new")}>
          순차 연습
        </button>
        <button type="button" onClick={() => onStart("random", "new")}>
          랜덤 연습
        </button>
        <button type="button" onClick={() => onStart("review", "new")} disabled={lowReadinessCount === 0}>
          낮은 readiness 복습
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
