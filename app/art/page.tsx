import { getSection } from '../../lib/cms-server.ts';
import { Gallery } from '../../components/site/Gallery.tsx';

export default async function ArtPage() {
  const sheets = await getSection('sheets');
  return <Gallery title="Art" hue="peach" kind="art" sheets={sheets.items} />;
}
