# Juntealo Web App — UI Kit

## Overview
High-fidelity click-through prototype of the Juntas Digitales web application.
Recreated from the Next.js source at `github.com/victorhidalgoricra/Juntaz`.

## Screens Covered
1. **Landing** — Navbar, hero, features grid, how-it-works, social proof, CTA
2. **Auth** — Login and Register forms
3. **Dashboard** — Score card, KPIs, upcoming payout, active juntas list
4. **Juntas List** — Browse/filter, junta cards, join/activate actions
5. **Junta Detail** — Overview, members, payments tab

## Design Width
- Desktop: 1280px (sidebar layout, 240px aside + content)
- Mobile: 390px (stacked nav)

## Tech
- React 18 + Babel (inline JSX)
- Lucide icons (CDN)
- DM Sans + DM Mono (Google Fonts)
- All design tokens from `../../colors_and_type.css`

## Components
- `Components.jsx` — Shared primitives: Button, Badge, Card, Input, Avatar, NavShell
- `Dashboard.jsx` — Dashboard screen
- `JuntasList.jsx` — Juntas list + detail screen
- `Landing.jsx` — Marketing landing page
- `Auth.jsx` — Login + Register forms
