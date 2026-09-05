import { useEffect, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { apiFetch } from "../lib/api";
import "./App.css";

type LearningItem = {
  id: string;
  english: string;
  mandarin: string;
  pinyin: string;
  type: "vocab" | "grammar" | "phrase" | "clause";
  source: "detected" | "user" | "assistant";
  created_at: string;
};

type StartingLanguage = "english" | "mandarin";

type VocabularyCardProps = {
  item: LearningItem;
  flipped: boolean;
  pinyinVisible: boolean;
  startingLanguage: StartingLanguage;
  onFlip: () => void;
  onTogglePinyin: () => void;
};

function VocabularyCard({
  item,
  flipped,
  pinyinVisible,
  startingLanguage,
  onFlip,
  onTogglePinyin,
}: VocabularyCardProps) {
  const frontIsMandarin = startingLanguage === "mandarin";
  const activeSide = flipped ? "back" : "front";

  function renderFace(side: "front" | "back", isMandarin: boolean) {
    const isActive = activeSide === side;
    const faceText = isMandarin ? item.mandarin : item.english;

    return (
      <div
        className={`vocabulary-card__face vocabulary-card__face--${side}`}
        aria-hidden={!isActive}
      >
        <button
          type="button"
          className="vocabulary-card__flip-button"
          onClick={onFlip}
          tabIndex={isActive ? 0 : -1}
          aria-label={`${faceText}. Flip card to show ${
            isMandarin ? "English" : "Mandarin"
          }`}
        >
          <span
            className={
              isMandarin
                ? "vocabulary-card__hanzi"
                : "vocabulary-card__english"
            }
          >
            {faceText}
          </span>

          {isMandarin && pinyinVisible && (
            <span className="vocabulary-card__pinyin">{item.pinyin}</span>
          )}
        </button>

        {isMandarin && isActive && (
          <button
            type="button"
            className="vocabulary-card__pinyin-toggle"
            onClick={onTogglePinyin}
            tabIndex={isActive ? 0 : -1}
            aria-pressed={pinyinVisible}
          >
            {pinyinVisible ? "Hide pinyin" : "Show pinyin"}
          </button>
        )}
      </div>
    );
  }

  return (
    <article
      className={`vocabulary-card${
        flipped ? " vocabulary-card--flipped" : ""
      }`}
    >
      <div className="vocabulary-card__inner">
        {renderFace("front", frontIsMandarin)}
        {renderFace("back", !frontIsMandarin)}
      </div>
    </article>
  );
}

type VocabularySectionProps = {
  title: string;
  emptyMessage: string;
  items: LearningItem[];
  flippedIds: Set<string>;
  pinyinIds: Set<string>;
  startingLanguage: StartingLanguage;
  onFlip: (id: string) => void;
  onTogglePinyin: (id: string) => void;
};

function VocabularySection({
  title,
  emptyMessage,
  items,
  flippedIds,
  pinyinIds,
  startingLanguage,
  onFlip,
  onTogglePinyin,
}: VocabularySectionProps) {
  return (
    <section className="vocabulary-section">
      <h2>{title}</h2>

      {items.length > 0 ? (
        <div className="vocabulary-grid">
          {items.map((item) => (
            <VocabularyCard
              key={item.id}
              item={item}
              flipped={flippedIds.has(item.id)}
              pinyinVisible={pinyinIds.has(item.id)}
              startingLanguage={startingLanguage}
              onFlip={() => onFlip(item.id)}
              onTogglePinyin={() => onTogglePinyin(item.id)}
            />
          ))}
        </div>
      ) : (
        <p className="vocabulary-section__empty">{emptyMessage}</p>
      )}
    </section>
  );
}

export default function Vocabulary() {
  const [learningItems, setLearningItems] = useState<LearningItem[]>([]);
  const [startingLanguage, setStartingLanguage] =
    useState<StartingLanguage>("english");
  const [flippedIds, setFlippedIds] = useState<Set<string>>(() => new Set());
  const [pinyinIds, setPinyinIds] = useState<Set<string>>(() => new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;

    async function loadLearningItems() {
      try {
        const response = await apiFetch("/learning-items");
        if (!response.ok) {
          throw new Error("Could not fetch learning items");
        }

        const result: LearningItem[] = await response.json();
        if (!ignore) setLearningItems(result);
      } catch (loadError) {
        if (!ignore) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Could not fetch learning items",
          );
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    void loadLearningItems();

    return () => {
      ignore = true;
    };
  }, []);

  const detectedItems = learningItems.filter(
    (item) => item.source === "detected",
  );
  const userItems = learningItems.filter((item) => item.source !== "detected");

  function toggleId(
    id: string,
    setter: Dispatch<SetStateAction<Set<string>>>,
  ) {
    setter((currentIds) => {
      const nextIds = new Set(currentIds);
      if (nextIds.has(id)) nextIds.delete(id);
      else nextIds.add(id);
      return nextIds;
    });
  }

  function handleStartingLanguageChange(useMandarin: boolean) {
    setStartingLanguage(useMandarin ? "mandarin" : "english");
    setFlippedIds(new Set());
  }

  return (
    <main className="learning-items-page">
      <header className="learning-items-page__header">
        <div>
          <h1>Learning Items</h1>
        </div>

        <div className="language-control">
          <span className="language-control__label" id="starting-language-label">
            Start with English or Mandarin
          </span>
          <label className="language-switch">
            <span>English</span>
            <input
              className="language-switch__input"
              type="checkbox"
              checked={startingLanguage === "mandarin"}
              onChange={(event) =>
                handleStartingLanguageChange(event.target.checked)
              }
              aria-labelledby="starting-language-label"
            />
            <span className="language-switch__track" aria-hidden="true">
              <span className="language-switch__thumb" />
            </span>
            <span>Mandarin</span>
          </label>
        </div>
      </header>

      {loading ? (
        <p className="learning-items-page__status" role="status">
          Loading your vocabulary…
        </p>
      ) : error ? (
        <p className="learning-items-page__status learning-items-page__status--error">
          {error}. Please refresh to try again.
        </p>
      ) : (
        <div className="learning-items-page__sections">
          <VocabularySection
            title="Detected from your conversations"
            emptyMessage="New vocabulary detected in your conversations will appear here."
            items={detectedItems}
            flippedIds={flippedIds}
            pinyinIds={pinyinIds}
            startingLanguage={startingLanguage}
            onFlip={(id) => toggleId(id, setFlippedIds)}
            onTogglePinyin={(id) => toggleId(id, setPinyinIds)}
          />

          <VocabularySection
            title="Your list"
            emptyMessage="Vocabulary you save will appear here."
            items={userItems}
            flippedIds={flippedIds}
            pinyinIds={pinyinIds}
            startingLanguage={startingLanguage}
            onFlip={(id) => toggleId(id, setFlippedIds)}
            onTogglePinyin={(id) => toggleId(id, setPinyinIds)}
          />
        </div>
      )}
    </main>
  );
}
