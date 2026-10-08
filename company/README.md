# Setubandh Tech company website

Both websites are managed in `krishvekriya12/krishvekriya12.github.io`:

- Repository root: existing developer portfolio, https://portfolio.setubandhtech.digital/.
- `company/`: company website, https://setubandhtech.digital/.
- `data/apps.json`: existing shared product data. The company reads `myApps` only; employer work is never shown as company-owned products.

## Hosting

The root `CNAME`, original HTML, portfolio assets and existing data workflow stay unchanged.
GitHub Pages publishes both the original portfolio and the `company/` folder automatically on pushes to `main`.
The Cloudflare Worker `setubandh-company` uses the checked-in `hosting/worker.js` to serve that published company folder on the main domain. It handles only `setubandhtech.digital/*` and `www.setubandhtech.digital/*`. The `www` host redirects to the main domain.

Company HTML, CSS, JavaScript, brand assets and product updates are published by GitHub Pages, so routine website changes need only a commit in this repository. Only routing-code edits need a Cloudflare Worker redeployment.

## Design system

`design.md` is the supplied Android / Compose M3 Expressive brief. This is its **web adaptation**, not a Kotlin app or a claim to use native Compose APIs.

- `assets/tokens.css`: semantic light/dark colors, typography, spacing, shapes and motion roles.
- `assets/motion.js`: physics-derived spring curves for spatial motion and critically damped effects.
- `assets/site.css`: expressive web components and responsive layouts.
- `assets/site.js`: theme, app selection, filters, dialog, product data loading/empty/error states and clipboard feedback.
- Icons: Material Symbols Rounded, consistent across the site.
- Typeface: variable Roboto Flex.
- `assets/logo.svg` and `assets/logo-mono.svg`: original bridge-inspired vector brand mark.

The public copy is specific to the four published products and confirmed contact email. No client count, company-wide install total, testimonials or service promises are invented. The native-only dynamic wallpaper, haptics, Compose previews and predictive back requirements do not apply to this website; system color preference, browser navigation, semantic HTML, keyboard focus and reduced motion are used instead.

## Local preview

Serve the repository root with a static HTTP server and open `/company/index.html`. Serving the repository root allows the app page to load shared `../data/apps.json`.
