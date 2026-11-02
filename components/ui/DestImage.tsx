'use client';

import { useEffect, useState } from 'react';
import { usePhotoConfig } from '@/hooks/usePhotos';
import Scene from './Scene';

const cache = new Map<string, { url: string; credit: string; link: string } | null>();

interface Props {
  id: string;
  query?: string;
  alt: string;
  className?: string;
  imgClassName?: string;
  /** direct photo URL (e.g. a live Google Places photo) — shown over the artwork */
  src?: string;
}

/**
 * Photo layering: your own file in /public/images/destinations → live photo (Places / Unsplash) → drawn artwork.
 * The artwork is always rendered underneath, so there is never an empty box.
 */
export default function DestImage({ id, query, alt, className = '', imgClassName = '', src }: Props) {
  const { local, unsplash } = usePhotoConfig();
  const [remote, setRemote] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const localUrl = local[id];

  useEffect(() => {
    if (src || localUrl || !unsplash || !query) return;
    let alive = true;
    const hit = cache.get(query);
    if (hit !== undefined) {
      setRemote(hit?.url ?? null);
      return;
    }
    fetch(`/api/photo?q=${encodeURIComponent(query)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { url: string; credit: string; link: string } | null) => {
        cache.set(query, d);
        if (alive) setRemote(d?.url ?? null);
      })
      .catch(() => cache.set(query, null));
    return () => {
      alive = false;
    };
  }, [src, localUrl, unsplash, query]);

  const photo = src ?? localUrl ?? remote;
  return (
    <div className={`relative overflow-hidden bg-cocoa-900 ${className}`}>
      <Scene id={id} className="absolute inset-0 h-full w-full" />
      {photo && !failed && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={photo}
          alt={alt}
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
          className={`absolute inset-0 h-full w-full object-cover ${imgClassName}`}
        />
      )}
    </div>
  );
}
