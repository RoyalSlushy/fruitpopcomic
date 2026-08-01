# Design

Recorded from the built site, not written ahead of it. Values here are what
`assets/css/main.css` actually ships.

## Direction

**Comic Spread.** The site is a handheld console dashboard drawn as a comic page
— a persistent channel rail down the side, and a home screen of inked panels cut
off-square, tilted, and overlapping at the gutters over a ben-day halftone
ground. The shell direction was chosen by roll after two re-rolls and a
"go screen-native" steer (seed key `e61a73a4`); the panel language replaced a
card grid at the creator's direction, keeping the palette and the face and
changing only structure, weight, and texture.

The change was convergent with the pinned brief rather than a departure from it.
[`docs/aesthetic-references.md`](docs/aesthetic-references.md) already read two
rules off the board that the card grid was quietly opting out of: **"nothing is
square to the grid — tilt is the board's default, not an accent"**, and
**"texture under the chrome — none of these sit on flat colour."** Halftone is
named there explicitly, behind the Monkey Ball tiles. This build finally puts
both up.

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
inline on the **`.slab` wrapper**, one hue each, so all five brand colours appear
on one screen. The wrapper rather than the panel, because the wrapper is what
paints the plinth now — a hue set on the panel inside would leave every plinth
the section's colour instead of its own.

### Ink

| Token | Value | Note |
|---|---|---|
| `--ink` | `#FFFFFF` | 18.47 on ground |
| `--ink-soft` | `#9FB3D9` | 8.73 on ground, 7.05 on `--navy-lift`. Tinted from the ground's own hue — never grey |

**The one measured constraint:** white on bright magenta is **4.00**. That is AA
for large text only — from 24px at a 400-weight face, or 18.66px at 700. Two
clamps are set by that number and nothing else: the hero headline floors at
`1.75rem`, and `.panel__title` floors at `1.1875rem` (19px, bold), just past the
large-text threshold. Everything smaller moves onto a deep-tone chip — the page
counter, the hero's subtitle readout, the status chips and the rank chips are all
built that way.

The halftone never makes a pair worse: every dot field is the deep tone screened
over the bright one, or the bright tone over the dark ground, so the field under
any text is between the two measured values rather than outside them. The inner
views' header band is the tightest case — navy on gold dotted with `--gold-dp`
measures **5.46**, against 10.05 for the flat plate.

**The hero body is the one gradient fill on the site**, magenta at the top
running into peach at the bottom — and it is the DEEP peach, `--peach-dp`, not
the bright one. White on the bright coral peach measures 2.23, a hard fail even
at the headline's large size; the deep tone measures 6.67, comfortably past AA
for text of any size. Reading warmer going down is the same move the halftone
already made (deep tone screened over bright), just carried into the base fill
too — and the dot colour follows it: `.hero__body::before`'s screen sits in the
bottom-left corner, which is where the gradient reads peach, so its dots are
`--peach-dp` now rather than `--magenta-dp`. A magenta dot in a peach field
would have been a mismatched hue sitting on the ground rather than a shade of
it.

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

**Shuttleblock**, and nothing else. Four widths and three weights from one Fort
Foundry family, which is enough to carry both jobs the site used to split between
two faces. Replaced the Bungee/Barlow pairing at the creator's direction; the
~101 KB of self-hosted woff2 went with it.

| Role | Treatment |
|---|---|
| HUD labels, ribbons, channel names, headings, buttons | `700`, uppercase, tracked. Bungee was caps-only and carried its weight in the drawing, so both have to be stated explicitly now — one grouped rule near the top of `main.css` does it for all 22 selectors |
| Body, instrumentation, captions | `400`–`600`, sentence case |

Shuttleblock ships three weights, so requests for 600 and 800 resolve to the
nearest real face rather than synthesising. The scale is left as authored.

Served from an Adobe Fonts kit, which changes two things that were previously
true. The site no longer has zero third-party network dependencies — it makes
requests to `use.typekit.net` and `p.typekit.net`. And the kit is **domain-locked**:
Adobe serves it only to domains registered in the web project, so an unregistered
host gets a 403 and falls through to `ui-sans-serif, system-ui`. The fallback was
checked; caps, weight and layout all survive it, but it is not the design.

Display maxes at `clamp(1.75rem, 4.4vw, 3.15rem)` — the hero headline, raised
when the dashboard went bolder. Prose is capped at 68ch.

## Form

- **Cut, not rounded.** Every framed surface is clipped to a `--cut` polygon. The
  default is an honest rectangle; the dashboard overrides it per panel from four
  named shapes, so no two neighbours share an edge angle:

  | Token | Shape | Where |
  |---|---|---|
  | `--cut-rise` | top edge climbs left to right | the hero, `BUILD STATUS` |
  | `--cut-fall` | the same wedge mirrored | `THE DRAFTS` |
  | `--cut-nick` | leading corners trimmed off | `START HERE`, every inner view |
  | `--cut-band` | a long banner, both ends chevroned | `QUICK ACCESS` |

  The offsets step down at ≤620px — a 20px nick on a 320px panel is a bite, not a
  trim.
- **Two cuts are hand-drawn rather than tokenised**, both inside the hero: the
  caption box (`.hero__body`) and the standfirst's plate (`.hero__sub`). They are
  set as `clip-path` directly, *not* as `--cut` — that token drives the panel's
  three copies of one shape (`.ch`, `.ch__in`, the plinth), so setting it here
  would redraw the frame instead of the box inside it. Both carry points outside
  their box; nothing paints out there, so those points steer the edges running to
  them rather than adding area, which is how the caption box leans its right edge
  without nicking either corner.

  The plate's is written in **percentages**, and that is the one thing to keep if
  it is ever re-tuned. It was drawn against a 342×430 panel and the plate is
  307×78 — pasted as pixels, the point meant to sit 13% down its edge landed 73%
  down instead and the wedge cut through the second line of copy. A cut drawn on
  one box and worn by another has to be proportional or it is not the same shape.
- **Keyline:** 5px white, and it is **not a border**. A `clip-path` clips a border
  square at the cut corners, so the keyline is the element's own white background
  showing through its padding, with the interior painted inset by exactly that
  much and clipped to the same shape. `.pane` does this with a `::before`;
  `.ch` and `.panel` need a real interior element (`.ch__in`, `.panel__in`)
  because they stack children with different fills. This is still the wordmark's
  own treatment — white cut-line outside, deep tone inside.
- **Elevation:** `clip-path` clips shadows with everything else, so elevation
  cannot be a `box-shadow` on a cut panel. The plinth is a **second copy of the
  same cut shape** in the channel's deep tone, painted by the `.slab` wrapper and
  translated down 10px; one `drop-shadow` filter on the same wrapper traces the
  clipped silhouette for the soft depth underneath. The mini quick-access tiles
  are the exception — too small for a corner cut to survive, so they stay
  square-cornered and keep a real `box-shadow` plinth.
- **Halftone.** `--ht` is a substitution mixin: it is inherited unresolved, so
  `--ht-c` (dot colour), `--ht-r` (dot radius) and `--ht-s` (cell pitch) can be
  re-set on any element and `background:var(--ht)` picks them up there. Two offset
  dot grids make the staggered screen a press actually lays down. Every field is
  masked so the dots decay rather than tiling flat: 20px magenta and 15px cyan on
  the ground, 14px in the hero's magenta face, 9px of the bright channel tone
  inside each panel, 9px of the deep tone across each inner view's header band.
- **Ribbon:** dashboard panels are labelled by a caption box overhanging the
  panel's top-left corner — where a letterer would put it — rotated `-2.4deg`,
  chevroned on its trailing edge, and drawing its own keyline the same way the
  panels draw theirs. It sits on the `.slab` wrapper rather than inside the panel.
  The five inner views do **not** carry one — their `.panel__bar` is already the
  header, and a second label would only repeat the section name.
- **Radius:** effectively gone. `0` on panels and tiles, `3–4px` on inner
  elements, pills still on small controls. The old `22px` toy-plastic radius was
  the card grid's; a comic panel has corners.
- **Press:** hover lifts the face 7px while `.slab:has(>.ch:hover)` drives the
  plinth to 17px; active drops the face 4px and collapses the plinth to 3px in
  60ms. The face moves by `transform` and the plinth by `translate` — two
  properties on two elements, so neither fights the other. The hero and the
  quick-access tiles are the same `.ch` component, so the press physics are
  identical sitewide.
- **Tilt:** every dashboard panel is rotated a fraction of a degree, no two the
  same, between `-1.1deg` and `+1.7deg`. The draft cards carry a four-step
  rotation cycle so the rhythm never resolves into a pattern the eye can lock
  onto, and the quick tiles alternate `±1.5deg`.

## Motion

**The tile→panel morph did not survive the port, and is currently absent.** In the
static build, opening a channel morphed the tile into the panel it became via the
View Transitions API. Under App Router that needs either Next's
`experimental.viewTransition` — a flag made inert during Next 16 — or React's
still-`unstable_` `ViewTransition`. Neither is worth depending on for something
purely cosmetic, so the routes navigate plainly for now. The CSS that drove it is
still in `globals.css` (`view-transition-name` on `.rail`/`.tabbar`, the
`::view-transition-*` rules), so restoring it is a small change once a stable API
lands.

What remains: a single diagonal light sweep across the hero on hover, the tile
press, and the phone shelf's Ken Burns pan — five moves, assigned by which page
is showing rather than by which layer is holding it, so one layer never repeats
a move every other slide. `prefers-reduced-motion` disables the sweep and stops
the shelf dead; see **Layout** for why stopping it beats letting the global
reduce rule flatten a pan into a snap between end states.

## Layout

**Shell.** Below 1024px the rail is an off-canvas drawer behind a hamburger, and a
five-slot bottom tab bar carries Home / Read / Cast / Wiki / Art. From 1024px the
rail is furniture: fixed at `238px` with `<body>` padded to clear it, so `<body>`
stays the scroll container — a second scroll container would break the starfield,
which sizes itself from `document.body.scrollHeight`. Between 1024 and 1219px the
rail narrows to `78px` of glyphs and shows the monogram instead of the wordmark.

**Below 860px the hamburger comes off the strip.** With no ribbon over it, the
wordmark is the strip's only remaining item, which is what puts it at the
top-left — a lone flex child in a `space-between` row sits at the start edge
with no extra rule needed. The burger can't stay on that line without crowding
back into the logo, so it becomes a fixed button over the corner a thumb
already rests near instead of a second thing sharing the strip.

It is only on screen for as long as the tab bar is not the answer to "where is
the nav" — the hero's first screen, before the first scroll — so it mirrors
that *same* hidden condition rather than inventing a second clock: hidden by
default, shown only where the tab bar rule says the tab bar is not. Everywhere
else the tab bar is already up, so the floating burger stays off, and reaching
`About` — the one nav item the tab bar drops — goes through the footer link
every page already carries.

**Dashboard.** Laid out as a comic page, not a card grid. Three devices do the
work, and all three are load-bearing:

1. Twelve columns, but the two content rows **do not split them at the same
   place** — 8/4 over 7/5, stepping to 7/5 over 6/6 once the narrow rail appears.
   A shared vertical gutter is what makes a grid read as a grid.
2. Every panel tilted, no two the same, and no two cut to the same edge angle.
3. Negative margins pull the panels into each other so their keylines butt and
   overlap the way inked panels do. The tilt needs that overlap — square gaps
   between rotated boxes read as a broken grid rather than a spread.

```
THE HERO (1–9, no ribbon)  START HERE (9–13, dropped 1.1rem)
QUICK ACCESS (full width)
THE DRAFTS (1–8)           BUILD STATUS (8–13, raised 1.8rem)
```

**The hero is the one panel with no caption box.** Four of the five carry a
ribbon over their top-left corner, because four of them need saying what they
are — a ranked list, a shelf, a set of links, a state table. The hero is a
drawing from the comic with the comic's name on the page above it, and a label
over the artwork was captioning a picture that captions itself. It is
`slab--bare`, so the `padding-top` that exists only to hold an overhanging
ribbon comes off with it and the artwork starts at the panel's own edge. The
headline lost its eyebrow on the same argument: an uppercase kicker over an
uppercase headline was two tracked lines saying one thing.

Quick access sits directly under the two top panels because it is the only row
that is navigation rather than the comic: a visitor who did not come to read
should not have to pass the whole draft shelf to find the way to everything
else. Only which row each panel is in changed — every overlap is the one it had.

One column below 860px, where the panels keep their tilt and still bite into each
other by `-0.4 × --gap`.

**The phone's first screen is the hero.** Below 860px that panel is sized to the
TRUE `100dvh`, so the dashboard opens as one full-bleed panel and everything
under it is a scroll away. Stacked into a single column, six tilted panels
otherwise arrive as a wall of edges; the panel that is the comic gets the screen
instead. The panel's height is a `min-block-size` — in landscape the copy is
taller than what is left of the window, and a hard height would clip it.

**The header comes off the strip and onto the glass, home only.** Everywhere
else the strip stays exactly what it always was: an in-flow row that reserves
its own height, because every other route has something real to reserve it
for — `/cast`'s own bar, `Wiki`'s, `About`'s, all sitting right where the strip
used to end. Pull the header out of flow there and it does not free any space,
it just lands on top of that bar. The dashboard is the one route with nothing
at that y-range to land on — the hero fills the whole window under it — so it
is the one route where the header can leave.

There, at ≤859px, `.sysbar` becomes an absolutely positioned mark pinned
`top`/`left` (each axis carrying its own `env(safe-area-inset-*)` term, since a
notch eats into one edge at a time and never both), laid straight on the
artwork with **no plate under it**. The burger and the tab bar carry plates
because they are things you press and have to read as pressable over anything;
a logo only has to be legible, and its own drop-shadow does that. The mark is
pale cloud-blue and white in places and the pages under it are white paper, so
the shadow is not decoration — without it the wordmark loses its own edges.

**Absolute, not fixed.** Fixed would pin it to the *viewport*, so it would
still be sitting in the corner after the hero scrolled out from under it — a
mark on the glass rather than a mark on the page, and a second landmark
competing with the burger's own fixed one. Absolute, against the initial
containing block (nothing between `.sysbar` and `<html>` is itself
positioned), anchors it to the same document y-origin the hero panel starts
at, so the two scroll away together: the mark only ever reads as sitting ON
the artwork, never as furniture bolted to the screen. It also drops to about
the burger's own size — it was sized for a strip that ran most of the screen's
width, and laid bare on the page it wants to be a mark rather than a banner.

**The picture takes the slack; everything else is sized to what it is.** The
copy is the copy, and the shelf under it has to stay the depth the button hangs
over — the picture is the only thing on the panel that can be any height without
something being wrong. So the caption box is sized to exactly what it holds and
the picture flexes into the rest of the window.

It was pinned to **4:5** for a while, and the reason it is not any more is worth
keeping. A fixed ratio makes the picture *set* the panel's height rather than
answer it: picture + copy + shelf is then a sum that has no reason to equal the
window, and on anything short it overshot. The panel's height is a minimum, so
nothing overflowed and nothing shrank — the panel simply grew past the fold and
took the slideshow with it. Measured against the flexed version, the shelf's
band sat **58.9px below the fold at 360×640** and **78.9px at 320×568**; flexed,
it clears by 1.7px and 2.0px. A `max-block-size` cap had been holding the worst
of that back, which is really the tell: a ratio that needs a cap to stay on
screen is not deciding the layout, it is arguing with it.

What the ratio bought was a picture whose shape did not change with the window,
and that is a real thing to want back — a page is composed for a frame. If it
returns it has to come back as something the panel's height is derived *from*
rather than something added to it.

**The button hangs over the caption box's bottom edge.** The gradient stops
`--shelf` short of the box's bottom, so the box has an edge inside the panel
for the button to cross, and what shows under it is the slideshow below.

**Painted short, not sized short.** The shelf is where the slideshow goes, so
it has to be a fixed depth the band can be positioned into; a box that reserved
it as real space would hand it to the flex line and let the picture take it
back. Painting the gradient short leaves the layout untouched and moves only
the edge — which is also what kept the button exactly where it already was when
the edge first came up to meet it.

The copy is justified to the box's **bottom** for this, and that half is
load-bearing. Centred, the button sat on half of whatever slack the window
happened to leave, so no fixed shelf could be relied on to cross it: at
390×844 the edge landed mid-button, at 360×640 it cleared the button entirely
and left it floating on white. Anchored, the button is always the same
distance off the box's bottom and the edge always cuts the same part of it —
measured at exactly 50% of the button's height on 390×844, 412×915 and
360×640 alike.

The shelf's depth is what it is because two things were asked for at once: the
button not moving, and the box's edge crossing it. The button sat 102px clear
of the box's bottom, so the edge has to come up at least that far — which
leaves a band of about the same depth under it. Shrinking `--shelf` closes the
band but walks the button down the screen with it; the two cannot be traded
separately.

**The shelf holds the pages, drifting.** `Reel.tsx` owns which page is showing;
`globals.css` owns the move, because a Ken Burns pan is a transform over time
and nothing else. It is absolutely positioned into exactly the unpainted shelf,
so it costs the flow nothing — added as a flex child it would have pushed the
copy up and moved the button off the edge it was just aligned to — and sits at
`z-index:0` against the `1` that `.hero__body>*` hands its children, so the
button paints over the band rather than under it. Page one is skipped: it is
the artwork directly above, and the same drawing twice on one screen reads as a
bug rather than a slideshow.

The band is far wider than a page is, so the frame crops hard, and **the pan is
what makes that a decision rather than a loss**: every move travels *down* its
page, so the crop reads as reading. `block-size:auto` is what gives it somewhere
to travel — a layer is a whole page tall (513px against a 124px band, so 389px
of room) and the band is a window onto it. In the transform, `translateY()`
comes *before* `scale()`: transforms apply right to left, so that scales about
the band's top edge first and then pans in the page's own units. The other order
multiplies the pan by the zoom and walks the later moves off the bottom of the
page. Each pair keeps `scale − pan` above the band's share of a page height
(0.26 at the narrowest phone), which is the condition for the window to stay on
the artwork.

Three things keep it from being a tax on a phone: **two layers, not ten** (a
slide is a full 1080px page, so the pair double-buffers and the dark one carries
the next page with a whole interval to load it), it **only ticks while it is on
screen**, and `prefers-reduced-motion` **stops** it rather than speeding it up —
the global reduce rule flattens animation durations, which would leave the pan
snapping between end states, so the tick never starts and the shelf holds one
still page. The cadence is slow twice over: a Ken Burns pan wants to be barely
perceptible, and each turn is a full page off the network. Measured at 6.5s a
slide, that is five page images in twenty seconds.

The **tab bar retracts** while that first screen is showing and rides back in on
the first scroll — the hero is the whole of the window, so nothing sits over its
bottom edge. The shell writes `data-scrolled` on `<html>`; the retract is scoped
to the dashboard at phone widths, because it is the one route guaranteed to be
taller than the window and a bar that needs a scroll to appear on a page that has
none is navigation nobody can reach. It hides by `visibility` on a stepped
transition, the way the drawer does, so it leaves the tab order rather than
lurking off-screen in it — and a `<noscript>` rule pins it open, since without
script nothing sets the attribute and the drawer's button does not open either.

A single repeating-conic speed-line burst sits behind the spread, thrown from
behind the hero and masked to an ellipse. It is the page's one authored flourish;
everything else is halftone, which is texture rather than event.

**The shelf.** `/read` opens the chapter list, not page one. "Start reading"
and "go back to where I was" are different intentions and page one only ever
served the first. The reader itself stays at `/read/[n]`, indexed into the flat
running order, so no existing link moved.

Chapters are a **view over that flat array**, not a second nested structure that
could disagree with it. The array stays the single running order — it is what
`/read/[n]` indexes, what reordering moves things within, and what the merge
matches by id across an edit — and each page names its chapter. One rule falls
out of that and is worth stating: a page whose chapter names one that does not
exist still appears, under `Unsorted`. A reading surface that silently hides a
page is worse than one that admits it does not know where the page goes.

There is one chapter, and its title says what the pages actually are. The drafts
carry timestamp filenames, no numbers and no grouping — the real chapter breaks
are not known, and inventing them would be inventing the story's shape.

**And it lists chapters, not pages.** Each entry used to unroll into a scrolling
strip of every page it holds, which made the chapter list a page list wearing
chapter headings — ten thumbnails to skim before the next title, and the trade
gets worse with every chapter the comic gains. An entry is now a cover, a name,
a line about it, a count and one destination. Choosing a particular page is the
reader's own `Pages` control, which is where you already are when you want one.

The cover is not a link and not in the tab order. The entry has exactly one
destination and it is the button beside it; a second link to the same place is
noise in a tab sequence and nothing at all to a screen reader.

**Reader.** The page is the product, so the page gets the room — the whole
window of it. On a desktop the reader is a viewport-tall flex column from the
view down to the artwork, and everything that used to sit above and below it is
either gone for this route or behind a control:

- **The top strip and the footer are `display:none` while `data-reading` is
  set**, which is `/read/[n]` and nothing else. A breadcrumb and three counters
  are not worth 160px of the page, and the rail is still there to navigate with.
- **The filmstrip is behind a `Pages` button** rather than opening on hover.
  Parked under the artwork it cost every page a hundred pixels of height, all
  day, to show ten thumbnails of the pages you are not reading.
- **The page number is not tipped over the artwork.** It was a corner flag on
  the drawing that said what the bar already said two feet away, and the bar's
  copy is the one that is never in the way.
- What is left is a bar, the page, and three controls.

The bar itself is down to the chapter and the count. `Chapters` is a back mark
rather than a word, because the room it was taking is the title's; it keeps the
label as an `aria-label` and as a tip on hover and on focus, so the only thing
lost is the width. Beside the title is **`(Chapter NN)`** — the title is the
creator's words and may carry no number at all, while this one is the running
order's and always does.

Nothing in that column is sized by a figure. The page takes what the bar and the
controls leave, at any window height, rather than a `calc()` worked out from how
much chrome there used to be.

Two controls are revealed rather than parked on screen:

| Control | At rest | Revealed by |
|---|---|---|
| The standing note | an `ⓘ` in the heading | hover, focus, or click on the mark |
| The page flips | nothing | hover or focus anywhere in `.stage` |

Each obeys the same three rules, and they are not optional:

1. It also appears on `:focus-within`, so a keyboard reaches it.
2. It is never the **only** route to the thing. The note is on
   `aria-describedby`; paging is on the arrow keys plus Home and End; the strip
   is duplicated by the counter and by the progress rail.
3. It is permanently visible under `@media (hover: none)`. A control that exists
   only under a mouse pointer is a control half the visitors do not have.

The reader's own controls follow the same rule as the rail and the tab bar:
`.rtools` is the desktop's set and `.rdock` is the phone's, each `display:none`
where the other one lives, so exactly one set is ever in the accessibility tree.

| Control | Does |
|---|---|
| `Pages` | opens the filmstrip, in flow, the page shrinking to make room |
| `Zoom` / `Fit page` | steps to 2× and back, for the pointer that cannot pinch |
| `Cinema` | below |

The flips are anchored to `.plate`, which shrink-wraps the page, so they sit
against its edges rather than stranded at the sides of a column a portrait page
never fills. They stay outside the page border — the chrome stops there, and
that rule does not get an exception for being convenient. At the ends they dim
rather than vanish: a handle that disappears reads as a glitch, one that greys
out reads as the end of the comic.

Whether there is room for the script column beside the page is a question about
the panel, not about the viewport — the rail takes 238px off one and not the
other — so it is a **container query** (`@container read (min-width: 820px)`)
and not a media query.

That number came down from 900 when the reader became viewport-tall. It was set
when the page had a fixed height and the panel could scroll, so a narrow row
cost the artwork width it could not get back. The page is bound by **height**
now, which makes the stacked column the expensive layout: it spends the page's
height, which is the whole budget, to save width the page was not using. At a
1024px window the swap is a page half again as large.

**Cinematic mode** is the same reader with everything else taken away: real
full screen through the Fullscreen API, because the browser's own chrome is part
of what stands between a reader and the page and only that API can take it. A
browser that refuses — every iPhone, where there is no element full screen —
still gets the mode inside the window it already had, because the attribute
carries the styling and the API call is separate.

What changes in it:

- The panel's construction comes off, exactly as it does on a phone and for the
  same reason: a rotated, clipped, drop-shadowed slab has nothing to cast a
  shadow onto when it is the whole screen, and its cut corners would be notches
  out of the artwork.
- **The script hugs the page.** The reader box stops filling the row and
  shrink-wraps its page, so the two become one centred group instead of a page
  in the middle and a column stranded at the window's edge. An empty script is
  not shown at all — three sentences explaining that there is no transcript yet
  is exactly what this mode is for getting rid of.
- The bar keeps the `<h1>` and the counter and loses everything else; a mode is
  no reason to take a landmark out of the accessibility tree. It and the control
  pill retract together on a tap, and the tap works on the bare field either
  side of the page as well as on the page itself.
- The filmstrip becomes a band floating above the controls rather than a drawer
  the page shrinks for. In here, the page shrinking is the one thing nothing is
  allowed to do.

**The phone's reader.** Below 860px the reader stops being a panel on a page and
becomes the whole screen. Same markup: the drawers **are** the timeline and the
script column, repositioned as bottom sheets, so there is one filmstrip and one
transcript rather than a desktop copy and a phone copy that drift apart. Only
the dock and the scrim are phone-only, and both are `display:none` above 860px —
the same rule the rail and the tab bar already follow, so exactly one set of
reader controls is ever in the accessibility tree.

| | Desktop | Phone |
|---|---|---|
| Page timeline | `Pages`, a strip in flow | `Pages` drawer, a grid |
| Script | column beside the page | `Script` drawer |
| Page turn | flips, arrow keys | flips, arrow keys, **swipe** |
| Chrome | always, or `Cinema` | retracts on a tap on the page |
| Zoom | `Zoom`, ctrl-wheel (a trackpad pinch) | **pinch**, then one finger pans |

**The drawers open in flow, and the page shrinks to make room.** They were
overlays first — absolutely positioned sheets sliding up over the page, dimming
it behind a scrim — and every one of that design's problems was the same
problem: a positioned, animated overlay nested this deep is hit-tested against
a composited layer that does not reliably agree with layout. The scrim ate the
taps meant for the drawer; with the scrim gone, taps fell through to the page
image, which then took pointer capture for the swipe and swallowed the click.

In flow there is no stacking context to lose, no transform to go stale and
nothing underneath to fall through to. It is also the better behaviour: an open
drawer never covers the page you are reading, so no scrim is needed either.

Their height is a **fixed share of the viewport, not a measurement of their own
content**. Opening one shrinks the page above it, which re-lays out a
1080 × 1620 image; with the height content-driven that settled a frame late, and
the first tap after opening landed a row out.

One thing has to give for the drawers to work at all: `.slab` carries a
`drop-shadow` filter, and **a filter makes an element the containing block for
every fixed-position descendant**, which would pin the sheets inside the panel
instead of to the viewport. The full-screen reader has nothing to cast a shadow
onto, so the filter comes off there.

Swipe is one gesture with three outcomes — a horizontal drag turns the page, a
vertical one is left to the scroller (`touch-action: pan-y`), and a tap that went
nowhere toggles the chrome. The axis is decided once, on the first 10px, so a
turn cannot start halfway through a scroll, and the page resists rather than
refuses at a chapter's edges: it still moves a little, which is what says there
is nothing there. Two details make it work at all — `draggable={false}` and
`-webkit-user-drag:none`, because Chromium starts a native image drag on
pointerdown and that fires `pointercancel` before the swipe has moved a pixel.

**Pinch to zoom, because a page is 1080px of ink and a phone shows it at about
a third of that.** The lettering in a corner panel is not readable at the size
the page arrives, and "open the image in a new tab" is not a reader. Two fingers
scale the artwork up to 4×; one finger then pans it instead of turning the page,
because turning while zoomed is turning to a part of the next page nobody chose.
It is written straight to the node, like the swipe and for the same reason —
React learns only whether we are zoomed at all, which flips twice a gesture
rather than sixty times a second.

Four things keep it honest. The page is **reined in at its own edges**, so it
cannot be dragged out into empty navy and lost. It is **clipped to the reader**
while zoomed, so the artwork never spills over the chrome — the border rule
holds in both directions. **Turning the page resets it**, because a zoom belongs
to the page it was made on, and the `<img>` is the same node across a turn. And
there is always a **way back out that is not a gesture**: Escape, or a `Fit page`
pill, for the trackpad and the mouse and the keyboard.

The one place the gesture is taken from the browser is `ctrl`-wheel, which is
what a trackpad pinch sends and also how a browser is asked to zoom the whole
document. On a phone the artwork takes `touch-action: none` — but only inside
the full-screen reader, where `html[data-reading]` has already stopped the
document scrolling and there is nothing for a second finger to mean. The flip
gutters keep `pan-y`, and nothing above 860px changes.

The page/cast/status readout is desktop furniture and is `display:none` on a
phone: three numbers between the visitor and the comic, and the same counts are
on the dashboard anyway.

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
- **Pages are reordered by dragging them.** Press and hold a page in the
  filmstrip, drag it between two others, let go. It is editor-only, and the
  drag code is in the async admin chunk with the rest of the CMS — a visitor's
  markup gains nothing, not even an attribute.

  Four things had to be true for it to feel like picking something up, and each
  one is a bug that was there first:

  - **Hold, not grab.** A tap on a thumbnail already means "go to that page",
    so the lift waits 320ms and any real movement before then cancels it —
    that is a scroll, not a lift.
  - **Capture on the list.** Once lifted the pointer is captured by the list,
    so the thumbnail's own handlers stop firing. Without it, letting go over a
    different page would also navigate to it.
  - **Scrolling gives way.** `touch-action:none` on the thumbnail is not
    enough: the gesture still belongs to whichever ancestor scrolls, and the
    moment the drag moved, that ancestor claimed it and the browser answered
    with `pointercancel`. Every scroll container above the list gives its
    `touch-action` up for the duration and gets it back on drop.
  - **No click afterwards.** A drag ends in a pointerup and the browser follows
    that with a click. Swallowed once, or every drop would navigate.

  The drop target is the **gap**, not the item, so the indicator is drawn on
  the near edge of the page you are next to rather than around it — an outline
  around a page reads as "replace this one". The arithmetic is in
  `lib/reorder.ts`, separated out and tested because dragging thinks in gaps
  while `moveItem` thinks in indices, and the item is spliced out before it is
  put back.

  **Dragging is never the only way.** The ↑ ↓ buttons stay exactly where they
  were; a drag has no keyboard equivalent, and inventing one out of the arrow
  keys would collide with the reader's own paging.

  One thing this exposed rather than caused: the editor's save bar is fixed to
  the bottom centre of the viewport, which is where the reader keeps its page
  strip. Those thumbnails could not be clicked at all. The bar now folds down
  to a pill, and the shell reserves room below the page so the strip can be
  scrolled clear of it.
- **The editor is dismissible.** Both of its exits used to lead back to a
  password box: pressing Done dropped to the sign-in bar, and clicking off that
  bar did nothing at all, so a gear pressed by accident left a password field
  parked over the site until the page was reloaded. Now a press outside the
  sign-in box, Escape, its `✕`, and Done all do the same thing — the editor
  leaves the page, and the marker cookie that would reload it goes with it.
  Only the sign-in box is dismissible that way; an editing session holds
  unsaved work, and is closed by Done and by nothing else.
- **Both of the site's editing affordances are hover-shaped** — a chip naming
  the field, a Replace button over an image — so on a phone neither of them
  exists. In the reader the same gesture that retracts the chrome raises a page
  sheet instead: the page image, the thumbnail and the script, for the page you
  are looking at. It closes on a tap outside it or Escape, and it is the same
  surface with a mouse, because a desktop copy and a phone copy drift apart.

  It also filled a hole that had nothing to do with phones. The reader's page
  image was a plain `<img>` — the drawing itself, the one thing a comic CMS has
  to be able to replace, was reachable from nowhere, and a script page could
  never be given the art that would finish it.
- **A page can exist before it is drawn.** A page with no image is a *script
  page*: it holds its place in the running order and shows its script on a
  paper-coloured sheet at the same 2:3 as every real page, so the shape of a
  chapter can be laid out before the art exists. It is rendered as a page rather
  than as a gap because that is what it is. A page added in the editor starts
  as one, since the template ships a blank image — and a script page does not
  also get the script column beside it, because it already is the script.
- **The script column ships empty too, and that is the point.** Every page now
  carries a `script` field, one beat per line, rendered beside the artwork as
  attributed dialogue. It is blank on all ten pages and must stay blank until
  the creator writes one out. The lettering is drawn into the drawing; there is
  nothing to extract, so anything in that column that the creator did not type
  would be invented dialogue — which is invented story, and the one rule this
  project does not bend. The empty state says why rather than apologising, and
  it is narrower than a populated column, because three sentences do not earn a
  transcript's share of the width.

  What the field buys once it is filled: the page becomes selectable,
  searchable, translatable and reachable by a screen reader, none of which an
  image is. Read-aloud gets something worth reading — before this the only
  spoken thing was a one-sentence description of a page nobody can read.

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
  otherwise. Where a script exists it stops apologising and points at the
  column instead, because the page is genuinely readable then.

Added with the reader rebuild:

- **Hover-revealed content meets WCAG 1.4.13 on all three counts.** The standing
  note is *dismissible* (Escape closes it), *hoverable* (a `::before` bridges
  the 9px gap so the pointer can reach the panel without it vanishing) and
  *persistent* (it stays until the pointer leaves, focus leaves, or Escape).
  Escape needs a `data-dismissed` flag to beat the CSS as well as the state:
  dismissing returns focus to the mark, the mark is inside the tip, and
  `:focus-within` would otherwise light it straight back up.
- **Paging never moves focus** — that would yank a keyboard visitor off the
  arrow they are holding — so the change is announced through a polite live
  region instead of being silent.
- `Home` and `End` jump to the first and last page. Arrow keys are ignored
  inside a field or a `contenteditable`, so they never fight the editor.
- The spoken line carries `aria-current`, and a second live region names it, so
  following along works by eye and by screen reader both.
- One speech queue for the whole page (`lib/tts.ts`). `speechSynthesis` is a
  single global device, so two components each holding their own `speaking`
  state would leave the loser's button stuck reading "Stop" for audio that had
  already been cancelled. `owner` is what makes the other one render idle
  without being told.
- **The voice is chosen, not accepted.** Read-aloud is only as good as the voice
  it is handed, and the one a browser hands you by default is usually the oldest
  synth installed. Every current platform ships something genuinely good —
  Microsoft's Natural set on Edge, Siri and the Premium downloads on Apple,
  Google's on Android — in the same `getVoices()` list as decades of legacy
  formant synths and the macOS novelty voices. `lib/voices.ts` sorts that list
  so the best thing the visitor already owns comes first, and the picker beside
  every read-aloud button offers it, with speed and pitch and a preview.

  Three details are load-bearing:

  - **Language outranks every quality signal**, by a margin nothing else can
    close. A superb German voice reading English is worse than any English one.
  - **The recommended group is a relative cut, not a score threshold.** A
    threshold high enough to mean "neural" leaves the group empty on any device
    whose best voices are named plainly — which is Android and Chrome OS, where
    Google's are the whole story. So: the neural ones if any exist, otherwise
    the best three in the right language. It is never empty when a usable voice
    exists.
  - **Preview is not a nicety.** A list of voice names tells you nothing about
    what any of them sound like, so choosing without hearing is guessing.

  The choice is persisted, applies to both callers, and changing it mid-sentence
  restarts from the line being read rather than from the top. `getVoices()` is
  empty on its first call in every Chromium browser, so the list is also taken
  from the `voiceschanged` event — without that the picker is permanently empty
  for most visitors.

## Content

Content lives in **code** — `content/*.ts`, typed consts — and the database holds
only a sparse override per section. The site renders completely from code with an
empty database. Editing happens **in place**: sign in at `/#cms` and the page
itself becomes the editor. See [`docs/cms.md`](docs/cms.md).

Two design consequences worth recording:

- **The fallback is content, not a placeholder.** `content/*.ts` is the real
  material, not a stub, and it renders if the database is unreachable or empty. A
  comic that goes blank when a database is down has failed at the one thing it
  exists to do. This is now verified on every build: the production build runs with
  the database unreachable and still prerenders all 18 pages.
- **A save is visible without reloading.** `revalidateTag(tag, 'max')` is
  stale-while-revalidate by design, and Next deliberately does not mark the path
  revalidated in that mode — its own comment says "so that server actions don't
  pull their own writes". The editor is precisely the caller that must pull its
  own write, so on its own that left them looking at the old copy until they
  reloaded by hand. `updateTag()` is the read-your-own-writes answer but throws
  outside a Server Action, and the save is a Route Handler, so the immediate
  half of the job is `revalidatePath('/', 'layout')` — scoped to the layout
  because the rail, the footer and the derived counters render from the same
  sections on every route. The tag call stays: it is what keeps everyone else's
  caches honest.
- **The honesty rules are now enforced by shape, not by discipline.** There is no
  field anywhere in the CMS for a release date, a view count, or a follower
  number, because there is no column for one. The cast counter sums figures that
  were actually drawn; the page count counts pages. `display_name` on a sheet is
  nullable and its hint says to leave it blank unless the name is genuinely known.
  The Build status panel is the one place the creator states what isn't finished,
  and it is the first tab that opens with a standing note saying so.

The wiki is wired up and starts empty. Its empty state appears only when there are
genuinely no published entries, rather than being hardcoded.

**One consequence of editing in place worth recording as a design rule:** a list
whose length can change must be read through `useCmsValue`, not rendered from the
server array. Leaf values alone are not enough — adding an item changes the array's
length, and a server-rendered list cannot grow a node in response to a draft.
Reordering would appear to work while adding silently did nothing. `Gallery` is a
client component for exactly this reason.

## Delivery

Next.js App Router on Vercel. The site was a hand-written zero-dependency static
build on GitHub Pages until the in-page CMS required a server function to hold a
service-role key; that is the trade, and the "no build step, no dependencies"
property recorded in earlier revisions of this file is no longer true.

Every content route is still statically prerendered (`○`/`●`) — only `/api/cms/*`
is dynamic. That is load-bearing: one `cookies()` call reaching the root layout
would make every route dynamic and take the whole site off the CDN, which is why
edit mode is detected from a marker cookie read on the client rather than from a
request header.

The editor is never in a visitor's bundle. Each editable primitive is a thin shell
that lazy-loads its implementation, and the build fails if that stops being true.

## Known gaps

- The logo is raster only. `assets/logo/wordmark.png` and `monogram.png` were cut
  from the opaque source programmatically — background keyed out, specks opened
  away, trimmed to content. **A real SVG would be better** and should replace them.
- Routing is hash-based (`#/read`, `#/read/4`), so page URLs are linkable but not
  server-rendered. Fine for GitHub Pages; revisit if search indexing of individual
  pages matters.
- Dialogue is lettered into the artwork and cannot be read as text. There is now
  a route out of this — the per-page `script` field — but it is a route, not a
  fix: every page is still blank, and each one has to be typed out by hand
  before that page becomes readable. Until then the alt text describes the
  page's position and states the limitation rather than pretending otherwise.
- The Adobe Fonts kit is a third-party dependency on a domain-locked resource, and
  it is now the site's single largest availability risk: an unregistered domain
  degrades every surface at once. Self-hosting is not permitted by the licence.
- Read-aloud quality is bounded by what the visitor's device happens to have
  installed. The picker gets the best of those to the top, which is a large
  improvement over the default and costs nothing, but it cannot conjure a good
  voice onto a device with none. A hosted neural voice would remove that
  variance and make every visitor hear the same thing; it would also mean an API
  key, a per-character bill, and a third-party runtime dependency on the read
  path. It slots into one function — `say()` in `lib/tts.ts` — if that trade is
  ever worth making. It has not been abstracted ahead of time, because there is
  no second engine to abstract over yet.
- The Supabase project is shared with an unrelated site. The comic's tables live
  in their own `fruitpop` schema and writes are gated on an explicit editor
  allowlist rather than on `authenticated`, because auth is shared. A dedicated
  project would be cleaner if the two ever need different retention or billing.
