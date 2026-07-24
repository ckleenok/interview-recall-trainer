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
  return new Intl.DateTimeFormat("ko-KR", { month: "numeric", day: "numeric" }).format(date);
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

export function QuestionStudyMatrix({ questionSet, progress, questionTypeFilter, onOpenQuestion }: QuestionStudyMatrixProps) {
  const questions =
    questionTypeFilter === "all"
      ? questionSet.questions
      : questionSet.questions.filter((question) => question.questionType === questionTypeFilter);
  const dateColumns = getDateColumns();
  const maxDailyQuestionCount = Math.max(
    1,
    ...questions.flatMap((question) =>
      dateColumns.map((date) => progress?.questionDailyStudyCounts?.[question.id]?.[date.key] ?? 0),
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
            <span className="studyMatrixReadinessHeader" role="columnheader">Readiness</span>
            <span className="studyMatrixActionHeader" role="columnheader">바로가기</span>
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
                  const count = progress?.questionDailyStudyCounts?.[question.id]?.[date.key] ?? 0;
                  const scale = count > 0 ? 0.62 + (count / maxDailyQuestionCount) * 0.38 : 0;
                  return (
                    <span className="studyMatrixCell" role="cell" key={date.key}>
                      {count > 0 ? (
                        <span
                          className="studyDot"
                          style={{ transform: `scale(${scale})`, opacity: 0.58 + (count / maxDailyQuestionCount) * 0.42 }}
                          title={`Quiz ${questionNumber} · ${date.label} · ${count}회`}
                          aria-label={`${date.label} ${count}회`}
                        >
                          {count > 1 ? count : ""}
                        </span>
                      ) : null}
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
