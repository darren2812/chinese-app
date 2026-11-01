import { useState } from "react";
import Icon from "./Icon";
import "./ChatBubble.css";
import type {
  BaseComponent,
  ProcessResult,
  SelectionAnalysis,
} from "../pages/Chat";

type ChatBubbleProps = {
  messageId: string;
  text: string;
  sender: "user" | "assistant";
  correction?: ProcessResult;
  selectionAnalysis?: SelectionAnalysis;
  onSelection?: (
    selection: string,
    sentence: string,
  ) => Promise<SelectionAnalysis>;
  onAddItem?: (component: BaseComponent) => Promise<void>;
  isAudioStreaming?: boolean;
  onPlayAudio?: (id: string) => Promise<void>;
};

function componentKey(component: BaseComponent) {
  return `${component.english}-${component.mandarin}-${component.type}`;
}

export default function ChatBubble({
  messageId,
  text,
  sender,
  correction,
  onSelection,
  onAddItem,
  isAudioStreaming,
  onPlayAudio,
}: ChatBubbleProps) {
  const [isCorrectionOpen, setIsCorrectionOpen] = useState(false);
  const [selectionAnalysis, setSelectionAnalysis] =
    useState<SelectionAnalysis | null>(null);
  const [addedKeys, setAddedKeys] = useState<Set<string>>(() => new Set());
  const correctionId = `correction-${messageId}`;
  const isPending = sender === "assistant" && text === "";

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

  async function handleAdd(component: BaseComponent) {
    if (!onAddItem) return;

    try {
      await onAddItem(component);
      setAddedKeys((keys) => new Set(keys).add(componentKey(component)));
    } catch {
      console.error("Could not add learning item.");
    }
  }

  return (
    <article className={`message message--${sender}`}>
      <div className={`chat-bubble chat-bubble--${sender}`}>
        {isPending ? (
          <span className="chat-bubble__typing" aria-label="Tutor is replying">
            <span />
            <span />
            <span />
          </span>
        ) : (
          <div
            className="chat-bubble__text"
            lang="zh-Hans"
            onMouseUp={onSelection ? handleMouseUp : undefined}
          >
            {text}
          </div>
        )}

        {onPlayAudio && !isPending && (
          <div className="chat-bubble__actions">
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              onClick={() => void onPlayAudio?.(messageId)}
              disabled={isAudioStreaming}
            >
              <Icon
                name={isAudioStreaming ? "loader" : "volume"}
                size="sm"
                className={isAudioStreaming ? "icon--spin" : ""}
              />
              {isAudioStreaming ? "Playing…" : "Listen"}
            </button>
          </div>
        )}
      </div>

      {sender === "user" && correction && (
        <>
          <button
            type="button"
            className="correction-toggle btn btn--ghost btn--sm"
            onClick={() => setIsCorrectionOpen(!isCorrectionOpen)}
            aria-expanded={isCorrectionOpen}
            aria-controls={correctionId}
          >
            <Icon name="sparkle" size="sm" />
            Chinese help
            <Icon name="chevronDown" size="sm" className="correction-toggle__chevron" />
          </button>

          {isCorrectionOpen && (
            <section
              id={correctionId}
              className="correction-card card"
              aria-label="Chinese help"
            >
              {correction.corrected_sentence && (
                <div className="correction-card__section">
                  <h3 className="eyebrow">Try saying</h3>
                  <p className="correction-card__sentence hanzi" lang="zh-Hans">
                    {correction.corrected_sentence}
                  </p>
                </div>
              )}

              {correction.components.length > 0 && (
                <div className="correction-card__section">
                  <h3 className="eyebrow">Vocabulary</h3>
                  <ul className="vocab-list">
                    {correction.components.map((word) => (
                      <li
                        key={`${word.english}-${word.mandarin}`}
                        className="vocab-row"
                      >
                        <span className="vocab-row__hanzi" lang="zh-Hans">
                          {word.mandarin}
                        </span>
                        <span className="vocab-row__meta">
                          <span className="pinyin">{word.pinyin}</span>
                          <span className="vocab-row__english">
                            {word.english}
                          </span>
                        </span>
                        <span className="tag">{word.type}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {correction.grammar_note && (
                <div className="correction-card__section">
                  <h3 className="eyebrow">Grammar note</h3>
                  <p>{correction.grammar_note}</p>
                </div>
              )}
            </section>
          )}
        </>
      )}

      {onAddItem && selectionAnalysis && (
        <section className="lookup-card card" aria-label="Selection lookup">
          <ul className="vocab-list">
            {selectionAnalysis.components.map((component) => {
              const key = componentKey(component);
              const isAdded = addedKeys.has(key);

              return (
                <li key={key} className="vocab-row">
                  <span className="vocab-row__hanzi" lang="zh-Hans">
                    {component.mandarin}
                  </span>
                  <span className="vocab-row__meta">
                    <span className="pinyin">{component.pinyin}</span>
                    <span className="vocab-row__english">
                      {component.english} <span className="tag">{component.type}</span>
                    </span>
                  </span>
                  <button
                    type="button"
                    className={`btn btn--sm ${isAdded ? "btn--ghost lookup-card__added" : "btn--secondary"}`}
                    onClick={() => void handleAdd(component)}
                    disabled={isAdded}
                    aria-label={
                      isAdded
                        ? `${component.mandarin} added to learning items`
                        : `Add ${component.mandarin} to learning items`
                    }
                  >
                    <Icon name={isAdded ? "check" : "plus"} size="sm" />
                    {isAdded ? "Added" : "Save"}
                  </button>
                </li>
              );
            })}
          </ul>
          <p className="lookup-card__explanation">
            {selectionAnalysis.explanation}
          </p>
        </section>
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
