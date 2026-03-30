# Aegis Shield

A privacy-first browser extension that detects and redacts PII in prompts before you send them to AI chatbots. Paste your text, scrub it, then paste the safe version into ChatGPT, Claude, or any AI—all processing happens locally in your browser.

Scrub / restore uses **[@aegisproxy/aegis-sdk](https://www.npmjs.com/package/@aegisproxy/aegis-sdk)** ([source](https://github.com/AegisProxy/aegis-sdk), `AegisProtector`): each sensitive span gets a stable token like `[REDACTED_EMAIL_abc12def]` with correct round-trip after the AI replies. PII **detection** is still regex (+ optional on-device NER); the SDK owns **tokenization and mapping** (v1 state in `chrome.storage.local`).

**Layout:** `package.json` uses `"@aegisproxy/aegis-sdk": "file:../AegisSDK"`. Keep `AegisSDK` and `aegis-shield` as sibling folders, run `npm run build` in **AegisSDK** once, then `npm install` here.

## Features

- **PII Detection** - Emails, phones, SSNs, credit cards, IPs, dates, and more
- **Unicode Stripping** - Removes invisible zero-width characters and watermarks
- **Copy Scrubbed** - One click to copy redacted text to clipboard
- **Restore PII** - Paste AI response with placeholders, restore your real data for emails
- **Local-Only** - Nothing leaves your browser

## Quick Start

```bash
# One-time: build local @aegisproxy/aegis-sdk sibling (see layout above)
(cd ../AegisSDK && npm install && npm run build)

npm install
npm run build
```

Load in Chrome: `chrome://extensions` → Developer mode → Load unpacked → `.output/chrome-mv3`

## Usage

**Popup:**
1. **Scrub** - Click the extension icon, paste your prompt, click **Copy scrubbed text**
2. **Send** - Paste into ChatGPT, Claude, or any AI
3. **Restore** - After getting a response with `[EMAIL]`, `[PHONE]`, etc., paste it back into the popup and click **Restore PII** to get your real data back

**Context menu (right-click anywhere):**
- **Scrub clipboard** - Copy text to clipboard, then right‑click → Scrub clipboard. Clipboard is replaced with scrubbed text; mapping is saved.
- **Restore PII in clipboard** - Paste AI response into clipboard, then right‑click → Restore PII in clipboard. Clipboard is replaced with restored text.

**Keyboard shortcuts** (customize at `chrome://extensions/shortcuts`):
| Action | Default (Win/Linux) | Default (Mac) |
|--------|---------------------|---------------|
| Scrub clipboard | `Ctrl + Shift + S` | `⌘ + Shift + S` |
| Restore PII | `Ctrl + Shift + Z` | `⌘ + Shift + Z` |

## PII Types

Detection types map to **Aegis SDK** entity tags; scrubbed text uses tokens like `[REDACTED_EMAIL_xxxxxxxx]` (stable per distinct value).

| Type        | SDK entity | Detection   |
|-------------|------------|-------------|
| Email       | `email`    | Regex       |
| Phone       | `phone`    | Regex       |
| SSN         | `ssn`      | Regex       |
| Credit card | `card`     | Regex       |
| ZIP code    | `zip`      | Regex       |
| IP address  | `ip`       | Regex       |
| Dates       | `date`     | Regex       |
| Names       | `name`     | AI (optional) |
| Orgs        | `org`      | AI (optional) |
| Locations   | `location` | AI (optional) |

**AI detection** - Hold the "Hold to download" button in the popup to download a local NER model (~110MB). The download runs in the background, so you can close the popup and it will continue. Once ready, an "AI ready" badge appears and names, organizations, and locations are detected automatically.

## Project Structure

```
aegis-shield/
├── entrypoints/
│   ├── background/index.ts
│   ├── offscreen/              # Context menu clipboard (Chrome only)
│   └── popup/
│       ├── index.html
│       ├── main.ts
│       └── style.css
├── src/
│   ├── logic/slm-integration.ts   # Future SLM placeholder
│   └── utils/pii-detector.ts      # PII detection (regex / merge)
│   └── utils/aegis-scrub.ts       # @aegisproxy/aegis-sdk scrub + restore
├── wxt.config.ts
├── tailwind.config.js
└── package.json
```

## Where the AI model is stored

The NER model (Xenova/bert-base-NER, ~110MB quantized) is cached by Transformers.js using the browser's **Cache API** under the name `transformers-cache`. This is part of Chrome's internal storage for your profile:

- **Chrome:** Data is stored in your user profile (not in a simple folder you can browse). You can inspect it via DevTools: open any extension page → Application → Cache Storage → `transformers-cache`.
- **Persistence:** The cache survives extension reloads and browser restarts. It is not cleared when you clear browsing data (Cache Storage is separate).
- **Shared:** The cache is shared across all pages in the extension (popup, offscreen, etc.).

## Scripts

| Command | Description |
|---------|-------------|
| `npm run build` | Build for production (`.output/chrome-mv3`) |
| `npm run dev` | Dev mode with hot reload (`.output/chrome-mv3-dev`) |
| `npm run zip` | Package for distribution |

## License

MIT 

