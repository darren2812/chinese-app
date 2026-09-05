import { useEffect, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import LearningItemSection from "../components/LearningItemSection";
import type {
  LearningItem,
  StartingLanguage,
} from "../components/LearningItemCard";
import { apiFetch } from "../lib/api";
import "./App.css";

export default function LearningItems() {
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
          Loading your learning items…
        </p>
      ) : error ? (
        <p className="learning-items-page__status learning-items-page__status--error">
          {error}. Please refresh to try again.
        </p>
      ) : (
        <div className="learning-items-page__sections">
          <LearningItemSection
            title="Detected from your conversations"
            emptyMessage="New learning items detected in your conversations will appear here."
            items={detectedItems}
            flippedIds={flippedIds}
            pinyinIds={pinyinIds}
            startingLanguage={startingLanguage}
            onFlip={(id) => toggleId(id, setFlippedIds)}
            onTogglePinyin={(id) => toggleId(id, setPinyinIds)}
          />

          <LearningItemSection
            title="Your list"
            emptyMessage="Learning items you save will appear here."
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
