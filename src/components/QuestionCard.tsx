interface QuestionCardProps {
  category: string;
  question: string;
}

export function QuestionCard({ category, question }: QuestionCardProps) {
  return (
    <section className="questionCard" aria-labelledby="current-question">
      <span className="category">{category}</span>
      <h1 id="current-question">{question}</h1>
    </section>
  );
}
