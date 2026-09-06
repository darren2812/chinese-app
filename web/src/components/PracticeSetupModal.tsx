import { useEffect, useMemo, useState } from "react";
import type { LearningItem } from "./LearningItemCard";
import { apiFetch } from "../lib/api";
import "./PracticeSetupModal.css";

export type PracticeSetup = {
  items: LearningItem[];
  starter: "user" | "assistant";
};

type PracticeSetupModalProps = {
  onStart: (setup: PracticeSetup) => void;
};

export default function PracticeSetupModal({
  onStart,
}: PracticeSetupModalProps) {
  const [items, setItems] = useState<LearningItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [search, setSearch] = useState("");
  const [starter, setStarter] = useState<PracticeSetup["starter"]>("user");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadItems() {
      try {
        const response = await apiFetch("/learning-items");
        if (!response.ok) throw new Error("Could not fetch learning items");

        const result: LearningItem[] = await response.json();
        if (!cancelled) setItems(result);
      } catch {
        if (!cancelled) setError("Could not load your learning items.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadItems();
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredItems = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    if (!query) return items;

    return items.filter((item) =>
      [item.english, item.mandarin, item.pinyin].some((value) =>
        value.toLocaleLowerCase().includes(query),
      ),
    );
  }, [items, search]);

  function toggleItem(id: string) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function start() {
    onStart({
      items: items.filter((item) => selectedIds.has(item.id)),
      starter,
    });
  }

  return (
    <div className="practice-modal__backdrop">
      <section
        className="practice-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="practice-modal-title"
      >
        <header className="practice-modal__header">
          <div>
            <h1 id="practice-modal-title">What would you like to practice?</h1>
          </div>
          <p>Select words now, or start a conversation without a practice list.</p>
        </header>

        <label className="practice-modal__search" htmlFor="practice-search">
          <span>Search your learning items</span>
          <input
            id="practice-search"
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="English, Mandarin, or pinyin"
          />
        </label>

        <div className="practice-modal__table-wrap">
          {loading ? (
            <p className="practice-modal__status" role="status">
              Loading learning items…
            </p>
          ) : error ? (
            <p className="practice-modal__status practice-modal__status--error">
              {error}
            </p>
          ) : filteredItems.length === 0 ? (
            <p className="practice-modal__status">
              {items.length === 0
                ? "You do not have any saved learning items yet."
                : "No learning items match that search."}
            </p>
          ) : (
            <table className="practice-modal__table">
              <thead>
                <tr>
                  <th scope="col"><span className="visually-hidden">Practice</span></th>
                  <th scope="col">Mandarin</th>
                  <th scope="col">Pinyin</th>
                  <th scope="col">English</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <input
                        type="checkbox"
                        checked={selectedIds.has(item.id)}
                        onChange={() => toggleItem(item.id)}
                        aria-label={`Practice ${item.mandarin}, ${item.english}`}
                      />
                    </td>
                    <td lang="zh-Hans">{item.mandarin}</td>
                    <td>{item.pinyin}</td>
                    <td>{item.english}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <fieldset className="practice-modal__starter">
          <legend>Who starts the conversation?</legend>
          <label>
            <input
              type="radio"
              name="conversation-starter"
              checked={starter === "user"}
              onChange={() => setStarter("user")}
            />
            I’ll start
          </label>
          <label>
            <input
              type="radio"
              name="conversation-starter"
              checked={starter === "assistant"}
              onChange={() => setStarter("assistant")}
            />
            Let AI start
          </label>
        </fieldset>

        <footer className="practice-modal__footer">
          <span aria-live="polite">
            {selectedIds.size} {selectedIds.size === 1 ? "word" : "words"} selected
          </span>
          <button type="button" className="practice-modal__start" onClick={start}>
            Start conversation
          </button>
        </footer>
      </section>
    </div>
  );
}
