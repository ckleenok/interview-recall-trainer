import { useEffect, useMemo, useState } from "react";
import type { StructuredAnswerPart } from "../types/interview";
import { type ClozeTarget, createClozeSegments } from "../utils/createClozeSegments";

interface ClozeAnswerProps {
  answerParts: StructuredAnswerPart[];
  hiddenTargetsByPart: ClozeTarget[][];
  blankRatio: number;
  revealToken: number;
  hideToken: number;
}

export function ClozeAnswer({
  answerParts,
  hiddenTargetsByPart,
  blankRatio,
  revealToken,
  hideToken,
}: ClozeAnswerProps) {
  const segmentedParts = useMemo(
    () =>
      answerParts.map((part, partIndex) => ({
        ...part,
        segments: createClozeSegments(part.text, hiddenTargetsByPart[partIndex] ?? [], blankRatio),
      })),
    [answerParts, blankRatio, hiddenTargetsByPart],
  );
  const allKeys = useMemo(
    () =>
      segmentedParts.flatMap((part, partIndex) =>
        part.segments
          .filter((segment) => segment.type === "blank")
          .map((segment) => `${partIndex}-${segment.key}`),
      ),
    [segmentedParts],
  );
  const [revealed, setRevealed] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    setRevealed(new Set());
  }, [answerParts, blankRatio, hiddenTargetsByPart]);

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
      <div className="answerParts">
        {segmentedParts.map((part, partIndex) => (
          <section className="answerPart" key={`${part.label}-${partIndex}`}>
            <span className="answerPartLabel">{part.label}</span>
            <p className="clozeAnswer">
              {part.segments.map((segment) => {
                if (segment.type === "text") {
                  return <span key={segment.key}>{segment.text}</span>;
                }
                const key = `${partIndex}-${segment.key}`;
                const isRevealed = revealed.has(key);
                return (
                  <button
                    className={isRevealed ? "blankButton revealed" : "blankButton"}
                    key={key}
                    type="button"
                    onClick={() => toggle(key)}
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
        ))}
      </div>
    </section>
  );
}
