import type { QuestionSet, QuestionTypeFilter, SetProgress } from "../types/interview";
import { getStudyCount, toLocalDateKey } from "../utils/studySchedule";

interface QuestionStudyMatrixProps {
  questionSet: QuestionSet;
  progress?: SetProgress;
  questionTypeFilter: QuestionTypeFilter;
  onOpenQuestion: (questionId: string) => void;
}

interface DateColumn {
  key: string;
  label: string;
}

function formatShortDate(date: Date): string {
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

function getDateColumns(): DateColumn[] {
  const today = new Date();
  return Array.from({ length: 7 }, (_, index) => {
    const offset = 6 - index;
    const date = new Date(today);
    date.setDate(today.getDate() - offset);
    return {
      key: toLocalDateKey(date),
      label: offset === 0 ? "오늘" : formatShortDate(date),
    };
  });
}

function formatReadiness(readiness?: number): string {
  return readiness ? `${readiness}` : "-";
}

function getQuestionDateCount(progress: SetProgress | undefined, questionId: string, dateKey: string): number {
  const dailyCounts = progress?.questionDailyStudyCounts?.[questionId];
  if (dailyCounts) return dailyCounts[dateKey] ?? 0;

  const stat = progress?.questionStats?.[questionId];
  if (!stat?.lastStudiedAt) return 0;
  const lastStudiedDate = new Date(stat.lastStudiedAt);
  if (Number.isNaN(lastStudiedDate.getTime())) return 0;
  return toLocalDateKey(lastStudiedDate) === dateKey ? 1 : 0;
}

export function QuestionStudyMatrix({ questionSet, progress, questionTypeFilter, onOpenQuestion }: QuestionStudyMatrixProps) {
  const questions =
    questionTypeFilter === "all"
      ? questionSet.questions
      : questionSet.questions.filter((question) => question.questionType === questionTypeFilter);
  const dateColumns = getDateColumns();
  const maxDailyQuestionCount = Math.max(
    1,
    ...questions.flatMap((question) =>
      dateColumns.map((date) => getQuestionDateCount(progress, question.id, date.key)),
    ),
  );

  if (questions.length === 0) return null;

  return (
    <section className="studyMatrixSection" aria-labelledby={`study-matrix-${questionSet.id}`}>
      <div className="sectionTitleRow">
        <div>
          <p className="eyebrow">Quiz Study Map</p>
          <h2 id={`study-matrix-${questionSet.id}`}>{questionSet.name} 문항별 학습 기록</h2>
        </div>
        <p>최근 7일</p>
      </div>
      <div className="studyMatrixScroller">
        <div className="studyMatrix" role="table" aria-label={`${questionSet.name} 최근 7일 문항별 학습 횟수`}>
          <div className="studyMatrixHeader" role="row">
            <span className="studyMatrixCorner" role="columnheader">Quiz</span>
            {dateColumns.map((date) => (
              <span className="studyMatrixDate" role="columnheader" key={date.key}>
                {date.label}
              </span>
            ))}
            <span className="studyMatrixReadinessHeader" role="columnheader">Ready</span>
            <span className="studyMatrixActionHeader" role="columnheader">Quiz</span>
          </div>
          {questions.map((question) => {
            const totalCount = getStudyCount(progress, question.id);
            const questionNumber = questionSet.questions.findIndex((item) => item.id === question.id) + 1;
            const readiness = progress?.readiness?.[question.id];
            return (
              <div className="studyMatrixRow" role="row" key={question.id}>
                <div className="studyMatrixQuiz" role="rowheader">
                  <span>Quiz {questionNumber}</span>
                  <strong>{totalCount}회</strong>
                </div>
                {dateColumns.map((date) => {
                  const count = getQuestionDateCount(progress, question.id, date.key);
                  const scale = count > 0 ? 0.78 + (count / maxDailyQuestionCount) * 0.22 : 1;
                  return (
                    <span className="studyMatrixCell" role="cell" key={date.key}>
                      <span
                        className={count > 0 ? "studyDot filled" : "studyDot empty"}
                        style={{ transform: `scale(${scale})` }}
                        title={`Quiz ${questionNumber} · ${date.label} · ${count}회`}
                        aria-label={`${date.label} ${count}회`}
                      >
                        {count > 1 ? count : ""}
                      </span>
                    </span>
                  );
                })}
                <span className="studyMatrixReadiness" role="cell" title={`Readiness ${formatReadiness(readiness)}`}>
                  {formatReadiness(readiness)}
                </span>
                <span className="studyMatrixAction" role="cell">
                  <button type="button" onClick={() => onOpenQuestion(question.id)}>
                    Quiz
                  </button>
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
