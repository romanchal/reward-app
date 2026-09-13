# Reward App Web Production Base

This file is the future reference for the production-ready web UI. Keep the implementation small, consistent, and easy to maintain.

## Source of truth

- All visual styling belongs in `src/styles.css`.
- React components should use existing semantic class names instead of adding duplicate inline styles.
- The stylesheet is dependency-free. Vite minifies it during production builds.
- Do not change backend, database, authentication, reward, withdrawal, or fraud logic for visual work.

## CSS structure

The stylesheet is organized in this order:

1. Design tokens: colors, spacing, radii, shadows, breakpoints, and fonts.
2. Global reset and accessibility defaults.
3. App shell, header, desktop navigation, mobile navigation, and safe areas.
4. Shared typography, cards, buttons, forms, headers, grids, and status colors.
5. Balance, mission, task, offer, reward, activity, leaderboard, profile, auth, state, and toast components.
6. Mobile safeguards, desktop layouts, reduced-motion support, and print styles.

## Production requirements

- Mobile-first layout starting at 320px.
- Use safe-area insets for notched devices and gesture bars.
- Keep primary actions at least 44px high and visibly focusable.
- Support light text contrast, disabled states, loading states, empty states, and error states.
- Use responsive grids without horizontal overflow or clipped long text.
- Show the bottom tab bar on mobile and the desktop navigation at 768px and above.
- Respect `prefers-reduced-motion`.
- Keep the demo/payment warning visible.
- Keep all API traffic behind the `/api` proxy and never trust client-side balance or verification values.
- Never place secrets, tokens, or credentials in frontend files.

## File boundaries

```text
web/
├── PRODUCTION_BASE.md       # This production reference
├── index.html               # HTML metadata and app entry
├── vite.config.ts           # Development proxy and build configuration
├── nginx.conf               # Static hosting and /api reverse proxy
├── Dockerfile               # Production build and nginx image
└── src/
    ├── styles.css           # Complete visual system
    ├── components/          # Reusable presentational components
    ├── pages/               # Route-level composition
    ├── lib/                 # API/auth/format helpers
    ├── App.tsx              # Route map
    └── main.tsx             # React entry point
```

## Verification

Run these commands from the repository root:

```bash
npm run typecheck --workspace web
npm run build --workspace web
```

Before release, also check the login, dashboard, earn, rewards, leaderboard, and profile pages at 360px, 768px, and 1440px widths. Confirm there is no horizontal scrolling, clipped text, invisible focus state, or console error.

## Future change rule

For a visual change, update only `src/styles.css` unless a missing semantic element truly requires a component edit. Re-run typecheck and production build after every change. Do not add another global stylesheet.
