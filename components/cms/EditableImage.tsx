'use client';

import dynamic from 'next/dynamic';
import { useCmsValue, useEditMode } from '../../lib/cms-context.tsx';
import { mediaURL } from '../../lib/media.ts';

/* Same split as EditableText: visitors get a plain <img> and nothing else. */
const Impl = dynamic(() => import('./EditableImageImpl.tsx'), { ssr: false });

export type EditableImageProps = {
  path: string;
  value: string;
  alt: string;
  className?: string;
  width?: number;
  height?: number;
};

export function EditableImage({ path, value, alt, className, width, height }: EditableImageProps) {
  const src = useCmsValue(path, value);
  const editing = useEditMode();

  if (!editing) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img className={className} src={mediaURL(src)} alt={alt} width={width} height={height} />;
  }
  return <Impl path={path} src={src} alt={alt} className={className} width={width} height={height} />;
}
