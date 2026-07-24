import type { PracticeMode } from "../types/interview";

interface CompletionPageProps {
  count: number;
  onHome: () => void;
  onRestartSequential: () => void;
  onRestartRandom: () => void;
  onRestartReview?: () => void;
  onRestartSpaced?: () => void;
  mode: PracticeMode;
}

function getCompletionLabel(mode: PracticeMode): string {
  if (mode === "random") return "랜덤 연습 완료";
  if (mode === "review") return "낮은 readiness 복습 완료";
  if (mode === "spaced") return "망각곡선 학습 완료";
  return "순차 연습 완료";
}

export function CompletionPage({
  count,
  onHome,
  onRestartSequential,
  onRestartRandom,
  onRestartReview,
  onRestartSpaced,
  mode,
}: CompletionPageProps) {
  return (
    <main className="page completionPage">
      <p className="eyebrow">
        {getCompletionLabel(mode)}
      </p>
      <h1>질문 {count}개를 모두 확인했습니다.</h1>
      <div className="buttonRow center">
        <button type="button" onClick={onRestartSequential}>
          다시 순차 연습
        </button>
        <button type="button" onClick={onRestartRandom}>
          새로운 랜덤 연습
        </button>
        {onRestartReview ? (
          <button type="button" onClick={onRestartReview}>
            낮은 readiness 다시 복습
          </button>
        ) : null}
        {onRestartSpaced ? (
          <button type="button" onClick={onRestartSpaced}>
            망각곡선 다시 학습
          </button>
        ) : null}
        <button className="primary" type="button" onClick={onHome}>
          홈으로 이동
        </button>
      </div>
    </main>
  );
}
