import { Chapters } from '../../components/site/Chapters.tsx';
import { getSection } from '../../lib/cms-server.ts';

/* /read is the shelf now, not page one. The reader itself lives at /read/[n],
   so every existing deep link still lands exactly where it used to. */
export default async function ReadPage() {
  const [pages, about] = await Promise.all([getSection('pages'), getSection('about')]);
  return (
    <Chapters
      chapters={pages.chapters}
      items={pages.items}
      notice={about.reader.notice}
    />
  );
}
