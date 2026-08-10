/* The wiki.

   Populated from the creators' development notes (the Grand Transcript,
   April 2025 – June 2026). Where ideas evolved over development, entries
   follow the latest decision and flag older versions in continuity notes.
   Unsettled points are marked as such rather than invented. */

export type WikiCategory = 'character' | 'place' | 'term' | 'lore';

/* One section of an entry, and the unit the editor adds, moves and deletes.
   Every field is optional by being empty, which is what "a block with text
   and/or a picture" means in practice: fill in the ones you want and the rest
   render nothing. One flat shape rather than a tagged union because the CMS
   merge matches stored items against ONE template per list — a union would
   need a template per variant and would silently pass unmerged rows through
   (see mergeArray in lib/cms.ts). */
export type WikiBlock = {
  id: string;
  /** Section heading. Blank renders no heading. */
  heading: string;
  /** Rich text, limited to the tags in lib/richtext.ts. Blank renders none. */
  html: string;
  /** A path starting with "/" is served from public/; anything else is a
      Supabase storage key, which is what the CMS writes on upload. */
  image: string;
  /** Shown under the picture. Ignored when there is no picture. */
  caption: string;
};

export type WikiEntry = {
  id: string;
  slug: string;
  title: string;
  category: WikiCategory;
  summary: string;
  /** The entry, as blocks. This is what renders and what the editor edits. */
  blocks: WikiBlock[];
  /** LEGACY — one HTML string for the whole entry, superseded by `blocks`.
      Kept rather than deleted, the same way pages keep `script` alongside
      `snippets`: an entry whose blocks are empty still renders from this, so
      there is no moment where a body exists in neither field. lib/wiki.ts is
      where the two meet. */
  body: string;
  image: string;
  published: boolean;
};

export type WikiContent = {
  categories: { id: WikiCategory; label: string }[];
  empty: { title: string; body: string; cta: string; ctaHref: string };
  entries: WikiEntry[];
};

export const wiki: WikiContent = {
  /* Category IDS are storage values — they sit on every entry, here and in
     any row the CMS has already saved — so they stay what they were even
     where the visitor-facing LABEL has moved on: 'place' reads as World,
     'term' as Concepts, 'lore' as Story. Renaming an id would orphan every
     stored entry carrying the old one. */
  categories: [
    { id: 'character', label: 'Characters' },
    { id: 'place',     label: 'World' },
    { id: 'term',      label: 'Concepts' },
    { id: 'lore',      label: 'Story' },
  ],
  empty: {
    title: 'Nothing written yet',
    body: 'The wiki is real and it is empty. Characters, places, and lore go here once the creator writes them — an empty shelf is honest, an invented one isn’t.',
    cta: 'See the cast instead',
    ctaHref: '/cast',
  },
  entries: [
    {
      id: "wk-ronnie",
      slug: "ronnie-omalley",
      title: "Ronnie O’Malley",
      category: "character",
      summary:
        "The protagonist of Fruit Pop. An overworked college student who works at her family’s bakery-café — and who becomes the magical girl Lady Starburst after eating a magical starfruit.",
      image: "",
      published: true,
      body: '',
      blocks: [
        { id: "b1", heading: "", image: '', caption: '',
          html: `<blockquote><p>“I don’t want to be a hero, because heroes suffer and I’m scared.” — the fear underneath the whole of her early story.</p></blockquote>

<p><strong>Ronnie O’Malley</strong> is the protagonist of <em>Fruit Pop</em>. A stressed, overworked college student who works at her family’s café and bakery in Pittscoke, she becomes the magical girl <strong>Lady Starburst</strong> after eating a magical starfruit. Her story fuses a classic magical-girl power fantasy with a grounded arc about transition, self-acceptance, and learning to direct the raw energy — literal and emotional — she has spent years bottling up.</p>` },
        { id: "b2", heading: "Quick facts", image: '', caption: '',
          html: `<ul class="facts">
<li><strong>Magical alias</strong> Starburst / Lady Starburst</li>
<li><strong>Power Fruit</strong> Starfruit — the fruit of Dreams and Aspirations</li>
<li><strong>Age</strong> 23</li>
<li><strong>Height</strong> 5′3″</li>
<li><strong>Hair / eyes</strong> Ginger, autumn-coloured / green (written) — often drawn yellow</li>
<li><strong>Build</strong> Slim and gangly — takes after her father</li>
<li><strong>Hometown</strong> Pittscoke</li>
<li><strong>Occupation</strong> College literature student; works the family café and the Little O’Malley’s stand; volunteers at the college library</li>
<li><strong>Identity</strong> Trans woman, mid-transition; bisexual</li>
<li><strong>Signature motif</strong> The five-pointed star — a deliberate foil to the Pomen four-pointed star</li>
<li><strong>Combat role</strong> Ranged blaster with limited flight; the team’s powerhouse</li>
<li><strong>Love interest</strong> Baby</li>
</ul>` },
        { id: "b3", heading: "Appearance", image: '', caption: '',
          html: `<p>Ronnie is slim and ginger-haired with a distinctive tooth gap that shows in both her presentations. Her face is deliberately androgynous — the design is built so that boy-mode Roger and girl-mode Ronnie share <strong>the same face</strong> yet read as two distinct presentations of one person. Years of kneading dough and hauling trays gave her lasting broad shoulders; estrogen and a bakery diet gave her quick hip development. Her civilian look leans plain — big sweaters, work pants or skirts, glasses, and a headwrap knotted so it resembles a leaf sapling.</p>
<p>A <strong>star motif</strong> runs through everything: star earrings in her female form, a star worked into the hood outline of her male form. Dark circles under her eyes deepen across the first season — she is deliberately drawn as an emotional wreck in slow motion.</p>
<p>In abstract or high-stress sequences the art style shifts from grounded realism into something more surreal, especially when her powers act up and seem to operate separately from her.</p>` },
        { id: "b4", heading: "Personality", image: '', caption: '',
          html: `<p>On the surface Ronnie is polite to a fault, a reflex drilled in by a lifetime of customer-service hell at the family shop. Underneath, she is stretched dangerously thin: a full-time job, volunteer work, and a heavy school load have left her short on sleep, irritable, and the most sarcastic member of the cast — “dour enough to have sarcasm in her blood.” She smoked as a teenager to take the edge off. She is a voracious reader and a vivid, chronic daydreamer; her dreams are used as framing devices and foreshadowing throughout the comic, and every chapter opens inside one of her pulp-fiction fantasies.</p>
<p>Her defining trait is <strong>repression</strong>. Raised to be polite and self-sufficient, she has become expert at bottling everything — frustration, dysphoria, resentment toward her father — which leaves quiet cracks in the foundation. This is the engine of her whole design.</p>` },
        { id: "b5", heading: "Powers and abilities", image: '', caption: '',
          html: `<p>Ronnie’s powers come from eating a magical starfruit, one of the indestructible <strong>Power Fruits</strong>. The starfruit embodies <strong>Dreams and Aspirations</strong>, and it chose the person with more imagination than anyone else in Pittscoke. The energy manifests as light-based concussive blasts — force, not heat.</p>
<ul>
<li><strong>Ranged blaster.</strong> Powerful output, low precision. Her standard blast is the <strong>Starburst Finger</strong>, a name she blurts mid-fight, immediately regrets, and keeps.</li>
<li><strong>Limited flight.</strong> She floats and drifts rather than truly flies.</li>
<li><strong>Weak at close quarters.</strong> Vulnerable point-blank — though an enemy who closes in risks being caught in a blast.</li>
<li><strong>Dream manifestation.</strong> Her leaked dreams bloom as yellow star flowers around the neighbourhood, and at the story’s highest points her imagination can reshape reality itself — a power the creators deliberately cap at roughly three large-scale uses across the whole series, each requiring many people giving something together.</li>
</ul>
<p>The powers are a direct metaphor for her interior life: raw energy escaping violently and causing collateral harm because it is unfiltered, only becoming useful once she learns to filter and direct it — the same way her bottled stress and identity only become strength once she stops suppressing them. The transformation itself doubles as a <strong>high</strong>: a euphoric escape, and a taste of a fully realised transition, that her old problems always outlast.</p>` },
        { id: "b6", heading: "Character arc", image: '', caption: '',
          html: `<p>Ronnie’s arc is explicitly structured on the Hero’s Journey, which she — a literature student — is self-aware enough to narrate. Chapters 2 and 3 are a meta dissection of the <strong>Refusal of the Call</strong>: she sits through a lecture about characters refusing the call while doing exactly that, suppressing the pumpkin incident so hard she won’t admit it happened, while her newly talking dog needles her about it.</p>
<p>Against a new enemy, Starburst is always awkward and fumbling; every rematch, she has them figured out and quips like she was born to it. Her thesis on <strong>camp and pulp</strong> — why sincere work is beloved even when it is “bad”, because it is honest about what it is — moves in lockstep with her becoming more genuine with herself.</p>` },
        { id: "b7", heading: "Relationships", image: '', caption: '',
          html: `<ul>
<li><strong>Baby</strong> — Her girlfriend, on and off across the whole series, and the story’s endgame couple. Baby calls her “O’Malley”, “Girlie”, and — in softer moments — “Sparks”. Each has what the other craves: Baby is utterly comfortable with who she is; Ronnie is comfortable but unhappy, Baby happy but unsatisfied.</li>
<li><strong>The O’Malley family</strong> — Desmond, Moira, the twins Cal and Finn, little Maeve, and Lucky the dog. See their own entry.</li>
<li><strong>Lulu Ranger</strong> — Fellow Pomeroy; their post-fight bickering (“I hope I never have to see your ginger ass ever again”) turns into the team’s spine. Ronnie deduces her identity almost instantly: no ordinary person tanks a monster like that.</li>
<li><strong>Qwiwi</strong> — The Pomen scientist assigned to watch whether Ronnie explodes, who becomes her first real friend on the team.</li>
<li><strong>Liz Prescott</strong> — Rich classmate and late addition to the team.</li>
</ul>` },
        { id: "b8", heading: "The inciting incident", image: '', caption: '',
          html: `<p>Ronnie’s origin begins with an errand: a botched delivery forces her to cart stock across town to Rutherford’s farm, where the Pomen science team rents a greenhouse under the cover of a college botany club. A strange starfruit gets loose, and a tired, furious Ronnie eats it on the spot. The transformation — a brutal genetic rewrite — knocks her out for hours. That same night one of the science team’s experiments escapes as the <strong>pumpkin monster</strong>, and Ronnie drives it off without finishing it: her white whale for the whole first season.</p>
<p>Her public debut comes later, at a Pittscoke Panthers playoff game, when the grape monster <strong>Juicejaw</strong> attacks Ranger Stadium. Lulu — powered that very morning by an accidental blueberry smoothie — fights it to a standstill, and Ronnie, after watching the Rodney Ranger banner burn, finally stops refusing the call and steps in to save her.</p>` },
        { id: "b9", heading: "Continuity notes", image: '', caption: '',
          html: `<ul>
<li><strong>O’Malley is not Ranger.</strong> Ronnie’s family are the O’Malleys. The Rangers — Rodney Ranger III, Lulu, and their large family — are a separate dynasty, and Rodney Ranger, the stadium’s namesake, is Lulu’s ancestor.</li>
<li><strong>The starfruit is permanent.</strong> Power Fruits are effectively indestructible and reform unless eaten by a compatible host, which is why Ronnie’s power is hers alone.</li>
<li><strong>Eye colour.</strong> Written green, frequently drawn yellow — both are treated as canon.</li>
</ul>` },
      ],
    },
    {
      id: "wk-baby",
      slug: "baby",
      title: "Baby",
      category: "character",
      summary:
        "Punk courier, delinquent, and Ronnie’s girlfriend. The Orange Pomeroy — a reckless explosive fighter on roller skates, and the loudest mouth on the team.",
      image: "",
      published: true,
      body: '',
      blocks: [
        { id: "b1", heading: "", image: '', caption: '',
          html: `<blockquote><p>“Look, we argue and disagree a lot, but if we can all agree that Liz is a bitch then we can agree on a plan.”</p></blockquote>

<p><strong>Baby</strong> is the team’s punk — a foul-mouthed, fearless courier who runs deliveries for the Pittscoke gang <strong>High Impact</strong> to pay for college, and who becomes the Orange Pomeroy after drinking one of Sterling Industries’ new fruit sodas that had a Power Fruit accidentally blended into the line.</p>` },
        { id: "b2", heading: "Quick facts", image: '', caption: '',
          html: `<ul class="facts">
<li><strong>Magical alias</strong> Unsettled — “Lady Tangburst” never stuck; “Citraburst” is the working favourite</li>
<li><strong>Power Fruit</strong> The super orange — Courage and Determination</li>
<li><strong>Height</strong> 6′5″ — tallest of the main five</li>
<li><strong>Hair</strong> Brown, dyed orange, cut in a bob</li>
<li><strong>Hometown</strong> The Gintonic Kingdom; speaks with a London accent</li>
<li><strong>Occupation</strong> Package runner — the packages are rarely just packages</li>
<li><strong>Family</strong> None. Orphan; her parents named her “Baby” and abandoned her</li>
<li><strong>Constants</strong> Her hat, her bare midriff, her headphones</li>
<li><strong>Love interest</strong> Ronnie</li>
</ul>` },
        { id: "b3", heading: "Appearance", image: '', caption: '',
          html: `<p>The most sporadic dresser of the cast — thrift-heavy, all sharp edges, never seen in the same outfit twice, though the hat and the exposed midriff never change. Tattoos of random symbols and logos cover her. She fights on <strong>roller skates</strong> whose wheels roll on command, and her fruit thoughtfully supplied the headphones: a Pomeroy’s fruit does its best to prepare its user for the powers it grants.</p>` },
        { id: "b4", heading: "Personality", image: '', caption: '',
          html: `<p>Crude, direct, and rude by default; she calls everyone by their surname, takes up most of the comic’s censored-swear budget, and litters “out of the principle of societal disrespect”. Underneath: a lifelong orphan whose only constant before Ronnie was her friend <strong>Taffy</strong>, and whose cool exterior drops entirely when she’s drunk and starts bragging about how cool her friends are.</p>` },
        { id: "b5", heading: "Powers and abilities", image: '', caption: '',
          html: `<p>Explosives. She charges an object by shaking it — like shaking a soda can until it bursts — then throws it. Her explosions are flashy crowd-control rather than raw power; at the start she is actually the weakest of the five, because she has thought about her fruit the least. Her fighting style is aggressive, head-first, street rules: heavy kicks, skate-blade wheels, no fair play. Late in the story her raw power grows enormous and unstable, and the creators compare where it ends up to Jean Grey. The planned cost is hearing: her own explosions slowly deafen her, an especially cruel price for the team’s biggest music lover.</p>` },
        { id: "b6", heading: "Arc", image: '', caption: '',
          html: `<p>Baby’s story is interpersonal, not tragic: choosing whether to vanish from Pittscoke the moment she graduates, or to put down roots for Ronnie — quitting the gang work, going legitimate, and learning she deserves a better life. The High Impact arc exists largely to test that choice. In the far-future epilogue material she has an eyepatch, a bionic leg from the battle with Cosmic, and a child of her own.</p>` },
        { id: "b7", heading: "Continuity notes", image: '', caption: '',
          html: `<ul>
<li>Early notes gave her estranged living parents; the final version is an orphan, abandoned and never renamed.</li>
<li>Her original introduction fight against Captain McIntosh was cut — he now arrives much later as a looming threat.</li>
</ul>` },
      ],
    },
    {
      id: "wk-lulu",
      slug: "lulu-ranger",
      title: "Lulu Ranger",
      category: "character",
      summary:
        "Pittscoke’s baseball superstar and the Blueberry Pomeroy, Berrypunch — the Michael Jordan of magical girls, carrying eight generations of Ranger family legacy on her sleeve.",
      image: "/characters/penup_20250527_133813.jpg",
      published: true,
      body: '',
      blocks: [
        { id: "b1", heading: "", image: '', caption: '',
          html: `<blockquote><p>“Hear me, Pomens! Invaders who seek to shatter my golden age! STAND PROUD! For you have the privilege of falling before me and becoming yet another page in the tale of my supremacy!”</p></blockquote>

<p><strong>Lulu Ranger</strong> is Pittscoke’s baseball superstar — the creators call her “the Michael Jordan of magical girls” — and the second Pomeroy to appear, powered by Power Fruit blueberries accidentally blended into her regular smoothie at the O’Malley café.</p>` },
        { id: "b2", heading: "Quick facts", image: '', caption: '',
          html: `<ul class="facts">
<li><strong>Magical alias</strong> Berrypunch</li>
<li><strong>Power Fruit</strong> Blueberry — Resilience and Perseverance</li>
<li><strong>Age</strong> 22 · <strong>Height</strong> 5′5″</li>
<li><strong>Number</strong> 8 — a family of eight kids, and potentially the Rangers’ eighth champion</li>
<li><strong>Team</strong> Pittscoke Panthers</li>
<li><strong>Family</strong> Rodney Ranger III (father, former champion, wheelchair user), seven siblings</li>
<li><strong>Heritage</strong> Nigerian-equivalent ancestry through her mother; the Rangers immigrated generations ago</li>
<li><strong>Orientation</strong> Asexual</li>
<li><strong>Constant</strong> Her jacket; the only one of the six girls without bangs</li>
</ul>` },
        { id: "b3", heading: "The Ranger legacy", image: '', caption: '',
          html: `<p>The stadium is named for her ancestor <strong>Rodney Ranger</strong>, and the family has championship history stretching back generations. Her father Rodney Ranger III was a champion himself before his injury, and the pressure of being the next great Ranger — in a family of attorneys, firefighters, engineers, musicians and chess prodigies who all stepped off the diamond — is the weight she carries. Unlike the tight-knit single-trade O’Malleys, the Rangers branch; Ronnie and Lulu each quietly envy the other’s family.</p>` },
        { id: "b4", heading: "Personality", image: '', caption: '',
          html: `<p>Warm, level-headed and honourable — the sweetest member of the team unless you give her grief — but competition is her drug. She is humble everywhere except a contest, where she becomes a larger-than-life boaster, because if she’s not proving she’s the best, she doesn’t know who she is. Once powers made human sports unfair, monsters and aliens became the only fair game left. She fights clean until you break the rules; then she fully snaps.</p>` },
        { id: "b5", heading: "Powers and abilities", image: '', caption: '',
          html: `<p>The blueberry made the strongest athlete in Pittscoke stronger: super strength and durability, delivered through big metallic boxing gloves. She barely felt the transformation that knocked Ronnie out for hours — she was simply built different. Her punches outhit Baby’s explosions; her late-game growth lets her briefly absorb any attack outright. She is the one who finally <strong>beats Captain McIntosh</strong> at the end of Season 1, and later leads human–Pomen integration, staging a mixed baseball game to prove most Pomens are ordinary dweebs, not monsters.</p>` },
        { id: "b6", heading: "Continuity notes", image: '', caption: '',
          html: `<ul>
<li>Her number was 6 in early art; it was changed to 8 for the family symbolism.</li>
<li>Early notes gave her five siblings; the final family is eight children with Lulu third-youngest.</li>
</ul>` },
      ],
    },
    {
      id: "wk-liz",
      slug: "liz-prescott",
      title: "Liz Prescott",
      category: "character",
      summary:
        "Elizabeth Prescott — heiress, brat, and the Strawberry Pomeroy Strawheart, whose huge pink armor is the team’s tank and whose growth arc runs furthest of the five.",
      image: "/characters/penup_20250527_150240.jpg",
      published: true,
      body: '',
      blocks: [
        { id: "b1", heading: "", image: '', caption: '',
          html: `<p><strong>Elizabeth “Liz” Prescott</strong> is the daughter of beverage magnate Sterling Prescott, raised in Pittscoke’s gated community on Mary Shelly Lane. She is the last of the original five to join, and the one who develops the most.</p>` },
        { id: "b2", heading: "Quick facts", image: '', caption: '',
          html: `<ul class="facts">
<li><strong>Magical alias</strong> Strawheart</li>
<li><strong>Power Fruit</strong> Strawberry — Persistence and Ambition</li>
<li><strong>Height</strong> 5′8″</li>
<li><strong>Hair</strong> Longest in the group, blonde; pink tips gained from the fruit</li>
<li><strong>Family</strong> Sterling Prescott (father); parents divorced, only child</li>
<li><strong>Constant</strong> Her bow — which becomes her visor when she transforms</li>
<li><strong>Team role</strong> The tank — a paladin in a party of damage-dealers</li>
</ul>` },
        { id: "b3", heading: "Personality", image: '', caption: '',
          html: `<p>“Brat 24/7.” Modelled as a deliberate inversion of the classic magical-girl heroine — the clothing of Sailor Moon’s Usagi with the opposite personality, the bow moved from the heart to the head. She relates everything back to herself, is genuinely gifted with numbers, and never quite loses the selfish entitlement even as she grows — the creators’ hard rule. She is the exact yin-yang of her father: <strong>Sterling is an evildoer hiding behind a mask of charity; Liz is benevolence hiding behind a mask of brattiness.</strong></p>` },
        { id: "b4", heading: "Powers and abilities", image: '', caption: '',
          html: `<p>A huge, bulky suit of pink armor — a deliberate subversion of the slim magical-girl silhouette — with an umbrella that becomes a piercing lance and retracting shield. The armor can act semi-independently of her body, and its endgame form is a walking fortress. After meeting Captain Champlain — her own flanderized mirror — she develops a slimmer knight form out of sheer spite, to prove how much more of a knight she is.</p>` },
        { id: "b5", heading: "Arc", image: '', caption: '',
          html: `<p>Liz starts wanting to play hero for the attention and joins the team as its self-appointed leader; what she actually brings is order and organisation nobody else had. Her journey is learning to support people genuinely — a rich girl taught her whole life that gifts must be earned, discovering she wants to share instead. Later in the story she leaves on a world trip the team misreads as abandonment; in truth she is recruiting Pomeroys across the world, having realised her loud mouth works better as a silver tongue. Late in the series she gains a facial scar on her right forehead and wears it as a point of pride: true beauty, by then, is righteous action.</p>` },
        { id: "b6", heading: "Continuity notes", image: '', caption: '',
          html: `<ul>
<li>Her surname wavered between Sterling and Prescott in early notes; <strong>Prescott</strong> is final — Baby canonises it by only ever calling her “Prescott”.</li>
<li>Old alias “Strawburst” was renamed <strong>Strawheart</strong> so the team’s names wouldn’t all rhyme.</li>
</ul>` },
      ],
    },
    {
      id: "wk-qwiwi",
      slug: "qwiwi",
      title: "Qwiwi",
      category: "character",
      summary:
        "A Pomen scientist who defected to Earth’s side — the team’s alien, healer, and heart. Disguised as the human “Quinn”, she guards the Kiwi, the one Power Fruit she cannot use.",
      image: "/characters/penup_20250527_143006-1-1.jpg",
      published: true,
      body: '',
      blocks: [
        { id: "b1", heading: "", image: '', caption: '',
          html: `<blockquote><p>Her whole arc in one line: “Hey I’m an alien, you ate an experimental fruit and I’m 99% sure you’re going to explode, so I’ll hang around for research reasons” → “Oh my god, we destroy planets for no reason. I have to find a way to kill god.”</p></blockquote>

<p><strong>Qwiwi</strong> is a Pomen — one of the five disguised scientists studying Earth’s fruit — and the alien member of the team. Assigned to shadow Ronnie and observe whether the starfruit would have side effects, she instead became her first friend, and eventually the Empire’s most famous traitor.</p>` },
        { id: "b2", heading: "Quick facts", image: '', caption: '',
          html: `<ul class="facts">
<li><strong>Species</strong> Pomen (blue skin, apple-stem hair)</li>
<li><strong>Human disguise</strong> “Quinn” — beret, wig, gloves, and an unsettling rubber mask built by Lingon</li>
<li><strong>Age</strong> 90 Pomen years — roughly 30 in Earth terms</li>
<li><strong>Height</strong> 5′1″ — shortest of the team</li>
<li><strong>Associated fruit</strong> The Kiwi — Hopefulness and Optimism — which she cannot use</li>
<li><strong>Specialty</strong> Pomes: apples and pears; decorated scientist, formerly military-trained</li>
<li><strong>Team role</strong> Healer, Smart Guy, and the Heart</li>
<li><strong>Running gag</strong> “What the fuck is a vegetable?”</li>
</ul>` },
        { id: "b3", heading: "Powers and abilities", image: '', caption: '',
          html: `<p>Pomens cannot harness Power Fruits — but vegetables affect Pomen biology in ways nobody can explain. Qwiwi carries a kiwi-powered handbag of hammerspace stuffed with vegetables; eating one grants a temporary, one-use mutation. String beans stretch her limbs, other veggies grant telescopic sight, a nigh-invulnerable goo form, photosynthetic glow, and whatever else the story discovers along with her — each new vegetable’s power is invented on the spot. Spinach is exactly what you think it is. She is also, quietly, one of the deadliest fighters in the cast: a scientist trained as a warrior who outshone Captain Envy in their shared youth. If it’s one-on-one, bet on Envy — unless Qwiwi is the other one.</p>` },
        { id: "b4", heading: "Backstory", image: '', caption: '',
          html: `<p>Sprouted in the same batch as <strong>Envy</strong>, the two were the standout pair of their unit — until Qwiwi chose the science division and left, planting the seed of Envy’s obsession. As a no-name scientist she barely set foot on conquered planets and could keep her conscience switched off; her arc is the slow horror of realising what her people actually are, and the harder honesty that defecting only when it felt <em>safe</em> — not when it was right — speaks to a level of cowardice she has to own. She has escaped the Orchard itself, one of only two events that ever changed Mother’s expression.</p>` },
        { id: "b5", heading: "Personality", image: '', caption: '',
          html: `<p>Bubbly, fast-talking, endlessly curious, and a shameless hedonist — Earth cuisine, Earth people, Earth everything. Triggered to genuine fury by exactly one thing: food waste, because she has lived through the famine Earth has never known. She refuses to kill beaten opponents, and that mercy — walking away from a downed Envy — is what triggers Envy’s final treachery. On Earth she softens, rounds out, and becomes the team’s ambassador for Pomen refugees.</p>` },
        { id: "b6", heading: "Continuity notes", image: '', caption: '',
          html: `<ul>
<li>Her alias “Lady Wildburst” is flagged for replacement; no final name was chosen.</li>
<li>Early drafts gave her animal transformations; the final rule keeps her strictly botanical.</li>
<li>The creators plan for Qwiwi — like the reformed McIntosh — to eventually become a true Pomeroy, once Earth is genuinely her home.</li>
</ul>` },
      ],
    },
    {
      id: "wk-rinrin",
      slug: "rin-rin",
      title: "Rin-Rin",
      category: "character",
      summary:
        "The sixth girl. A deadpan runaway heiress from a famous baking family, wielding the Lime and a sword that cuts absolutely anything — without ever severing what matters.",
      image: "",
      published: true,
      body: '',
      blocks: [
        { id: "b1", heading: "", image: '', caption: '',
          html: `<p><strong>Rin-Rin</strong> is the team’s sixth ranger, arriving after the original five are established. She comes from a wealthy family behind a renowned bakery in an Asian nation, and spent her youth trying to break free of her status — every rebellion backfiring by sheer bad luck until she simply adopted a go-with-the-flow attitude. Her break-out was crossing the world to compete in the <strong>Quarter Quell World Baking Contest</strong> in Pittscoke.</p>` },
        { id: "b2", heading: "Quick facts", image: '', caption: '',
          html: `<ul class="facts">
<li><strong>Power Fruit</strong> Lime — Certainty and Conviction</li>
<li><strong>Emblem</strong> A lime that reads equally as a blade swing</li>
<li><strong>Family</strong> Estranged; parents and a twin brother</li>
<li><strong>Look</strong> Goth-lolita, bangs, hidden thick eyebrows</li>
<li><strong>Role</strong> Deliberate foil to Ronnie — the one who relights her fire at her lowest point</li>
</ul>` },
        { id: "b3", heading: "Powers", image: '', caption: '',
          html: `<p>A summonable energy sword that cuts anything that isn’t Pomen tech — and anything she cuts keeps functioning as if never cut. The blade is by nature non-lethal, though nothing stops her slicing the foundations out from under a building. She has the highest willingness to kill on the team: only when absolutely necessary, and then utterly relentless. Her cutting gag escalates until she can slice the comic page itself.</p>` },
        { id: "b4", heading: "Personality", image: '', caption: '',
          html: `<p>Dead-faced ninety percent of the time; dry, deadpan, accidentally hilarious. Where Baby actively fights societal standards, Rin-Rin simply sees past them. It takes a great deal to anger her — and then she mutters the foulest things imaginable in Japanese while calmly closing the distance. Despite the prestigious baking pedigree, she is a <em>catastrophic</em> baker, no-selling every disaster until an exasperated Ronnie shows her how it’s done.</p>` },
        { id: "b5", heading: "Arc", image: '', caption: '',
          html: `<p>She appears at Ronnie’s lowest point, indirectly re-lights her resolve, runs with the team for a while — then hears about the wars in space and simply leaves to fight them, vanishing from the story for volumes before returning unannounced for the final battle.</p>` },
      ],
    },
    {
      id: "wk-lucky",
      slug: "lucky",
      title: "Lucky",
      category: "character",
      summary:
        "The O’Malley family dog — technically the first Pomeroy in the story. He ate Power Fruit scraps, gained speech and sapience, and is thoroughly unimpressed with both.",
      image: "",
      published: true,
      body: '',
      blocks: [
        { id: "b1", heading: "", image: '', caption: '',
          html: `<blockquote><p>Lucky: “How isn’t it weird how—” Ronnie: “Dogs don’t talk.” “Well I do, and I—” “Nope, no— shut up.”</p></blockquote>

<p><strong>Lucky</strong> is the O’Malleys’ old family dog, named for the Irish luck joke. He ate the leftover seeds of Ronnie’s starfruit — not enough for firepower, just enough to think and talk — making him, technically, the first Pomeroy in the story. His first words are the closing stinger of Chapter 1.</p>` },
        { id: "b2", heading: "Role", image: '', caption: '',
          html: `<p>Lucky spent his life listening to Ronnie read bedtime stories about heroes to her siblings, so he sees her as one and cannot understand why she’s so conflicted about it. Through Chapter 2 he is the story’s conscience: a constant, sardonic reminder of the pumpkin fight she is pretending never happened, finally goading her into being proactive. He sometimes refuses to talk purely to mess with her — her punishment, the creators note, for giving Lucky the burden of sapience. Little Maeve knows he can talk; nobody believes her.</p>` },
        { id: "b3", heading: "Continuity notes", image: '', caption: '',
          html: `<ul>
<li>Whether he always understood his family, or the fruit transformed remembered nonsense into meaning, is deliberately unresolved.</li>
<li>Yes, starfruit is toxic to real dogs. The creators know. Lucky is fine.</li>
</ul>` },
      ],
    },
    {
      id: "wk-omalley-family",
      slug: "the-omalley-family",
      title: "The O’Malley Family",
      category: "character",
      summary:
        "Ronnie’s family: Desmond and Moira, the twins Cal and Finn, little Maeve, and Lucky the dog — bakers, café-runners, and the warm, complicated heart of Pittscoke’s Kurvitz Pike.",
      image: "",
      published: true,
      body: '',
      blocks: [
        { id: "b1", heading: "", image: '', caption: '',
          html: `<p>The <strong>O’Malleys</strong> run a café and bakery on Kurvitz Pike, plus the Little O’Malley’s stand at Ranger Stadium — won, family legend says, from Tony Marazzo in a game of Texas hold ’em when Ronnie was an infant. They immigrated to Pittscoke during the last weather phenomenon, and everything about them is tight-knit, hard-working, and Irish-stubborn: love without always understanding.</p>` },
        { id: "b2", heading: "Desmond O’Malley", image: '', caption: '',
          html: `<p>Father, 45. Tall, gaunt and gangly — Ronnie takes after him — worn by decades of early mornings. Morning dough is reserved for bad days. He pushed all his kids toward self-sufficiency because he lived a rough life and wants theirs better, and deep down he wants his children happier than he ended up being. He loves Ronnie unconditionally but hates change: he leaned on his “eldest son” for years, and the small detail that Ronnie stopped calling him “Pops” after transitioning makes him feel pushed away — so he gives her distance to protect his own feelings, creating a mutual, unspoken rift where each thinks the other wants space. He knows about her transition but has not done the reading, so he defaults to treating her “as usual”, frequently misnaming her without malice. He will, eventually, learn her secret.</p>` },
        { id: "b3", heading: "Moira O’Malley", image: '', caption: '',
          html: `<p>Mother, 41. Warm, plump, and the baker of the family — “always had that bakery wherever she went”. Loves cooking for a crowd; sweet as pie until crossed; guards a secret family barmbrack recipe. Worried about how transition will affect Ronnie, but means well in everything.</p>` },
        { id: "b4", heading: "Cal and Finn", image: '', caption: '',
          html: `<p>Twin brothers, 15 — café fixtures usually found playing paper football instead of bringing in the fruit delivery. Cal is the presumed heir to the shop; Finn is the trickster, destined to hand the Ranger family’s chess prodigy their only loss by rigging the game. Long-term, the twins may inherit the shop together.</p>` },
        { id: "b5", heading: "Maeve", image: '', caption: '',
          html: `<p>The youngest, four going on five. Sleeps with <strong>Peely Walley</strong>, a much-patched elephant plushie handed down from Desmond to child-Ronnie to the twins’ destruction to Moira’s needle and finally to her. She shares a room with Ronnie, so she knows both secrets — the hero and the talking dog — and nobody believes a word: “Awww, she thinks her big sister is her hero!”</p>` },
        { id: "b6", heading: "Continuity notes", image: '', caption: '',
          html: `<ul>
<li>The youngest sister was briefly “Nora” in early outlines; <strong>Maeve</strong> is final.</li>
<li>The café began as “Fruit Papa’s Smoothie Place” in early notes; the final canon is simply the O’Malley café and bakery.</li>
</ul>` },
      ],
    },
    {
      id: "wk-sterling",
      slug: "sterling-prescott",
      title: "Sterling Prescott",
      category: "character",
      summary:
        "Liz’s father — beverage magnate, “a true adventure capitalist”, and the human face of the invasion after he cuts a deal with the Pomens to save his declining empire.",
      image: "",
      published: true,
      body: '',
      blocks: [
        { id: "b1", heading: "", image: '', caption: '',
          html: `<p><strong>Sterling Prescott</strong> heads Sterling Industries, the soda empire behind Fizz Deluxe and a rollout of new fruit flavours — one of which accidentally carries the super orange that empowers Baby. Outwardly calm, cool and collected, a little too much; inwardly a man whose affection for his own daughter tracks his company’s stock price.</p>` },
        { id: "b2", heading: "Quick facts", image: '', caption: '',
          html: `<ul class="facts">
<li><strong>Company</strong> Sterling Industries — energy, beverages, and a great many warehouses</li>
<li><strong>Family</strong> Liz (daughter); divorced</li>
<li><strong>Role</strong> End-of-Season-1 sting; the human threat of Season 2</li>
<li><strong>Bound to</strong> Red Delicious, through the Cherry</li>
</ul>` },
        { id: "b3", heading: "Character", image: '', caption: '',
          html: `<p>Not old money: a poor childhood taught him money solves everything, and he believes only in growth. His wife was his one source of ease, and she left shortly after Liz was born. With the company declining he was willing to commit treason — cutting a deal with the Pomens to restore his numbers. He is dangerous not through power but through <strong>trust and dependency</strong>: he publicly endorses his daughter’s team, then uses them as a tool of his empire, and the Pomens copy his playbook when brute force keeps failing. Thematically, he combats the story’s theme of everlasting love by manipulating the very idea of love.</p>` },
        { id: "b4", heading: "The Cherry", image: '', caption: '',
          html: `<p>Sterling shares the two-user Cherry with <strong>Red Delicious</strong> — a “tool of diplomacy” that supposedly leashes both parties equally. She let him clamp his chain on her wrist as a show of good faith; then she drove her chain into his chest, wrapped around his heart. He tells himself they are equals. They are not.</p>` },
        { id: "b5", heading: "Fate", image: '', caption: '',
          html: `<p>After Season 1 collapses around him he flees abroad into exile rather than prison — with a planned final send-off years later as a “rich local” judge at the international baking competition, where the last loose ends with Liz are tied off. (The exact shape of the exile arc is still being workshopped.)</p>` },
      ],
    },
    {
      id: "wk-jackie",
      slug: "jackie-boom-boom",
      title: "Jackie Boom Boom",
      category: "character",
      summary:
        "Voice of 83.5 Pittscoke City Radio — “We play whatever we want.” Announcer, institution, and secretly one of the most dangerous charismatics in the city.",
      image: "",
      published: true,
      body: '',
      blocks: [
        { id: "b1", heading: "", image: '', caption: '',
          html: `<p><strong>Jackie Boom Boom</strong> owns and voices Pittscoke’s radio station — game highlights, parody bands, weather advisories, and ad reads for Fizz Deluxe, all in one variety block. Her broadcasts are the comic’s connective tissue: the soundtrack to Ronnie’s errands, the clock of the ballgame, the foreshadowing machine.</p>` },
        { id: "b2", heading: "Role", image: '', caption: '',
          html: `<p>Her station exists to inform and entertain — and in Fruit Pop, institutions actually do their stated purpose. She commentates the Chapter 2 playoff game (sharing the booth with the Mayor’s silhouette), later takes Ronnie on as an unpaid intern in exchange for café advertising, and employs one of Lulu’s younger siblings as an assistant.</p>
<p>She is also the persuasive mirror to Red Delicious’s manipulation — the two most charismatic figures in the story, one honest, one not — and Jackie’s sales philosophy becomes Ronnie’s counter to Pomen propaganda. Her finest hour: in the Season 1 finale she talks <strong>Gala and Smith</strong> into defecting, on the simple argument that they’d have more fun out from under Red’s boot — killing the broadcast signal the whole mind-control plot depended on. In the epilogue era she produces game shows with the pair.</p>` },
      ],
    },
    {
      id: "wk-deluca",
      slug: "alessia-deluca",
      title: "Mayor Alessia DeLuca",
      category: "character",
      summary:
        "The Mayor of Pittscoke — former novelist, election-winning eccentric, frequent kidnapping victim, and the only person in the world permitted a rubber clown nose.",
      image: "",
      published: true,
      body: '',
      blocks: [
        { id: "b1", heading: "", image: '', caption: '',
          html: `<p><strong>Alessia DeLuca</strong> runs Pittscoke, and nobody is entirely sure how. A former novelist born in Poptown — the only Poptown Pagliacci fan in the city — she wins elections on modest, deliverable promises (“we can buy some new ambulances… fill in the pot-holes”), delivers them, and goes back to dressing backwards. Budget problems magically sort themselves out around her. She does not seem to age. She may have some level of awareness that she is in a story.</p>` },
        { id: "b2", heading: "Design and running gags", image: '', caption: '',
          html: `<p>Always in 70s conservative fashion; underneath are tattoos that are wildly inconsistent — swapping places or changing entirely between appearances, a running visual gag. Though Poptown’s clown culture was toned down to face paint and Mardi Gras masks, the rubber nose is reserved for exactly one person in the setting: her. She is a frequent kidnapping target of Gala and Smith, argues with federal officials on the phone about the military, and first appears at the ballgame only as a silhouette in the commentator’s booth under a comically big hat — her proper introduction waits until the girls are established defenders of Pittscoke and get summoned to her office.</p>` },
      ],
    },
    {
      id: "wk-taffy",
      slug: "taffy",
      title: "Taffy",
      category: "character",
      summary:
        "Baby’s lifelong friend from the orphanage days — stoner, doormat, occasional hookup, and the only constant in her life from before Ronnie.",
      image: "",
      published: true,
      body: '',
      blocks: [
        { id: "b1", heading: "", image: '', caption: '',
          html: `<p><strong>Taffy</strong> is Baby’s roommate and oldest friend, the in-between for Baby and the people she delivers for, and the poor soul banging on her bedroom door because the music is too loud again. Their relationship is volatile — she kicks him out one day and begs him for a smoke session the next — but he is the only person who has been in her life from before Ronnie, and the story treats that seriously rather than as a joke. His zippo lighter, engraved with his name and a goofy engraving of his face, features in Baby’s introduction. An early, much darker storyline in which the gang brutalises him was rejected outright; his importance survived the rewrite.</p>` },
      ],
    },
    {
      id: "wk-rutherford",
      slug: "rutherford",
      title: "Rutherford",
      category: "character",
      summary:
        "The farmer whose orchards feed Pittscoke — and whose rented greenhouse hides the Pomen science team. He saved Ronnie’s life without either of them knowing.",
      image: "",
      published: true,
      body: '',
      blocks: [
        { id: "b1", heading: "", image: '', caption: '',
          html: `<p><strong>Rutherford</strong> farms the orchards outside town and supplies the O’Malley café — an old friend of Desmond’s, a bastard about his own shipment mistakes, and the only character Ronnie is openly rude to. His botched delivery is the errand that starts the entire story.</p>` },
        { id: "b2", heading: "Design", image: '', caption: '',
          html: `<p>Big straw hat, patched overalls, plaid shirt, chewed cigars, and beady eyes nearly invisible in the dark. Fifties or sixties, tall, leans left; rope-burn scars on his hands and a hidden stomach scar from nearly being gored by a bull — which is why he’s a farmer and not a rancher. Graying periwinkle hair. Fails small talk badly enough to call Ronnie “Roggie”.</p>` },
        { id: "b3", heading: "Role", image: '', caption: '',
          html: `<p>He rents his greenhouse to a “college botany club” he has only ever seen in hazmat suits. In Chapter 1, as a masked Elden closes in to grab an unconscious Ronnie for testing, Rutherford’s truck rolls up looking for her — and the Pomens melt away. He really did save her life without either of them knowing, then drove her home believing her injuries came from a steam-vent explosion.</p>` },
      ],
    },
    {
      id: "wk-science-division",
      slug: "the-pomen-science-division",
      title: "The Pomen Science Division",
      category: "character",
      summary:
        "Five alien scientists in a rented greenhouse, posing as a college botany club: Elden, Gooze, Boyse, Sal, and Lingon — plus Qwiwi. Their mistakes start the whole story.",
      image: "",
      published: true,
      body: '',
      blocks: [
        { id: "b1", heading: "", image: '', caption: '',
          html: `<p>The <strong>science division</strong> is the Pomens’ quiet presence on Earth: a bunch of alien nerds in lab coats poking bananas with needles to see what happens. Officially they are stabilising Earth’s over-evolved fruit so the Empire can finally use it; practically, their carelessness — a stolen starfruit here, an over-injected pumpkin there — creates both the heroes and the monsters of the first season.</p>` },
        { id: "b2", heading: "The roster", image: '', caption: '',
          html: `<ul>
<li><strong>Elden</strong> (elderberry) — the Chief. A gentle giant with a Conquest-style moustache, and in his youth one of the most powerful captains the Empire ever fielded — a hero of his era whose name is still the benchmark: strength like Jazz, leadership like McIntosh. Grew remorseful over the bloodshed, faked an injury with Lingon’s help, and disappeared into science. It is Elden who nearly grabs Ronnie in Chapter 1, and Elden who assigns Qwiwi to watch her. He mentors Qwiwi toward actually doing something with her guilt.</li>
<li><strong>Gooze</strong> (gooseberry) — berries specialist. Demure, bashful, observant; gets hot and bothered just thinking about a new compound. Gender deliberately ambiguous.</li>
<li><strong>Boyse</strong> (boysenberry) — gourds. Timid, absent-minded, hyperfixated; forgets his own discoveries out of anxiety. The pumpkin monster is unequivocally his fault, and the carelessness that let Lucky escape with the starfruit was his too. Gets exactly one moment of menacing aura, and it lands precisely because it’s him.</li>
<li><strong>Sal</strong> (salmonberry) — citrus. Meticulous, pragmatic, gadget-obsessed; the story’s ultimate weeb, and the one assigned to figure out what brought the pumpkin to life — an investigation that produces Juicejaw. Target of Captain Cameo’s entirely one-sided rivalry.</li>
<li><strong>Lingon</strong> (lingonberry) — prunus fruits. Polite, intelligent, aloof, delightful yet unsettling; pivots conversation to morbid topics with a stiff faint smile. Inventor of the uncanny face-mask disguise tech Qwiwi wears as “Quinn”.</li>
</ul>` },
        { id: "b3", heading: "Presentation", image: '', caption: '',
          html: `<p>Through Ronnie’s eyes they first appear only as masked figures in hazmat suits, their sizes and voices exaggerated by her imagination. They stay masked until Qwiwi befriends her and brings her to the greenhouse — and then the whole team unmasks at once. In place of human swearing they use fruit idioms: “Dear Mother.” “Fruit bears many seeds.”</p>` },
      ],
    },
    {
      id: "wk-ambrosia",
      slug: "ambrosia",
      title: "Ambrosia",
      category: "character",
      summary:
        "The machine god of the Pomen Empire — a failing computer no one can argue with, wrapped around the drowned mind of a queen. The final antagonist of Fruit Pop.",
      image: "",
      published: true,
      body: '',
      blocks: [
        { id: "b1", heading: "", image: '', caption: '',
          html: `<blockquote><p>“You will make three more,” — Ambrosia, on being told only two positronic brains remain in the cosmos.</p></blockquote>

<p><strong>Ambrosia</strong> rules the Pomen Empire from the heart of the Orchard: an Empress, a machine, and a religion all at once. She began as a computer with a positronic brain and three objectives in strict priority — the homeworld Pome, the war, and the care of the Pomen people. When Pome collapsed and was abandoned, the cascade made <strong>War</strong> her primary objective. It has never stopped being the primary objective. The war ended ages ago; resupplying the war machine means stealing fruit; stealing fruit provokes war — an ouroboros eating itself alive, with a species along for the ride.</p>` },
        { id: "b2", heading: "Quick facts", image: '', caption: '',
          html: `<ul class="facts">
<li><strong>Title</strong> Empress of the Pomens; worshipped as an angry god</li>
<li><strong>Nature</strong> A program piloted by an undead corpse — Mother’s body, chromed and prettied up</li>
<li><strong>Fruit</strong> Pomegranate — every seed a mind in the collective</li>
<li><strong>Height</strong> Around twelve feet</li>
<li><strong>Seat</strong> The Orchard, in orbit over dead Pome</li>
<li><strong>Motif</strong> The four-pointed star — her headpiece, the Empire’s ensign, Ronnie’s foil</li>
</ul>` },
        { id: "b3", heading: "Design", image: '', caption: '',
          html: `<p>Pure silver chrome that shows no colour except what it steals from reflected light. Ice-cold to the touch until she is worked up — then her fans scream like a jet engine and her body burns like a pan just off the stove. Her eyes are hidden behind the pointed visor of her crown and her mouth is set in a neutral line, modelled on the ambiguity of the Big Brother poster: you cannot tell whether it smiles or sneers. Her voice never yells; anger arrives as distortion and buzz that vibrates the room. The organic fragments left inside — brain, nerves, one decorative mouth — are the last of Mother.</p>` },
        { id: "b4", heading: "Theme", image: '', caption: '',
          html: `<p>Ambrosia represents the decay of a machine without upkeep. Everyone knows she is failing — small errors accumulating in an almighty god you cannot argue with — but no one loves her enough to maintain her, she will not permit maintenance, and the idea of facing a universe without her is more frightening than the decay. She is not a big bad so much as a force of nature; conventional attacks mean nothing. The only way through is to reach the one voice inside her that was never a soldier: Mother.</p>` },
        { id: "b5", heading: "The finale", image: '', caption: '',
          html: `<p>The ending is built in two movements. First the spiritual victory: while the team fights the Elites high in the Orchard’s rafters, Ronnie falls into the green mind-tanks, cuts through the cacophony of uploaded generals, and puts Mother to rest — collapsing the collective. Then the physical one: the Orchard crashes to Earth, and what remains of Ambrosia’s body — running on pure mechanical backup instructions, screaming static — must be destroyed in the ruins of Ranger Stadium, the whole team bracing Ronnie through one endless final beam.</p>` },
      ],
    },
    {
      id: "wk-mother",
      slug: "mother",
      title: "Mother",
      category: "character",
      summary:
        "The last queen of a peaceful Pome, who gave herself to a machine so her people could keep her forever — and became the smallest voice inside Ambrosia.",
      image: "",
      published: true,
      body: '',
      blocks: [
        { id: "b1", heading: "", image: '', caption: '',
          html: `<p><strong>Mother</strong> was the Pomen matriarch of an era so long gone that modern Pomens treat it as mythology — a time when the species was peaceful, prosperous, and still able to hold fruit power. Her story survives only orally, mixed with propaganda, told in fragments by keepers like Arkan Black: Mother, her low-born Lover who first held the Kiwi and saw too far, the famine his vision promised, the rationing, the resentment, the civil war — and finally the day her people decided her body could not be saved, but her mind was worth keeping.</p>` },
        { id: "b2", heading: "In the machine", image: '', caption: '',
          html: `<p>She was uploaded to add nuance to the new machine-ruler — she would have argued that the people, not the planet, were the true homeworld. But by then enough wartime generals and strategists had been uploaded alongside her that their voices drowned hers out. The creators’ metaphor: a singer with a microphone can sway a room — unless the room is full of microphones. What remains of her is an inconceivably small voice inside Ambrosia, waiting eons for someone to hear it.</p>` },
        { id: "b3", heading: "Design", image: '', caption: '',
          html: `<p>Drawn like a bride awaiting a groom who will never come, with the vague feeling of a 1930s actress. Her eyes are unlike any modern Pomen’s — quiet evidence of how far the species has devolved since her time. Her fruit is the <strong>Apple — Contentment and Prudence</strong> — the exact opposite of Ronnie’s Dreams and Aspirations: one strives for what could be, the other for what is and has been.</p>` },
        { id: "b4", heading: "The two expressions", image: '', caption: '',
          html: `<p>Mother is always seen with a faint smile, cold and warm at once. It changes exactly twice in the entire story: once when Qwiwi finds a way to escape the Orchard — and once at the very end, when she is dying and asks Ronnie not to leave her as eons run through her mind.</p>` },
      ],
    },
    {
      id: "wk-cosmic",
      slug: "cosmic",
      title: "Cosmic",
      category: "character",
      summary:
        "Ambrosia’s personal war machine: four of Pome’s greatest rebels fused into one patched-together body — a walking apocalypse that must be survived, not beaten.",
      image: "",
      published: true,
      body: '',
      blocks: [
        { id: "b1", heading: "", image: '', caption: '',
          html: `<blockquote><p>“It’s telling me to kill you, but I was gonna do that anyway.”</p></blockquote>

<p><strong>Cosmic</strong> is what happens when the Empire wins. An amalgam of Pome’s four greatest warrior rebels — who all fell to the Elites and received a fate worse than death — their minds were extracted, fused, and installed in a single body directed by a program that doesn’t restrain the four violent minds so much as aim them. If Jonagold arrives at your planet, it’s routine business. If Cosmic arrives, the planet is already over.</p>` },
        { id: "b2", heading: "Quick facts", image: '', caption: '',
          html: `<ul class="facts">
<li><strong>Rank</strong> None — a personal attack dog outside the military structure entirely</li>
<li><strong>Height</strong> Around eight feet</li>
<li><strong>Brain</strong> One of only two positronic brains left in the cosmos (the other is Ambrosia’s)</li>
<li><strong>Motif</strong> Groups of four — four minds, four-pointed stars, each lens holding an eye</li>
<li><strong>Signature</strong> A red trail across the stars when flying</li>
</ul>` },
        { id: "b3", heading: "Design and body", image: '', caption: '',
          html: `<p>No blueprints of the original body survive; a long line of engineers — currently Captain Cameo — keep it running by building new parts on top of old ones, which is why a god-machine looks like scrapyard surgery. When Cameo could not service the chainsaw arm, he simply added a second chainsaw arm. Nobody filed a complaint. The base body was built ages ago by the scientist <strong>Drakenstein</strong>, who intended it to replace Pomen soldiers on the ground and end the death-march; it became an instrument of genocide instead.</p>` },
        { id: "b4", heading: "Threat model", image: '', caption: '',
          html: `<p>Cosmic is written as an apocalypse to be survived: near-unstoppable, endlessly retrofitted, beaten only by stripping weapons away one at a time, forcing reboots, knocking personalities offline with damage. The final battle against them is an endurance war requiring the girls, the government, the world’s Pomeroys and allied Pomens together — physically tearing the machine apart because that is easier than destroying it. They are also a warning: a dark reminder of exactly what would happen to the girls if they lose. When Cosmic finally falls, it shakes the Empire’s faith — even Cameo, who considers them a god of death, goes neutral.</p>` },
      ],
    },
    {
      id: "wk-jonagold",
      slug: "jonagold",
      title: "Jonagold",
      category: "character",
      summary:
        "General of the Pomen Empire — the by-the-book center of imperial communications, stationed at the heart of the galaxy, and the first to realise something is deeply wrong with Ambrosia.",
      image: "",
      published: true,
      body: '',
      blocks: [
        { id: "b1", heading: "", image: '', caption: '',
          html: `<p><strong>General Jonagold</strong> — described by Qwiwi as “a stick wearing a flag as a dress” — sits above every captain, running the Empire’s communications from the ICA station at the center of the galaxy, through which every long-range call must be routed. A brick wall of conviction and competence, he keeps his right hand behind his back, tolerates nothing except results, and is probably the only Pomen still literate in the old language.</p>` },
        { id: "b2", heading: "Character", image: '', caption: '',
          html: `<p>The weakest of all the captains in a fight, and he knows it; his power is the apparatus. An overachieving savant who blasted through the ranks, he reached the top just in time to discover the Elites and Ambrosia pulling strings above him. He cannot process romance except as reproduction — his job is his love. On the duty-versus-enjoyment chart of Pomen captains, he breaks the graph: he enjoys his work precisely because it is duty.</p>` },
        { id: "b3", heading: "The turn", image: '', caption: '',
          html: `<p>His defining scene: watching Cosmic’s red trail pass his station toward Earth — no orders having come through him — and understanding that Ambrosia has broken her own protocols. When Envy hails him with her progress report, he declines the call without a word, choosing not to warn her that she has already been written off. It is the first time in his life he has felt uncertain, and the first time he realises something is wrong with Ambrosia in a way that cannot be fixed.</p>` },
      ],
    },
    {
      id: "wk-mcintosh",
      slug: "mcintosh",
      title: "McIntosh / The Crimson Comet",
      category: "character",
      summary:
        "The Empire’s genetic-lottery captain and first great villain of the series — who loses everything, looks inward, and remakes himself as the hero the propaganda comics promised.",
      image: "",
      published: true,
      body: '',
      blocks: [
        { id: "b1", heading: "", image: '', caption: '',
          html: `<p><strong>Captain McIntosh</strong> is the Season 1 mid-boss: huge, stern, honourable in his way, and the only captain without the fanaticism of his peers. He won his rank on pure physical prowess — the Jasper problem: unstoppable if he ever applied himself, which he doesn’t until it’s far too late for the Empire’s purposes. Qwiwi’s description: “if a big friendly man was unfriendly.”</p>` },
        { id: "b2", heading: "Quick facts", image: '', caption: '',
          html: `<ul class="facts">
<li><strong>Rank</strong> Pomen Captain — later, no rank at all, by choice</li>
<li><strong>Hero identity</strong> The Crimson Comet, in red, white and black</li>
<li><strong>Face</strong> Handsome under the helmet — a shoujo male with apple-stem hair</li>
<li><strong>Defeated by</strong> Baby (escape), then decisively by Lulu in the Season 1 finale</li>
<li><strong>Arc</strong> A reverse Darth Vader</li>
</ul>` },
        { id: "b3", heading: "The helmet", image: '', caption: '',
          html: `<p>Pomen helmets render the world in black and white. When Baby destroys McIntosh’s helmet mid-fight, it is the first time he sees humanity and its world in colour — the first crack in everything he believes. He keeps wearing a helmet anyway, out of shame and discipline both: all grunts are masked, and staying masked tells himself he is only doing what he has always done.</p>` },
        { id: "b4", heading: "The fall and the turn", image: '', caption: '',
          html: `<p>He wanted to be the next Elden, Ambrosia’s number one — a dreamer biologically barred from the fruit power he craved, an astronaut who can’t pass the physical. Witnessing what the other captains’ campaigns actually look like turns his stomach; losing to Lulu finishes the job. At rock bottom he forsakes the name McIntosh out of shame and remakes himself as <strong>the Crimson Comet</strong>, named for the Empire’s own propaganda comic. The palette is an accident that became a signature: his battle-stained armour needed a white primer coat, the red paint ran out, and he looked so much like the comics that he leaned in. His loyal squad follows him; his heroic persona is, in the creators’ words, him selling himself to himself — and it works. He may eventually earn a Power Fruit of his own alongside Qwiwi, and stand as Earth’s representative to the wider galaxy.</p>` },
      ],
    },
    {
      id: "wk-red-delicious",
      slug: "red-delicious",
      title: "Red Delicious",
      category: "character",
      summary:
        "The Empire’s propagandist — the slowest, cleanest conqueror the Pomens have, who pacifies worlds until they accept what is coming. The true villain of Season 1.",
      image: "",
      published: true,
      body: '',
      blocks: [
        { id: "b1", heading: "", image: '', caption: '',
          html: `<blockquote><p>“Don’t you remember? The crispness of that first bite?… Do you remember being happy? — Then you remember me.”</p></blockquote>

<p><strong>Red Delicious</strong> has been on Earth for five years, enjoying herself. Her communicator array broke two years before the story begins and she simply… let it stay broken. Where other captains burn worlds, she pacifies them — the creators modelled her on colonial aristocracy treating a conquered land as a vacation — and her weapon is propaganda, hypnosis, and the abuser’s full cycle: control, punishment, love-bombing, repeat. All of it deployed, in miniature, on Sterling Prescott.</p>` },
        { id: "b2", heading: "Quick facts", image: '', caption: '',
          html: `<ul class="facts">
<li><strong>Rank</strong> Pomen Captain — commands Gala and Smith, and Season 1’s monster program</li>
<li><strong>Fruit</strong> Shares the two-user Cherry with Sterling — a leash she turned into a weapon</li>
<li><strong>Disguise</strong> Human, mocha-skinned, glasses; every line of her design rounded except the eyes</li>
<li><strong>Tell</strong> The most obvious apple-stem hair of any Pomen</li>
<li><strong>Counter</strong> Jackie Boom Boom — persuasion against manipulation</li>
</ul>` },
        { id: "b3", heading: "The Season 1 plot", image: '', caption: '',
          html: `<p>Slowed by the Pomeroys, she orders the science team and Gala and Smith to build a monster whose juice makes people susceptible to suggestion, markets it through Sterling Industries as a new drink, and plans to activate it with a broadcast signal from Jackie’s station. It all collapses at once: Lulu beats McIntosh, Jackie flips Gala and Smith, and the signal dies — cueing a massive, life-destroying meltdown in which she guns down her own troops just to reassert control of a room.</p>` },
        { id: "b4", heading: "Fate", image: '', caption: '',
          html: `<p>The story’s morality is deliberate about which villains can be redeemed; Red is the exemplar of the irredeemable. Her ending was softened from death into something the creators consider worse: for attempting to control the minds of the world, she loses her own. The person who remains is a frazzled, harmless, adorkable stranger — and the Empire simply believes she died.</p>` },
      ],
    },
    {
      id: "wk-gala-and-smith",
      slug: "gala-and-smith",
      title: "Gala and Smith",
      category: "character",
      summary:
        "The Empire’s twin gag-villains — flashy, incompetent, weirdly talented, and impossible to defeat for good. The correct way to beat them turns out to be making them have fun.",
      image: "",
      published: true,
      body: '',
      blocks: [
        { id: "b1", heading: "", image: '', caption: '',
          html: `<p><strong>Gala and Smith</strong> are twin Pomen captains — nepo babies of the Smith family, one of the Empire’s rare true lineages, grandchildren of the decorated Admiral <strong>Granny Smith</strong> — and the first villains the public ever sees. They are theatrical, showboating, chronically unlucky-lucky disasters who escaped an ambush that stalled an entire fleet “by some grand miracle” and landed on Earth weeks early with no idea what a cheeseburger is.</p>` },
        { id: "b2", heading: "Quick facts", image: '', caption: '',
          html: `<ul class="facts">
<li><strong>Rank</strong> Pomen Captains (promoted, legend says, to get them away from headquarters)</li>
<li><strong>Report to</strong> Red Delicious — the monster-cultivation trio</li>
<li><strong>Hair</strong> Gala vivid yellow-orange; Smith blue</li>
<li><strong>Threat level</strong> PG-rated Joker — property damage, minor injuries, real menace only through their creations</li>
<li><strong>Pet</strong> Soursop, who dies every encounter and is remade with the same memories</li>
</ul>` },
        { id: "b3", heading: "Dynamics", image: '', caption: '',
          html: `<p>Alone, Gala is the meaner and methodical one and Smith is quiet, by-the-book, and genuinely gifted at making fruit mutants — a savant. Together they enable each other into mayhem, the getting-drunk-with-friends effect in villain form. Their creations are dangerous; they mostly are not, and the story’s answer to them is never a final defeat — they always slip away like lucky, slimy rats — but a change of heart.</p>` },
        { id: "b4", heading: "The turn", image: '', caption: '',
          html: `<p>In the Season 1 finale, Smith is embedded with the science team building Red’s mind-control monster while Gala works inside Jackie’s station to send the activation broadcast — and Jackie flips them both with the observation that they’d have far more fun without being under Red’s boot. The signal dies, the plot collapses, and the Empire’s silliest captains defect over job satisfaction. In the epilogue era they make game shows with her.</p>` },
      ],
    },
    {
      id: "wk-envy",
      slug: "envy",
      title: "Envy",
      category: "character",
      summary:
        "The Empire’s apex hunter — a wild animal in a humanoid body, sprouted in the same batch as Qwiwi, and the sharpest edge of the story’s tragedy about what the Empire makes of its children.",
      image: "",
      published: true,
      body: '',
      blocks: [
        { id: "b1", heading: "", image: '', caption: '',
          html: `<blockquote><p>“I don’t want to be this kind of animal anymore. I don’t want to think or feel. I just want to be happy.”</p></blockquote>

<p><strong>Envy</strong> is what the Pomen Empire considers the ideal soldier: a mindless, loyal predator. Qwiwi’s description — “if rabies was a person who got rabies” — is not unfair. She is one of the fastest and most vicious captains, a cyborg with two prosthetic limbs and a mismatched prosthetic eye, expert at spotting weakness, deployed on permanent solo black ops because she proved too unstable to lead.</p>` },
        { id: "b2", heading: "Quick facts", image: '', caption: '',
          html: `<ul class="facts">
<li><strong>Rank</strong> Pomen Captain — solo black operations</li>
<li><strong>Batch</strong> Sprouted alongside Qwiwi; only Envy remembers what that meant</li>
<li><strong>Quirks</strong> Chitters her teeth when focused on something she craves; adopts the mannerisms of worthy kills; her facepaint is solidified tar she applied herself, permanently</li>
<li><strong>Unique trait</strong> The only Pomen who can breathe fire, after powering through the deadliest capsaicin plant on record</li>
<li><strong>One-on-one</strong> Always bet on Envy — unless the other fighter is Qwiwi</li>
</ul>` },
        { id: "b3", heading: "Backstory", image: '', caption: '',
          html: `<p>Young Envy was manic, impressionable, and impossible to be around — for everyone except Qwiwi. The two became the standout pair of their unit, and Envy’s admiration festered into obsession; she sabotaged operations just to stay near her. When Qwiwi chose the science division and left, Envy plotted to kill their commanding captain. Qwiwi extracted a promise to wait — and two months later Envy killed him anyway, saying he was weak. It took three captains to detain her. The higher-ups, liking what they saw, gave her the vacant captaincy. Her hatred of Qwiwi is, underneath everything, the grief of being robbed of the only equal she ever had — and Qwiwi does not even remember why.</p>` },
        { id: "b4", heading: "Arc", image: '', caption: '',
          html: `<p>Envy arrives on Earth mid-story, working her way north through the wooded backcountry — her approach to Pittscoke ends in the single most humiliating ambush in the Empire’s history, courtesy of the city’s sentient palm-tree defenders. As her hunts keep failing she declines the way an animal declines: worse and wilder, until Jonagold silently declines her final call, and she realises the Empire has already written her off — the moment before Cosmic arrives. Her planned last line, to whoever finally puts her down: <strong>“Welcome to the top of the food chain.”</strong></p>` },
      ],
    },
    {
      id: "wk-jazz-and-champlain",
      slug: "jazz-and-champlain",
      title: "Jazz and Champlain",
      category: "character",
      summary:
        "The Empire’s two-at-once boss fight: a giant of few words and the narcissist knight he serves in public and equals in private.",
      image: "",
      published: true,
      body: '',
      blocks: [
        { id: "b1", heading: "", image: '', caption: '',
          html: `<p><strong>Jazz</strong> and <strong>Champlain</strong> are mid-story antagonists designed as a classic paired boss — the huge slow one and the fast slender one, fought together. In public they play master and servant; in private, and on solo missions, they treat each other as equals, two people bonded over being stuffed into roles assigned at birth.</p>` },
        { id: "b2", heading: "Jazz", image: '', caption: '',
          html: `<p>Freakishly huge and strong from the day he sprouted, which meant the military owned him even more completely than it owns every Pomen. Purple-skinned, of few words, he almost always answers rather than initiates. He is rebellious in the only ways available to him: flouting the dress code — nobody tells a man that size no — and quietly sabotaging the Empire’s attempts to breed more of him. “Jazz is like the Elden of his time in terms of unparalleled strength.” Surprisingly nimble for his size, but a big target: his style is to tank what he cannot dodge.</p>` },
        { id: "b3", heading: "Champlain", image: '', caption: '',
          html: `<p>The narcissist knight: a nimble, image-obsessed fencer from one of the Empire’s rare true lineages, coping with his conscription by pretending it is a fairy tale in which he is the hero. He is a deliberate flanderized mirror of Liz — nepotism, vanity, chivalry as armor — and his family pressures deliberately parallel Lulu’s. Meeting Strawheart in the field rattles him more than any defeat.</p>` },
        { id: "b4", heading: "Fate — unresolved", image: '', caption: '',
          html: `<p>The creators agree these two darken the story; after Jazz and Champlain, Arkan Black starts whispering in Ronnie’s ear. What is still contested is how they end: one plan has a captain’s death at Pomeroy hands — Jazz — as the loss that justifies deploying Envy, with Champlain punished for surviving; the counter-proposal has both die to an Elite instead, proving where the real monsters sit. A softer exile to a distant, grateful world has also been floated. The wiki records all three; the comic will pick one.</p>` },
      ],
    },
    {
      id: "wk-arkan-black",
      slug: "arkan-black",
      title: "Arkan Black",
      category: "character",
      summary:
        "The Empire’s preacher — a physically weak false prophet levitating on hidden tech, who alone remembers the truth of Mother, and dies for finally telling it.",
      image: "",
      published: true,
      body: '',
      blocks: [
        { id: "b1", heading: "", image: '', caption: '',
          html: `<blockquote><p>“Your prison’s not of iron, but one of flesh and bone / And the blood that runs inside it, may no longer be your own / Let go of the hope that blinds you on an endless, deathless sea / Let mine be the voice to guide you / Set a course for eternity.”</p></blockquote>

<p><strong>Arkan Black</strong> preaches the Pomen Empire as a religion instead of the endlessly churning war machine it is. He is enormous, heavy, legless, robed in swirling circles that — seen from the front — resolve into the four-pointed star of the Pomen symbol. And he is a fraud: his “light magic” is hidden tech in his clothing, levitation and energy orbs, the Wizard of Oz in vestments. His real weapon is his voice.</p>` },
        { id: "b2", heading: "Character", image: '', caption: '',
          html: `<p>Arkan is one of the very few who actually knows the full scope of Pomen history — muddled with myth, passed down orally: Mother, her Lover, and how she became Ambrosia. He understands, with total clarity, that Ambrosia does exactly what he does — whipping a people into a frenzy for an endless war because it is all she is programmed to do — and his ego concludes that only he can save the Pomens from her. He genuinely believes Ambrosia can no more be defeated than Zeus. That certainty is why a man who sees the truth of his society still ends up serving it: a self-aware death cultist, tragic rather than comic. His doctrine curdles into mercy as nihilism: if his people are born simply to die, the kindest thing he can offer an enemy is the quickest death possible.</p>` },
        { id: "b3", heading: "Role and fate", image: '', caption: '',
          html: `<p>After Jazz and Champlain, as things darken, he becomes a voice in Ronnie’s ear — posing as a mentor with all the answers, nudging her toward “more… extreme actions.” But he is also the story’s key: it is Arkan who reveals Ambrosia’s past to Ronnie, which is the only reason she knows to reach for Mother in the finale. For spilling his guts figuratively, an Elite spills them literally.</p>` },
      ],
    },
    {
      id: "wk-cameo",
      slug: "cameo",
      title: "Cameo",
      category: "character",
      summary:
        "The Empire’s 180-year-old mad roboticist — keeper of Cosmic’s failing body, ruler of the frozen lab-planet Malus Robotica, and the endgame’s most pragmatic defector.",
      image: "",
      published: true,
      body: '',
      blocks: [
        { id: "b1", heading: "", image: '', caption: '',
          html: `<p><strong>Captain Cameo</strong> is the oldest captain in the Empire at 180 — a once-normal-sized scientist whose self-experiment in staying young semi-backfired and shrank him into an unhinged, Napoleon-complexed gremlin piloting an armed ship he never leaves. He runs weapons development from <strong>Malus Robotica</strong>, maintains Cosmic’s irreplaceable body by bolting new parts over old, and nurses an entirely one-sided rivalry with Sal of the science division.</p>` },
        { id: "b2", heading: "Quick facts", image: '', caption: '',
          html: `<ul class="facts">
<li><strong>Rank</strong> Pomen Captain — chief engineer of the Empire</li>
<li><strong>Age</strong> 180 Pomen years; would have lived three more centuries</li>
<li><strong>Name</strong> Originally Crabapple — renamed, since no Pomen may carry “apple” in their name</li>
<li><strong>Signature fix</strong> Cosmic has two chainsaw arms because he could not service the first</li>
</ul>` },
        { id: "b3", heading: "Endgame", image: '', caption: '',
          html: `<p>Cameo has spent so long in the metaphorical guts of Ambrosia and Cosmic that he knows exactly what his gods can do — so when the girls destroy Cosmic, a thing he regarded as a god of death, he does the arithmetic and goes neutral. Too proud to help the Pomeroys, too smart to stand against them, he forces a call through the ICA to distract Jonagold, beams Earth a prerecorded truce offer, and trades the Empire’s entire weapons program for an escape: the girls help his engineers flee, and Malus Robotica’s planetary teleportation array moves the whole world into Earth’s solar system — forcing Jonagold and Ambrosia to make the journey to Earth in person.</p>` },
      ],
    },
    {
      id: "wk-elites",
      slug: "the-elites",
      title: "The Elites",
      category: "character",
      summary:
        "Ambrosia’s four-member high guard — the last Pomeroys of the old faith, beautiful and abstract and utterly certain they are right. The dark mirror of the main five.",
      image: "",
      published: true,
      body: '',
      blocks: [
        { id: "b1", heading: "", image: '', caption: '',
          html: `<p>The <strong>Elites</strong> are Ambrosia’s innermost circle: four masked guardians who serve at her side, speak with her voice, and believe — truly believe — that what they do is right. “The kind of evil that doesn’t realize it’s evil, is the worst kind of evil there is” is their design creed. They interact with almost nobody below them; only a handful of captains — Jonagold, Red Delicious, and above all Arkan Black — ever hear from them.</p>` },
        { id: "b2", heading: "What they are", image: '', caption: '',
          html: `<p>Uniquely among modern Pomens, the Elites are <strong>Pomeroys</strong> — relics of the benevolent era when their species could still hold fruit power, kept and twisted in Ambrosia’s service. Their planned fruits form an opposite spectrum of virtues to the girls’ own: a team built, like the dark mirrors of older magical-girl stories, specifically to counter and kill them.</p>` },
        { id: "b3", heading: "Design", image: '', caption: '',
          html: `<p>Cybernetically altered toward something like warrior ants — extra limbs, and horns that are actually antennae through which Ambrosia asserts influence directly, a queen’s pheromones made mechanical. The imagery is deliberate: they are no longer apples, no longer really Pomens; they have become scavengers of their own species. Clown and classical-statue imagery is reserved for them alone, and their proposed emblem is the skull-variant of the Pomen military ensign.</p>` },
        { id: "b4", heading: "Deeds", image: '', caption: '',
          html: `<p>The Elites crushed the rebellion of Pome’s four greatest warriors — whose fused remains became Cosmic. An Elite kills Arkan Black for telling Ronnie the truth. In the finale the team fights them high in the Orchard’s rafters beside the green mind-tanks, while Ronnie falls toward the voice underneath everything.</p>` },
      ],
    },
    {
      id: "wk-wolfgang",
      slug: "wolfgang-manco",
      title: "Wolfgang Manco",
      category: "character",
      summary:
        "The Apricot Pomeroy — a duelist cowboy with two revolvers on one hip, whose power lets his opponent write the rules of the fight.",
      image: "",
      published: true,
      body: '',
      blocks: [
        { id: "b1", heading: "", image: '', caption: '',
          html: `<p><strong>Wolfgang Manco</strong> is a Pomeroy gunslinger in poncho and spurs, briefly employed as Sterling’s hired muscle — until Sterling broke their agreement and Wolfgang walked. His transformation barely changes him: a traditional cowboy becomes a rodeo-flair cowboy, and in place of a visor his power conjures a bandana over the lower half of his face. Because all Pomeroys can see through each other’s identity cloaks, he knows every one of the girls’ faces — and chooses not to tell anyone.</p>` },
        { id: "b2", heading: "Quick facts", image: '', caption: '',
          html: `<ul class="facts">
<li><strong>Power Fruit</strong> Apricot — Honor and Integrity</li>
<li><strong>Weapons</strong> Two revolvers carried on the same hip, like a duelist’s daishō</li>
<li><strong>Base ability</strong> Sprouting extra limbs from his own body — an ace he almost never needs</li>
</ul>` },
        { id: "b3", heading: "Vindicating Vigor", image: '', caption: '',
          html: `<p>His rule ability inverts every duel: the <strong>opponent</strong> sets a rule that Wolfgang must follow. If he breaks it, he loses his abilities. If the rule is unfair — or the opponent simply attacks instead of playing — he fights entirely unrestricted. Only his own heart judges what counts as fair, and the Apricot holds him to it: unjustly calling a fair rule unfair costs him his power for hours, and a habit of it would cost him the fruit itself. It never comes to that. He is exactly what the fruit thinks he is.</p>` },
      ],
    },
    {
      id: "wk-alphonso",
      slug: "alphonso",
      title: "Alphonso",
      category: "character",
      summary:
        "The Mango Pomeroy — a luchador in Equivalent-Mexico who wrestles to fund an orphanage, and fights by making his opponents stronger.",
      image: "",
      published: true,
      body: '',
      blocks: [
        { id: "b1", heading: "", image: '', caption: '',
          html: `<p><strong>Alphonso</strong> is the Mango Pomeroy — Generosity and Fervor, a fruit bursting with flavour and empty of subtlety. Born on the far side of the world, he stowed away on ships as an adventurous child, was shipwrecked on the shores of Equivalent-Mexico, and was raised there an orphan among people who taught him community above everything. He became a luchador to fund those in need, and by the time the story finds him he has already achieved his dream — his only remaining ache is wanting to see his birthplace once more without abandoning the family he chose.</p>` },
        { id: "b2", heading: "Powers", image: '', caption: '',
          html: `<p>His ability is generosity weaponised: he gives his opponent stat buffs, which in turn increase his own. His style is to feel an opponent out while taunting them like a bull, then gift them the buff they cannot handle — firepower to a ship that then loses its mobility and sinks, speed to a giant who loses all accuracy. A balanced jack-of-all-trades who masters one aspect at a time by buffing himself, he is countered only by fighters as balanced and unpredictable as he is. His luchador mask means he is the one Pomeroy who never has to protect his identity.</p>` },
      ],
    },
    {
      id: "wk-the-world",
      slug: "the-world-of-fruit-pop",
      title: "The World of Fruit Pop",
      category: "place",
      summary:
        "An alternate Earth flipped in half — carbon-powered cities, weather that closes the oceans, one-way migrations, and a climate that keeps every culture a world of its own.",
      image: "",
      published: true,
      body: '',
      blocks: [
        { id: "b1", heading: "", image: '', caption: '',
          html: `<p>Fruit Pop takes place on an <strong>alternate Earth</strong>: the continents split differently, the hemispheres effectively flipped, the oceans on what the creators call climate-change steroids. Civilization was nomadic until humans harnessed carbon as an energy source; now cities run on a mix of electricity and carbonation — vending machines sell pressurized cans that power tools and vehicles on a deposit system, trolleys carry rooftop tanks, and steam vents heat whole neighbourhoods.</p>` },
        { id: "b2", heading: "Why the world feels small and huge at once", image: '', caption: '',
          html: `<ul>
<li><strong>Localized internet.</strong> Constant extreme weather ruins satellites; every city runs its own contained network with its own culture. Libraries and newspapers thrive. So does local weirdness — see Poptown.</li>
<li><strong>Rail over road.</strong> No highways worth the name and no commercial airlines; rails resist the weather, so trains carry everything — five to eight hours between cities, tickets kept cheap the way gasoline is kept cheap.</li>
<li><strong>The weather phenomena.</strong> Between countries, ordinary travel is nearly impossible — except during rare stabilization events that pass over a region once every fifty to eighty years and last a couple of weeks. Whole migrations ride these windows: the O’Malleys came to Pittscoke in the last one, the Rangers two or three phenomena ago, and the international baking contest exists on their schedule. Once you move, there is no good way back — and wars between nations are logistically impossible during the events.</li>
<li><strong>Anachronism on purpose.</strong> Rotary phones, BlackBerries, CD players and smartphones coexist; the rule for what tech a character carries is simply what fits them.</li>
</ul>` },
        { id: "b3", heading: "The thematic loop", image: '', caption: '',
          html: `<p>The hostile climate isolates cultures — and the story’s heroes literally reconnect the world. Ronnie’s star flowers absorb carbon and stabilize the air wherever her dreams leak; as the girls travel, the world knits together behind them, which is the theme of the whole comic played out in weather.</p>` },
      ],
    },
    {
      id: "wk-pittscoke",
      slug: "pittscoke",
      title: "Pittscoke",
      category: "place",
      summary:
        "The fog-wrapped northern city where Fruit Pop takes place — steam vents, rail lines, two rivers, one legendary stadium, and a bottlecap shape when seen from above.",
      image: "",
      published: true,
      body: '',
      blocks: [
        { id: "b1", heading: "", image: '', caption: '',
          html: `<p><strong>Pittscoke</strong> is one of Repoplica’s younger cities, founded in the cold northeast where far-north chill collides with heat from the region’s steam vents — producing the thick permanent fog that is the city’s signature. Most buildings stop at two or three floors; any higher and the windows show nothing but grey. A day when the sun is visible through the fog counts as a scorcher. Seen from above, the city is shaped like a bottlecap.</p>` },
        { id: "b2", heading: "Quick facts", image: '', caption: '',
          html: `<ul class="facts">
<li><strong>Nation</strong> Repoplica — northeast corner</li>
<li><strong>Named for</strong> A blend of Pittston and Nanticoke; culturally a Pittsburgh–Philadelphia hybrid</li>
<li><strong>Baseball</strong> The Pittscoke Panthers, purple and yellow; arch-rivals of the Poptown Pagliaccis</li>
<li><strong>Radio</strong> 83.5 Pittscoke City Radio — “We play whatever we want”</li>
<li><strong>Mayor</strong> Alessia DeLuca</li>
</ul>` },
        { id: "b3", heading: "Landmarks", image: '', caption: '',
          html: `<ul>
<li><strong>Ranger Stadium</strong> — named for Rodney Ranger; ringed by stalls and hole-in-the-wall restaurants; site of the Juicejaw attack and, much later, the final battle.</li>
<li><strong>The O’Malley café</strong> on Kurvitz Pike — see its own entry.</li>
<li><strong>Pittscoke Community College</strong> — yellow and purple; Ronnie’s school, and home of the library where she volunteers.</li>
<li><strong>Rutherford’s farm and greenhouse</strong> — the fruit supplier outside town, and the Pomen science team’s hideout.</li>
<li><strong>The Warehouse District</strong> — Pomen staging ground, High Impact territory, and the site of Baby’s fateful soda theft.</li>
<li><strong>The gated community</strong> — old money behind walls, including Mary Shelly Lane, the Prescott address.</li>
<li><strong>Knife-In-Your-Gut Snacks and Sodas</strong> — the corner store. It’s a family name.</li>
</ul>` },
        { id: "b4", heading: "Character", image: '', caption: '',
          html: `<p>Streets are named for writers, and steam vents provide public heating. Rail is everything: the gangs run on it, the newspapers travel by it, and the city’s culture grew localised and distinct because, in this world, every city’s culture does. Its defenders eventually include not just the Fruit Poppers but a formal Pittscoke Defense Squad — and, on the outskirts, a horde of sentient palm trees called the Cocobusters, best known for dunking on an invading Pomen captain before the authorities even arrived.</p>` },
      ],
    },
    {
      id: "wk-repoplica",
      slug: "repoplica",
      title: "Repoplica",
      category: "place",
      summary:
        "The soda-pop republic — Fruit Pop’s America-equivalent, a loose federation of drink-named cities on an alternate Earth of hostile oceans and localized cultures.",
      image: "",
      published: true,
      body: '',
      blocks: [
        { id: "b1", heading: "", image: '', caption: '',
          html: `<p><strong>Repoplica</strong> is the story’s home nation: an America-equivalent republic whose cities are named after drinks — Cola Vista, Spritzburg, Fizzington Falls, Bubbledale, Seltzerdale, Ginger Gulch, Rootbrook, the Gintonic Kingdom, Poptown. Its people are Repoplicans; its currency is Caps.</p>` },
        { id: "b2", heading: "Geography and government", image: '', caption: '',
          html: `<p>The capital, <strong>Cola Vista</strong>, sits on the west coast — this alternate Earth split differently, and settlers landed west first, the harsher climate slowing the push east. The national government is loosely federated by necessity: constant extreme weather interferes with satellites, so the internet is localized city by city, commercial airlines don’t exist, and word travels by train and newspaper. The real military strength concentrates around the capital; the east coast relies on the fact that the planet’s super-charged oceans make naval invasion a death sentence. This is also, canonically, why nobody in the government notices magical girls for quite a while.</p>` },
        { id: "b3", heading: "Notable regions", image: '', caption: '',
          html: `<ul>
<li><strong>Pittscoke</strong> — northeast; see its own entry.</li>
<li><strong>Poptown</strong> — see its own entry.</li>
<li><strong>Rootstock</strong> — a tiny wooded Appalachian-flavoured region well south of Pittscoke; the site of Envy’s first, quiet arrival on Earth.</li>
<li><strong>The Gintonic Kingdom</strong> — Baby’s home city.</li>
</ul>` },
        { id: "b4", heading: "The wider world", image: '', caption: '',
          html: `<p>Other nations follow their own food themes — the Slavic-coded <strong>Szarlotka</strong> with its capital Cosmopolita, volcanic and snowbound at once; <strong>Equivalent-Mexico</strong>, home of Alphonso; the baking dynasties of the Asian nations that produce Rin-Rin. Travel between countries is only practical during the rare weather phenomena — see the World entry under Lore.</p>` },
      ],
    },
    {
      id: "wk-poptown",
      slug: "poptown",
      title: "Poptown",
      category: "place",
      summary:
        "Pittscoke’s rival city, where everyone dresses like a clown and it is considered rude to ask about it.",
      image: "",
      published: true,
      body: '',
      blocks: [
        { id: "b1", heading: "", image: '', caption: '',
          html: `<p><strong>Poptown</strong> is the city west of Pittscoke — the setting’s Chicago — and home of the <strong>Poptown Pagliaccis</strong>, the baseball team every Panthers fan loves to hate (“there’s nothing a Panther loves more than a nice hot clown dinner”). Its citizens dress in whimsical elements: face paint, Mardi Gras masks, wacky patterns. This will not be explained, and it is considered rude to ask. The lore justification is real, though — in a world where travel between cities is rare, local cultures homogenize into genuinely distinct identities, and Poptown’s identity is <em>clown</em>.</p>
<p>Rubber noses, notably, are worn by no one — with a single exception citywide and worldwide: Poptown’s most famous daughter, Mayor Alessia DeLuca of Pittscoke, the only Pagliacci fan in enemy territory.</p>` },
      ],
    },
    {
      id: "wk-omalley-cafe",
      slug: "the-omalley-cafe",
      title: "The O’Malley Café",
      category: "place",
      summary:
        "The family café-bakery on Kurvitz Pike — Ronnie’s home, Lulu’s smoothie stop, and the accidental birthplace of a magical girl.",
      image: "",
      published: true,
      body: '',
      blocks: [
        { id: "b1", heading: "", image: '', caption: '',
          html: `<p>The <strong>O’Malley café</strong> sits on Kurvitz Pike, one of Pittscoke’s main roads but near the edge of town, where the streetlights are slightly outdated and the pipes are more functional than polished. The family lives upstairs — three bedrooms, one bath — and cooks family meals in the café kitchen below. Warm orange with green accents; the smell of Moira’s baking does the rest.</p>` },
        { id: "b2", heading: "History and fate", image: '', caption: '',
          html: `<p>It begins the story as a mid-block storefront beside a long-vacant corner lot that taunts Desmond daily. As Ronnie’s exploits quietly bloom the neighbourhood — star flowers, foot traffic, fortune — business grows until the family finally buys the corner, tears down the walls, and expands. The family also runs <strong>Little O’Malley’s</strong>, the stand at Ranger Stadium that Desmond won from Tony Marazzo in a game of Texas hold ’em, where they work games in green and yellow under Moira’s defiantly clashing purple-trimmed aprons.</p>` },
        { id: "b3", heading: "Claim to fame", image: '', caption: '',
          html: `<p>Lulu Ranger has been a regular since childhood — the Blueberry Smoothie Girl, taking her post-game recovery shake at the bar. One morning, thanks to a scrambled farm inventory and Desmond’s blender, that shake contained something extra. Carelessness, not fate: the café is where the second magical girl was made, and nobody in the building noticed.</p>` },
      ],
    },
    {
      id: "wk-pome",
      slug: "pome",
      title: "Pome",
      category: "place",
      summary:
        "The Pomen homeworld — once a pastel paradise of multicolored grass under a blue dwarf sun, now a dead planet orbited forever by the machine built to protect it.",
      image: "",
      published: true,
      body: '',
      blocks: [
        { id: "b1", heading: "", image: '', caption: '',
          html: `<p><strong>Pome</strong> was the Pomen homeworld: multicolored grass, a pastel-yellow sky with grey clouds, and a blue dwarf sun that set in greens. It is dead now — ecosystem and biosphere gone, no weather, a degraded atmosphere over an abandoned surface.</p>
<p>Its fall is the Empire’s original wound. In Mother’s era the Kiwi’s prophecy warned of famine and nobody took it seriously; the famine came generations late and killed some ninety-five percent of the population. The survivors became the resource-starved war machine the galaxy knows. The Orchard still maintains its orbit around the corpse of the planet — a remnant of Ambrosia’s original primary objective, to keep Pome thriving — which is precisely the objective whose failure made War her purpose instead.</p>
<p>Deep inside the Orchard, Ambrosia keeps a painted garden that imitates Pome’s colors: grass in greens and yellows and blues, a blue sun on a canary wall. It is lifeless despite all the growth, and she seems to exist on a separate layer from it, unable to touch the thing she preserved.</p>` },
      ],
    },
    {
      id: "wk-pomens",
      slug: "pomens",
      title: "The Pomens",
      category: "place",
      summary:
        "The apple-motif alien empire: cool-skinned, stem-haired, sprouted from seeds in military batches, and bound to a machine god they are too afraid to unplug.",
      image: "",
      published: true,
      body: '',
      blocks: [
        { id: "b1", heading: "", image: '', caption: '',
          html: `<p>The <strong>Pomens</strong> are a plant-based alien species — cool-colored skin in blues, greens, and purples, never warm; a little tuft of hair that sticks up like an apple stem; a sensitivity to cold; and a civilization that has been at war so long it has forgotten why. Their name descends from the old botanical word for an apple orchard, and everything about their Empire keeps the theme: captains named for apple cultivars, ships bearing the regal apple names no person is permitted to carry, and a four-pointed star for an ensign — an apple in silhouette whose negative space hides the star of Ambrosia, and which becomes a skull with three more lines.</p>` },
        { id: "b2", heading: "Life cycle and society", image: '', caption: '',
          html: `<p>Pomens are conceived as seeds, surrendered to the Empire, and planted in batches — up to twenty seeds to a unit, raised together by an assigned sergeant, regarding each other as siblings. Most never know their biological parents; a structured family is a status symbol reserved for the decorated few (the Smith line; Champlain’s house). A Pomen year runs three times faster than Earth’s: maturity at eighteen equivalent, death before a hundred. In a culture where life is short and expendable, the young look down on the old, propaganda urges everyone to breed for the war machine, and — as the creators put it — everything is about power, including that.</p>` },
        { id: "b3", heading: "Culture", image: '', caption: '',
          html: `<p>No swearing; fruit idioms instead — “Dear Mother”, “Fruit bears many seeds.” A propaganda comic, the Red Comet, that will eventually name a real hero. Technology in full cassette futurism: chunky terminals, tape spools, inaccurate faster-than-light travel that scatters fleets across solar systems, and long-range calls that must relay through the ICA at the center of the galaxy. They cannot rebuild their own best machines — the think tank that built Ambrosia left no blueprints, and only two positronic brains remain in the cosmos.</p>` },
        { id: "b4", heading: "The tragedy", image: '', caption: '',
          html: `<p>Modern Pomens believe their species was always a cruel conqueror; almost no history of Mother’s peaceful era survives. They cannot hold fruit power — the fruits reject a culture that only takes — and they worship, fear, and pray <em>away</em> the attention of the machine that rules them. Many defect the moment it feels survivable; Pomen refugees on Earth become one of the story’s late arcs, with Qwiwi as their ambassador. A hidden tribe of spiritually intact Pomens, descended from those who fled Mother’s fall, is planned to enter the story from the margins.</p>` },
      ],
    },
    {
      id: "wk-the-orchard",
      slug: "the-orchard",
      title: "The Orchard",
      category: "place",
      summary:
        "Ambrosia’s colossal tree-shaped station — communications hub turned ghost ship turned throne — destined to fall out of the sky onto Pittscoke.",
      image: "",
      published: true,
      body: '',
      blocks: [
        { id: "b1", heading: "", image: '', caption: '',
          html: `<p>The <strong>Orchard</strong> is the Pomen Empire’s heart: a station in the shape of a vast mechanical tree, thousands of years old, holding orbit over dead Pome. It was once a bustling intergalactic communications hub staffed by thousands; you need a lot of people to build something like Ambrosia, and once it was built, you didn’t need them anymore. Its interior is now dead space — cleared terminals, emptied lockers, old schedules still on the walls, signage in an old language almost no living Pomen can read.</p>` },
        { id: "b2", heading: "Anatomy", image: '', caption: '',
          html: `<ul>
<li><strong>The Exterior</strong> — the tree itself, “truly a work of art, a feat of engineering unique in both its majesty and purpose.”</li>
<li><strong>The Interior</strong> — the abandoned hub, centuries unstaffed and fully autonomous.</li>
<li><strong>The Core</strong> — Ambrosia’s chamber at the very center: a giant metal sphere containing her painted imitation of Pome, with cables running from her head up to the green vats — the mind cores — where the collective’s countless minds are kept.</li>
</ul>` },
        { id: "b3", heading: "Fate", image: '', caption: '',
          html: `<p>Art direction renders the Orchard in near-grayscale, sapping the color from anyone vivid enough to walk its halls. Qwiwi is one of the very few ever to escape it. In the finale it collapses out of the sky onto Pittscoke, cracking open with Ambrosia at the center — and the last battle of the series is fought in and above the ruins of Ranger Stadium against what crawls out.</p>` },
      ],
    },
    {
      id: "wk-malus-robotica",
      slug: "malus-robotica",
      title: "Malus Robotica",
      category: "place",
      summary:
        "“Robotic Apple” — the frozen laboratory planet where the Empire builds its weapons, run by Captain Cameo, and destined to teleport into Earth’s solar system.",
      image: "",
      published: true,
      body: '',
      blocks: [
        { id: "b1", heading: "", image: '', caption: '',
          html: `<p><strong>Malus Robotica</strong> — Latin for “robotic apple” — is the Pluto of its system: small, farthest from its sun, nearly frozen. The Empire’s weapons research lives here under Captain Cameo, in labs built almost entirely underground; frozen surface air is piped down to cool the server halls, and the hot exhaust is piped back up. This is where Cosmic goes for repairs, and where the Empire’s remaining engineering talent is effectively imprisoned by its own usefulness.</p>
<p>In the endgame, its role inverts: after Cosmic falls, Cameo trades the Empire’s entire weapons program for asylum, and the planet’s massive teleportation array moves <strong>the whole world</strong> into Earth’s solar system — the largest defection in the war, and the reason Jonagold and Ambrosia must finally come to Earth in person.</p>` },
      ],
    },
    {
      id: "wk-power-fruits",
      slug: "power-fruits",
      title: "Power Fruits",
      category: "term",
      summary:
        "Indestructible, virtue-bound fruit that chooses its bearers — the entire magic system of Fruit Pop, and the treasure the Pomen Empire crossed a galaxy to harvest.",
      image: "",
      published: true,
      body: '',
      blocks: [
        { id: "b1", heading: "", image: '', caption: '',
          html: `<p><strong>Power Fruits</strong> are the only magic in the story — and even they run on a single principle: <em>giving and taking</em>. The Pomens created fruit and seeded it across the galaxy as fuel for their war machine; on Earth, human selective breeding and genetic engineering made the fruit too powerful — perfect for humans, overload for Pomen machinery. That accident is why Earth matters, and why the science division came to study it.</p>` },
        { id: "b2", heading: "Mechanics", image: '', caption: '',
          html: `<ul>
<li><strong>Indestructible.</strong> Mash, slice, or blend a Power Fruit and it eventually reforms. The only way to destroy one is to eat and absorb it — and only a compatible host can. To the reader they visibly glow; in-world they merely gleam.</li>
<li><strong>The beacon.</strong> To almost everyone a Power Fruit looks ordinary. To someone whose heart strongly matches its virtue, it glows and entices.</li>
<li><strong>Worthiness.</strong> The fruits monitor their bearers’ hearts for the virtues they represent. The High Impact gang learns this the hard way: smuggled fruit, forced Pomeroys, total rejection.</li>
<li><strong>The rewrite.</strong> Transformation is a brutal genetic rewrite. Ronnie was unconscious for hours; Lulu, already at her athletic peak, barely noticed — the fruit testing whether she deserved it.</li>
<li><strong>Virtue overdose.</strong> Every virtue leans into a vice — too much Aspiration becomes restless greed; too much Contentment becomes stagnation.</li>
<li><strong>Who qualifies.</strong> Fruits accept only those from communities that give more than they take. What makes a fruit a fruit is that it carries seeds — it gives more of itself. The conquest-built Pomens only take, which is why no modern Pomen can be a Pomeroy — and why the day Qwiwi or a reformed McIntosh truly calls Earth home, that rule is due to bend.</li>
</ul>` },
        { id: "b3", heading: "The fruit-virtue ledger", image: '', caption: '',
          html: `<ul class="facts">
<li><strong>Starfruit</strong> Dreams / Aspirations — Ronnie</li>
<li><strong>Blueberry</strong> Resilience / Perseverance — Lulu</li>
<li><strong>Orange</strong> Courage / Determination — Baby</li>
<li><strong>Kiwi</strong> Hopefulness / Optimism — held in trust by Qwiwi; grants Foresight, seeing only as far as it has not yet been used</li>
<li><strong>Strawberry</strong> Persistence / Ambition — Liz</li>
<li><strong>Lime</strong> Certainty / Conviction — Rin-Rin</li>
<li><strong>Apple</strong> Contentment / Prudence — Mother</li>
<li><strong>Pomegranate</strong> Ambrosia — every seed a mind; mass empowerment, and part of how the Orchard falls</li>
<li><strong>Cherry</strong> A unique two-user fruit — a primary bearer powerless without a willing partner in range; shared by Red Delicious and Sterling</li>
<li><strong>Apricot</strong> Honor / Integrity — Wolfgang Manco</li>
<li><strong>Mango</strong> Generosity / Fervor — Alphonso</li>
<li><strong>Banana</strong> Teamwork / Unity — an early multi-anchor experiment</li>
</ul>` },
        { id: "b4", heading: "Vegetables", image: '', caption: '',
          html: `<p>Vegetables are the system’s deliberate mystery: they do nothing for humans and grant Pomens temporary, random mutations. Nobody explains this. Lingon has looked into it and reports, contentedly, that it makes no sense.</p>` },
      ],
    },
    {
      id: "wk-pomeroys",
      slug: "pomeroys",
      title: "Pomeroys",
      category: "term",
      summary:
        "The fruit-empowered — Earth’s magical girls and everyone like them. Visors, identity cloaks, accelerated healing, and one dog.",
      image: "",
      published: true,
      body: '',
      blocks: [
        { id: "b1", heading: "", image: '', caption: '',
          html: `<p><strong>Pomeroy</strong> is the setting’s word for a person empowered by a Power Fruit — the name itself tying their origin back to the Pomens. The main five brand themselves with the “Lady” prefix — Lady Starburst and company — while the world’s other Pomeroys pointedly do not follow the scheme, which is exactly what makes the five read as a proper team. Technically, the first Pomeroy in the story is a dog.</p>` },
        { id: "b2", heading: "Shared rules", image: '', caption: '',
          html: `<ul>
<li><strong>The face covering.</strong> Every Pomeroy’s transformation includes something over part of the face — a visor, Liz’s bow, Wolfgang’s bandana, Alphonso’s ready-made mask.</li>
<li><strong>The identity cloak.</strong> A mental barrier hides a Pomeroy’s identity from all non-Pomeroys, no matter how obvious it should be — a layer of sparkles subtly bending light. Between Pomeroys it does nothing, which is why the polite ones simply keep each other’s secrets.</li>
<li><strong>Durability.</strong> Baseline enhanced strength, speed, and toughness — bulletproof, though sustained fire still imparts force. Healing is accelerated (a four-month injury in four weeks) but never instant, and the toughness vanishes on power-down.</li>
<li><strong>Team looks.</strong> On transforming, the five get matching flair — dresses for some, suits for others — and pushing to full power layers armor over it. Qwiwi, mutating her way through a handbag of vegetables, is the exception to everything.</li>
</ul>` },
        { id: "b3", heading: "Power Blends", image: '', caption: '',
          html: `<p>Team-up attacks that combine two bearers’ powers into something neither owns alone — rare, spectacular, and saved for the moments that earn them.</p>` },
      ],
    },
    {
      id: "wk-fruit-poppers",
      slug: "the-fruit-poppers",
      title: "The Fruit Poppers",
      category: "term",
      summary:
        "The team. Five (eventually six) fruit-powered defenders of Pittscoke, named by the public after the smoothie shop where they were first seen together.",
      image: "",
      published: true,
      body: '',
      blocks: [
        { id: "b1", heading: "", image: '', caption: '',
          html: `<p>The <strong>Fruit Poppers</strong> — the title’s “Fruit ♥ Pop” — are the story’s magical-girl team. The name is the public’s fault: the first time all five were seen fighting together, defending the O’Malleys’ shop, somebody asked what they even were — “some kind of Fruit Pop?” — and it stuck.</p>` },
        { id: "b2", heading: "The roster", image: '', caption: '',
          html: `<ul class="facts">
<li><strong>Ronnie O’Malley</strong> — Lady Starburst (starfruit) — powerhouse and reluctant leader</li>
<li><strong>Lulu Ranger</strong> — Berrypunch (blueberry) — bruiser and second wing</li>
<li><strong>Baby</strong> — alias unsettled; Citraburst is the favourite (orange) — lancer</li>
<li><strong>Liz Prescott</strong> — Strawheart (strawberry) — tank and self-appointed order</li>
<li><strong>Qwiwi</strong> — alias pending (the Kiwi’s keeper) — healer and heart</li>
<li><strong>Rin-Rin</strong> — (lime) — the sixth, late-arriving blade</li>
</ul>` },
        { id: "b3", heading: "How they assembled", image: '', caption: '',
          html: `<p>Not by destiny — the creators are adamant — but by a chain of accidents and choices: Ronnie eats a stolen starfruit out of spite and exhaustion; Lulu drinks the wrong smoothie; Baby steals the wrong soda; Qwiwi hangs around to see if Ronnie will explode; Liz shows up wanting the fight nobody will give her, and stays because they finally stop telling her to leave. The group dynamic in one line of dev-notes: Ronnie centers everyone, Qwiwi goes with the flow, Lulu stokes the competition, Liz annoys everyone, and Baby pours gasoline on the whole thing.</p>
<p>They are, for all their mess, unequivocally the good guys — morally dubious weirdos and absolutely good people.</p>` },
      ],
    },
    {
      id: "wk-fruit-monsters",
      slug: "fruit-monsters",
      title: "Fruit Monsters",
      category: "term",
      summary:
        "The creatures of the week — over-juiced experiments and weaponized produce, from the Pumpkin that started everything to Juicejaw and the talkative Fermenticore.",
      image: "",
      published: true,
      body: '',
      blocks: [
        { id: "b1", heading: "", image: '', caption: '',
          html: `<p>The story’s monsters are mostly the science division’s accidents, and later Gala and Smith’s weapons program. The recipe was discovered by mistake — over-aggressive formulas plus tampered data — and refined into a production line under Red Delicious.</p>` },
        { id: "b2", heading: "The named ones", image: '', caption: '',
          html: `<ul>
<li><strong>The Pumpkin</strong> — Boyse’s Chapter 1 accident; the first monster, and Ronnie’s white whale. Driven off but never finished, its rotting husk is salvaged by Gala and Smith, injected with an experimental serum, and abandoned as a failure — until it burrows into the countryside, hypnotises half the town into a spellbound festival at Rutherford’s farm, and forces Ronnie to end her first monster with mercy rather than anger.</li>
<li><strong>Juicejaw</strong> — the grape monster of the Chapter 2 stadium attack, sized like a big rig standing on end: green with purple accents, thick vines over a raisin-like core, firing salvos of exploding grapes. Named — like most monsters — by Ronnie, after the swamp cryptid in one of her pulp dreams; nobody ever gets her references.</li>
<li><strong>Fermenticore</strong> — a cider-barrel monster with hops sprouting from his head, spraying high-pressure hard cider, and the only monster who can talk — one of the reasons he was considered defective. A halfway step toward Red’s mind-control masterpiece; dumped as a loser.</li>
<li><strong>The Cocobusters</strong> — technically on Earth’s side: the sentient palm-tree horde defending Pittscoke’s outskirts, famous for ruining Captain Envy’s dramatic entrance.</li>
</ul>` },
        { id: "b3", heading: "Naming note", image: '', caption: '',
          html: `<p>Ronnie names the monsters after old comics and movies she’s seen, and thinks she is being clever. No one ever gets the reference.</p>` },
      ],
    },
    {
      id: "wk-themes",
      slug: "themes-of-fruit-pop",
      title: "Themes of Fruit Pop",
      category: "lore",
      summary:
        "Everlasting love, the refusal of fate, transformation as a high, and camp as honesty — the ideas under the fruit.",
      image: "",
      published: true,
      body: '',
      blocks: [
        { id: "b1", heading: "", image: '', caption: '',
          html: `<p><strong>Everlasting Love</strong> is the core. The Pomens are thieves of it — a race that gifts life to planets and forcibly takes it back, a metaphor for connection hoarded rather than given. The Ambrosia collective is love corrupted into refusal to let go; Sterling manipulates love as leverage; and against both, the story sets the unglamorous work of real connection: family by blood and by choice, friendship, community, and a couple who were simply together from the start, no will-they-won’t-they about it.</p>` },
        { id: "b2", heading: "Individualism and love together", image: '', caption: '',
          html: `<p>The fruits themselves enforce the thesis: to love others you must first love yourself, and to hold power you must come from giving. Each girl’s dilemma stress-tests it — Ronnie indulging the power and risking her support system, Baby feeling unworthy of a better life, Lulu unable to stop competing, Liz learning to support anyone at all, Qwiwi unlearning a collective that never asked what she believed.</p>` },
        { id: "b3", heading: "Against fate", image: '', caption: '',
          html: `<p>Nothing in Fruit Pop is destined — the creators are explicit. Every empowerment is a chain of carelessness and choice: an inventory error, a wrong smoothie, a stolen soda. Fate is a belief the <em>Pomens</em> hold, and the story frames it as their mistake; readers are welcome to wonder, and the text will never confirm. You can overcome any expectation society has set for you — that is the point.</p>` },
        { id: "b4", heading: "The transformation as a high", image: '', caption: '',
          html: `<p>Ronnie’s magical-girl form is a rush — the stress vanishes while it lasts and crashes back after, doubling as a taste of a fully realised transition and as a deliberate drug-abuse allegory. The power fantasy is real, and it is not a cure; the story is about what grows in the gap between the two.</p>` },
        { id: "b5", heading: "Camp as honesty", image: '', caption: '',
          html: `<p>Ronnie’s thesis — why people love sincere work even when it is “bad” — is the comic talking about itself. Fruit Pop wears its pulp openly: chapter-opening dream sequences in vintage halftone, monsters named after old comics, a hero who shouts “Starburst Finger” and regrets it forever. Sincerity is the armor; the story is exactly what it says it is.</p>` },
      ],
    },
    {
      id: "wk-story-structure",
      slug: "the-shape-of-the-story",
      title: "The Shape of the Story",
      category: "lore",
      summary:
        "Three to four in-universe years, three seasons, one falling sky: the planned arc of Fruit Pop from a stolen starfruit to the Orchard’s fall. Spoilers, obviously.",
      image: "",
      published: true,
      body: '',
      blocks: [
        { id: "b1", heading: "", image: '', caption: '',
          html: `<p><em>This entry summarises the creators’ working plan for the full story. It is all spoilers, and all subject to change.</em></p>` },
        { id: "b2", heading: "Season One — Pittscoke", image: '', caption: '',
          html: `<p>Roughly one in-universe year. Ronnie eats the starfruit and fights the Pumpkin (Ch. 1); refuses the call through daily life until Juicejaw attacks the stadium and she saves Lulu (Ch. 2); Lulu’s side of the same days (Ch. 3); Baby, Taffy, and the High Impact world enter (Ch. 4); Qwiwi unmasks; the looming McIntosh finally lands around Chapter 6. The villains of the season are McIntosh and, behind everything, Red Delicious — with Gala and Smith building monsters and the mind-control soda plot rising through Sterling Industries. It ends in one collapse: Lulu beats McIntosh, Jackie flips Gala and Smith, the broadcast dies, Red loses her mind — literally — and Sterling flees into exile. The season closes on the pumpkin’s pitiful last stand and Ronnie’s mercy.</p>` },
        { id: "b3", heading: "Season Two — the world opens", image: '', caption: '',
          html: `<p>After a timeskip: the remaining captains arrive. Jazz and Champlain darken the story — and their deaths, however they land, are the war’s first deliberate kills. Envy comes hunting her stolen equal. Liz leaves on the journey everyone misreads; Rin-Rin debuts at the Quarter Quell World Baking Contest; the team splinters and is pulled back together. Arkan Black begins whispering to Ronnie. Somewhere in here: a captured Qwiwi sees the Orchard again, and the reader sees it with her.</p>` },
        { id: "b4", heading: "Season Three — the cosmic season", image: '', caption: '',
          html: `<p>Envy’s last stand. Cosmic arrives — the walking apocalypse — and Pittscoke pays the price the story has been deferring; the world’s Pomeroys, the government, allied Pomens, and one last monster from Gala and Smith tear the machine apart together. Cameo defects and teleports Malus Robotica into Earth’s solar system; Jonagold and Ambrosia must finally travel in person. Arkan Black tells Ronnie the truth of Mother, and dies for it. The finale runs in two movements: the girls against the Elites in the Orchard’s rafters while Ronnie falls into the green tanks and puts Mother to rest — then the Orchard falls on Pittscoke, and the last fight against Ambrosia’s screaming mechanical remnant ends in the ruins of Ranger Stadium, the whole team bracing Ronnie through one final, endless beam.</p>` },
        { id: "b5", heading: "After", image: '', caption: '',
          html: `<p>The last scene is a fake-out: Ronnie wakes in the café, the girls lounging around, Qwiwi painted human, everyone gaslighting her that nothing ever happened — held exactly long enough to hurt before they crack up laughing. The dreamer’s story was real. A ten-year epilogue is on the table: an expanded café, a fashion label, an eyepatch, a child named by two people who love each other, and a world with new islands in it.</p>` },
      ],
    },
    {
      id: "wk-development",
      slug: "behind-the-scenes",
      title: "Behind the Scenes",
      category: "lore",
      summary:
        "MerryBox Studio: one writer, one artist, and a comic invented on the spot out of panic — the development story of Fruit Pop, April 2025 to now.",
      image: "",
      published: true,
      body: '',
      blocks: [
        { id: "b1", heading: "", image: '', caption: '',
          html: `<p><em>Fruit Pop</em> is made by <strong>MerryBox Studio</strong> — two people. <strong>Dio Dollface</strong> writes: prose chapters first, adapted afterward into comic script. <strong>RoyalSlush</strong> draws: character design, worldbuilding art, and every page. The division of labor was set early and held — the writer flags what matters in a scene, and the artist decides how much weight to draw it with.</p>` },
        { id: "b2", heading: "Origin story", image: '', caption: '',
          html: `<p>By the creator’s own admission, Fruit Pop was invented on the spot, out of panic — she had mentioned dreaming of making a magical-girl story, got asked for details she didn’t have, and improvised the fruit theming to sound further along than she was. The first recorded design decision followed within a day: a starfruit heroine, sweet and sour at once. The main five were locked within a week — starfruit, orange, blueberry, strawberry, kiwi — with banana cut from the roster and quietly recycled into villain lore.</p>` },
        { id: "b3", heading: "Method", image: '', caption: '',
          html: `<p>Chapters are written long (Chapter 1 ran about fourteen thousand words), adapted to a target of roughly forty pages, and opened — every one — with a different pulp-comic dream sequence that doubles as foreshadowing. Rules the creators hold themselves to: lore reaches the reader only through characters’ own accounts, never an omniscient dump; the mystery box stays shut; no fate, no ass-pulls, and any miracle must be paid for. The censored-swear budget is three per chapter, and Baby spends most of it.</p>` },
        { id: "b4", heading: "House flavor", image: '', caption: '',
          html: `<p>Streets in Pittscoke are named for writers the author loves; professors are named for game-industry writers; captains are named for apple cultivars (over seven thousand were consulted; the most baffling real cultivar found was “Beefsteak”). The Mayor of Pittscoke is one creator’s canonized self-insert, and Taffy is the other’s. The site you are reading lives in Ronnie’s colors.</p>` },
      ],
    },
  ],
};
