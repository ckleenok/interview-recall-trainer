import type { Dispatch, SetStateAction } from "react";
import { BlankRatioSelector } from "../components/BlankRatioSelector";
import { QuestionStudyMatrix } from "../components/QuestionStudyMatrix";
import { QuestionTypeSelector } from "../components/QuestionTypeSelector";
import { SetCard } from "../components/SetCard";
import type { AppStorage, PracticeMode, QuestionTypeFilter } from "../types/interview";

interface HomePageProps {
  storage: AppStorage;
  setStorage: Dispatch<SetStateAction<AppStorage>>;
  onImport: () => void;
  onStart: (setId: string, mode: PracticeMode, start: "resume" | "new") => void;
}

export function HomePage({ storage, setStorage, onImport, onStart }: HomePageProps) {
  function updateBlankRatio(blankRatio: number) {
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

  function deleteSet(setId: string) {
    const target = storage.sets.find((questionSet) => questionSet.id === setId);
    if (!target || target.id === "default-pusan-ai") return;
    const confirmed = window.confirm(`${target.name} 세트를 삭제할까요?`);
    if (!confirmed) return;
    setStorage((previous) => {
      const { [setId]: _deleted, ...progress } = previous.progress;
      return {
        ...previous,
        sets: previous.sets.filter((questionSet) => questionSet.id !== setId),
        progress,
      };
    });
  }

  return (
    <main className="page">
      <header className="homeHeader">
        <p className="eyebrow">Interview Recall Trainer</p>
        <h1>면접 답변을 단계적으로 떠올리는 연습</h1>
        <p>
          질문을 보고 5초간 생각한 뒤, 핵심 문장과 빈칸 답변으로 내용을 다시 회상합니다.
        </p>
      </header>

      <section className="toolbar" aria-label="연습 설정">
        <BlankRatioSelector
          value={storage.settings.blankRatio}
          onChange={updateBlankRatio}
        />
        <QuestionTypeSelector
          value={storage.settings.questionTypeFilter}
          onChange={updateQuestionTypeFilter}
        />
        <button className="primary" type="button" onClick={onImport}>
          새 세트 붙여넣기
        </button>
      </section>

      <section className="setList" aria-labelledby="set-list-title">
        <h2 id="set-list-title">질문 세트</h2>
        {storage.sets.map((questionSet) => (
          <SetCard
            key={questionSet.id}
            questionSet={questionSet}
            progress={storage.progress[questionSet.id]}
            questionTypeFilter={storage.settings.questionTypeFilter}
            onStart={(mode, start) => onStart(questionSet.id, mode, start)}
            onDelete={questionSet.id === "default-pusan-ai" ? undefined : () => deleteSet(questionSet.id)}
          />
        ))}
      </section>

      {storage.sets.map((questionSet) => (
        <QuestionStudyMatrix
          key={questionSet.id}
          questionSet={questionSet}
          progress={storage.progress[questionSet.id]}
          questionTypeFilter={storage.settings.questionTypeFilter}
        />
      ))}
    </main>
  );
}
