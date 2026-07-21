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

The Content Script has two explicit modes. Precision reading captures only the user's current selection. Page translation starts only after a persistent per-origin user action, then scans visible/near-visible English text and observes dynamic DOM changes while active. It never receives credentials, arbitrary network destinations or request headers.

Page segments are classified as `content` or `ui`, bounded to 12 segments / 6,000 characters per batch, and sent through a separately validated Port. Background rebuilds a strict JSON translation prompt, checks a hashed local translation memory, calls the active Provider for misses, validates the exact returned ID set and sends text results back. Content applies results only to still-current text nodes and discards every result from a cancelled or superseded job.

All Provider requests originate in the Background Service Worker. The Background reconstructs prompts and network requests from validated internal settings; page-controlled messages cannot supply URLs, headers, models or executable prompt instructions.

## Build

Vite builds extension pages as standard module entries. The service worker is emitted as one ESM bundle, and the Content Script as one IIFE bundle. A typed manifest generator writes `dist/manifest.json`. Production builds compile a closed Shadow DOM; the E2E build may compile an open Shadow DOM only for assertions.

No runtime code, fonts, icons, SDKs or configuration are loaded from a CDN.
