import { type Dispatch, type SetStateAction, useState } from "react";
import { ImportPreview } from "../components/ImportPreview";
import type { AppStorage, ParsedQuestionPreview, QuestionSet } from "../types/interview";
import { createImportedSetName, parseQuestionSet } from "../utils/parseQuestionSet";

interface ImportPageProps {
  setStorage: Dispatch<SetStateAction<AppStorage>>;
  onCancel: () => void;
  onSaved: () => void;
}

const SAMPLE = `유형: Why
구조: CER
카테고리: 지원동기
질문: 부산대학교 AI컴퓨터공학과에 지원한 이유는 무엇입니까?
Conclusion: 저는 AI로 실제 생활의 문제를 해결하는 개발자가 되고 싶어 지원했습니다.
Evidence: 베트남 호치민에서 공부하며 디지털 기술이 학습과 소통을 돕는 모습을 경험했습니다.
Relevance: 부산대학교에서 컴퓨터공학 기본기와 AI 응용을 체계적으로 배우고 싶습니다.
키워드: AI 문제 해결, 호치민 경험, 컴퓨터공학 기본기

---

유형: What
구조: DEM
카테고리: AI·전공 이해
질문: 인공지능이란 무엇입니까?
Definition: 인공지능은 컴퓨터가 데이터를 바탕으로 판단하거나 예측하도록 만드는 기술입니다.
Explanation/Example: 예를 들어 사진 속 얼굴을 인식하거나 문장의 의미를 분석할 수 있습니다.
Meaning: 중요한 것은 사람처럼 생각한다기보다 데이터를 이용해 특정 문제를 해결한다는 점입니다.
키워드: 데이터, 판단, 예측, 문제 해결`;

function createId(prefix: string): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return `${prefix}-${crypto.randomUUID()}`;
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function ImportPage({ setStorage, onCancel, onSaved }: ImportPageProps) {
  const [name, setName] = useState(createImportedSetName);
  const [text, setText] = useState("");
  const [previews, setPreviews] = useState<ParsedQuestionPreview[]>([]);
  const [message, setMessage] = useState("");

  const hasErrors = previews.some((preview) => preview.errors.length > 0);
  const validQuestions = previews.filter((preview) => preview.errors.length === 0).map((preview) => preview.question);

  function analyze() {
    const parsed = parseQuestionSet(text);
    setPreviews(parsed);
    setMessage(parsed.length === 0 ? "인식된 질문이 없습니다." : "");
  }

  function save() {
    if (!name.trim()) {
      setMessage("세트 이름을 입력해 주세요.");
      return;
    }
    if (validQuestions.length === 0 || hasErrors) {
      setMessage("오류가 없는 질문만 저장할 수 있습니다.");
      return;
    }

    const now = new Date().toISOString();
    const setId = createId("set");
    const nextSet: QuestionSet = {
      id: setId,
      name: name.trim(),
      questions: validQuestions,
      createdAt: now,
      updatedAt: now,
    };

    setStorage((previous) => ({
      ...previous,
      sets: [...previous.sets, nextSet],
      settings: {
        ...previous.settings,
        lastSetId: setId,
      },
      progress: {
        ...previous.progress,
        [setId]: {
          sequentialIndex: 0,
        },
      },
    }));
    onSaved();
  }

  return (
    <main className="page">
      <header className="screenHeader">
        <button className="ghost" type="button" onClick={onCancel}>
          홈
        </button>
        <div>
          <p className="eyebrow">세트 가져오기</p>
          <h1>새 질문 세트 붙여넣기</h1>
        </div>
      </header>

      <section className="importLayout">
        <label className="field">
          <span>세트 이름</span>
          <input value={name} onChange={(event) => setName(event.target.value)} />
        </label>

        <label className="field">
          <span>질문 데이터</span>
          <textarea value={text} onChange={(event) => setText(event.target.value)} placeholder={SAMPLE} />
        </label>

        <details className="sampleBox">
          <summary>입력 형식 예시</summary>
          <pre>{SAMPLE}</pre>
        </details>

        <div className="buttonRow">
          <button type="button" onClick={analyze}>
            분석하기
          </button>
          <button className="primary" type="button" onClick={save} disabled={previews.length === 0 || hasErrors}>
            저장
          </button>
          <button className="ghost" type="button" onClick={onCancel}>
            취소
          </button>
        </div>

        {message ? <p className="errorText">{message}</p> : null}
        {previews.length > 0 ? <ImportPreview previews={previews} /> : null}
      </section>
    </main>
  );
}
