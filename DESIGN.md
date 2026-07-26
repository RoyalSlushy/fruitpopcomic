# Design

Recorded from the built site, not written ahead of it. Values here are what
`assets/css/main.css` actually ships.

## Direction

**System Dashboard.** The site is a handheld console home menu — sections are
channel tiles in a grid, and opening one zooms it into a panel. Chosen by roll
after two re-rolls and a "go screen-native" steer; seed key `e61a73a4`.

The governing rule, derived from the assets in
[`docs/art-analysis.md`](docs/art-analysis.md): **the chrome is loud, the artwork
is never touched.** Every reference source — the moodboard, the character art, the
logo — colour-blocks by unit. The moodboard gives each tile a hue, the art gives
each character a field, the logo gives each letter a cloud window. The dashboard
is that instinct at page scale.

## Colour

Sampled from the wordmark's flat vector fills. Strategy is **Drenched** — the
surface is the colour, not a neutral with accents.

### Ground

| Token | Value | Use |
|---|---|---|
| `--navy` | `#0C1326` | Page ground. The logo's own field. |
| `--navy-lift` | `#142746` | Panel interiors |
| `--navy-line` | `#1C426C` | Hairlines, readout borders |

The ground is never flat: a canvas starfield plus two soft radial nebula washes
(cyan at 50%/68%, magenta at 78%/12%) sit under everything, matching the logo's
own background and the moodboard's rule that no reference sits on flat colour.

### Channels

Each section owns a hue. Bright tone is the tile face; deep tone is the name
plate, the plinth shadow, and any small text.

| Channel | Bright | Deep | Plate contrast |
|---|---|---|---|
| Read | `#ED2390` magenta | `#9F1F63` | 7.37 |
| Cast | `#2CC2E5` cyan | `#0F5E77` | 7.27 |
| Wiki | `#FCB040` gold | `#8A5209` | 6.38 |
| Art | `#F69385` peach | `#9B3F30` | 6.67 |
| About | `#31297A` indigo | `#211B54` | 15.56 |

### Ink

| Token | Value | Note |
|---|---|---|
| `--ink` | `#FFFFFF` | 18.47 on ground |
| `--ink-soft` | `#9FB3D9` | 8.73 on ground. Tinted from the ground's own hue — never grey |

**One measured constraint:** white on bright magenta is **4.00** — large text only.
Small text never sits on a bright channel face; it moves to a deep-tone chip. The
reader's page counter is built that way.

## Typography

| Role | Face | Why |
|---|---|---|
| HUD labels, channel names, buttons | **Bungee** 400 | Signage face with a real point of view. Its all-caps chunk matches the wordmark's weight, and its lineage is vertical sign painting — a system label, not a heading |
| Body, instrumentation, captions | **Barlow** 400/600/700/800 | Grotesque with slight rounding. Reads as machine instrumentation next to Bungee without going cold |

Self-hosted, latin subset only, 5 files / ~101 KB total. No external font request —
the site has zero third-party network dependencies.

Display maxes at `clamp(1.375rem, 3.4vw, 2rem)`. Prose is capped at 68ch.

## Form

- **Keyline:** 4px white border with a deep-tone inline. This is the wordmark's own
  treatment — white cut-line outside, deep-magenta inline — applied to every tile,
  panel, button and nav control.
- **Elevation:** hard offset plinth in the channel's deep tone, plus a soft blurred
  shadow. `0 7px 0 var(--ch-dp), 0 16px 30px rgba(0,0,0,.5)`. The plinth is the
  toy-plastic reading; the blur carries real depth.
- **Radius:** `22px` on tiles and panels, `12px` on inner elements, pills on small
  controls. Chunkier than a conventional UI floor, per the committed world.
- **Press:** hover lifts 5px and grows the plinth; active drops 4px and collapses it
  to 3px in 60ms. Tiles read as physically pressable.

## Motion

**One authored moment: the channel zoom.** Opening a section morphs the tile into
the panel it becomes, via the View Transitions API with a matched
`view-transition-name`. This is the form's native motion — console channels zoom
open — not a generic page fade.

Everything else is restrained: a single diagonal light sweep across the Read
channel's screen on hover, and the tile press. `prefers-reduced-motion` disables
the sweep and skips the transition entirely.

## Layout

Six-column grid. Read and Cast take 3 columns × 2 rows; Wiki, Art and About take 2
each. At ≤900px Read goes full width and the rest pair up. At ≤620px the grid
collapses to one column and the small channels become horizontal rows — screen
thumbnail left, plate right — which packs more above the fold on a phone.

Shell is `min(1240px, 100% - 2.5rem)`.

## Content rules

These are design decisions, not copy suggestions.

- **Comic pages are shown flat and clean**, on white, in their own field. The
  chrome stops at the page border. Pages are 2:3 at 1080px native.
- **Character art keeps its own ground.** The pale field each figure was drawn on
  is preserved as-is; the tile frames it and never recolours it.
- **Nothing is claimed that isn't supplied.** No release dates, no reader counts,
  no page numbers beyond what exists, no invented character names. The status
  readout says `Draft`, the Read channel is badged `Drafts`, and the reader carries
  a standing notice that the pages are working roughs.
- **The empty wiki ships empty**, with an empty state that says so.

## Known gaps

- The logo is raster only. `assets/logo/wordmark.png` and `monogram.png` were cut
  from the opaque source programmatically — background keyed out, specks opened
  away, trimmed to content. **A real SVG would be better** and should replace them.
- Routing is hash-based (`#/read`), so page URLs are linkable but not
  server-rendered. Fine for GitHub Pages; revisit if search indexing of individual
  pages matters.
- Dialogue is lettered into the artwork and cannot be read as text. Alt text
  describes each page's position and states the limitation rather than pretending
  otherwise.
