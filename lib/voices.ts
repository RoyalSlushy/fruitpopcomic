/* Choosing a voice.
 *
 * The Web Speech API is only as good as the voice it is handed, and the
 * default it hands you is usually the worst one installed. Every current
 * platform ships something genuinely good — Microsoft's Natural voices on
 * Edge, Siri and the Premium/Enhanced downloads on Apple, Google's on Android
 * and Chrome — sitting in the same `getVoices()` list as decades of legacy
 * formant synths and macOS novelty voices. Nobody hears the good ones because
 * nothing ever offers them.
 *
 * So this file's whole job is to sort that list so the best thing the visitor
 * already owns comes first. Pure string work over the voice metadata; no
 * browser API is called here, which is what makes it testable.
 */

export type VoiceInfo = {
  /** the stable id — what gets persisted and matched back on next load */
  voiceURI: string;
  name: string;
  lang: string;
  /** false means the platform synthesises it server-side, which in practice
      is how the neural voices are delivered */
  localService: boolean;
  isDefault: boolean;
};

/* Marketing names the platforms give their neural voices. These are the ones
   worth surfacing, and they are only ever exposed as part of the name. */
const NEURAL = /\b(natural|neural|premium|enhanced|siri|online)\b/i;

/* The families that are reliably modern, in rough order of how good they are
   when you get one. */
const FAMILY = /\b(microsoft|google|apple|siri)\b/i;

/* macOS has shipped these since the 1980s as jokes. They are not voices anyone
   wants to hear a comic read in, and several of them sort alphabetically to the
   top of the list, which is how they end up as somebody's default. */
const NOVELTY = new Set([
  'albert', 'bad news', 'bahh', 'bells', 'boing', 'bubbles', 'cellos',
  'deranged', 'good news', 'jester', 'junior', 'kathy', 'organ', 'ralph',
  'superstar', 'trinoids', 'whisper', 'wobble', 'zarvox', 'bruce', 'fred',
  'hysterical', 'pipe organ', 'princess', 'grandma', 'grandpa', 'rocko',
  'shelley', 'sandy', 'flo', 'eddy', 'reed', 'rishi', 'novelty',
]);

/* Legacy compact/embedded synths. Fine as a fallback, last as a choice. */
const LOW = /\b(compact|eloquence|espeak|pico|festival)\b/i;

const base = (lang: string) => (lang || '').toLowerCase().split(/[-_]/)[0] ?? '';

/** Higher is better. Only ever compared against other voices in the same list. */
export function score(v: VoiceInfo, lang = 'en'): number {
  const name = (v.name || '').toLowerCase();
  let n = 0;

  /* Language first, and by a margin nothing else can close: a superb German
     voice reading English is worse than any English one. */
  if (base(v.lang) === base(lang)) n += 1000;
  if ((v.lang || '').toLowerCase() === lang.toLowerCase()) n += 60;

  if (NOVELTY.has(name.replace(/\s*\(.*\)\s*/g, '').trim())) n -= 500;
  if (LOW.test(name)) n -= 120;

  if (NEURAL.test(name)) n += 200;
  if (FAMILY.test(name)) n += 40;
  /* A network voice is not automatically better, but on every platform that
     has both, the neural ones are the network ones. */
  if (!v.localService) n += 25;
  if (v.isDefault) n += 10;

  return n;
}

/** Every usable voice, best first. Voices in other languages are kept, last. */
export function rank(voices: VoiceInfo[], lang = 'en'): VoiceInfo[] {
  return [...voices]
    .map((v, i) => ({ v, i, s: score(v, lang) }))
    /* Index breaks ties so the order is stable rather than engine-dependent. */
    .sort((a, b) => b.s - a.s || a.i - b.i)
    .map((x) => x.v);
}

/* Everything at or above this is in the right language. Below it the voice is
   for some other one and belongs at the bottom of the list, whatever it is. */
const SAME_LANG = 1000;

/**
 * The list split into what to offer first and everything else.
 *
 * The cut is RELATIVE, not a fixed score, and that matters: a threshold high
 * enough to mean "neural" leaves the recommended group empty on any device
 * whose best voices carry no marketing word for it — Google's are the whole
 * story on Android and Chrome OS and are named plainly. An empty
 * "Recommended" heading above a list of everything is worse than no heading.
 *
 * So: if anything in the right language is a named neural voice, those are the
 * recommendations. If nothing is, the best three in the right language are.
 * Either way the group has something in it whenever a usable voice exists.
 */
export function split(voices: VoiceInfo[], lang = 'en'): {
  top: VoiceInfo[]; rest: VoiceInfo[];
} {
  const ranked = rank(voices, lang);
  const native = ranked.filter((v) => score(v, lang) >= SAME_LANG);

  const neural = native.filter((v) => NEURAL.test(v.name));
  const top = (neural.length ? neural : native).slice(0, neural.length ? 6 : 3);

  const picked = new Set(top);
  return { top, rest: ranked.filter((v) => !picked.has(v)) };
}

/** The voice to use when the visitor has not chosen one. */
export function best(voices: VoiceInfo[], lang = 'en'): VoiceInfo | null {
  return rank(voices, lang)[0] ?? null;
}
