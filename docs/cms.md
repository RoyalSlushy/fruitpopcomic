# The CMS

Content lives in Supabase. The site reads it over the REST API with plain
`fetch` — no SDK, no build step, no `node_modules`. Editing happens at
[`/admin/`](../admin/), which is part of this repository and deploys with it.

**Two things must be done by hand before any of it works.** They are steps 1 and 2
below, and both take under a minute. Everything else is already built and seeded.

---

## Where things are

| | |
|---|---|
| Project | **SetApartCare** — `rdmxtosklpvwtggakbja`, region `us-west-1` |
| Dashboard | <https://supabase.com/dashboard/project/rdmxtosklpvwtggakbja> |
| API URL | `https://rdmxtosklpvwtggakbja.supabase.co` |
| Schema | `fruitpop` — its own schema, isolated from that project's `public` |
| Storage | public bucket `fruitpop`, folders `pages/ thumbs/ sheets/ wiki/` |
| Site config | [`assets/js/config.js`](../assets/js/config.js) |

This project is shared with an unrelated site. Nothing here touches its `public`
schema, its tables, or its data.

---

## Step 1 — expose the schema

PostgREST only serves schemas it has been told about, and `fruitpop` is not one of
the defaults. Until this is done **every request returns `PGRST106`** and the site
quietly falls back to its bundled copy of the drafts.

> Dashboard → **Settings → API** → **Exposed schemas** → add `fruitpop` → Save.

The site and the admin both detect this specific failure and say so in plain words
rather than looking broken.

## Step 2 — make yourself an editor

Supabase Auth is shared across the whole project, so being able to log in is *not*
enough to edit the comic. Write access is gated on membership of
`fruitpop.editors`, checked by the database on every statement.

1. Dashboard → **Authentication → Users → Add user**. Use **Create new user** with
   an email and password, and tick *Auto Confirm User*.
2. Dashboard → **SQL Editor**, and run:

   ```sql
   insert into fruitpop.editors (user_id, email)
   select id, email from auth.users where email = 'you@example.com'
   on conflict (user_id) do nothing;
   ```

3. Go to `/admin/` and sign in.

To revoke someone, delete their row from `fruitpop.editors`. Their login keeps
working for the rest of the project; their ability to change the comic stops
immediately.

---

## Using it

`/admin/` has five tabs.

| Tab | Writes to | Notes |
|---|---|---|
| **Pages** | `fruitpop.pages` | The comic. `↑ ↓` set reading order; upload writes to `pages/`. |
| **Cast & Art** | `fruitpop.sheets` | `kind` decides whether a sheet lands in Cast or Art. |
| **Wiki** | `fruitpop.wiki_entries` | Unpublished entries are invisible to the public — enforced by RLS, not just the UI. |
| **Status** | `fruitpop.build_status` | The dashboard's Build status panel. |
| **Copy** | `fruitpop.site_text` | Headline, notices, footer, the whole About page. |

### Adding a page

Upload the image, set the reading order, pick the pencil stage, save. A thumbnail
is optional — the full image is used if you leave it blank, which costs bandwidth
on the dashboard but works.

### The wiki

Entries have a slug (the URL, `#/wiki/your-slug`), a category, a one-line summary
for the index card, and a body. The body accepts plain text — blank lines become
paragraphs — or HTML if you'd rather write it yourself.

New entries are **unpublished by default**. The site's empty state appears only
while there are genuinely no published entries.

### Copy

`site_text` rows are keyed strings. `read.notice`, `cast.notice` and `about.body`
accept HTML; the rest are plain text. Keys cannot be added from the admin because
the markup has to have somewhere to put them — add new ones with SQL and a
matching `id` in `index.html`.

---

## Image paths

One convention, shared by every table:

| Value | Meaning |
|---|---|
| `https://…` | An absolute URL, used as-is |
| `assets/…` | A file committed to this repository |
| anything else | An object key in the public `fruitpop` bucket |

The ten original drafts and five sheets use `assets/…` because those files are
already in the repo. Anything uploaded through the admin gets a storage key.
Both work side by side; there is no migration to do.

---

## What happens when Supabase is down

The site keeps working. [`assets/js/data.js`](../assets/js/data.js) carries a
bundled copy of the ten drafts, five sheets and the status rows, and falls back to
it on any failure — unreachable host, unexposed schema, empty tables. A comic
should not go blank because a database is having a bad day.

You can force that path by setting `USE_REMOTE = false` in
[`config.js`](../assets/js/config.js).

---

## Security notes

- The key in `config.js` is the **publishable** (anon) key. It is meant to be
  public and grants exactly what RLS allows: reading published rows. Never put a
  service-role key in this repository.
- Public read policies filter on `published`, so drafts and unpublished wiki
  entries are not merely hidden — they are never sent.
- Every write policy calls `fruitpop.is_editor()`. Storage writes are scoped to
  `bucket_id = 'fruitpop'` and the same check, so an editor here cannot touch the
  other site's objects.
- Admin tokens live in `sessionStorage`, so closing the tab signs you out.
- `/admin/` is `noindex`, but it is still a public URL — the protection is the
  database policy, not the obscurity of the path.

---

## Changing project

Edit [`assets/js/config.js`](../assets/js/config.js). To rebuild the schema
elsewhere, the three migrations are in the project's migration history:
`fruitpop_cms_schema`, `fruitpop_storage_bucket`, `fruitpop_seed_existing_content`.
