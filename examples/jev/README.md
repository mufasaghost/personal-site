# Jev (TypeSafe AI) example — contact-form triage

This is a **standalone, clearly-marked example**, not code that runs as part
of the site today.

`mufasaghost/personal-site` is currently a fully static GitHub Pages site
(see the repo root: just `index.html` and a Jekyll `_config.yml` — no
server, no build step, no form handler). There is nowhere in this repo for a
real Jev integration to plug into yet.

[`contact-triage.mjs`](./contact-triage.mjs) shows what that integration
would look like the moment this site gets a server-side contact-form handler
(a serverless function, an API route, etc.): a small, isolated module that
asks Jev's `system_one` three typed questions about an incoming message —

- `choice` — which category does it fall into (general / collaboration /
  job opportunity / bug report / spam)?
- `score` — how urgent is it?
- `noul` — yes/no, does it look like spam?

and returns a typed decision the handler can route on, instead of writing a
bespoke classifier or making a free-form LLM call.

## Using it for real

1. `cd examples/jev && npm install`
2. Set `TYPESAFE_API_KEY` in your environment (never hardcode it).
3. `npm run demo` to see it run against a sample message, or import
   `triageContactMessage` from a real form handler once one exists.

## Design notes

- **Lazy import** — `@typesafe-ai/sdk` is only imported inside
  `triageContactMessage`, so nothing breaks just because the package isn't
  installed.
- **Env-only auth** — the API key comes solely from `TYPESAFE_API_KEY`.
- **Graceful degradation** — a missing package, a missing key, or an API
  failure all raise a clear, actionable `Error` (never a raw crash), so a
  caller can catch it and fall back to default/manual handling.
- **Real package** — `@typesafe-ai/sdk` on npm (MIT, published by
  typesafe.ai). The unscoped `typesafe-sdk` package on npm is an unrelated,
  squatted package — do not use it.
