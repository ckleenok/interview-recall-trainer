import { useEffect, useMemo, useState } from "react";
import { type ClozeTarget, createClozeSegments } from "../utils/createClozeSegments";

interface ClozeAnswerProps {
  answer: string;
  hiddenTargets: ClozeTarget[];
  blankRatio: number;
  revealToken: number;
  hideToken: number;
}

export function ClozeAnswer({ answer, hiddenTargets, blankRatio, revealToken, hideToken }: ClozeAnswerProps) {
  const segments = useMemo(
    () => createClozeSegments(answer, hiddenTargets, blankRatio),
    [answer, blankRatio, hiddenTargets],
  );
  const allKeys = useMemo(
    () => segments.filter((segment) => segment.type === "blank").map((segment) => segment.key),
    [segments],
  );
  const [revealed, setRevealed] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    setRevealed(new Set());
  }, [answer, blankRatio, hiddenTargets]);

  useEffect(() => {
    setRevealed(new Set(allKeys));
  }, [revealToken]);

  useEffect(() => {
    setRevealed(new Set());
  }, [hideToken]);

  function toggle(key: string) {
    setRevealed((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  return (
    <section className="answerCard" aria-labelledby="answer-title">
      <h2 id="answer-title">전체 답변</h2>
      <p className="clozeAnswer">
        {segments.map((segment) => {
          if (segment.type === "text") {
            return <span key={segment.key}>{segment.text}</span>;
          }
          const isRevealed = revealed.has(segment.key);
          return (
            <button
              className={isRevealed ? "blankButton revealed" : "blankButton"}
              key={segment.key}
              type="button"
              onClick={() => toggle(segment.key)}
              aria-label={isRevealed ? `${segment.keyword} 다시 가리기` : "빈칸 확인"}
            >
              {isRevealed ? (
                segment.keyword
              ) : (
                <span className="blankPlaceholder">
                  <span className="blankSizer" aria-hidden="true">
                    {segment.keyword}
                  </span>
                </span>
              )}
            </button>
          );
        })}
      </p>
    </section>
  );
}
