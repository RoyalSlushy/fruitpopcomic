# Fruit Pop Comic

The site for the Fruit Pop webcomic — the pages, the cast, and the hub around it.

## Run it

No build step, no dependencies. Open `index.html`, or serve the folder:

```bash
python3 -m http.server 8000
```

Then visit <http://localhost:8000>.

## Deploy it

**Settings → Pages → Source: Deploy from a branch → `main` / root.** That's the
whole deployment. Everything is static.

## Layout

```
index.html            the whole site — hash routing, one page
assets/
  css/                main.css (system) + fonts.css (self-hosted faces)
  fonts/              Bungee + Barlow, latin subset, ~101KB
  js/  app.js         behaviour;  data.js  the whole data layer
  pages/              web-optimised comic pages + thumb/
  characters/         character art
  logo/               wordmark and monogram, background removed
docs/
  references/         source material as supplied — originals, do not ship
  art-analysis.md     what the artwork and logo actually establish
  aesthetic-references.md   the pinned moodboard, read
PRODUCT.md            product truth
DESIGN.md             the design system, recorded from the built site
```

`docs/references/` is the archive of what was uploaded. `assets/` is what ships —
the pages there are re-encoded for web (11.8 MB → 3.3 MB).

## Getting around

A channel rail down the left on desktop; below 1024px it becomes a drawer behind
the hamburger, with a bottom tab bar for the five main destinations. Home is a
dashboard rather than a menu — the hero, the drafts in order, the draft card rail,
the build status and quick access all on one screen.

Routes are hashes: `#/`, `#/read`, `#/read/4` (a specific page), `#/cast`,
`#/wiki`, `#/art`, `#/about`. Anything unrecognised falls back to home.

## Adding pages

1. Drop the image in `assets/pages/`, and a 300px-wide copy in
   `assets/pages/thumb/` with the same filename.
2. Add the filename to `PAGES` in `assets/js/data.js`, in reading order.

The array **is** the reading order. The current order is provisional — the drafts
have timestamp filenames and no page numbers. Nothing else needs editing: the
readout counts, the `START HERE` list, the draft cards and the reader all come off
that one array. New files default to the `blue` pencil stage unless you add them to
`STAGES` in the same file.

## Keeping the site honest

`assets/js/data.js` also holds `STATUS`, which draws the dashboard's **Build
status** panel. Every row there must be checkable against this repository — it is
where a manga portal would put a daily-mission list, and it is the surface that
keeps the site from claiming things it can't back up. If one of those lines stops
being true, fix it there.

## What's real, and what's pending

Everything on the site is the creator's own work. Nothing has been invented to
fill space — no dates, no counts, no names beyond the one the drafts supply.

**Pending:**

- The comic pages are **rough drafts**, not finished art.
- The **wiki is empty** and says so.
- The logo is raster only; an SVG should replace `assets/logo/*.png`.
- Reading order, character names, and content rating are undecided — see
  `PRODUCT.md`.
