import { getSection } from '../../lib/cms-server.ts';
import { Gallery } from '../../components/site/Gallery.tsx';

export default async function CastPage() {
  const [sheets, about] = await Promise.all([getSection('sheets'), getSection('about')]);
  return (
    <Gallery
      title="Cast" hue="cyan" kind="cast" sheets={sheets.items}
      notice={about.cast.notice} noticePath="about.cast.notice"
    />
  );
}
