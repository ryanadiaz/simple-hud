<div align="center">

# Simple HUD for Even Realities G2

**Clock, weather, and mic level — always in view on your G2 glasses.**

<br />

[![Star this repo](https://img.shields.io/github/stars/ryanadiaz/simple-hud?style=for-the-badge&logo=github&label=%E2%AD%90%20Star%20this%20repo&color=yellow)](https://github.com/ryanadiaz/simple-hud/stargazers)
&nbsp;&nbsp;
[![Follow @mrryanadiaz](https://img.shields.io/badge/Follow_%40mrryanadiaz-000000?style=for-the-badge&logo=x&logoColor=white)](https://x.com/mrryanadiaz)

<br />

[![License: MIT](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)](LICENSE)
&nbsp;
[![React 19](https://img.shields.io/badge/React-19-61dafb?style=for-the-badge&logo=react)](https://react.dev)
&nbsp;
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
&nbsp;
[![Even Hub](https://img.shields.io/badge/Even%20Hub-App-black?style=for-the-badge)](https://www.evenrealities.com)

---

A heads-up display for your G2 glasses that shows what you actually need — time, weather, and sound level. Nothing more. Built with even-toolkit and ready to run in minutes.

[Quick Start](#quick-start) &nbsp;|&nbsp; [Features](#features) &nbsp;|&nbsp; [How It Works](#how-it-works) &nbsp;|&nbsp; [Contributing](#contributing)

</div>

## Why This Exists

Even Hub ships with generic widgets. Simple HUD puts the three most useful data points — clock, weather, and mic level — in a clean layout on the right side of your field of view. Your left visual field stays completely clear.

Double-click the touchpad to blank the display in one gesture. Double-click again to bring it back.

## Features

| Feature | Details |
|---|---|
| **Clock** | 12-hour time, on by default every session |
| **Weather** | Temp, condition, feels-like. Location persists between sessions — no re-entering your city. |
| **Microphone** | Live decibel readout from the G2 mic, with browser fallback for simulator testing |
| **Hidden mode** | Double-click the touchpad to hide everything. Double-click to restore. |
| **Persistent settings** | Every toggle remembers its state when you close and reopen the app |
| **Simulator support** | Fully testable without physical glasses |

## Display Layout

```
┌──────────────────────────────────────────────────────┐
│  576 × 288 px  ·  Even Realities G2                 │
│                                    ┌──────────────┐  │
│                                    │   9:41 AM    │  │  ← Clock
│                                    │  72°F  ☀️    │  │  ← Weather
│                                    │ Feels 68°F   │  │
│                                    │  Mic: 54 dB  │  │  ← Decibels
│                                    └──────────────┘  │
└──────────────────────────────────────────────────────┘
```

All elements sit in the right column (x: 360–571). Five independent text containers update without a full page redraw — no flicker.

## Quick Start

**1. Clone and install**
```bash
git clone https://github.com/ryanadiaz/simple-hud.git
cd simple-hud
npm install
```

**2. Start the dev server**
```bash
npm run dev
```

**3. Test in the simulator**
```bash
npx @evenrealities/evenhub-simulator@latest http://localhost:5173
```

**4. Test on your glasses**
```bash
evenhub qr -u http://<your-local-ip>:5173 --http
```

**5. Build and deploy**
```bash
npm run pack
```

Upload the generated `simplehud.ehpk` to Even Hub.

## How It Works

Simple HUD builds a custom page using `GlassesSdk` directly, placing text containers at exact pixel positions on the 576×288 display. Each container updates independently via `updateWithEvenHubSdk()` — only the changed element gets rewritten.

Weather data comes from [Open-Meteo](https://open-meteo.com/) — no API key required. Your location is saved to `localStorage` and restored next session.

The mic uses the G2's built-in microphone via `audioControl()`. If glasses aren't connected, it falls back to your browser mic automatically.

When the phone screen locks or the app moves to the background, the display recovers automatically when you bring it back — no manual refresh needed.

## Touchpad Controls

| Gesture | Action |
|---|---|
| Double-click | Toggle display hidden / visible |

## Settings

Each feature has its own toggle in the companion Settings app. Settings are saved to `localStorage` and restored on every open. The clock is always on by default — other features start off until you enable them.

## Contributing

Open an issue first for anything larger than a bug fix. PRs are welcome.

```bash
git clone https://github.com/ryanadiaz/simple-hud.git
cd simple-hud
npm install
npm run dev
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for details.

## License

MIT — see [LICENSE](LICENSE).

---

<div align="center">

Built by [Ryan Diaz](https://github.com/ryanadiaz) | [ryanadiaz.com](https://ryanadiaz.com)

<br />

**If this saves you time:**

[![Star this repo](https://img.shields.io/github/stars/ryanadiaz/simple-hud?style=for-the-badge&logo=github&label=%E2%AD%90%20Star%20this%20repo&color=yellow)](https://github.com/ryanadiaz/simple-hud/stargazers)
&nbsp;&nbsp;
[![Follow @mrryanadiaz](https://img.shields.io/badge/Follow_%40mrryanadiaz-000000?style=for-the-badge&logo=x&logoColor=white)](https://x.com/mrryanadiaz)

</div>
