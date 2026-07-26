# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

**Primary: new readers arriving cold from social.** They have seen a single panel
or art post on a social feed, are almost always on a phone, and are deciding in
seconds whether this comic is worth their time. They arrive with no context about
the story, the characters, or the creator. Their job is to sample the work and
decide whether to keep reading and follow.

**Secondary (implied by confirmed scope, not separately confirmed): returning and
invested readers.** The wiki and hub scope below only makes sense for readers who
are already in the story and want to go deeper — checking for new pages, looking
up a character, resolving a piece of lore. Treat this audience as real but do not
let it outrank the primary visitor when the two conflict.

## Product Purpose

Publish the Fruit Pop webcomic and serve as the complete hub for everything
surrounding it. Three things live here:

1. **The comic** — pages, chapters, and an archive to read them in.
2. **A wiki** — the comic's world: characters, locations, lore, terminology.
3. **The hub** — everything else that belongs to the series.

Success is a cold social visitor becoming a reader, and a reader having one place
that answers everything about the series instead of it being scattered across
platforms.

## Positioning

The comic and its reference material live together under the creator's own roof.
The common alternative splits them — the comic hosted on a social platform or
webcomic aggregator, the lore accumulating on a third-party fan wiki, neither
controlled by the creator. Fruit Pop Comic is one destination that owns both the
reading experience and the canonical reference for the world.

## Operating Context

- Discovery happens on social feeds; arrival is overwhelmingly mobile and cold.
- Reading is sequential — page by page, grouped into chapters, with an archive for
  navigating back.
- Wiki consultation happens alongside or after reading, driven by a reader
  encountering something in the story they want to know more about.
- The creator publishes new material on an ongoing basis, making "what's new" a
  recurring reason to return.

## Capabilities and Constraints

**Confirmed:**
- Reading the comic: pages, chapters, archive navigation.
- A wiki covering the comic's world.
- Hub role for material related to the series.
- **Page format is 1080 × 1620, a 2:3 portrait**, consistent across all ten
  supplied drafts. Phone-native by construction. 1080px is also the resolution
  ceiling on current material.
- **Lettering is drawn into the artwork**, not a text layer. Dialogue and SFX are
  hand-lettered and cross panel borders.

**Explicitly undecided — do not invent these:**
- Publication cadence, and current page or chapter counts.
- Whether the conversion target for a new reader is a newsletter, an RSS feed, or
  a social follow.
- Whether the wiki is creator-authored only or reader-editable.
- Comments, forums, or any community features.
- Any shop, merch, print, or monetization surface.
- Content management approach (static files vs. CMS) and hosting/deployment.
- Whether accessible transcripts or alt text accompany comic pages — see below.
- **Content rating and whether the site carries a content note.** Profanity
  appears in the page drafts, so the script is not all-ages by default. The
  primary visitor arrives cold from social with no context, which makes this a
  real product decision rather than a formality.
- **Reading order.** The supplied drafts have timestamp filenames, no page
  numbers, and no chapter grouping. Sequence is currently unknown.

## Brand Commitments

- The name **Fruit Pop Comic** is settled.
- A logo/wordmark exists and is binding. It is to be used as-is, not redesigned or
  reinterpreted. Both a full lockup and an **FP** monogram are in
  `docs/references/logo/`, currently raster-only at 600×600 on an opaque ground;
  vector and transparent versions are still wanted. The mark establishes the
  brand palette and, with it, a **dark navy ground** (`#0C1326`) — see
  [`docs/art-analysis.md`](docs/art-analysis.md).
- A **pinned aesthetic direction** exists: bold, vivid, stylish, y2k, established
  from a creator-supplied reference board of game UI and planner-collage sources.
  Recorded in [`docs/aesthetic-references.md`](docs/aesthetic-references.md). This
  is a binding brief, not a suggestion. Palette, typefaces, and components remain
  undecided — the pin fixes the world, not its specific values.

## Evidence on Hand

Real material the creator confirmed exists:

- **Finished, publish-ready comic pages.**
- **Character designs, illustrations, and other art** beyond the finished pages.
- **A name and a logo/wordmark.**

**Partially in the repository.** Five character-art files are in
`docs/references/characters/`, read in
[`docs/art-analysis.md`](docs/art-analysis.md). The **logo/wordmark** and
**finished comic pages** are still missing — nothing on hand yet shows panel
layout, gutters, lettering, or page proportion, which the reading surface depends
on. Work done before those land must treat placeholders as visibly provisional.

Future work must not fabricate: page or chapter counts, character names, story
events, lore, release dates, reader or follower numbers, review quotes,
testimonials, press mentions, or artwork presented as the real comic.

## Product Principles

1. **The comic is the product.** Every other surface exists to get someone into it
   or deeper into it. Nothing on the site competes with the work for attention.
2. **Judge in seconds.** A cold mobile visitor must understand what this is and be
   reading without making a decision, creating an account, or dismissing a gate.
3. **One roof.** Anything a reader wants to know about the series resolves here
   rather than sending them to a third-party platform.
4. **The wiki serves the reading.** Reference material rewards investment; it never
   becomes a prerequisite for enjoying the comic, and never spoils ahead of a
   reader's position by accident.
5. **Never fabricate the fiction.** Story facts, character details, and lore come
   from the creator's real material only. An empty wiki is honest; an invented one
   is not.

## Accessibility & Inclusion

No product-specific standard has been established yet. One question is material
and left open deliberately: a comic is image-carried narrative, so whether pages
ship with transcripts or descriptive alt text determines whether the story is
reachable by screen-reader and low-vision readers at all.

The drafts sharpen this. Lettering is **drawn into the artwork**, so dialogue is
not extractable — there is no path to selectable text, screen-reader access,
search, or translation without the creator writing transcripts separately. That
is a cost worth naming before it is assumed away, not an assumed requirement.
