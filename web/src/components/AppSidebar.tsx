import { NavLink } from "react-router";

type AppSidebarProps = {
  isOpen: boolean;
  onToggle: () => void;
};

export default function AppSidebar({ isOpen, onToggle }: AppSidebarProps) {
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
          <span className="app-sidebar__label">Vocabulary</span>
        </NavLink>
      </nav>
    </aside>
  );
}
