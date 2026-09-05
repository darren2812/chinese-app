import { NavLink, useParams } from "react-router";
import { use, useEffect, useState } from "react";
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

  useEffect(() => {
    async function loadConversations() {
      const response = await apiFetch("/conversations");
      if (!response.ok) {
        throw new Error("Could not generate response");
      }

      const result = await response.json();

      setConversations(result);
    }
    void loadConversations();
  }, [conversationId]);

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
            <NavLink
              key={conversation.id}
              to={`/chat/${conversation.id}`}
              className={({ isActive }) =>
                `app-sidebar__link${isActive ? " app-sidebar__link--active" : ""}`
              }
            >
              <span className="app-sidebar__label">
                {conversation.title ?? "Untitled conversation"}
              </span>
            </NavLink>
          ))}
        </nav>
      )}
    </aside>
  );
}
