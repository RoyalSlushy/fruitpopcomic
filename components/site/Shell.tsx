'use client';

import Link from 'next/link';
import { useSelectedLayoutSegment } from 'next/navigation';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { Glyph } from './Glyph.tsx';
import { EditableText } from '../cms/EditableText.tsx';
import { CmsHatch } from '../cms/CmsHatch.tsx';
import type { SiteContent } from '../../content/site.ts';

/* The persistent chrome: channel rail, top strip, bottom tab bar.
 *
 * A client component so it can read the active segment — but it still renders
 * on the server, so `data-section` is correct in the first HTML and the channel
 * hue never flashes. That attribute is why the shell exists at all: a root
 * layout cannot know which route is active, and every --ch consumer needs it. */

export function Shell({ site, counts, children }: {
  site: SiteContent;
  /** derived by counting real content — never a claimed number */
  counts: { pages: number; cast: number };
  children: ReactNode;
}) {
  const segment = useSelectedLayoutSegment();
  const section = segment ?? 'home';

  const [open, setOpen] = useState(false);
  const railRef = useRef<HTMLElement>(null);
  const burgerRef = useRef<HTMLButtonElement>(null);
  const lastFocus = useRef<HTMLElement | null>(null);

  const close = useCallback((restore = false) => {
    setOpen(false);
    if (restore) lastFocus.current?.focus();
  }, []);

  /* The drawer state stays on <html> so the existing CSS keeps working. */
  useEffect(() => {
    const el = document.documentElement;
    if (open) el.dataset.drawer = 'open';
    else delete el.dataset.drawer;
  }, [open]);

  /* Focus moves in once the visibility flip has landed. */
  useEffect(() => {
    if (!open) return;
    const rail = railRef.current;
    void rail?.offsetWidth;
    rail?.querySelector('a')?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close(true);
    };
    const onFocus = (e: FocusEvent) => {
      const t = e.target as Node;
      if (rail?.contains(t) || burgerRef.current === t) return;
      rail?.querySelector('a')?.focus();
    };
    addEventListener('keydown', onKey);
    addEventListener('focusin', onFocus);
    return () => {
      removeEventListener('keydown', onKey);
      removeEventListener('focusin', onFocus);
    };
  }, [open, close]);

  /* Any navigation closes the drawer. */
  useEffect(() => { setOpen(false); }, [segment]);

  /* The phone's first screen is the hero and nothing else, so the tab bar
     starts off the bottom of the window and rides in on the first scroll —
     see the `data-scrolled` rules in globals.css, which apply on the
     dashboard, at phone widths, and nowhere else. Read on a frame rather
     than on the event: the listener fires far faster than a paint. */
  useEffect(() => {
    const root = document.documentElement;
    let frame = 0;
    const read = () => {
      frame = 0;
      root.dataset.scrolled = scrollY > 32 ? 'on' : 'off';
    };
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(read); };
    read();
    addEventListener('scroll', onScroll, { passive: true });
    return () => {
      removeEventListener('scroll', onScroll);
      cancelAnimationFrame(frame);
      delete root.dataset.scrolled;
    };
  }, []);

  const step = String(site.nav.findIndex((n) => n.id === section) + 1).padStart(2, '0');
  const current = site.nav.find((n) => n.id === section);

  return (
    <div className="shell" data-section={section}>
      <div className="scrim" aria-hidden="true" onClick={() => close(true)} />

      <nav className="rail" id="rail" ref={railRef} aria-label="Sections">
        <Link className="rail__logo" href="/" aria-label={`${site.title} — home`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo/wordmark.png" alt={site.title} width={498} height={245} />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="rail__mark" src="/logo/monogram.png" alt="" width={600} height={600} />
        </Link>

        <div className="rail__nav">
          {site.nav.map((item, i) => (
            <Link
              key={item.id}
              className="rail__item"
              data-nav={item.id}
              href={item.href}
              aria-current={item.id === section ? 'page' : 'false'}
            >
              <Glyph name={item.id} />
              <EditableText as="span" path={`site.nav.${i}.label`} value={item.label} />
            </Link>
          ))}
        </div>

        <div className="rail__promo">
          <EditableText as="h2" path="site.promo.title" value={site.promo.title} />
          <EditableText as="p" path="site.promo.body" value={site.promo.body} />
          <Link className="btn btn--solid" href={site.promo.ctaHref}>
            <EditableText as="span" path="site.promo.cta" value={site.promo.cta} />
          </Link>
        </div>
      </nav>

      <header className="sysbar">
        <button
          className="burger"
          id="burger"
          ref={burgerRef}
          type="button"
          aria-label="Open sections menu"
          aria-expanded={open}
          aria-controls="rail"
          onClick={() => {
            if (open) close(true);
            else {
              lastFocus.current = document.activeElement as HTMLElement;
              setOpen(true);
            }
          }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true">
            <path d="M4 7h16M4 12h16M4 17h16" />
          </svg>
        </button>

        <Link className="sysbar__home" href="/" aria-label={`${site.title} — home`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo/wordmark.png" alt={site.title} width={498} height={245} />
        </Link>

        <p className="crumb">
          <span className="crumb__step">{step}</span>
          <span className="crumb__title">{current?.label ?? 'Home'}</span>
        </p>

        <Readout counts={counts} />
      </header>

      <main id="main" tabIndex={-1}>{children}</main>

      <footer className="foot">
        <EditableText as="p" path="site.footer.copyright" value={site.footer.copyright} />
        {/* The gear rides inside this paragraph rather than as a third footer
            child, so the bar stays a two-item space-between and the build note
            does not slide to the middle. */}
        <p className="foot__build">
          <EditableText as="span" path="site.footer.build" value={site.footer.build} />
          {' · '}
          <Link href="/about">About</Link>
          <CmsHatch />
        </p>
      </footer>

      {/* The retracted tab bar is a scripted state: the CSS hides it until
          `data-scrolled` says otherwise, and nothing sets that attribute
          without script. Where there is none, the bar is the only navigation
          left — the drawer opens from a button — so it is pinned open. */}
      <noscript>
        <style dangerouslySetInnerHTML={{ __html: '.tabbar{translate:none!important;visibility:visible!important}' }} />
      </noscript>

      <nav className="tabbar" aria-label="Quick navigation">
        {site.nav.filter((n) => n.tab).map((item) => (
          <Link
            key={item.id}
            className="tab"
            data-nav={item.id}
            href={item.href}
            aria-current={item.id === section ? 'page' : 'false'}
          >
            <Glyph name={item.id} />
            {item.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}

/* The counters are derived, never claimed: the page count counts pages and the
   cast count sums the figures actually drawn on the sheets. */
function Readout({ counts }: { counts: { pages: number; cast: number } }) {
  return (
    <dl className="readout" aria-label="Status">
      <div><dt>Pages</dt><dd>{counts.pages}</dd></div>
      <div><dt>Cast</dt><dd>{counts.cast}</dd></div>
      <div><dt>Status</dt><dd className="readout__flag">Draft</dd></div>
    </dl>
  );
}
