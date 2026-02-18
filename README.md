# Aegis Shield

A privacy-first browser extension for AI prompt scrubbing and Unicode tag stripping. Real-time PII warnings on LLM chat sites plus a popup to scrub and restore—all processing happens locally in your browser.

## Features

- 🎯 **Real-time warnings** — Toast notifications when PII is detected in ChatGPT, Claude, Gemini, Perplexity prompts
- 🛡️ **PII Detection** — Regex-based detection for emails, phones, SSNs, credit cards, IPs, dates, and more
- 🧹 **Unicode Stripping** — Removes invisible zero-width characters and watermarks
- 📋 **Copy Scrubbed** — One click to copy redacted text to clipboard
- ↩️ **Restore PII** — Paste AI response with placeholders, restore your real data for emails
- ⚡ **Local-Only** — All processing happens in your browser, nothing is sent anywhere
- 🧠 **SLM Ready** — Structured for future Small Language Model integration

## Project Structure

```
aegis-shield/
├── entrypoints/
│   ├── background/
│   │   └── index.ts        # Minimal background
│   ├── llm-prompt.content.ts  # Real-time PII warnings on LLM sites
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

**Automatic (on LLM sites):** Visit ChatGPT, Claude, Gemini, or Perplexity—a toast appears when PII is detected in the prompt box.

**Popup (scrub & restore):**
1. Click the Aegis Shield icon
2. Paste your prompt → Click **Copy scrubbed text** → Paste into any AI chat
3. After getting a response with `[EMAIL]`, `[PHONE]`, etc. → Paste it back into the popup → Click **Restore PII** → Copy for your email

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
