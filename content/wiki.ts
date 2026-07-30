/* The wiki. It ships empty on purpose.

   An empty shelf is honest; an invented one is not. The empty state below is
   shown only while `entries` is genuinely empty — add entries through the CMS
   and the index replaces it. */

export type WikiCategory = 'character' | 'place' | 'term' | 'lore';

export type WikiEntry = {
  id: string;
  slug: string;
  title: string;
  category: WikiCategory;
  summary: string;
  /** Plain text is auto-paragraphed; HTML is passed through if you write it. */
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
  categories: [
    { id: 'character', label: 'Characters' },
    { id: 'place',     label: 'Places' },
    { id: 'term',      label: 'Terms' },
    { id: 'lore',      label: 'Lore' },
  ],
  empty: {
    title: 'Nothing written yet',
    body: 'The wiki is real and it is empty. Characters, places, and lore go here once the creator writes them — an empty shelf is honest, an invented one isn’t.',
    cta: 'See the cast instead',
    ctaHref: '/cast',
  },
  entries: [
    {
      id: 'wk-ronnie',
      slug: 'ronnie-omalley',
      title: 'Ronnie O’Malley',
      category: 'character',
      summary:
        'The protagonist of Fruit Pop. An overworked college student who sells smoothies at her family’s stand — and who becomes the magical girl Lady Starburst after eating a magical starfruit.',
      image: '',
      published: true,
      body: `<blockquote><p>“I’ll do my best, because that’s all I got!” — the line, from Rodney Ranger’s burning banner, that breaks her refusal of the call.</p></blockquote>

<p><strong>Ronnie O’Malley</strong> is the protagonist of <em>Fruit Pop</em>. A stressed, overworked college student who sells smoothies at her family’s stand, she becomes the magical girl <strong>Lady Starburst</strong> after eating a magical starfruit. Her story fuses a classic magical-girl power fantasy with a grounded arc about transition, self-acceptance, and learning to direct the raw energy — literal and emotional — she has spent years bottling up.</p>

<h3>Quick facts</h3>
<ul class="facts">
<li><strong>Magical alias</strong> Lady Starburst</li>
<li><strong>Pre-transition name</strong> Roger (male form)</li>
<li><strong>Age</strong> 23</li>
<li><strong>Hair / eyes</strong> Ginger / green</li>
<li><strong>Build</strong> Slim — takes after her father</li>
<li><strong>Hometown</strong> Pittscoke</li>
<li><strong>Occupation</strong> College student; works the family smoothie stand</li>
<li><strong>Identity</strong> Trans woman, mid-transition</li>
<li><strong>Power source</strong> Magical starfruit (a “Power Fruit”)</li>
<li><strong>Combat role</strong> Ranged blaster with limited flight</li>
<li><strong>Love interest</strong> Baby</li>
</ul>

<h3>Appearance</h3>
<p>Ronnie is slim and ginger-haired with green eyes, resembling her haggard father far more than her warm, heavier-set mother. Her civilian look leans casual — sweatshirt, work apron, a bandana tied tight over her hair for shifts at the stand.</p>
<p>A <strong>star motif</strong> runs through her design as a visual signature: star-shaped earrings in her female form, a star cut into the neckline, and a star worked into the hood outline of her male form, Roger. The design is deliberately built so both forms share <strong>the same face</strong> yet read as two distinct presentations of one person.</p>
<p>In abstract or high-stress sequences the art style shifts from grounded realism into something more surreal, especially when her powers act up and seem to operate separately from her.</p>

<h3>Lady Starburst</h3>
<p>When Ronnie transforms, yellow smoke pours off her and a flash leaves her in a <strong>black-and-yellow dress, a pointed yellow visor, and a hat</strong>. The flashy transformation sequence is reserved as her signature high — the euphoric jolt that the rest of her arc complicates.</p>

<h3>Personality</h3>
<p>On the surface Ronnie is polite to a fault, a reflex drilled in by a lifetime of customer-service hell at the family stand. Underneath, she is stretched dangerously thin: a full-time job, volunteer work, and a heavy school load have left her short on sleep, irritable, and prone to a dry, sarcastic edge whenever she can afford to let it slip. She smoked as a teenager to take the edge off. She reads comics voraciously and has plenty of opinions about them, but talks them over to no one.</p>
<p>Her defining trait is <strong>repression</strong>. Raised to be polite and self-sufficient, she has become expert at bottling everything — frustration, dysphoria, resentment toward her father — which leaves quiet cracks in the foundation. This is the engine of her whole design.</p>

<h3>Powers and abilities</h3>
<p>Ronnie’s powers come from eating a magical starfruit, one of the indestructible <strong>Power Fruits</strong>. The energy manifests as a yellow plasma — in her own words, <em>“a miasma of plasma”</em> — that drips from her palms when her emotions spike and bursts out as light-based attacks.</p>
<ul>
<li><strong>Ranged blaster.</strong> Powerful output, low precision.</li>
<li><strong>Limited flight.</strong> She floats and drifts rather than truly flies.</li>
<li><strong>Weak at close quarters.</strong> Vulnerable point-blank — though an enemy who closes in risks being caught in a blast.</li>
<li><strong>Growth arc.</strong> She gradually learns close-combat technique, a skill curve that runs parallel to her learning to be more intimate with others.</li>
</ul>
<p>Named techniques: <strong>Starburst Finger</strong>, her standard blast, whose name she regrets the instant she shouts it mid-fight and then keeps; and <strong>Starburst Cascade / Crescendo</strong>, a larger and heavier blast. “Starburst” serves as the prefix for most of her arsenal.</p>
<p>The powers are a direct metaphor for her interior life: raw energy escaping violently and causing collateral harm because it is unfiltered, only becoming useful once she learns to filter and direct it — the same way her bottled stress and identity only become strength once she stops suppressing them.</p>

<h3>Character arc</h3>
<p>Ronnie’s arc is explicitly structured on the Hero’s Journey, which she — a literature student — is self-aware enough to narrate.</p>
<p><strong>The starting point.</strong> Before the starfruit, her life had grown stagnant: steady, low-change, and not enough to feel self-fulfilling.</p>
<p><strong>Refusal of the call.</strong> During the inciting monster fight she nearly walks away, back to her mom, her brothers, and her endlessly-rewritten manuscript. The turning point comes when she watches the <strong>Rodney Ranger banner</strong> burn and its motto sears into her, snapping her into action.</p>
<p><strong>The power as a high.</strong> The transformation works as a euphoric escape that distracts her from the crushing weight of her new responsibility, and doubles as <strong>gender euphoria</strong> — a taste of a fully-realised transition. But her old problems do not vanish; she keeps bottling them, and the cracks widen even as she lives out the power fantasy.</p>
<p><strong>The thematic foil.</strong> Ronnie is writing a thesis on <strong>camp and pulp</strong> — about why genuinely sincere work can be beloved even when it is “bad”, because it is honest about what it is. Her progress on that essay moves in lockstep with her becoming more genuine with herself.</p>

<h3>Relationships</h3>
<ul>
<li><strong>Desmond O’Malley</strong> (father, 45) — Slim, frazzled and dour; a hard-working baker who pushed all his kids toward self-sufficiency. Their relationship is frosty and tension-filled, his stubbornness clashing with her identity. He and Moira know about her transition but have not researched how to support it, so they default to treating her “as usual”, frequently misgendering and misnaming her. Beneath the gruffness he wants his children happier than he ended up.</li>
<li><strong>Moira O’Malley</strong> (mother, 41) — Warm and motherly; loves cooking for a crowd. Worried about how transition will affect Ronnie, but means well. Cries loudly and embarrassingly when frightened.</li>
<li><strong>Cal and Finn</strong> (twin brothers, 15) — Help run the smoothie stand, and a source of low-grade chaos. Long-term, the twins are slated to inherit the shop.</li>
<li><strong>Maeve</strong> (youngest sister, 4–5) — Ronnie babysits her. Sleeps with a patched-up stuffed animal handed down through the family. A soft spot in Ronnie’s life.</li>
<li><strong>Baby</strong> — Punk-leaning love interest, and a major recurring thread rather than a fling.</li>
<li><strong>Qwiwi</strong> — A kiwi-fruit alien scientist on Earth’s side. Initially studies Ronnie clinically, stalking her to see whether she will explode, then slowly forms a real connection to the planet and its people.</li>
<li><strong>Lulu Ranger</strong> — The “Blueberry Smoothie Girl”, a Pittscoke sports superstar and the powered girl in blue from the inciting fight.</li>
<li><strong>Liz (Elizabeth)</strong> — Fashion-forward classmate with a hidden double life; an only child of divorced parents.</li>
</ul>

<h3>The inciting incident</h3>
<p>Ronnie’s origin plays out at a <strong>Pittscoke Panthers</strong> game, where she is working the family’s smoothie stand in purple-outlined aprons over the O’Malleys’ green and yellow. A giant grape-and-pumpkin monster erupts during the game, setting fires across the stadium and threatening the powered newcomer fighting it. After her refusal and the banner-burning epiphany, Ronnie tears off her smoothie harness, channels the starfruit’s power for the first time, and blasts the monster across the field — debuting as Lady Starburst.</p>

<h3>Continuity notes</h3>
<ul>
<li><strong>O’Malley is not Ranger.</strong> Ronnie’s family are the O’Malleys. The Rangers — Mr Ranger, Lulu, and the deceased Mrs Ranger — are a separate family. “Rodney Ranger” is an in-universe pulp hero whose banner inspires Ronnie; the surnames should not be conflated.</li>
<li><strong>Roger is not Rodney.</strong> Ronnie’s male form is Roger. Keep it distinct from Rodney Ranger.</li>
<li><strong>The starfruit is permanent.</strong> Power Fruits are effectively indestructible and reform unless eaten by a compatible host, which is why Ronnie’s power is hers alone.</li>
</ul>`,
    },
  ],
};
