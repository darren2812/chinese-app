// Line icons drawn on a 24px grid with a 1.8 stroke, matching the sidebar set.
// Decorative by default; pass `label` when the icon carries meaning on its own.

const paths = {
  mic: (
    <>
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21" />
    </>
  ),
  stop: <rect x="7" y="7" width="10" height="10" rx="2" />,
  volume: (
    <>
      <path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5z" />
      <path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11" />
    </>
  ),
  chevronDown: <path d="m6 9 6 6 6-6" />,
  plus: <path d="M12 5v14M5 12h14" />,
  check: <path d="m5 12.5 4.5 4.5L19 7.5" />,
  sparkle: (
    <path d="M12 3.5 13.8 9a2 2 0 0 0 1.2 1.2l5.5 1.8-5.5 1.8a2 2 0 0 0-1.2 1.2L12 20.5 10.2 15A2 2 0 0 0 9 13.8L3.5 12 9 10.2A2 2 0 0 0 10.2 9z" />
  ),
  loader: <path d="M12 3a9 9 0 1 0 9 9" />,
  menu: <path d="M4 6h16M4 12h16M4 18h16" />,
  close: <path d="M6 6l12 12M18 6 6 18" />,
  chat: (
    <>
      <path d="M20 11.5a7.5 7.5 0 0 1-7.5 7.5c-1.2 0-2.34-.28-3.35-.78L4 20l1.78-4.56A7.47 7.47 0 0 1 5 11.5a7.5 7.5 0 1 1 15 0Z" />
      <path d="M9 11.5h.01M12.5 11.5h.01M16 11.5h.01" />
    </>
  ),
  cards: (
    <>
      <rect x="7" y="4" width="13" height="16" rx="2" />
      <path d="M4 7.5v10A2.5 2.5 0 0 0 6.5 20" />
    </>
  ),
  pencil: <path d="m14 5 5 5M4 20l5.5-1.5L19 9l-5-5-9.5 9.5z" />,
  trash: (
    <path d="M4.5 7h15M9.5 7V4.5h5V7M6.5 7l.8 12a1.5 1.5 0 0 0 1.5 1.5h6.4a1.5 1.5 0 0 0 1.5-1.5l.8-12M10 11v6M14 11v6" />
  ),
} as const;

export type IconName = keyof typeof paths;

type IconProps = {
  name: IconName;
  size?: "sm" | "md" | "lg";
  label?: string;
  className?: string;
};

export default function Icon({
  name,
  size = "md",
  label,
  className = "",
}: IconProps) {
  const sizeClass = size === "md" ? "" : ` icon--${size}`;

  return (
    <svg
      className={`icon${sizeClass}${className ? ` ${className}` : ""}`}
      viewBox="0 0 24 24"
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      {paths[name]}
    </svg>
  );
}
