import type { QuestionType } from "../types/interview";
import { QUESTION_STRUCTURES } from "../utils/questionStructure";

interface QuestionCardProps {
  category: string;
  questionType: QuestionType;
  question: string;
  studyCount: number;
  reviewLabel: string;
}

export function QuestionCard({ category, questionType, question, studyCount, reviewLabel }: QuestionCardProps) {
  const structure = QUESTION_STRUCTURES[questionType];

  return (
    <section className="questionCard" aria-labelledby="current-question">
      <div className="questionMeta">
        <span className="category">{category}</span>
        <span className="structureBadge">
          {structure.displayType} · {structure.code}
        </span>
        <span className="studyBadge">학습 {studyCount}회</span>
        <span className="studyBadge">{reviewLabel}</span>
      </div>
      <p className="structureLine">{structure.labels.join(" → ")}</p>
      <h1 id="current-question">{question}</h1>
    </section>
  );
}
