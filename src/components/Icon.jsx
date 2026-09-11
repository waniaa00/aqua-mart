// A small hand-drawn line-icon set, replacing emoji everywhere on the site.
// Same stroke convention as the cart/menu icons already in Header.jsx and
// the mute/back icons in the jellyfish experience: 24x24 viewBox, no fill,
// currentColor stroke - so every icon inherits its color from CSS and
// renders identically on every device, unlike emoji.
const PATHS = {
  // brand mark: a stylized jellyfish, since that's literally the business
  jellyfish: (
    <>
      <path d="M4 11a8 6 0 0 1 16 0c0 1.4-.9 2-.9 3.5H4.9C4.9 13 4 12.4 4 11z" />
      <path d="M7 14.5c0 2-1 3-1 5.5M11 14.5c0 2 .4 3.5.4 6M15 14.5c0 2 1 3 1 5.5M9 14.5c0 2-.3 3-1.2 5.5" />
    </>
  ),
  fish: (
    <>
      <ellipse cx="13" cy="12" rx="7.5" ry="5" />
      <path d="M5.5 12 2 8.5v7z" />
      <circle cx="17" cy="10.3" r="0.9" fill="currentColor" stroke="none" />
    </>
  ),
  shrimp: (
    <>
      <path d="M5 19c-1.8-2.3-1.3-5.7 1-8 3-3 8.5-4 11.5-1.5 2 1.7 1.8 4.4-.3 5.7-2.3 1.4-5.5 1-7.2-1" />
      <path d="M9.5 9c-.3-2 .6-3.6 2.3-4.6" />
      <path d="M4.5 19l-2 .8M5.3 17.3l-2.3.3M6.3 15.8l-2-1" />
    </>
  ),
  leaf: (
    <>
      <path d="M20 4C10 4 4 10 4 20c10 0 16-6 16-16z" />
      <path d="M8 20c2-6 6-10 12-12" />
    </>
  ),
  tank: (
    <>
      <rect x="3" y="4" width="18" height="13" rx="1" />
      <path d="M3 8c1.5.9 3-.9 4.5 0s3-.9 4.5 0 3-.9 4.5 0 3-.9 4.5 0" />
      <path d="M6.5 17v3M17.5 17v3" />
    </>
  ),
  wrench: <path d="M21 7.2a4 4 0 0 1-5.4 3.7L8.2 18.3 5.7 15.8l7.4-7.4A4 4 0 1 1 21 7.2z" />,
  wind: (
    <>
      <rect x="5" y="17.5" width="14" height="3.2" rx="1.4" />
      <circle cx="7.5" cy="12.5" r="1.5" />
      <circle cx="12.5" cy="7.5" r="1.9" />
      <circle cx="16.5" cy="11.5" r="1.5" />
    </>
  ),
  thermometer: (
    <>
      <path d="M12 3a2 2 0 0 0-2 2v9.3a4 4 0 1 0 4 0V5a2 2 0 0 0-2-2z" />
      <path d="M12 8v6" />
    </>
  ),
  bulb: (
    <>
      <path d="M9.5 18.5h5" />
      <path d="M10.3 21h3.4" />
      <path d="M12 3a6.3 6.3 0 0 0-3.8 11.3c.7.7 1 1.3 1 2.2h5.6c0-.9.3-1.5 1-2.2A6.3 6.3 0 0 0 12 3z" />
    </>
  ),
  bowl: (
    <>
      <path d="M3 12h18a9 6 0 0 1-18 0z" />
      <path d="M6.3 12a5.7 3 0 0 1 11.4 0" />
    </>
  ),
  droplet: <path d="M12 3c4 5 7 8.6 7 12a7 7 0 1 1-14 0c0-3.4 3-7 7-12z" />,
  decor: (
    <>
      <path d="M6 3h12l3 6-9 12L3 9z" />
      <path d="M3 9h18" />
      <path d="M9 3l3 6 3-6" />
    </>
  ),
  rock: (
    <>
      <path d="M4 18 3 12.5 8 8.5 14 9.5 19 13 18 18Z" />
      <path d="M8 8.5 10 13 3 12.5" />
      <path d="M14 9.5 12 14 19 13" />
    </>
  ),
  broom: (
    <>
      <path d="M20 4 10 14" />
      <path d="M10 14 5 21" />
      <path d="M10 14l-6.5 3 2 3 6.5-3z" />
    </>
  ),
  pill: (
    <>
      <rect x="2.5" y="8" width="19" height="8" rx="4" />
      <path d="M12 8v8" />
    </>
  ),
  cart: (
    <>
      <circle cx="9" cy="21" r="1" />
      <circle cx="20" cy="21" r="1" />
      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
    </>
  ),
  calendar: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </>
  ),
  check: <path d="M5 13l4 4L19 7" />,
  x: <path d="M18 6 6 18M6 6l12 12" />,
  menu: <path d="M3 6h18M3 12h18M3 18h18" />,
  truck: (
    <>
      <rect x="1" y="7" width="13" height="10" rx="1" />
      <path d="M14 10h4l3 3v4h-7z" />
      <circle cx="6" cy="19" r="1.6" />
      <circle cx="17.5" cy="19" r="1.6" />
    </>
  ),
  'map-pin': (
    <>
      <path d="M12 21s7-7.5 7-12a7 7 0 1 0-14 0c0 4.5 7 12 7 12z" />
      <circle cx="12" cy="9" r="2.3" />
    </>
  ),
  palette: (
    <>
      <path d="M12 3a9 9 0 1 0 0 18c1.1 0 2-.9 2-2 0-.5-.2-.9-.5-1.3-.3-.4-.5-.8-.5-1.3 0-1 .8-1.9 1.8-1.9H17a4 4 0 0 0 4-4c0-4.4-4-7.5-9-7.5z" />
      <circle cx="7.5" cy="10.5" r="1" fill="currentColor" stroke="none" />
      <circle cx="9.5" cy="7" r="1" fill="currentColor" stroke="none" />
      <circle cx="14" cy="7" r="1" fill="currentColor" stroke="none" />
      <circle cx="16.5" cy="10" r="1" fill="currentColor" stroke="none" />
    </>
  ),
  repeat: (
    <>
      <path d="M17 2l4 4-4 4" />
      <path d="M21 6H8a4 4 0 0 0-4 4v1" />
      <path d="M7 22l-4-4 4-4" />
      <path d="M3 18h13a4 4 0 0 0 4-4v-1" />
    </>
  ),
  package: (
    <>
      <path d="M21 8 12 3 3 8l9 5 9-5z" />
      <path d="M3 8v9l9 5 9-5V8" />
      <path d="M12 13v9" />
    </>
  ),
  'message-circle': <path d="M21 11.5a8.5 8.5 0 0 1-8.5 8.5c-1.2 0-2.4-.3-3.4-.8L4 21l1.8-5.1A8.5 8.5 0 1 1 21 11.5z" />,
  'heart-pulse': (
    <>
      <path d="M20.8 8.6a5.6 5.6 0 0 0-9.6-4A5.6 5.6 0 0 0 2 8.6c0 5.2 9.2 10.9 9.2 10.9s9.6-5.7 9.6-10.9z" />
      <path d="M6 11h2l1.5-3L11 15l1.5-4H16" />
    </>
  ),
  graduation: (
    <>
      <path d="M2 9l10-5 10 5-10 5-10-5z" />
      <path d="M6 11v5c0 1.5 3 3 6 3s6-1.5 6-3v-5" />
    </>
  ),
  waves: (
    <>
      <path d="M2 8c2-2 4-2 6 0s4 2 6 0 4-2 6 0" />
      <path d="M2 14c2-2 4-2 6 0s4 2 6 0 4-2 6 0" />
      <path d="M2 20c2-2 4-2 6 0s4 2 6 0 4-2 6 0" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8" />
    </>
  ),
  home: (
    <>
      <path d="M4 11l8-7 8 7" />
      <path d="M6 10v10h12V10" />
    </>
  ),
  store: (
    <>
      <path d="M3 9l1.5-5h15L21 9" />
      <path d="M3 9a2.5 2.5 0 0 0 5 0 2.5 2.5 0 0 0 5 0 2.5 2.5 0 0 0 5 0 2.5 2.5 0 0 0 5 0" />
      <path d="M5 9v11h14V9" />
      <path d="M10 20v-6h4v6" />
    </>
  ),
  flask: (
    <>
      <path d="M9 3h6" />
      <path d="M10 3v6.5L4.8 18a2 2 0 0 0 1.7 3h11a2 2 0 0 0 1.7-3L14 9.5V3" />
      <path d="M6.5 15h11" />
    </>
  ),
};

export default function Icon({ name, size = 24, ...props }) {
  const path = PATHS[name];
  if (!path) return null;
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {path}
    </svg>
  );
}
