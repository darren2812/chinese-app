import { NavLink, useNavigate, useParams } from "react-router";
import { useEffect, useState } from "react";
import { apiFetch } from "../lib/api";
import Icon from "./Icon";
import "./AppSidebar.css";

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
  const navigate = useNavigate();

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

  async function deleteConversation(itemId: string) {
    if (!window.confirm("Delete this conversation?")) return;

    const response = await apiFetch(`/conversations/${itemId}`, {
      method: "DELETE",
    });

    if (!response.ok) throw new Error("Could not delete conversation");

    setConversations((items) =>
      items.filter((item) => item.id !== itemId),
    );

    if (conversationId === itemId) {
      navigate("/app", { replace: true });
    }
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
        <Icon name="menu" size="lg" />
        <span className="app-sidebar__label app-sidebar__brand">
          Mandarin Tutor
        </span>
      </button>

      <nav className="app-sidebar__nav" aria-label="Main navigation">
        <NavLink
          to="/app"
          end
          className={({ isActive }) =>
            `app-sidebar__link${isActive ? " app-sidebar__link--active" : ""}`
          }
        >
          <Icon name="chat" size="lg" />
          <span className="app-sidebar__label">New Chat</span>
        </NavLink>

        <NavLink
          to="/app/learning-items"
          className={({ isActive }) =>
            `app-sidebar__link${isActive ? " app-sidebar__link--active" : ""}`
          }
        >
          <Icon name="cards" size="lg" />
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
                  className="icon-btn conversation-item__action"
                  aria-label={`Rename ${conversation.title ?? "conversation"}`}
                  title="Rename"
                  onClick={() => void renameConversation(conversation)}
                >
                  <Icon name="pencil" size="sm" />
                </button>

                <button
                  type="button"
                  className="icon-btn conversation-item__action conversation-item__action--danger"
                  aria-label={`Delete ${conversation.title ?? "conversation"}`}
                  title="Delete"
                  onClick={() => void deleteConversation(conversation.id)}
                >
                  <Icon name="trash" size="sm" />
                </button>
              </div>
            </div>
          ))}
        </nav>
      )}
    </aside>
  );
}
