# aegis-shield

A privacy-first browser extension for real-time AI prompt scrubbing and Unicode tag stripping. Local-only PII redaction using SLMs.

## Features

- 🛡️ **Background Service Worker**: Intercepts outgoing fetch requests to `api.openai.com` and `anthropic.com`
- 🔍 **PII Detection**: Regex-based fast-pass filter for detecting PII in ChatGPT message input
- 🎯 **Content Script**: Monitors ChatGPT input box and provides real-time warnings for detected PII
- 🧠 **SLM Ready**: Structured with `/src/logic` folder for future Small Language Model integration
- ⚡ **Built with WXT**: Chrome Extension Manifest V3 using the WXT framework
- 📘 **TypeScript**: Fully typed codebase for better development experience

## Project Structure

```
aegis-shield/
├── entrypoints/
│   ├── background/
│   │   └── index.ts          # Background service worker
│   └── chatgpt.content.ts    # Content script for ChatGPT
├── src/
│   ├── logic/
│   │   └── slm-integration.ts # Future SLM integration
│   └── utils/
│       └── pii-detector.ts   # Regex-based PII detection
├── wxt.config.ts             # WXT configuration
├── tsconfig.json             # TypeScript configuration
└── package.json
```

## Development

### Prerequisites

- Node.js 16+
- npm or yarn

### Installation

```bash
npm install
```

### Build

Build for Chrome:
```bash
npm run build
```

Build for Firefox:
```bash
npm run build:firefox
```

### Development Mode

Run with hot-reload for Chrome:
```bash
npm run dev
```

Run with hot-reload for Firefox:
```bash
npm run dev:firefox
```

### Package for Distribution

```bash
npm run zip
```

## PII Detection

The extension currently uses regex-based patterns to detect:

- Email addresses
- Phone numbers (US format)
- Social Security Numbers (SSN)
- Credit card numbers (with Luhn validation)
- ZIP codes
- IP addresses
- Dates

## Future Enhancements

- Integration with Small Language Models (SLM) for advanced PII detection
- Context-aware redaction
- Custom PII pattern learning
- Semantic analysis of prompts
- Support for additional AI platforms

## License

See LICENSE file for details.
