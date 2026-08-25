'use client';

import dynamic from 'next/dynamic';
import { useCmsValue, useEditMode } from '../../lib/cms-context.tsx';
import { mediaURL } from '../../lib/media.ts';

/* A picture that may not be there yet.
 *
 * EditableImage assumes an image exists and offers to replace it. A wiki
 * section starts with none, so the editor needs somewhere to click BEFORE
 * there is anything to click on — and a way to take the picture back out
 * again. That is the whole difference between the two components.
 *
 * For a visitor with no picture set this renders nothing at all: no empty
 * <figure>, no placeholder box, no reserved space. */
const Impl = dynamic(() => import('./EditableFigureImpl.tsx'), { ssr: false });

export type EditableFigureProps = {
  /** path of the image field */
  path: string;
  value: string;
  /** path of the caption field; omit for a picture that takes no caption */
  captionPath?: string;
  captionValue?: string;
  alt?: string;
  className?: string;
};

export function EditableFigure({
  path, value, captionPath, captionValue = '', alt = '', className,
}: EditableFigureProps) {
  const src = useCmsValue(path, value);
  const caption = useCmsValue(captionPath ?? path, captionPath ? captionValue : '');
  const editing = useEditMode();

  if (!editing) {
    if (!src) return null;
    return (
      <figure className={className}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={mediaURL(src)} alt={alt} loading="lazy" />
        {captionPath && caption ? <figcaption>{caption}</figcaption> : null}
      </figure>
    );
  }

  return (
    <Impl
      path={path}
      src={src}
      alt={alt}
      className={className}
      captionPath={captionPath}
      caption={captionPath ? caption : ''}
    />
  );
}
