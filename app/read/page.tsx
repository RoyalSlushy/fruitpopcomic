import { Reader } from '../../components/site/Reader.tsx';
import { getSection } from '../../lib/cms-server.ts';

export default async function ReadPage() {
  const [pages, about] = await Promise.all([getSection('pages'), getSection('about')]);
  return <Reader pages={pages.items} notice={about.reader.notice} start={0} />;
}
