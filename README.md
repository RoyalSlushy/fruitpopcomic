# Fruit Pop Comic

The site for the Fruit Pop webcomic — the pages, the cast, and the hub around it.

## Run it

No build step, no dependencies. Serve the folder — `index.html` opened directly
will not work, because the page is an ES module:

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
admin/                the CMS: index.html + admin.js + admin.css
assets/
  css/                main.css — the whole system
  js/  app.js         behaviour
       data.js        content: fetches Supabase, falls back to a bundled copy
       config.js      Supabase URL, key and schema — the only file to edit
  pages/              the original drafts + thumb/
  characters/         character art
  logo/               wordmark and monogram, background removed
docs/
  cms.md              Supabase setup and how to edit
  references/         source material as supplied — originals, do not ship
  art-analysis.md     what the artwork and logo actually establish
  aesthetic-references.md   the pinned moodboard, read
PRODUCT.md            product truth
DESIGN.md             the design system, recorded from the built site
```

`docs/references/` is the archive of what was uploaded. `assets/` is what ships —
the pages there are re-encoded for web (11.8 MB → 3.3 MB).

Type is **Shuttleblock**, served from an Adobe Fonts kit. That kit is
**domain-locked**: every domain that serves the site, `localhost` included, has to
be listed in the Adobe Fonts web project or the stylesheet 403s and the page falls
back to system sans. Nothing else breaks.

## Editing it

Content lives in Supabase; the editor is at `/admin/`. Two one-time setup steps
are needed before it works — see [`docs/cms.md`](docs/cms.md).

## Getting around

A channel rail down the left on desktop; below 1024px it becomes a drawer behind
the hamburger, with a bottom tab bar for the five main destinations. Home is a
dashboard rather than a menu — the hero, the drafts in order, the draft card rail,
the build status and quick access all on one screen.

Routes are hashes: `#/`, `#/read`, `#/read/4` (a specific page), `#/cast`,
`#/wiki`, `#/art`, `#/about`. Anything unrecognised falls back to home.

## Adding pages

Go to `/admin/` → **Pages** → **+ New**. Upload the image, set the reading order,
pick the pencil stage, save. Nothing needs a commit or a deploy.

The order **is** the reading order, and it is provisional — the drafts have
timestamp filenames and no page numbers.

## Keeping the site honest

The dashboard's **Build status** panel is editable under `/admin/` → **Status**.
Every row there must be checkable against reality — it is where a manga portal
would put a daily-mission list, and it is the surface that keeps the site from
claiming things it can't back up. If one of those lines stops being true, change
it.

The same rule governs everything else the CMS can reach: page counts come from
counting pages, the cast counter sums the figures actually drawn, and no field
anywhere asks for a release date, a view count, or a name that isn't known.

## What's real, and what's pending

Everything on the site is the creator's own work. Nothing has been invented to
fill space — no dates, no counts, no names beyond the one the drafts supply.

**Pending:**

- The comic pages are **rough drafts**, not finished art.
- The **wiki is empty** and says so.
- The logo is raster only; an SVG should replace `assets/logo/*.png`.
- Reading order, character names, and content rating are undecided — see
  `PRODUCT.md`.
