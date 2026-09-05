import { NavLink, useParams } from "react-router";
import { useEffect, useState } from "react";
import { apiFetch } from "../lib/api";

type AppSidebarProps = {
  isOpen: boolean;
  onToggle: () => void;
};

type Conversation = {
  id: string;
  title: string | null;
  created_at: string;
  updated_at: string;
};

export default function AppSidebar({ isOpen, onToggle }: AppSidebarProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const { conversationId } = useParams();
  const [updateConversations, setUpdateConversations] =
    useState<boolean>(false);

  useEffect(() => {
    async function loadConversations() {
      const response = await apiFetch("/conversations");
      if (!response.ok) {
        throw new Error("Could not generate response");
      }

      const result = await response.json();

      setConversations(result);
      setUpdateConversations(false);
    }
    void loadConversations();
  }, [conversationId, updateConversations]);

  async function renameConversation(conversation: Conversation) {
    const title = window.prompt("Conversation name:", conversation.title ?? "");

    if (!title?.trim()) return;

    const response = await apiFetch(
      `/conversations/${conversation.id}?title=${encodeURIComponent(title.trim())}`,
      { method: "PATCH" },
    );

    if (!response.ok) throw new Error("Could not rename conversation");

    const updated: Conversation = await response.json();

    setConversations((items) =>
      items.map((item) => (item.id === updated.id ? updated : item)),
    );
  }

  async function deleteConversation(conversationId: string) {
    if (!window.confirm("Delete this conversation?")) return;

    const response = await apiFetch(`/conversations/${conversationId}`, {
      method: "DELETE",
    });

    if (!response.ok) throw new Error("Could not delete conversation");

    setConversations((items) =>
      items.filter((item) => item.id !== conversationId),
    );
  }

  return (
    <aside className={`app-sidebar${isOpen ? " app-sidebar--open" : ""}`}>
      <button
        type="button"
        className="app-sidebar__toggle"
        onClick={onToggle}
        aria-expanded={isOpen}
        aria-label={isOpen ? "Close sidebar" : "Open sidebar"}
      >
        <svg
          className="app-sidebar__icon"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path d="M4 6h16M4 12h16M4 18h16" />
        </svg>
        <span className="app-sidebar__label">Menu</span>
      </button>

      <nav className="app-sidebar__nav" aria-label="Main navigation">
        <NavLink
          to="/app"
          end
          className={({ isActive }) =>
            `app-sidebar__link${isActive ? " app-sidebar__link--active" : ""}`
          }
        >
          <svg
            className="app-sidebar__icon"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path d="M20 11.5a7.5 7.5 0 0 1-7.5 7.5c-1.2 0-2.34-.28-3.35-.78L4 20l1.78-4.56A7.47 7.47 0 0 1 5 11.5a7.5 7.5 0 1 1 15 0Z" />
            <path d="M9 11.5h.01M12.5 11.5h.01M16 11.5h.01" />
          </svg>
          <span className="app-sidebar__label">New Chat</span>
        </NavLink>

        <NavLink
          to="/app/vocabulary"
          className={({ isActive }) =>
            `app-sidebar__link${isActive ? " app-sidebar__link--active" : ""}`
          }
        >
          <svg
            className="app-sidebar__icon"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path d="m14 5 5 5M4 20l5.5-1.5L19 9l-5-5-9.5 9.5z" />
          </svg>
          <span className="app-sidebar__label">Learning Items</span>
        </NavLink>
      </nav>

      {isOpen && (
        <nav className="app-sidebar__recent" aria-label="Recent chats">
          <h2 className="app-sidebar__section-heading">Recent Chats</h2>

          {conversations.map((conversation) => (
            <div className="conversation-item" key={conversation.id}>
              <NavLink
                to={`/app/chat/${conversation.id}`}
                className={({ isActive }) =>
                  `app-sidebar__link app-sidebar__conversation${
                    isActive ? " app-sidebar__link--active" : ""
                  }`
                }
              >
                <span className="app-sidebar__conversation-title">
                  {conversation.title ?? "Untitled conversation"}
                </span>
              </NavLink>

              <div className="conversation-item__actions">
                <button
                  type="button"
                  aria-label={`Rename ${conversation.title ?? "conversation"}`}
                  onClick={() => void renameConversation(conversation)}
                >
                  Rename
                </button>

                <button
                  type="button"
                  aria-label={`Delete ${conversation.title ?? "conversation"}`}
                  onClick={() => void deleteConversation(conversation.id)}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </nav>
      )}
    </aside>
  );
}
