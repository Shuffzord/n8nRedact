<div align="center">

<img src="public/logo-white.png" alt="n8nRedact logo" width="96" />

# n8nRedact

**Deterministic, fully client-side anonymizer for exported n8n workflow JSON.**

[![CI](https://github.com/Shuffzord/n8nRedact/actions/workflows/ci.yml/badge.svg)](https://github.com/Shuffzord/n8nRedact/actions/workflows/ci.yml)
[![Deploy](https://github.com/Shuffzord/n8nRedact/actions/workflows/deploy.yml/badge.svg)](https://github.com/Shuffzord/n8nRedact/actions/workflows/deploy.yml)
[![Live demo](https://img.shields.io/badge/demo-live-2ea44f)](https://shuffzord.github.io/n8nRedact/)

**[Try it live →](https://shuffzord.github.io/n8nRedact/)**

</div>

---

Paste or drop a workflow export, get back a version with every secret, credential, and identifier replaced by realistic-but-fake values — safe to share, still importable into n8n.

> **Nothing you paste ever leaves your browser.** There's no backend. A strict Content-Security-Policy (`connect-src 'none'`) blocks all network egress at runtime, so this isn't just a promise in the code — it's enforced by the browser itself.

## Contents

- [Features](#features)
- [Getting started](#getting-started)
- [How it works](#how-it-works)
- [Privacy & security](#privacy--security)
- [Project structure](#project-structure)
- [Deployment](#deployment)
- [Contributing](#contributing)

## Features

- 🔁 **Deterministic anonymization** — the same original value always maps to the same replacement, so relationships between nodes stay intact (e.g. a credential referenced twice still matches after redaction).
- 🧩 **Format-preserving** — replacements keep the shape of the original (valid email, valid URL, valid UUID/hex id) so the anonymized workflow still imports into n8n.
- 🛡️ **Rule-based engine**, covering:
  - API keys / tokens / secret fields
  - Credential ids and names
  - Resource names and resource locators (Airtable, Postgres, Notion, etc.)
  - Messaging ids (e.g. Telegram `chatId`)
  - UUIDs / hex ids
  - Email addresses
  - URLs (including path-embedded secrets, e.g. Slack/Discord webhook tokens)
- 🎚️ Each rule can be toggled on/off individually.
- 🔍 **Side-by-side and diff views** of the original vs. anonymized workflow.
- ⚠️ **Risk report** summarizing what kind of sensitive data was found, plus warnings for things rules can't safely handle (e.g. pinned execution data).
- 📋 **Copy / download** the anonymized result.
- 📴 **Fully offline** — a service worker precaches the app shell so it keeps working after the first visit, with no weakening of the runtime CSP.

## Getting started

Requires [pnpm](https://pnpm.io/).

```bash
pnpm install
pnpm dev
```

Open the printed local URL — everything runs client-side. Or just use the [live demo](https://shuffzord.github.io/n8nRedact/), which is the same static build.

### Other scripts

| Command           | Description                                    |
| ----------------- | ---------------------------------------------- |
| `pnpm build`      | Type-check and build the static production app |
| `pnpm preview`    | Preview the production build locally           |
| `pnpm test`       | Run unit tests (Vitest)                        |
| `pnpm test:watch` | Run unit tests in watch mode                   |
| `pnpm test:e2e`   | Run end-to-end tests (Playwright)              |
| `pnpm check`      | Svelte/TypeScript type-checking                |
| `pnpm lint`       | Check formatting (Prettier) and lint (ESLint)  |
| `pnpm format`     | Auto-format the codebase                       |

Git hooks (via Husky) run formatting and linting on staged files before each commit.

## How it works

```
Input JSON → parse → recursive traversal → rule pipeline → replacement map → output JSON
```

- The engine (`src/lib/engine`) recursively visits every value in the parsed JSON.
- Rules run in a fixed order: whole-value rules (secret fields, credential ids/names, messaging ids) first, so their contents aren't re-scanned by pattern rules, followed by pattern-matching rules (UUIDs, emails, URLs, hex ids).
- A shared context keeps a deterministic map from original → fake value per category, so repeated originals always resolve to the same replacement (referential integrity across the whole document).
- The risk report (`src/lib/engine/risk.ts`) scores the _original_ input based on what the rules found, and flags residual risks (like `pinData`) that can't be fully handled by deterministic rules alone.

See `src/lib/engine/rules/` for the individual rule implementations.

## Privacy & security

- **The app makes zero network requests at runtime.** This is enforced by a `connect-src 'none'` Content-Security-Policy — not just app logic — so even a bug or a malicious dependency couldn't exfiltrate what you paste.
- **No analytics, telemetry, or third-party scripts are embedded in the app.** Your workflow JSON is never read by anything outside your browser tab.
- Processing happens entirely client-side; closing the tab discards everything.
- Covered by end-to-end tests that assert no foreign requests occur and that a CSP violation is actually raised if network egress is attempted (`tests/e2e/privacy.spec.ts`).

**Distinguishing this from GitHub Pages hosting stats:** like any static site, GitHub Pages logs basic server-side request metadata (e.g. page visits) as part of serving the files, visible to the repo maintainer under the repo's _Insights → Traffic_. That's GitHub's own hosting log, generated the same way for every GitHub Pages site — it is unrelated to, and has no visibility into, the workflow content you paste or process in the app, which never leaves your browser in the first place.

## Project structure

```
src/
  lib/
    engine/          rule engine: types, traversal, generators, risk scoring
      rules/         individual anonymization rules
    components/       Svelte UI components (editor, diff view, rule panel, report)
    csp.ts            the Content-Security-Policy applied to the built app
  App.svelte          main application shell
tests/
  engine/             unit tests + fixtures for the rule engine
  e2e/                Playwright tests (flow, privacy, offline)
  coverage-matrix.test.ts   living requirement → test coverage matrix
```

## Deployment

Pushing to `main` runs CI (lint, type-check, build, unit + e2e tests) and, on success, deploys the static build to GitHub Pages: **https://shuffzord.github.io/n8nRedact/**. See `.github/workflows/ci.yml` and `.github/workflows/deploy.yml`.

## Contributing

Standard flow: fork, branch, `pnpm install`, make changes, ensure `pnpm lint`, `pnpm check`, `pnpm test`, and `pnpm test:e2e` pass, then open a PR.
