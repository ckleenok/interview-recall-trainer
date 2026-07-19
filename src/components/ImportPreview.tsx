import type { ParsedQuestionPreview } from "../types/interview";
import { QUESTION_STRUCTURES } from "../utils/questionStructure";

interface ImportPreviewProps {
  previews: ParsedQuestionPreview[];
}

export function ImportPreview({ previews }: ImportPreviewProps) {
  const validCount = previews.filter((preview) => preview.errors.length === 0).length;

  return (
    <section className="previewPanel" aria-labelledby="preview-title">
      <h2 id="preview-title">미리보기</h2>
      <p>
        인식된 질문 {previews.length}개 · 저장 가능 {validCount}개
      </p>
      <div className="previewList">
        {previews.map((preview, index) => (
          <article className="previewItem" key={`${preview.question.id}-${index}`}>
            <span className="previewMeta">
              {QUESTION_STRUCTURES[preview.question.questionType].displayType} ·{" "}
              {QUESTION_STRUCTURES[preview.question.questionType].code}
            </span>
            <strong>
              {index + 1}. {preview.question.question || "질문 없음"}
            </strong>
            <div className="previewParts">
              {preview.question.answerParts.map((part) => (
                <p key={part.label}>
                  <span>{part.label}</span>
                  {part.text || "내용 없음"}
                </p>
              ))}
            </div>
            <span>키워드 {preview.question.keywords.length}개</span>
            {preview.errors.map((error) => (
              <p className="errorText" key={error}>
                오류: {error}
              </p>
            ))}
            {preview.warnings.map((warning) => (
              <p className="warningText" key={warning}>
                경고: {warning}
              </p>
            ))}
          </article>
        ))}
      </div>
    </section>
  );
}
