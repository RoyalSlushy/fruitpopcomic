# The CMS

Sign in, click a headline, type, save. No separate admin panel — the site itself
is the editor.

## The idea

**Content lives in code. The database only stores what you changed.**

`content/*.ts` holds every section as a typed const. The site renders completely
from those alone, with an empty database — that is verified by
`scripts/assert-visitor-bundle.mjs` running against a build, and by the site
rendering fine right now with zero rows in `site_content`.

When you edit something, the change is stored as a sparse override in one JSONB
row per section. `getSection()` deep-merges that row over the code default.

The pay-off is what happens when both change. Add a field in `content/pages.ts`
and it appears on pages you already edited. Fix a typo in code and it shows up
unless you had edited that exact string. Neither side clobbers the other.

## Editing

Go to **`/#cms`** and sign in. After that a marker cookie keeps the editor loading
until you press **Done**.

| | |
|---|---|
| Click any text | edit it in place |
| **F2** | edit the focused field (the hero headline is inside a link, where Enter would navigate) |
| **Enter** | commit |
| **Escape** | cancel |
| Click away | commit |
| Hover | a chip names the field |
| `↑ ↓ ×` | reorder or delete a list item |
| **+ Add** | append one, built from the schema template |
| **Save** | writes only the sections that actually differ |

Deleting a list item is permanent in the sense that matters: the stored array's
length wins, so the code default will **not** bring it back. Reverting
`content/*.ts` won't restore it either — the only way back is deleting the
`site_content` row for that section.

## The rules the merge follows

Worth knowing, because they explain every surprise:

1. **Code owns shape; the database owns values and array length.** `getSection()`
   always returns something shaped exactly like the code default. A stale row can
   never crash a component that has moved on.
2. **Arrays of objects merge item-wise**, matched by `id` first and index only as
   a fallback — so reordering a list does not smear field values between items.
3. **Items you added** merge over the schema template for that path, not over
   item 0, so a new blank item never inherits the first one's real content.
4. **A stored key the code no longer has is dropped**, and the next save cleans it
   out of the row.
5. **Type mismatches keep the code value** and warn. If code says object and the
   database says string, the code wins — losing one field's edit beats a page that
   cannot render.
6. **`null` is a real stored value** meaning "empty". Absence means "not
   overridden". `setByPath` refuses `undefined` outright, because `JSON.stringify`
   drops it and it would silently read back as "not overridden" — a revert with no
   error anywhere.

All of it is covered by `npm test` (26 cases in `lib/cms.test.ts`), including the
ones that are easy to get wrong: an emptied list stays empty, a deleted item stays
deleted, a reorder doesn't smear.

## Adding a new editable field

1. Add it to the type and const in `content/<section>.ts`.
2. Render it with `<EditableText path="section.path.to.field" value={…} />`.
3. If it's a list item field, add a label in `lib/cms-schema.ts` and make sure the
   list has a `TEMPLATES` entry.

The path's first segment is the section, which is also the row it saves into.

## Images

One convention everywhere:

| Value | Meaning |
|---|---|
| `https://…` | absolute, used as-is |
| `/…` | a file committed to `public/` |
| anything else | an object key in the public `fruitpop` storage bucket |

Uploading through the CMS produces the third kind. The client's filename is
**discarded entirely** — the extension comes from sniffing the file's magic bytes,
so path traversal, double extensions and unicode tricks are impossible rather than
filtered. SVG is not accepted: it is script-bearing XML served from the site's own
origin, which would be stored XSS against the admin session.

## Security

- **Writes are impossible without the server.** `site_content` has RLS on with
  exactly one policy — public `SELECT`. There is no insert, update or delete
  policy at all, so the anon key cannot write by construction. Verified by trying
  it as the `anon` role and watching Postgres refuse.
- **The service-role key never reaches the browser.** `lib/supabase.ts` starts with
  `import 'server-only'`, which makes a client import a build error rather than a
  runtime surprise. `scripts/assert-visitor-bundle.mjs` also greps every client
  chunk for `service_role` on each build.
- **The editor is not in the visitor's bundle.** Each primitive is a thin shell
  that lazy-loads its implementation, so `dynamic({ssr:false})` never fires for
  someone who isn't editing. The build asserts it: 18 prerendered pages reference
  13 scripts, none of which contain the editor.
- **Fails closed.** Missing `CMS_ADMIN_PASSWORD`, missing `CMS_SESSION_SECRET`, or
  a session secret under 32 characters → 503 on every CMS endpoint. There is no
  fallback credential in the source, deliberately.
- The session cookie is `httpOnly`, `SameSite=Strict`, signed with HMAC-SHA256,
  and expires after 12 hours. The password is compared with a timing-safe equal
  over fixed-length digests.
- The save endpoint re-runs the merge server-side against the code defaults and
  stores the **output**, so a crafted payload cannot introduce a key, change a
  container into a scalar, or plant `__proto__`.

### Known weaknesses

Named rather than glossed over:

- **The password is shared.** `ladystar` is eight lowercase letters. There is no
  per-user identity, no audit trail, and no revocation short of rotating the
  secret. Replace it with a long passphrase before this matters, and move to real
  accounts when you want more than one editor — that touches only
  `app/api/cms/login/route.ts`.
- **No rate limiting.** An in-memory counter is meaningless on serverless
  (per-instance, resets on cold start), so none was added rather than pretending.
  The real options are a Vercel Firewall rule on `/api/cms/*` or a Postgres
  counter.
- **Saves are whole-section, last-write-wins.** Two tabs editing the same section
  will silently clobber each other. An `updated_at` precondition would fix it.
- Forging the `fp_cms_ui` marker cookie loads the editor UI and gets a 401 on every
  write. It grants nothing; the real gate is the signed cookie and the database.

## Where it lives

Supabase project **SetApartCare** (`rdmxtosklpvwtggakbja`), table
`public.site_content`, storage bucket `fruitpop`. That project is shared with an
unrelated site; nothing here touches its tables.

The older `fruitpop.*` schema from the previous table-based CMS is still there,
unused. Nothing was dropped, so the previous approach remains recoverable.
