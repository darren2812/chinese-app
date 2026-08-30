import { useState } from "react";
import type { ProcessResult, SelectionAnalysis } from "../pages/Chat";

type ChatBubbleProps = {
  text: string;
  sender: "user" | "assistant";
  correction?: ProcessResult;
  selectionAnalysis?: SelectionAnalysis;
  onSelection?: (
    selection: string,
    sentence: string,
  ) => Promise<SelectionAnalysis>;
};

export default function ChatBubble({
  text,
  sender,
  correction,
  onSelection,
}: ChatBubbleProps) {
  const [isCorrectionOpen, setIsCorrectionOpen] = useState(false);
  const [selectionAnalysis, setSelectionAnalysis] =
    useState<SelectionAnalysis | null>(null);

  async function handleMouseUp(event: React.MouseEvent<HTMLDivElement>) {
    const selection = window.getSelection()?.toString().trim();

    if (!selection || !onSelection) return;

    const sentence = getSelectedSentence(event.currentTarget);
    if (!sentence) return;

    try {
      const analysis = await onSelection(selection, sentence);
      setSelectionAnalysis(analysis);
    } catch {
      console.error("Could not analyze sentence.");
    }
  }

  return (
    <article className={`message message--${sender}`}>
      <div
        className={`chat-bubble chat-bubble--${sender}`}
        onMouseUp={sender === "assistant" ? handleMouseUp : undefined}
      >
        {text}
      </div>

      {sender === "user" && correction && (
        <>
          <button
            type="button"
            className="correction-toggle"
            onClick={() => setIsCorrectionOpen(!isCorrectionOpen)}
            aria-expanded={isCorrectionOpen}
          >
            Chinese help
          </button>

          {isCorrectionOpen && (
            <section className="correction-card" aria-label="Chinese help">
              {correction.components.length > 0 && (
                <div className="correction-card__section">
                  <h3 className="correction-card__heading">Vocabulary</h3>
                  <ul className="correction-card__vocabulary">
                    {correction.components.map((word) => (
                      <li key={`${word.english}-${word.mandarin}`}>
                        <strong>{word.english}</strong>
                        <span> → {word.mandarin}</span>
                        <span className="correction-card__pinyin">
                          {" "}
                          · {word.pinyin}
                        </span>
                        <span> · {word.type}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {correction.corrected_sentence && (
                <div className="correction-card__section">
                  <h3 className="correction-card__heading">
                    Corrected sentence
                  </h3>
                  <p>{correction.corrected_sentence}</p>
                </div>
              )}

              {correction.grammar_note && (
                <div className="correction-card__section">
                  <h3 className="correction-card__heading">Grammar note</h3>
                  <p>{correction.grammar_note}</p>
                </div>
              )}
            </section>
          )}
        </>
      )}

      {sender === "assistant" && selectionAnalysis && (
        <>
          <div className="correction-card__section">
            {selectionAnalysis.components.map((component) => (
              <>
                <h3 className="correction-card__heading">
                  {component.mandarin} - {component.pinyin}
                </h3>
                <strong>{component.english}</strong>
                <span> {`(${component.type})`}</span>
              </>
            ))}
            <p>{selectionAnalysis.explanation}</p>
          </div>
        </>
      )}
    </article>
  );
}

function getSelectedSentence(container: HTMLElement) {
  const selection = window.getSelection();

  if (
    !selection ||
    selection.rangeCount === 0 ||
    !selection.toString().trim()
  ) {
    return null;
  }

  const range = selection.getRangeAt(0);

  if (!container.contains(range.startContainer)) {
    return null;
  }

  const text = container.textContent ?? "";
  const punctuation = new Set(["。", "！", "？", ".", "!", "?", "\n"]);

  const beforeRange = document.createRange();
  beforeRange.selectNodeContents(container);
  beforeRange.setEnd(range.startContainer, range.startOffset);

  const start = beforeRange.toString().length;
  const end = start + selection.toString().length;

  let sentenceStart = start;
  while (sentenceStart > 0 && !punctuation.has(text[sentenceStart - 1])) {
    sentenceStart--;
  }

  let sentenceEnd = end;
  while (sentenceEnd < text.length && !punctuation.has(text[sentenceEnd])) {
    sentenceEnd++;
  }

  if (sentenceEnd < text.length) {
    sentenceEnd++;
  }

  return text.slice(sentenceStart, sentenceEnd).trim();
}
