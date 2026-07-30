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

`vercel.json` pins `"framework": "nextjs"`, and it has to stay. This repo used to
be a plain `index.html`, so a project imported back then carries the **Other**
preset, which makes Vercel publish `public/` as a static folder. There is no
`index.html` in it, so *every* path — `/` included — returns Vercel's own
`404: NOT_FOUND` page rather than anything the app rendered. The pin in
`vercel.json` overrides the stale preset. If a 404 like that ever comes back,
check Project Settings → Build & Output for a leftover **Output Directory**
override, which `vercel.json` does not clear.

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

### "The CMS is not configured on this deployment"

That is the 503 above, and it means exactly one of four things. The sign-in box
now names which, because a secret pasted at 24 characters looks perfectly set
from a dashboard:

| | |
|---|---|
| `CMS_ADMIN_PASSWORD is not set` | add it |
| `CMS_ADMIN_PASSWORD is shorter than 6 characters` | lengthen it |
| `CMS_SESSION_SECRET is not set` | add it |
| `CMS_SESSION_SECRET is shorter than 32 characters` | regenerate it at 32+ |

Generate a secret with:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Setting the variable is not enough — redeploy.** Server env is read at runtime
by the deployment that was built, so a deployment that already exists keeps the
values it was deployed with. Editing a variable in the dashboard changes nothing
until a new deployment picks it up.

Check the **build log** rather than waiting to be surprised at the sign-in box.
`npm run build` ends with two independent lines — one for signing in, one for
saving:

```
✓ CMS secrets present — the editor will accept a sign-in
✓ Supabase write credentials present — the editor will be able to save
✓ Supabase read credentials present — saved edits will render
```

Three lines because they are three separate configurations and each fails
differently: you cannot sign in, or you can sign in but Save fails, or Save
succeeds and the page still shows the old text because the stored row is never
read back. The last needs `SUPABASE_ANON_KEY`, which is a **different value**
from the service-role key — one writes, the other reads.

Either can be a warning instead, naming what is missing. It only ever warns —
the build has to succeed without secrets so that forks and preview deployments
of docs-only changes still work.

This is also the fastest way to answer **"I set the variable and it still
doesn't work"**: the build log reflects what the deployment was actually built
with. If you set `SUPABASE_SERVICE_ROLE_KEY` in Vercel and the build log still
says it is not set, the value never reached that build — it is scoped to a
different environment (Production and Preview are separate), or the deployment
predates the change and needs a redeploy.

These variables gate the *editor*. The `SUPABASE_*` ones gate where edits are
*stored*: without them the site still renders from `content/*.ts`, and a save
fails at write time rather than at sign-in.

### "Saving is not configured on this deployment"

The write-side counterpart of the 503 above, and the reason a save can fail on a
deployment you just signed into perfectly well. It names the variable:

| | |
|---|---|
| `SUPABASE_SERVICE_ROLE_KEY is not set` | add it — it is the only credential that can write |
| `SUPABASE_URL is not set` | add it, or `NEXT_PUBLIC_SUPABASE_URL` as the fallback |

If instead the save reports **`the database rejected the service key`**, the
variable is set but holds the wrong key. `site_content` has no write policy, so
an `anon` or `sb_publishable_…` key gets refused by RLS — it must be the
`service_role` key, and it must never carry a `NEXT_PUBLIC_` prefix. Redeploy
after changing it. Full detail in [`docs/cms.md`](docs/cms.md#when-save-fails).

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
  speech.ts           read-aloud text prep: chunking, HTML → spoken text
components/
  site/               the site itself; Speak.tsx is the read-aloud button
  cms/                editable primitives; every *Impl is lazy-loaded
public/               images
docs/cms.md           how the CMS works and how to edit
```

## Editing

Click the **gear in the footer** — or go to `/#cms`, which still works — sign in,
and the page becomes editable in place. Click any text to edit it; Enter commits,
Escape cancels. Lists get add / move / delete controls. Save writes only the
sections you actually changed.

Full detail — including how the merge behaves when you change content in code
after editing it in the CMS — is in [`docs/cms.md`](docs/cms.md).

## Reading it aloud

Every panel with prose carries a **Listen** button: About, a wiki entry, Cast
and Art. The Reader's is labelled **Describe**, because a comic page has no text
to read — it speaks the page's alt text instead.

It uses the browser's own speech synthesiser (the Web Speech API), so there is
no key, no server hop and no per-character bill, and the voice is the one the
visitor already chose in their OS. Browsers without it get no button rather than
a dead one. Text is spoken in sentence-sized chunks because Chrome silently cuts
off a single utterance after about fifteen seconds.

Two things follow from this that are worth knowing:

- **Filling in a page's Alt text in the CMS improves what Describe says.** Until
  then it falls back to "Page *n* of *m* — rough draft. Dialogue is lettered into
  the artwork and cannot be read as text," which is honest but tells you nothing
  about the page.
- It does **not** make the lettering readable. The dialogue is still drawn into
  the artwork and still un-transcribed — see the note on access on the About page.
  This reads the site's own prose, not the comic.

`lib/speech.ts` holds the text preparation (chunking, HTML stripping) and is
covered by `lib/speech.test.ts`; `components/site/Speak.tsx` is the button.

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
