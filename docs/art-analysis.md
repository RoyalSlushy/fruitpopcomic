# Artwork and brand analysis

Read from the creator's own assets in [`references/`](references/). Colour values
were sampled programmatically — flat vector fills counted exactly for the logo,
median-cut quantization over the figure region for the character art — rather than
estimated from a preview. These are the assets' actual values.

This is evidence, not a design system. `DESIGN.md` gets written at finish from the
built world.

---

## 1. The logo — primary visual authority

Two files, both 600×600 PNG.

| File | What it is |
|---|---|
| [`logo/wordmark-fruitpop.png`](references/logo/wordmark-fruitpop.png) | Full lockup: *Fruit* in rounded brush script over **POP!** in chunky display caps, gold star burst behind, scattered confetti marks below. Originally `Artboard_1.png` |
| [`logo/monogram-fp.png`](references/logo/monogram-fp.png) | **FP** monogram, star behind the P, same treatment. Originally `FP2.png` |

### Brand palette

Large flat fills, present in both files:

| Role | Hex | HSV |
|---|---|---|
| **Magenta** — primary | `#ED2390` | H328 S85 V93 |
| **Cyan** — the sky inside the letterforms | `#2CC2E5` | H191 S81 V90 |
| **Gold** — the star | `#FCB040` | H36 S75 V99 |
| **Peach** — bottom of the *Fruit* gradient | `#F69385` | H7 S46 V96 |
| **Deep magenta** — keyline/outline | `#9F1F63` | H328 S81 V62 |
| **Navy** — the ground | `#0C1326` | H224 S68 V15 |
| **White** — outlines, clouds, heart | `#FFFFFF` | — |

Confetti marks use what look like stock Illustrator swatches — `#ED1C24` red,
`#0C9548` green, `#31297A` indigo — and read as decorative rather than as brand
colours. Treat the seven above as the system.

### How the mark is built

- **Letterforms are windows.** *POP!* is not filled with colour, it is filled with
  a sky-and-cloud scene. The type is a mask onto another image. This is the single
  most distinctive idea in the brand and it is reusable — headings, section
  titles, and chapter numbers can all be windows onto artwork.
- **Gradient, pink into peach**, top to bottom on *Fruit* and on the monogram.
- **Double outline** — thick white keyline outside a deep-magenta inline. Chunky,
  sticker-like, cut-out.
- **The ground is a dark navy starfield** with a soft blue nebula glow. Not flat.
- **A gold star sits behind and breaks the frame**, its points escaping the lockup.
- **Confetti scattered off-axis** below the mark — stars and blobs, no alignment.
- **A heart in the O counter.**

### Practical constraint

Both files are **600×600 raster PNG on an opaque navy background.** For build that
is a problem: no transparency, and 600px is too small for a hero. Wanted —

- an **SVG** (or the source `.ai`/`.svg`) of both marks,
- versions with a **transparent background**,
- ideally a **horizontal lockup**, since a square mark is awkward in a site header.

---

## 2. The character art

Five files in [`references/characters/`](references/characters/). All are
character art — **none are finished sequential comic pages.**

| File | Contents |
|---|---|
| `penup_20250418_074701.jpg` | Two characters, full-body. Copper-haired pair — one in a gold hoodie over a green tunic and headband, one bespectacled in a green turtleneck and gold pleated skirt |
| `penup_20250527_133813.jpg` | Single figure. Bantu knots and braids, cropped teal denim jacket, rose crop top, navy leggings, teal sneakers |
| `penup_20250527_143006-1-1.jpg` | Single figure. Pointed ears, mint skin, rust beret, marigold striped sweater, rust boots |
| `penup_20250527_150240.jpg` | Single figure. Long blonde hair with a pink bow, school uniform with rust tie, red pleated skirt, closed umbrella |
| `penup_20251219_145410.jpg` | Sketch page — sanguine studies, one figure in multiple poses plus expression work. WIP |

Characters are described, not named — **no names were supplied. Do not invent
them.**

### Four rules hold across every finished piece

**1. Every character gets its own flat colour field.**

| Piece | Ground | S | V |
|---|---|---|---|
| Pair | `#F8F2E6` cream | 7 | 97 |
| Denim | `#79BACC` sky blue | 41 | 80 |
| Beret | `#77C8A7` jade | 40 | 78 |
| Umbrella | `#E9C7D5` dusty pink | 15 | 91 |

One flat colour behind a full-body figure. No gradients, no scenery. This is
already a card system — it maps onto a cast page or wiki index with nothing
invented.

**2. Grounds are pale, figures are saturated.** Grounds S 7–41, figures S 40–85.
The contrast mechanism is saturation and value, not hue. Inverting it breaks the
look.

**3. A loose white shape backs each figure** — a cloud, an eight-point sunburst, a
soft blob. It reads as a spotlight. Hand-drawn, never a clean primitive. The most
portable device in the artwork: a ready-made container for a character card or
hover state.

**4. Linework is coloured, never black** — a darkened tone of the local colour, and
visibly brushy with construction still showing. Not cleaned-up vector, and UI
around it should not pretend otherwise.

### Figure palette, by hue family

**Gold / amber** `#E6B551` `#F4C162` `#E9AC30` `#F0BE87`
**Green** `#5A7538` `#497970` `#235C4A` `#11402D`
**Rust / red** `#B83724` `#A35243` `#8E272A` `#600E22`
**Teal / blue** `#2E87A7` `#4B83A8` `#1E3C56`
**Rose** `#946163` `#BC7168` `#D9947F`

Each individual piece uses only **four to six** colours. The breadth above is the
range across characters, not a palette for one surface.

---

## 3. The moodboard conflict — resolved by the logo

Earlier this file recorded an open fork: the pinned moodboard wanted dark
saturated grounds, the character art wanted pale ones, and it was unclear which
owned the site's ground.

**The logo settles it. The ground is dark navy `#0C1326`.** That is the brand's
own answer, not an inference — both marks sit on a starfield, and the wordmark is
the binding asset.

The logo turns out to bridge all three sources rather than pick a side:

| Motif | Moodboard | Character art | Logo |
|---|---|---|---|
| Dark saturated ground | ✅ navy fields | ✗ pale fields | ✅ `#0C1326` |
| Textured, never flat | ✅ halftone, checkerboard, scrawl | ✗ flat | ✅ starfield + nebula |
| Sky blue and clouds | — | ✅ cloud ground | ✅ inside the letterforms |
| Gold / amber | ✅ selected state | ✅ four of five pieces | ✅ the star |
| Stars and bursts | ✅ throughout | ✅ sunburst backing | ✅ star + confetti |
| Chunky outlines | ✅ every reference | — | ✅ double keyline |
| Off-axis stickers | ✅ throughout | — | ✅ confetti |

The hues line up across sources rather than fighting: the logo's cyan `#2CC2E5`
(H191) and the denim character's sky ground `#79BACC` (H193) are the same hue at
different saturations; the logo's gold `#FCB040` (H36) and the art's gold family
(H36–40) likewise.

**So the resolution is a division of labour, and every part of it is evidenced:**

- **Chrome** — dark navy ground, textured; chunky double-outlined tiles; gold and
  magenta for state; confetti and stars off-axis. Moodboard grammar, logo palette.
- **Artwork** — presented in its own pale field, exactly as drawn, with the white
  spotlight shape as its container. The art keeps its own rules and the chrome
  does not reach inside.
- **The bridge** — colour-blocking by unit. The moodboard gives each tile a hue,
  the art gives each character a field, the logo gives each letter a window. All
  three do the same thing, which is what makes this coherent rather than collaged.

---

## 4. Still missing

- **Vector / transparent / larger logo files.** See the constraint above.
- **Finished comic pages.** Nothing on hand shows panel layout, gutters, lettering,
  or page proportion — all of which the reading surface depends on. This is now the
  only major blocker.
- **Character names**, and any wiki content.
