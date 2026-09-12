# Aqua Mart

A full aquarium & aquatic pet store front-end: live fish, equipment, and
plants across a real category catalog; a multi-step online booking system
for in-home services; a rule-based "Build My Aquarium" recommender; and, as
its centerpiece feature, the original interactive Three.js jellyfish reef
this project started as.

**The frontend below is still a self-contained prototype** — the cart and
bookings persist to `localStorage` so the whole experience works end-to-end
and survives a refresh, but it does not yet talk to a server. See "Known
limitations" below.

A real backend now exists alongside it in **`backend/`** — a FastAPI +
PostgreSQL API covering accounts, the product catalog, multi-currency
pricing, cart/orders, appointment booking, reviews, promotions, and admin
management (see `specs/001-fish-shop-backend/`). Connecting this frontend to
it is a separate, not-yet-done feature; see `backend/README.md` and
[`specs/001-fish-shop-backend/quickstart.md`](specs/001-fish-shop-backend/quickstart.md)
to run the backend on its own.

## Run it

```bash
npm install
npm run dev      # local dev server
npm run build    # production build to dist/
npm run preview  # serve the production build locally
```

## Site map

| Route | What's there |
|---|---|
| `/` | Shop homepage — hero, revenue pillars, category tiles, featured products, services teaser, Build My Aquarium CTA |
| `/shop` | Full product catalog, filterable by category, with search |
| `/product/:id` | Rich product page — specs, availability, Add to Cart, Reserve Fish (live animals), Schedule Delivery |
| `/cart` | Cart (products + booked services), running total, prototype checkout |
| `/services` | All 12 appointment-based services |
| `/services/:id` | The booking wizard — a full 8-step flow for Aquarium Setup / Custom Aquarium Design (size → water type → design style → add fish & plants → date → time → address → confirm), a shorter generic flow for everything else |
| `/build-my-aquarium` | The rule-based setup recommender |
| `/gallery` | Filterable gallery of tanks, livestock, and aquascapes |
| `/about`, `/contact` | Standard content pages |
| `/experience` | The full interactive jellyfish/ocean scene, full-screen |

## What's inside

- **`backend/`** — the FastAPI backend described above; not yet connected to
  this frontend. See `backend/README.md`.
- **`src/experience/`** — the original Three.js jellyfish scene (bell
  pulse-and-glide physics, vortex rings, tentacle sway, kelp, rays, a fish
  school sheltering in the tentacles, zooplankton capture, a sandy seafloor
  with rocks), unchanged in behavior but refactored from a page-scope script
  into `mountJellyfishScene(root)` — a function that mounts into any
  container and returns a proper cleanup function, so React can mount/unmount
  it on route changes without leaking a running render loop.
- **`src/data/products.js`** — the product catalog (mock data covering every
  category you asked for: freshwater and marine fish, shrimp & snails,
  plants, tanks, filtration, air pumps, heaters, lighting, food,
  conditioners, decor, substrate, cleaning gear, medication).
- **`src/data/services.js`** — the 12 bookable services.
- **`src/context/CartContext.jsx`** — cart + booked-service state,
  persisted to `localStorage`.
- **`src/context/CurrencyContext.jsx`** — global currency preference (USD,
  GBP, or PKR — picked from the selector in the header), persisted to
  `localStorage`. Every price in the data files is stored in USD; this
  context fetches live USD rates from a free, key-less exchange-rate API
  (`open.er-api.com`), caches them for 12h, and falls back to fixed
  approximate rates if that request fails. Product prices, service prices,
  cart/booking totals, and the Build My Aquarium budget all render through
  its `format()` helper, so switching currency updates every price on the
  site at once.
- **`src/pages/BookingFlow.jsx`** — one wizard component drives both the
  full Aquarium Setup flow and the shorter generic flow used by every other
  service, based on each service's `flow` field in `services.js`.
- **`src/pages/BuildMyAquarium.jsx`** — plain, explainable rule-based logic
  (not an optimizer, not AI) that picks livestock, plants, substrate, and
  equipment from the real catalog based on tank size, experience, and style,
  and reports whether the result fits the stated budget.

## Product photography

All 39 products have real photos, in `public/images/products/`, one file per
product named exactly after its id (e.g. `betta-royal-blue.jpg`) —
`ProductImage.jsx` looks for that file and falls back to a gradient-plus-icon
placeholder (`PlaceholderArt.jsx`) if it isn't there, so adding or swapping a
photo later needs no code change. The Gallery page (`public/images/gallery/`)
uses the same pattern via the shared `PhotoImage.jsx` loader and now has real
photos for all 9 entries. Service icons still use the icon-only placeholder
system.

## Known limitations (by design, for this pass)

- **No backend.** Cart, bookings, and the contact form all work fully in
  the browser and persist via `localStorage`, but nothing reaches a server.
  Checkout confirms and clears the cart without charging anything.
- **No real auth, inventory, or order history.** Those need a backend to
  mean anything.
- **"Build My Aquarium" is rule-based, not AI.** The original request
  floated an AI advisor as a future step — this is the explainable
  first version that a smarter one could sit on top of later.

## Interactions carried over from the original jellyfish page

- **Drag** — orbit the camera (`OrbitControls`, damped). Tilt down to see
  the kelp bed and rocks; the look-down angle is capped so the camera can't
  dip below the seafloor at full zoom-out.
- **Scroll** — zoom in/out within a clamped range, from an intimate view out
  to a full panoramic view of the reef.
- **Click the water** — reads as a current disturbance: the jellyfish (no
  eyes, no brain) answers with one extra pulse and a ripple; the sheltering
  fish scatter sharply and drift back once it passes.
- **Mute button** — toggles the fully synthesized (Web Audio API, no audio
  files) underwater soundscape.
# aqua-mart
