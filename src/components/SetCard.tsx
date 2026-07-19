import type { PracticeMode, QuestionSet, QuestionType, QuestionTypeFilter, SetProgress } from "../types/interview";
import { QUESTION_STRUCTURES } from "../utils/questionStructure";

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
