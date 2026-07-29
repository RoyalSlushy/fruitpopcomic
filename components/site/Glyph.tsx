/* The inline SVGs the rail, tab bar and quick tiles draw. Server component —
   no JavaScript ships for these. Ported verbatim from the static build. */

const PATHS: Record<string, React.ReactNode> = {
  home: (
    <>
      <path d="M9 29 32 10l23 19" />
      <path d="M16 27v27h32V27" />
      <path d="M26 54V39h12v15" />
    </>
  ),
  read: (
    <>
      <rect x="11" y="9" width="42" height="46" rx="5" />
      <path d="M22 22h20M22 32h20M22 42h12" />
    </>
  ),
  cast: (
    <>
      <circle cx="24" cy="23" r="9" />
      <path d="M9 53c0-9 6-14 15-14s15 5 15 14" />
      <circle cx="45" cy="25" r="7" />
      <path d="M43 39c7 0 12 5 12 13" />
    </>
  ),
  wiki: (
    <>
      <path d="M8 14h18a6 6 0 0 1 6 6v30a6 6 0 0 0-6-6H8z" />
      <path d="M56 14H38a6 6 0 0 0-6 6v30a6 6 0 0 1 6-6h18z" />
    </>
  ),
  star: <path d="M32 7l6.6 13.4L53.5 22l-10.7 10.5 2.5 14.8L32 40.3 18.7 47.3l2.5-14.8L10.5 22l14.9-1.6z" />,
  speak: (
    <>
      <path d="M30 12 17 24H8v16h9l13 12z" />
      <path d="M40 24a11 11 0 0 1 0 16" />
      <path d="M48 16a22 22 0 0 1 0 32" />
    </>
  ),
  stop: <rect x="16" y="16" width="32" height="32" rx="4" />,
  info: (
    <>
      <circle cx="32" cy="32" r="24" />
      <path d="M32 29v15" />
      <path d="M32 21h.03" />
    </>
  ),
};

/* the rail and tab bar key off the section id; quick tiles name a glyph */
const ALIASES: Record<string, string> = { art: 'star', about: 'info' };

export function Glyph({ name, width = 5 }: { name: string; width?: number }) {
  const body = PATHS[ALIASES[name] ?? name] ?? PATHS.info;
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      stroke="currentColor"
      strokeWidth={width}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {body}
    </svg>
  );
}

/* Eight teeth on a hub. Its own 24-grid rather than the 64 the rail glyphs
   use, because it is only ever drawn at footer size. */
export function Gear() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor"
      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="6.8" />
      <circle cx="12" cy="12" r="2.6" />
      <path d="M18.8 12h2.5M16.81 7.19l1.77-1.77M12 5.2V2.7M7.19 7.19 5.42 5.42M5.2 12H2.7M7.19 16.81l-1.77 1.77M12 18.8v2.5M16.81 16.81l1.77 1.77" />
    </svg>
  );
}

export function Chevron({ dir = 'right' }: { dir?: 'left' | 'right' }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d={dir === 'left' ? 'M15 5l-7 7 7 7' : 'M9 5l7 7-7 7'}
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
