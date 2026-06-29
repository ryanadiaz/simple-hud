# Contributing

Thanks for taking the time. Here's how to get started.

## Setup

```bash
git clone https://github.com/ryanadiaz/simple-hud.git
cd simple-hud
npm install
npm run dev
```

Test your changes in the simulator before opening a PR:

```bash
npx @evenrealities/evenhub-simulator@latest http://localhost:5173
```

## Process

1. Open an issue to describe what you want to change — especially for anything beyond a bug fix
2. Fork the repo and create a branch from `master`
3. Make your change, test it in the simulator, open a PR

## What's Welcome

- Bug fixes
- Display layout improvements
- New persistent settings
- Better background/foreground recovery
- Additional data sources (battery, steps, notifications)

## What to Avoid

- Adding external runtime dependencies without discussion first
- Changes that break the 8-container limit on the G2 display
- Features that require an API key to function

## Questions

Open an issue or reach out on X at [@mrryanadiaz](https://x.com/mrryanadiaz).
