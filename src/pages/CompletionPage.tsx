import type { PracticeMode } from "../types/interview";

interface CompletionPageProps {
  count: number;
  onHome: () => void;
  onRestartSequential: () => void;
  onRestartRandom: () => void;
  onRestartReview?: () => void;
  mode: PracticeMode;
}

export function CompletionPage({ count, onHome, onRestartSequential, onRestartRandom, onRestartReview, mode }: CompletionPageProps) {
  return (
    <main className="page completionPage">
      <p className="eyebrow">
        {mode === "random" ? "랜덤 연습 완료" : mode === "review" ? "낮은 readiness 복습 완료" : "순차 연습 완료"}
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
        <button className="primary" type="button" onClick={onHome}>
          홈으로 이동
        </button>
      </div>
    </main>
  );
}
