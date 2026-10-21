# Mandarin Tutor: Design System (Master)

The single source of truth for visual design. When building a page, read this file, then check
`pages/<page-name>.md`. If a page file exists, its rules override this one.

- Tokens: `web/src/styles/variables.css`
- Base element styles: `web/src/styles/global.css`
- Shared primitives: `web/src/styles/components.css`
- Icons: `web/src/components/Icon.tsx`

## Direction

**Persimmon Sunset (柿 · 梅).** A warm, unhurried lifestyle app, not a gamified school app. Think of a
cosy café notebook: cream paper, persimmon accents, plum for pinyin, serif headings.

Principles:

1. **Chinese text is the hero.** Hanzi is always larger than the English around it, sits in an
   airy line-height (1.7), and is marked `lang="zh-Hans"`.
2. **One warm accent per screen.** Persimmon marks the main action (the mic button, a primary CTA)
   and the current location. Everything else stays neutral.
3. **Soft, not loud.** Cards on cream, hairline borders, warm-tinted shadows. No neon, no heavy
   gradients, no confetti.
4. **Calm motion.** Short ease-out fades and rises. Nothing loops except progress indicators.
   Every animation respects `prefers-reduced-motion`.
5. **Light-first.** `color-scheme: light`. Dark mode comes later, as a token remap only.

## Color tokens

Components use **only semantic tokens**. Never use raw hex values or `--persimmon-*` primitives.

| Token | Value | Use |
|---|---|---|
| `--color-bg` | `#FFF6EE` cream | Page background |
| `--color-surface` | `#FFFFFF` | Cards, AI messages, inputs |
| `--color-surface-sunken` | `#FBEEE3` | Sidebar, grouped strips, hover fill |
| `--color-border` / `-strong` | `#F0DFD2` / `#E3CBB9` | Hairlines / secondary button outline |
| `--color-text` | `#2B1E1A` ink | Body and headings |
| `--color-text-muted` | `#6E5A52` | Secondary text, labels (6.0:1 on cream) |
| `--color-primary` | `#C2532B` persimmon | **Fills only**: white text on it is 4.6:1 |
| `--color-primary-hover` / `-pressed` | `#A8441F` / `#8F3818` | Interaction states |
| `--color-primary-text` | `#A8441F` | Persimmon **text** on cream/white (5.6:1) |
| `--color-primary-soft` | `#FBE3D6` | User messages, active nav, selected rows |
| `--color-secondary` | `#6B4E71` plum | Pinyin, tags (7.1:1 on white) |
| `--color-secondary-soft` | `#EFE6F0` | Tag background |
| `--color-highlight` | `#FFD58A` apricot | `::selection`, "new" highlights |
| `--color-success` / `-soft` | `#3D6B52` / `#E2EFE6` jade | Saved, correct |
| `--color-danger` / `-soft` | `#A8322A` / `#FBE4E1` | Errors, delete |
| `--color-overlay` | ink at 44% | Modal scrim |

> ⚠️ `--color-primary` is 4.3:1 against cream, which is below AA for body text. For persimmon-coloured
> text, use `--color-primary-text`.

## Typography

| Role | Font | Token |
|---|---|---|
| Headings (h1–h3) | Fraunces 500/600 | `--font-serif` |
| UI and body | Inter 400/500/600 | `--font-sans` |
| Chinese body (messages) | Noto Sans SC | `--font-hanzi` |
| Chinese display (vocab, hero 你好) | Noto Serif SC | `--font-hanzi-display` |

Use the fluid type scale (`--step--2` … `--step-5`):

- Page title: `--step-4` serif. Section title: `--step-1` serif.
- Chat message: `--step-0`, `--leading-hanzi`.
- Vocabulary hanzi: `--step-1` serif SC. Hero hanzi: `--step-5`.
- Body and UI: `--step--1` to `--step-0`. Eyebrow labels: `--step--2`, uppercase, 0.08em tracking.
- Pinyin always uses the `.pinyin` class (plum, weight 500).

## Shape, elevation, motion

- Radius: `--radius-sm` 8px (tails, inputs), `--radius-md` 12px, `--radius-lg` 20px (cards and
  bubbles), `--radius-xl` 28px (sheets/modals), `--radius-pill` (buttons, chips).
- Shadows: `--shadow-sm` for resting cards, `--shadow-md` for floating controls (mic button,
  popovers), `--shadow-lg` for modals. All shadows are warm-tinted.
- Motion: `--dur-fast` 120ms (press, hover), `--dur-base` 200ms (disclosure), `--dur-slow`
  320ms (content entering). Easing: `--ease-out` when entering, `--ease-in-out` for loops.
  Entering content rises 6px and fades in. Press feedback is `scale(0.97)`.
- Spacing: the Utopia fluid scale (`--space-3xs` … `--space-3xl`). Don't use ad-hoc px values.
- Layout: reading column `--content-width` (46rem); tap targets at least `--tap-target` (44px).

## Primitives (`components.css`)

| Class | Notes |
|---|---|
| `.btn` + `--primary` / `--secondary` / `--ghost`, `--sm` | Pill buttons. One `--primary` per screen. |
| `.icon-btn` | 44px round icon-only button. **Must have `aria-label`.** |
| `<Icon name size label?>` | 24-grid line icons, 1.8 stroke. Decorative unless `label` is set. Add new glyphs to `Icon.tsx`; never use emoji as icons. |
| `.card` | White surface, hairline border, `--radius-lg`, `--shadow-sm`. |
| `.chip` | White pill for words/values (e.g. practice words). |
| `.tag` | Plum lowercase label for word type (vocab, grammar…). |
| `.eyebrow` | Uppercase section label inside cards and above lists. |
| `.hanzi`, `.pinyin` | Chinese text helpers. |
| `.visually-hidden` | Screen-reader-only text. |

## Patterns

- **Vocabulary row** (`.vocab-list` > `.vocab-row`): large serif hanzi, then a stack of pinyin and
  English, then a trailing tag or action. The row wraps on narrow screens. Reuse it anywhere a
  word is listed (chat help, lookups, practice setup, learning items list view).
- **Messages:** AI messages are `.card`-like surfaces with a small bottom-left tail and a ghost
  "Listen" action inside. User messages use `--color-primary-soft` with a bottom-right tail. While
  waiting for a reply, show the three-dot typing indicator, not an empty bubble.
- **Disclosure** ("Chinese help"): a ghost button with a sparkle icon and a rotating chevron,
  `aria-expanded` and `aria-controls`; the panel is a `.card` divided by hairline sections.
- **Primary voice action:** a 64px persimmon circle with `aria-pressed`. While recording, a pulsing
  ring plus a status line (`role="status"`) under it. While processing, the button is disabled and
  shows a spinner.
- **Success feedback:** after an action, swap the button to a jade "✓ Added"-style state. Don't use
  alerts.
- **Empty state:** large hero hanzi in persimmon, a serif title and one line of muted guidance.

## Applying this to other pages

1. Swap legacy variables (`--text-h`, `--accent`, `--code-bg`…) for semantic tokens. The legacy
   aliases at the bottom of `variables.css` keep old pages working meanwhile; delete them once no
   CSS uses them.
2. Replace bespoke buttons with `.btn` / `.icon-btn` and add `<Icon>` glyphs.
3. Replace hard-coded colours (`#b42318`, `#dc6b6b`, `white`) with `--color-danger`, etc.
4. Headings get the serif automatically via `global.css`. Don't override `font-family`.
5. Add `lang="zh-Hans"` to every element whose main content is Chinese.

Migrated: Chat, sidebar, Learning Items (page, sections, flip cards).
Still to migrate: `PracticeSetupModal.css` (start button, error colour, table header, scrim →
`--color-overlay`), SignIn and SignUp. After those, delete the legacy aliases.

- **Hover-revealed actions** (conversation rename/delete, card add/delete): `.icon-btn` at 36px,
  revealed on `:hover` / `:focus-within`, and always visible under `@media (hover: none)`. The
  destructive action gets a danger-soft hover; the additive action gets a success-soft hover.
- **Section heading with count:** serif `h2` + a sunken pill count with screen-reader text for
  the noun ("3 items").
- **Card grids:** `grid-template-columns: repeat(auto-fill, minmax(min(100%, 14rem), 1fr))`.

## Pre-delivery checklist

- [ ] No raw hex values or primitive tokens in component CSS
- [ ] Text contrast ≥ 4.5:1 (persimmon text uses `--color-primary-text`)
- [ ] Icon-only controls have `aria-label`; toggles expose `aria-expanded` / `aria-pressed`
- [ ] Visible `:focus-visible` ring (2px persimmon, from `global.css`)
- [ ] Tap targets ≥ 44px on touch screens (`--tap-target`)
- [ ] No horizontal scroll at 375px; long rows wrap
- [ ] Animations are transform/opacity only and stop under `prefers-reduced-motion`
- [ ] Chinese content carries `lang="zh-Hans"`
