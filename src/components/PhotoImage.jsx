import { useState } from 'react';

const MAX_ATTEMPTS = 2;

// Generic "try a real photo, fall back to placeholder art" loader - the
// same logic ProductImage used before this got pulled out so Gallery could
// reuse it too, rather than re-solving the same StrictMode bug twice.
//
// Retries once before falling back: React 18/19 StrictMode's dev-only
// double-render can abort an in-flight <img> load and fire a spurious
// onError even though the file exists (confirmed - the production build
// never shows this, only `npm run dev`). One retry with a fresh <img>
// element (via the `key`) absorbs that, while a genuinely missing file
// still fails on the retry too and falls back correctly.
//
// Pass `key` from the parent wherever the same PhotoImage instance could be
// reused for a different photo without remounting (e.g. a detail page
// navigated to a different id) - otherwise a stale "already fell back"
// state could carry over from the previous photo.
export default function PhotoImage({ src, alt, aspect = '4 / 3', className = 'product-image', fallback, note }) {
  const [attempt, setAttempt] = useState(0);

  if (attempt >= MAX_ATTEMPTS) {
    return (
      <>
        {fallback}
        {note}
      </>
    );
  }

  return (
    <img
      key={attempt}
      src={src}
      alt={alt}
      className={className}
      style={{ aspectRatio: aspect }}
      onError={() => setAttempt((a) => a + 1)}
    />
  );
}
