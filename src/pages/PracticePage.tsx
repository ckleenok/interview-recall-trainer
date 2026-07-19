import { type Dispatch, type SetStateAction, useCallback, useEffect, useState } from "react";
import { BlankRatioSelector } from "../components/BlankRatioSelector";
import { ClozeAnswer } from "../components/ClozeAnswer";
import { Countdown } from "../components/Countdown";
import { QuestionCard } from "../components/QuestionCard";
import { QuestionTypeSelector } from "../components/QuestionTypeSelector";
import { usePracticeSession } from "../hooks/usePracticeSession";
import type { AppStorage, PracticeMode, QuestionSet, QuestionTypeFilter, ReadinessLevel } from "../types/interview";
import { CompletionPage } from "./CompletionPage";

interface PracticePageProps {
  storage: AppStorage;
  setStorage: Dispatch<SetStateAction<AppStorage>>;
  questionSet: QuestionSet;
  mode: PracticeMode;
  start: "resume" | "new";
  onHome: () => void;
}

export function PracticePage({ storage, setStorage, questionSet, mode, start, onHome }: PracticePageProps) {
  const [showAnswer, setShowAnswer] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const [revealToken, setRevealToken] = useState(0);
  const [hideToken, setHideToken] = useState(0);
  const session = usePracticeSession({
    storage,
    setStorage,
    questionSet,
    mode,
    start,
    questionTypeFilter: storage.settings.questionTypeFilter,
  });

  const completeCountdown = useCallback(() => setShowAnswer(true), []);

  useEffect(() => {
    if (start !== "new") return;
    const params = new URLSearchParams({ setId: questionSet.id, mode, start: "resume" });
    window.history.replaceState(null, "", `#/practice?${params.toString()}`);
  }, [mode, questionSet.id, start]);

  function updateRatio(blankRatio: number) {
    setStorage((previous) => ({
      ...previous,
      settings: {
        ...previous.settings,
        blankRatio,
      },
    }));
  }

  function updateQuestionTypeFilter(questionTypeFilter: QuestionTypeFilter) {
    setStorage((previous) => ({
      ...previous,
      settings: {
        ...previous.settings,
        questionTypeFilter,
      },
    }));
  }

  function updateReadiness(readiness: ReadinessLevel) {
    if (!session.currentQuestion) return;
    setStorage((previous) => {
      const previousProgress = previous.progress[questionSet.id] ?? { sequentialIndex: 0 };
      return {
        ...previous,
        progress: {
          ...previous.progress,
          [questionSet.id]: {
            ...previousProgress,
            readiness: {
              ...(previousProgress.readiness ?? {}),
              [session.currentQuestion.id]: readiness,
            },
            lastStudiedAt: new Date().toISOString(),
          },
        },
      };
    });
  }

  function goNext() {
    setShowAnswer(false);
    setShowControls(false);
    setRevealToken(0);
    setHideToken(0);
    session.next();
  }

  function goPrevious() {
    setShowAnswer(false);
    setShowControls(false);
    setRevealToken(0);
    setHideToken(0);
    session.previous();
  }

  function toggleControlsFromSurface(event: React.MouseEvent<HTMLElement>) {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const interactiveSelector = "button, input, textarea, select, summary, a, .optionPanel, .controlDock";
    if (target.closest(interactiveSelector)) return;
    setShowControls((value) => !value);
  }

  if (session.sessionComplete) {
    return (
      <CompletionPage
        count={session.total}
        mode={mode}
        onHome={onHome}
        onRestartRandom={() => {
          session.restartRandom();
          setShowAnswer(false);
        }}
        onRestartReview={() => {
          session.restartReview();
          setShowAnswer(false);
        }}
        onRestartSequential={() => {
          session.restartSequential();
          setShowAnswer(false);
        }}
      />
    );
  }

  if (!session.currentQuestion) {
    return (
      <main className="page">
        <p>{mode === "review" ? "readiness가 낮은 질문이 없습니다." : "질문이 없습니다."}</p>
        <button type="button" onClick={onHome}>
          홈
        </button>
      </main>
    );
  }

  return (
    <main className="page practicePage" onClick={toggleControlsFromSurface}>
      <header className="practiceTop">
        <button
          className="ghost optionButton"
          type="button"
          aria-expanded={showOptions}
          onClick={(event) => {
            event.stopPropagation();
            setShowOptions((value) => !value);
          }}
        >
          옵션
        </button>
      </header>

      {showOptions ? (
        <section className="optionPanel" aria-label="연습 옵션">
          <div className="statusPills" aria-label="현재 연습 상태">
            <span>
              {session.currentNumber}/{session.total}
            </span>
            <span>{mode === "random" ? "랜덤" : mode === "review" ? "복습" : "순차"}</span>
            <span>빈칸 {storage.settings.blankRatio}%</span>
            <span>
              유형 {storage.settings.questionTypeFilter === "all" ? "전체" : storage.settings.questionTypeFilter.toUpperCase()}
            </span>
          </div>
          <BlankRatioSelector compact value={storage.settings.blankRatio} onChange={updateRatio} />
          <QuestionTypeSelector
            compact
            value={storage.settings.questionTypeFilter}
            onChange={updateQuestionTypeFilter}
          />
          <button className="ghost" type="button" onClick={onHome}>
            홈으로 이동
          </button>
        </section>
      ) : null}

      <QuestionCard
        category={session.currentQuestion.category}
        questionType={session.currentQuestion.questionType}
        question={session.currentQuestion.question}
      />

      {!showAnswer ? (
        <section className="thinkingPanel" aria-label="생각 시간">
          <Countdown seconds={5} onComplete={completeCountdown} />
          <button type="button" onClick={() => setShowAnswer(true)}>
            바로 보기
          </button>
        </section>
      ) : (
        <div className="answerStack">
          <ClozeAnswer
            answerParts={session.currentQuestion.answerParts}
            hiddenTargetsByPart={session.hiddenTargetsByPart}
            blankRatio={storage.settings.blankRatio}
            revealToken={revealToken}
            hideToken={hideToken}
          />
          <div
            className={showControls ? "buttonGrid controlDock visible" : "buttonGrid controlDock"}
          >
            <div className="readinessControl" aria-label="현재 질문 readiness">
              <span>Readiness</span>
              <div className="readinessButtons">
                {[1, 2, 3, 4, 5].map((level) => {
                  const readiness = level as ReadinessLevel;
                  const current = storage.progress[questionSet.id]?.readiness?.[session.currentQuestion.id];
                  return (
                    <button
                      className={current === readiness ? "readinessButton active" : "readinessButton"}
                      key={readiness}
                      type="button"
                      aria-pressed={current === readiness}
                      onClick={() => updateReadiness(readiness)}
                    >
                      {readiness}
                    </button>
                  );
                })}
              </div>
            </div>
            <button type="button" onClick={() => setRevealToken((value) => value + 1)}>
              모든 빈칸 보기
            </button>
            <button type="button" onClick={() => setHideToken((value) => value + 1)}>
              모든 빈칸 가리기
            </button>
            <button type="button" onClick={goPrevious} disabled={!session.hasPrevious}>
              이전 질문
            </button>
            <button className="primary" type="button" onClick={goNext}>
              {session.isLast ? "연습 완료" : "다음 질문"}
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
