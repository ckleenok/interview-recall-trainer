interface KeySentenceCardProps {
  sentence: string;
}

export function KeySentenceCard({ sentence }: KeySentenceCardProps) {
  return (
    <section className="keySentenceCard" aria-labelledby="key-sentence-title">
      <h2 id="key-sentence-title">핵심 문장</h2>
      <p>{sentence}</p>
    </section>
  );
}
