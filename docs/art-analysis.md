# Artwork analysis

Read from the creator's character art in
[`references/characters/`](references/characters/). Colour values were sampled
programmatically (median-cut quantization over the figure region, ground excluded)
rather than estimated by eye, so they are the artwork's actual values.

This is evidence, not a design system. `DESIGN.md` gets written at finish from the
built world.

## What is here

Five files. All are **character art** — none are finished sequential comic pages.

| File | Contents |
|---|---|
| `penup_20250418_074701.jpg` | Two characters together, full-body. Copper-haired pair — one in a gold hoodie over a green tunic with a green headband, one bespectacled in a green turtleneck and gold pleated skirt |
| `penup_20250527_133813.jpg` | Single figure, full-body. Bantu knots and braids, cropped teal denim jacket, rose crop top, navy leggings, teal sneakers |
| `penup_20250527_143006-1-1.jpg` | Single figure, seated/floating. Pointed ears, mint skin, rust beret, marigold striped sweater, rust boots |
| `penup_20250527_150240.jpg` | Single figure, full-body. Long blonde hair with a pink bow, school uniform with a rust tie, red pleated skirt, holding a closed umbrella |
| `penup_20251219_145410.jpg` | Sketch page — monochrome sanguine studies, one figure in multiple poses plus expression work. WIP, not finished art |

Characters are referred to descriptively above because **no names were supplied.**
Do not invent them.

## The system the art already has

Four rules hold across every finished piece. These are the strongest design
evidence in the project.

### 1. Every character gets its own flat colour field

| Piece | Ground | S | V |
|---|---|---|---|
| Pair | `#F8F2E6` cream | 7 | 97 |
| Denim | `#79BACC` sky blue | 41 | 80 |
| Beret | `#77C8A7` jade | 40 | 78 |
| Umbrella | `#E9C7D5` dusty pink | 15 | 91 |

No gradients, no scenery — one flat colour behind a full-body figure. This is
already a card system. It maps directly onto a character grid, a wiki index, or a
cast page without inventing anything.

### 2. Grounds are pale; figures are saturated

Grounds sit at **S 7–41, V 78–97**. Figure colours sit at **S 40–85, V 25–96**.
The contrast mechanism is saturation and value, not hue. Inverting this — a
saturated field with a pale figure — would break the look.

### 3. A white shape sits behind the figure

A cloud on the denim piece, an eight-point sunburst on the beret piece, a soft
blob on the umbrella piece. It reads as a spotlight, separating figure from field.
It is loose and hand-drawn, never a clean geometric primitive.

This is the single most portable device in the artwork — it is a ready-made
container for a character card, an avatar frame, or a hover state.

### 4. Linework is coloured, never black

Lines are a darkened tone of the local colour: warm brown on the pair, navy-purple
on the denim figure, deep green on the beret figure, dark red on the umbrella
figure. The line is visibly brushy, with construction still showing. It is not
cleaned-up vector art, and any UI drawn around it should not pretend otherwise.

## Sampled palette

Figure colours, by hue family across the whole set:

**Gold / amber** `#E6B551` `#F4C162` `#E9AC30` `#F0BE87` `#BF9C59`
**Green** `#5A7538` `#497970` `#235C4A` `#11402D` `#C3C383`
**Rust / red** `#B83724` `#A35243` `#8E272A` `#600E22` `#9A4141`
**Teal / blue** `#2E87A7` `#4B83A8` `#1E3C56` `#152E51`
**Rose** `#946163` `#BC7168` `#D9947F`
**Neutrals** `#F8F2E6` `#665640` `#604E28` `#858368`

Each individual piece uses only **four to six** colours. The breadth above is the
range across characters, not a palette for one surface.

Gold and rust appear in four of five pieces and are the closest thing to a
through-line. Blue appears fully in only one.

## Conflict with the pinned moodboard

This matters and should not be smoothed over. The board in
[`aesthetic-references.md`](aesthetic-references.md) and the artwork disagree on
colour:

| | Moodboard | Artwork |
|---|---|---|
| Ground | Deep navy / saturated cobalt | Pale cream, sky, jade, pink |
| Saturation | High everywhere | Pale field, saturated figure |
| Dominant hue | Blue, 5 of 7 | Gold and rust, 4 of 5 |
| Accent | Red for action, yellow for selected | Varies per character |

Where they **agree** is more useful than where they differ: both systems
**colour-block by unit.** The moodboard gives every menu tile its own saturated
hue; the artwork gives every character their own field. That shared instinct is
the bridge, and it is also what the name *Fruit Pop* already implies — gold, jade,
rose, rust, sky reading as a fruit spread.

The unresolved decision is which system owns the **ground**:

- **Moodboard-true** — dark saturated chrome, artwork punched in as pale windows.
  Maximum contrast against the art; risks the chrome overpowering it.
- **Artwork-true** — pale fields carried out of the art, with chunky saturated
  chrome on top. Continuous with the comic; risks reading softer than the pinned
  brief asks for.

This is a real fork and it is the creator's call, not an inference to make quietly.

## Still missing

- **The logo/wordmark.** Binding per `PRODUCT.md`, still not supplied.
- **Finished comic pages.** These five are character art and sketches. Nothing
  here shows panel layout, gutters, lettering, or page proportion — all of which
  the reading surface depends on.
