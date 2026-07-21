# FloatRead V2 product boundary

Effective date: 2026-07-21

The project owner explicitly replaced V1's selection-only X boundary after hands-on acceptance. V2 is a page-translation product; selection reading remains a secondary precision tool.

## Primary flow

1. The user explicitly enables translation for the current origin from the Popup or companion.
2. FloatRead reads only visible and near-viewport English text.
3. Main/article content is classified as precision content; navigation/menu/button text is classified as UI.
4. Background batches bounded segments and sends one strict-JSON translation request to the configured Provider.
5. Translations replace their corresponding text nodes. New visible content is processed as the user scrolls.
6. UI translations are retained in a bounded local translation memory and reused on future menu instances.
7. Stop aborts the current batch and disables observation while preserving completed translations. Clear restores surviving original text nodes and removes the site's persistent translation preference.

## Newly allowed

- Reading visible unselected page text after a persistent, explicit per-origin enable action.
- A bounded `MutationObserver` plus scroll/resize rescans while page translation is active.
- Replacing visible text-node values with translations without modifying React event handlers or application state.
- Progressive translation of dynamic X content and menus.

## Still prohibited

- Preloading or batch-reading an infinite timeline outside the visible/near-visible window.
- Any request before the user enables page translation for that origin.
- Developer servers, accounts, payment, advertising, telemetry or hidden collection.
- Sending credentials to Content Scripts or host-page events.
- Direct Provider calls from Content.
- Executing page text, model output or imported skin content as code.

## Rendering and privacy trade-off

V2 intentionally changes visible host-page text and can change text wrapping. It does not attach handlers to X React nodes or edit X business state. Host applications can replace DOM nodes at any time; FloatRead discards stale references and reprocesses only current visible English text.
