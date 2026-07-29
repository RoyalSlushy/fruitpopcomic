# Fruit Pop Comic

The site for the Fruit Pop webcomic — the pages, the cast, and the hub around it.

A Next.js App Router app with an **in-page CMS**: sign in, click a headline, type,
save. Content lives in code and the database only stores what you changed.

## Run it

```bash
npm install
cp .env.example .env.local     # then fill it in — see below
npm run dev
```

Then visit <http://localhost:3000>.

`npm run build` also runs `scripts/assert-visitor-bundle.mjs`, which fails the
build if the editor ever leaks into a chunk visitors download, or if a
service-role string reaches the client.

## Deploy it

**Vercel.** Import the repo; the framework is detected. It cannot be GitHub Pages
any more — the CMS writes through a server function.

Set these in the Vercel project (and in `.env.local` locally):

| Variable | |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | public; used to build storage URLs in the browser |
| `SUPABASE_URL` | server reads/writes. Set it explicitly — the public one is inlined at build time |
| `SUPABASE_ANON_KEY` | public-read key |
| `SUPABASE_SERVICE_ROLE_KEY` | **the only thing that can write.** Server-side only, never `NEXT_PUBLIC_` |
| `CMS_ADMIN_PASSWORD` | the editor password |
| `CMS_SESSION_SECRET` | 32+ bytes, signs the session cookie |

`CMS_ADMIN_PASSWORD` and `CMS_SESSION_SECRET` have **no defaults and no
fallback**. If either is missing — or the secret is under 32 characters — every
CMS endpoint returns 503 and signing in is impossible. That is deliberate.

Type is **Shuttleblock**, from an Adobe Fonts kit that is **domain-locked**: every
domain serving the site has to be registered in the web project or the stylesheet
403s and the page falls back to system sans. Preview URLs can't be wildcarded, so
pin one stable alias and register that.

## Layout

```
app/                  routes; layout.tsx holds the shell
  api/cms/            login · logout · content · save · upload
content/              THE CONTENT, as typed consts — the site renders from these alone
lib/
  cms.ts              the merge: code owns shape, the database owns values
  cms-server.ts       getSection() — falls back to code defaults on any failure
  path.ts             dot-path get/set + list ops, all immutable
  cms-schema.ts       templates for new list items, labels for hover chips
  cms-context.tsx     drafts, baseline, dirty set
  supabase.ts         server-only REST; holds the service-role key
components/
  site/               the site itself
  cms/                editable primitives; every *Impl is lazy-loaded
public/               images
docs/cms.md           how the CMS works and how to edit
```

## Editing

Go to `/#cms`, sign in, and the page becomes editable in place. Click any text to
edit it; Enter commits, Escape cancels. Lists get add / move / delete controls.
Save writes only the sections you actually changed.

Full detail — including how the merge behaves when you change content in code
after editing it in the CMS — is in [`docs/cms.md`](docs/cms.md).

## Adding pages

Either edit `content/pages.ts` and deploy, or add one through the CMS. Both work;
the merge reconciles them.

The order **is** the reading order, and it is provisional — the drafts carry
timestamp filenames and no page numbers.

## Keeping the site honest

The dashboard's **Build status** panel says what is and isn't finished. Every row
must be checkable against reality — it is where a manga portal would put a
daily-mission list, and it is what stops the site claiming things it can't back
up.

The same rule is built into the shape of the content: there is no field anywhere
for a release date, a view count or a follower number, because there is no column
for one. The page count counts pages; the cast counter sums the figures actually
drawn. `name` on a character sheet is optional and ships blank, because only one
name is known from the drafts.

## What's real, and what's pending

Everything on the site is the creator's own work. Nothing has been invented to
fill space — no dates, no counts, no names beyond the one the drafts supply.

**Pending:**

- The comic pages are **rough drafts**, not finished art.
- The **wiki is empty** and says so.
- The logo is raster only; an SVG should replace `public/logo/*.png`.
- Reading order, character names, and content rating are undecided — see
  `PRODUCT.md`.
- The CMS password is shared, not per-user. See the security note in `docs/cms.md`.
