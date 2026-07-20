# Architecture

FloatRead is a Manifest V3 Chromium extension with no developer-operated backend.

## Trust boundaries

```text
Host page (untrusted)
  └─ isolated Content Script
      └─ one <floatread-root> with closed Shadow DOM
          ⇅ validated chrome.runtime messages/Port
Background Service Worker (trusted network and secret boundary)
  ├─ Provider Router
  ├─ Secret Repository
  ├─ Permission Manager
  ├─ Cache Repository
  └─ Skin Repository
Extension pages (trusted UI)
  ├─ Popup
  ├─ Options
  └─ Onboarding
```

The Content Script may read only the user's current text selection after local selection events and may request generation only after an explicit FloatRead action. It never receives credentials, arbitrary network destinations or request headers.

All Provider requests originate in the Background Service Worker. The Background reconstructs prompts and network requests from validated internal settings; page-controlled messages cannot supply URLs, headers, models or executable prompt instructions.

## Build

Vite builds extension pages as standard module entries. The service worker is emitted as one ESM bundle, and the Content Script as one IIFE bundle. A typed manifest generator writes `dist/manifest.json`. Production builds compile a closed Shadow DOM; the E2E build may compile an open Shadow DOM only for assertions.

No runtime code, fonts, icons, SDKs or configuration are loaded from a CDN.
