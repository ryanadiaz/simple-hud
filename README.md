# Simple Hud

A G2 smart glasses app built with [even-toolkit](https://www.npmjs.com/package/even-toolkit).

## Development

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

## Test with Simulator

```bash
npx @evenrealities/evenhub-simulator@latest http://localhost:5173
```

## Test with Glasses using Prototype QR code

```bash
evenhub qr -u http://192.168.68.104:5173 --http
```

## Build for Even Hub

```bash
npm run build
npx @evenrealities/evenhub-cli pack app.json dist -o simplehud.ehpk
```

Upload the generated `.ehpk` file to the Even Hub.
