# Aegis Shield

A privacy-first browser extension that detects and redacts PII in prompts before you send them to AI chatbots. Paste your text, scrub it, then paste the safe version into ChatGPT, Claude, or any AI—all processing happens locally in your browser.

## Features

- **PII Detection** — Emails, phones, SSNs, credit cards, IPs, dates, and more
- **Unicode Stripping** — Removes invisible zero-width characters and watermarks
- **Copy Scrubbed** — One click to copy redacted text to clipboard
- **Restore PII** — Paste AI response with placeholders, restore your real data for emails
- **Local-Only** — Nothing leaves your browser

## Quick Start

```bash
npm install
npm run build
```

Load in Chrome: `chrome://extensions` → Developer mode → Load unpacked → `.output/chrome-mv3`

## Usage

1. **Scrub** — Click the extension icon, paste your prompt, click **Copy scrubbed text**
2. **Send** — Paste into ChatGPT, Claude, or any AI
3. **Restore** — After getting a response with `[EMAIL]`, `[PHONE]`, etc., paste it back into the popup and click **Restore PII** to get your real data back for your email

## PII Types

| Type        | Redacted as |
|------------|-------------|
| Email      | `[EMAIL]`   |
| Phone      | `[PHONE]`   |
| SSN        | `[SSN]`     |
| Credit card| `[CARD]`    |
| ZIP code   | `[ZIP]`     |
| IP address | `[IP]`      |
| Dates      | `[DATE]`    |

## Project Structure

```
aegis-shield/
├── entrypoints/
│   ├── background/index.ts
│   └── popup/
│       ├── index.html
│       ├── main.ts
│       └── style.css
├── src/
│   ├── logic/slm-integration.ts   # Future SLM placeholder
│   └── utils/pii-detector.ts      # PII detection & scrubbing
├── wxt.config.ts
├── tailwind.config.js
└── package.json
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run build` | Build for production (`.output/chrome-mv3`) |
| `npm run dev` | Dev mode with hot reload (`.output/chrome-mv3-dev`) |
| `npm run zip` | Package for distribution |

## License

MIT 

