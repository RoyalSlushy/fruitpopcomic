import { Reader } from '../../../components/site/Reader.tsx';
import { getSection } from '../../../lib/cms-server.ts';

/* Deep link to one page. Prerendered for every page that exists. */
export async function generateStaticParams() {
  const pages = await getSection('pages');
  return pages.items.map((_, i) => ({ page: String(i + 1) }));
}

export default async function ReadAt({ params }: { params: Promise<{ page: string }> }) {
  const { page } = await params;
  const [pages, about] = await Promise.all([getSection('pages'), getSection('about')]);
  const n = Number(page);
  const start = Number.isFinite(n) ? Math.max(0, Math.min(pages.items.length - 1, n - 1)) : 0;
  return <Reader pages={pages.items} notice={about.reader.notice} start={start} />;
}
