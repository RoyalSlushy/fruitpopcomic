# Design

Recorded from the built site, not written ahead of it. Values here are what
`assets/css/main.css` actually ships.

## Direction

**System Dashboard.** The site is a handheld console dashboard — a persistent
channel rail down the side, and the home screen is an instrument panel rather
than a menu you leave. Chosen by roll after two re-rolls and a "go screen-native"
steer; seed key `e61a73a4`.

The governing rule, derived from the assets in
[`docs/art-analysis.md`](docs/art-analysis.md): **the chrome is loud, the artwork
is never touched.** Every reference source — the moodboard, the character art, the
logo — colour-blocks by unit. The moodboard gives each tile a hue, the art gives
each character a field, the logo gives each letter a cloud window. The dashboard
is that instinct at page scale.

The shell is convergent with the pinned brief rather than a departure from it:
[`docs/aesthetic-references.md`](docs/aesthetic-references.md) reads a
glyph-labelled bottom bar off reference 1 and a five-slot one off reference 5, and
names "chrome as ornament — counters, badges, currency pills, timers, tab bars.
Density and instrumentation read as richness, not clutter." That is the surface
this build finally puts up.

## Colour

Sampled from the wordmark's flat vector fills. Strategy is **Drenched** — the
surface is the colour, not a neutral with accents.

### Ground

| Token | Value | Use |
|---|---|---|
| `--navy` | `#0C1326` | Page ground. The logo's own field. |
| `--navy-lift` | `#142746` | Panel and rail interiors |
| `--navy-line` | `#1C426C` | Hairlines, readout borders |

The ground is never flat: a canvas starfield plus two soft radial nebula washes
(cyan at 50%/68%, magenta at 78%/12%) sit under everything, matching the logo's
own background and the moodboard's rule that no reference sits on flat colour.

### Channels

Each section owns a hue. Bright tone is the tile face; deep tone is the ribbon
label, the name plate, the plinth shadow, and any small text.

| Channel | Bright | Deep | White on deep |
|---|---|---|---|
| Read | `#ED2390` magenta | `#9F1F63` | 7.37 |
| Cast | `#2CC2E5` cyan | `#0F5E77` | 7.27 |
| Wiki | `#FCB040` gold | `#8A5209` | 6.38 |
| Art | `#F69385` peach | `#9B3F30` | 6.67 |
| About | `#31297A` indigo | `#211B54` | 15.56 |

The router writes the active section onto `<html data-section>`, so `--ch` and
`--ch-dp` follow the route with no per-element JS. Dashboard panels set theirs
inline, one hue each, so all five brand colours appear on one screen.

### Ink

| Token | Value | Note |
|---|---|---|
| `--ink` | `#FFFFFF` | 18.47 on ground |
| `--ink-soft` | `#9FB3D9` | 8.73 on ground, 7.05 on `--navy-lift`. Tinted from the ground's own hue — never grey |

**The one measured constraint:** white on bright magenta is **4.00**. That is AA
for large text only, and WCAG counts "large" from 24px at a 400-weight face. So
the hero headline's clamp floors at exactly `1.5rem`, and everything smaller moves
onto a deep-tone chip — the page counter, the hero's subtitle readout, the status
chips and the rank chips are all built that way.

Measured on the components this build added:

| Pair | Ratio |
|---|---|
| Rail selected — navy on gold | 10.05 |
| Rail idle — `--ink-soft` on `--navy-lift` | 7.05 |
| Tab bar active — gold on `--navy-lift` | 8.11 |
| Rank index — gold on `--navy-lift` | 8.11 |
| Card foot — white on `--cyan-dp` | 7.27 |
| Status pending chip — `#FFE2B4` on tinted lift | 9.29 |
| Status done chip — `#C7F4DA` on tinted lift | 9.16 |
| Hero subtitle readout — white on `--magenta-dp` | 7.37 |

## Typography

| Role | Face | Why |
|---|---|---|
| HUD labels, ribbons, channel names, buttons | **Bungee** 400 | Signage face with a real point of view. Its all-caps chunk matches the wordmark's weight, and its lineage is vertical sign painting — a system label, not a heading |
| Body, instrumentation, captions | **Barlow** 400/600/700/800 | Grotesque with slight rounding. Reads as machine instrumentation next to Bungee without going cold |

Self-hosted, latin subset only, 5 files / ~101 KB total. No external font request —
the site has zero third-party network dependencies, verified per route.

Display maxes at `clamp(1.5rem, 3.1vw, 2.15rem)`. Prose is capped at 68ch.

## Form

- **Keyline:** 4px white border with a deep-tone inline. This is the wordmark's own
  treatment — white cut-line outside, deep-magenta inline — applied to every tile,
  panel, ribbon, button and nav control.
- **Elevation:** hard offset plinth in the channel's deep tone, plus a soft blurred
  shadow. `0 7px 0 var(--ch-dp), 0 16px 30px rgba(0,0,0,.5)`. The plinth is the
  toy-plastic reading; the blur carries real depth.
- **Ribbon:** dashboard panels are labelled by a tab that overhangs the panel's top
  edge, rotated `-1.4deg` for the board's sticker logic. It sits on a `.slab`
  wrapper rather than inside the panel, because the panel keeps `overflow:hidden`.
  The five inner views do **not** carry one — their `.panel__bar` is already the
  header, and a second label would only repeat the section name.
- **Radius:** `22px` on tiles and panels, `12px` on inner elements, pills on small
  controls. Chunkier than a conventional UI floor, per the committed world.
- **Press:** hover lifts 5px and grows the plinth; active drops 4px and collapses it
  to 3px in 60ms. Tiles read as physically pressable. The hero and the quick-access
  tiles are the same `.ch` component, so the press physics are identical sitewide.

## Motion

**Three modes, one authored moment.** Opening a channel from the dashboard morphs
the tile into the panel it becomes, via the View Transitions API with a matched
`view-transition-name`. Returning to the dashboard reverses the same morph.
Panel-to-panel from the rail gets a short lateral swap instead, because nothing
zoomed — claiming a zoom there would be a lie about what happened.

The rail and the tab bar hold still through all of it: both carry a
`view-transition-name` with `animation:none`, so the persistent chrome never
cross-fades under the content.

Everything else is restrained: a single diagonal light sweep across the hero on
hover, and the tile press. `prefers-reduced-motion` disables the sweep and skips
every transition. The first paint on a cold load never animates.

## Layout

**Shell.** Below 1024px the rail is an off-canvas drawer behind a hamburger, and a
five-slot bottom tab bar carries Home / Read / Cast / Wiki / Art. From 1024px the
rail is furniture: fixed at `238px` with `<body>` padded to clear it, so `<body>`
stays the scroll container — a second scroll container would break the starfield,
which sizes itself from `document.body.scrollHeight`. Between 1024 and 1219px the
rail narrows to `78px` of glyphs and shows the monogram instead of the wordmark.

**Dashboard.** One column below 860px; above it, `1fr` plus a `268–324px` rail:

```
WHAT'S HOT    START HERE
THE DRAFTS    BUILD STATUS
QUICK ACCESS  (full width)
```

Shell is `min(1240px, 100% - 2.5rem)`, tightening to `min(1180px, 100% - 3rem)`
once the rail appears. At ≤620px the radius and keyline step down to 18px/3px.

## Content rules

These are design decisions, not copy suggestions.

- **Comic pages are shown flat and clean**, on white, in their own field. The
  chrome stops at the page border. Pages are 2:3 at 1080px native.
- **Character art keeps its own ground.** The pale field each figure was drawn on
  is preserved as-is; the tile frames it and never recolours it.
- **Nothing is claimed that isn't supplied.** The dashboard borrows a manga
  portal's shape, and every slot that would normally carry invented data carries
  something real instead:

  | Portal convention | What ships here |
  |---|---|
  | Top-N ranking with view counts | `START HERE` — the real drafts in file order, no metrics |
  | New chapters, numbered and titled | `THE DRAFTS` — ten cards, index only, no titles |
  | Daily missions and rewards | `BUILD STATUS` — what is finished and what is pending |
  | Genre tiles | `QUICK ACCESS` — the four other sections |
  | Events, creators | not built; neither exists |

  The only per-page fact shown is the **pencil stage** — magenta, sanguine, blue —
  which `docs/art-analysis.md` §3 establishes by date and which the filenames
  carry. No release dates, no reader counts, no cadence, no page numbers beyond
  the array index, no character names.
- **The build's own state is the densest panel on the page.** Where a portal puts a
  mission list, this puts the five things that are and aren't done. It is the site's
  thesis rendered as instrumentation rather than an apology in a paragraph.
- **The empty wiki ships empty**, with an empty state that says so.

## Accessibility

- Two navigation landmarks, distinctly labelled (`Sections`, `Quick navigation`).
  Exactly one is rendered at any width — the other is `display:none` and so leaves
  the accessibility tree entirely.
- The closed drawer is `visibility:hidden`, which keeps it off the tab order. The
  visibility flip is stepped, not eased, so it is already visible when focus moves
  into it on open. `Esc` closes and returns focus to the hamburger.
- `aria-current="page"` tracks the route on both navs; the router sets it in
  `paint()`.
- Route changes move focus to the new view (`tabindex="-1"` on each section), and
  each view carries the page's only `<h1>`.
- `BUILD STATUS` is a list with an `aria-hidden` glyph and the state in text. It is
  deliberately **not** checkboxes — they would be controls that do nothing.
- Comic-page alt text names the lettering limitation rather than pretending
  otherwise.

## Known gaps

- The logo is raster only. `assets/logo/wordmark.png` and `monogram.png` were cut
  from the opaque source programmatically — background keyed out, specks opened
  away, trimmed to content. **A real SVG would be better** and should replace them.
- Routing is hash-based (`#/read`, `#/read/4`), so page URLs are linkable but not
  server-rendered. Fine for GitHub Pages; revisit if search indexing of individual
  pages matters.
- Dialogue is lettered into the artwork and cannot be read as text. Alt text
  describes each page's position and states the limitation rather than pretending
  otherwise.
