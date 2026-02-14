# Aegis Shield

A privacy-first browser extension for AI prompt scrubbing and Unicode tag stripping. Paste your prompts into the popup to detect and redact PII before sending to ChatGPT, Claude, or any AI—all processing happens locally in your browser.

## Why Popup-Only?

ChatGPT and similar AI platforms use anti-tampering that blocks extensions that inject into their pages (causing 403 errors). Aegis Shield uses a **popup workflow** instead: you paste your prompt into the extension, scrub it, then copy the safe version to paste into any AI chat. No injection, no breakage.

## Features

- 🛡️ **PII Detection** — Regex-based detection for emails, phones, SSNs, credit cards, IPs, dates, and more
- 🧹 **Unicode Stripping** — Removes invisible zero-width characters and watermarks
- 📋 **Copy Scrubbed** — One click to copy redacted text to clipboard
- ⚡ **Local-Only** — All processing happens in your browser, nothing is sent anywhere
- 🧠 **SLM Ready** — Structured for future Small Language Model integration

## Project Structure

```
aegis-shield/
├── entrypoints/
│   ├── background/
│   │   └── index.ts     # Minimal background
│   └── popup/
│       ├── index.html   # Popup UI
│       ├── main.ts      # Popup logic
│       └── style.css
├── src/
│   ├── logic/
│   │   └── slm-integration.ts  # Future SLM
│   └── utils/
│       └── pii-detector.ts     # PII detection & scrubbing
├── wxt.config.ts
└── package.json
```

## Development

### Install

```bash
npm install
```

### Build

```bash
npm run build
```

### Dev (hot reload)

```bash
npm run dev
```

### Load in Chrome

1. Go to `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked**
4. Select `.output/chrome-mv3-dev` (dev) or `.output/chrome-mv3` (build)

## Usage

1. Click the Aegis Shield icon in your toolbar
2. Paste your prompt into the text area
3. Review detected PII (emails, phones, etc.)
4. Click **Copy scrubbed text**
5. Paste into ChatGPT, Claude, or any AI chat

## PII Types Detected

| Type      | Redacted as |
|-----------|-------------|
| Email     | `[EMAIL]`   |
| Phone     | `[PHONE]`   |
| SSN       | `[SSN]`     |
| Credit card| `[CARD]`   |
| ZIP code  | `[ZIP]`     |
| IP address| `[IP]`      |
| Dates     | `[DATE]`    |

## Future Enhancements

- SLM-based PII detection
- Context-aware redaction
- Custom PII patterns
- Support for more formats

## License

See LICENSE file for details.
