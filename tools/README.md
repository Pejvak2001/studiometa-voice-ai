# Voice call diagnostics

Dev-only. `/tools` is `export-ignore`d in `.gitattributes`, so nothing here
reaches the release zip or WordPress.org. Never copy this folder into the SVN
working copy — build the release with `git archive` and the exclusion is
automatic.

## The two pieces

| Piece | Lives in | Runs where |
|---|---|---|
| `SMVATrace` recorder | `assets/widget.js` (ships) | the visitor's browser, during a call |
| `smva-trace-analyzer.html` | here (never ships) | your machine, opened as a local file |

The recorder has to ship: only the visitor's browser can observe when audio
actually arrived. It is passive — no network requests, no UI, a bounded ring
buffer of at most 4000 events. Nothing is sent anywhere; you collect a trace by
asking for it in the console.

Only numbers are recorded: message types, byte counts, timings, microphone
peak levels. No transcript text, no lead fields, no audio.

## Collecting a trace

In the browser where the call happened, **before closing the tab**:

```js
SMVATrace.copy()
```

The last three calls persist in `localStorage`, so a reload or an accidental
tab close does not lose them. Other console entry points:

```js
SMVATrace.summary()   // per-reply table + verdict, printed inline
SMVATrace.dump()      // the full JSON as a string
SMVATrace.stored()    // the persisted calls as objects
SMVATrace.clear()     // wipe history before a clean test run
```

Then open `smva-trace-analyzer.html` in any browser, paste, and hit Analyze.

## Reading the result

One number decides which half of the system is at fault:

**`deliveryRatio` = audio ms delivered ÷ wall ms elapsed**

- **< 1.00** — audio arrived slower than it plays. The stream cannot sustain
  realtime. No local buffer size can hide this; the cause is the backend or the
  network path. Stop tuning the widget.
- **≈ 1.00 with high `gapP95`** — enough audio arrived, but in bursts. This is
  jitter, and a larger start cushion genuinely fixes it.

Supporting columns:

- `minLookaheadMs` — the smallest amount of scheduled audio still ahead of the
  playhead during that reply. Under ~80ms the reply was one hiccup from a gap,
  even if it did not actually break.
- `primeQueuedMs` — how much audio was buffered when the pre-roll released,
  against its 350ms target. Well under it means the pre-roll timed out rather
  than succeeded.
- `startBufferMs` — the adaptive cushion in force for that reply. It starts at
  its floor on every fresh page load and only grows after an underrun.

## Reproducing the demo failure

The failure mode that shows up in front of a client is specifically the
**first reply of the first call after a page load**, when the cushion is at its
floor. A test that skips that condition will not reproduce it.

1. `SMVATrace.clear()`, then hard-reload the page.
2. Start a call and ask one question. **This first reply is the measurement.**
3. Ask two more questions so there is a recovery baseline to compare against.
4. End the call, run `SMVATrace.copy()`, analyze.
5. Repeat three times, reloading between runs. One clean run proves nothing —
   the fault is intermittent by nature.

To confirm a suspected network cause rather than guessing, re-run the same
protocol over a different link (phone hotspot vs. office wifi) and compare
`deliveryRatio`. If the ratio moves with the link, it is the network. If it
stays below 1.0 everywhere, it is the backend.
