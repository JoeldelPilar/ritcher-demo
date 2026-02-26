# Ritcher Demo

Interactive demo for [Ritcher](https://github.com/JoeldelPilar/ritcher) — an open-source HLS & DASH SSAI/SGAI stitcher built in Rust.

## What This Does

A web-based player that connects to a running Ritcher instance and demonstrates live ad insertion with configurable parameters. Choose format (HLS/DASH), number of ad breaks (1-5), and content interval — then watch Ritcher stitch ads into the stream in real-time.

Features:
- **Dual player support** — HLS.js for HLS, Shaka Player for DASH
- **Configurable ad breaks** — 1-5 breaks with 10/15/20s content intervals
- **Visual timeline** — shows content vs ad proportions with playhead
- **Ad break overlay** — detects and displays ad segments live
- **5 unique ad creatives** — color-coded with countdown timers, served locally

## Quick Start

### 1. Start Ritcher (with demo ad provider)

```bash
cd /path/to/ritcher
AD_PROVIDER_TYPE=demo \
DEMO_AD_BASE_URL=http://localhost:3333/ads \
DEV_MODE=true \
cargo run
```

### 2. Start the Demo

```bash
npm install
npm start
```

Open [http://localhost:3333](http://localhost:3333), select your options, and click **Start Demo**.

## Configuration

### Demo Controls

| Control | Options | Default | Description |
|---------|---------|---------|-------------|
| Format | HLS, DASH | HLS | Streaming protocol |
| Ad Breaks | 1-5 | 3 | Number of ad breaks to insert |
| Interval | 10s, 15s, 20s | 15s | Content duration between breaks |

### Advanced Settings

| Field | Default | Description |
|-------|---------|-------------|
| Stitcher Base URL | `http://localhost:3000` | Where Ritcher is running |
| Custom Origin URL | *(empty)* | Override the demo playlist with your own HLS/DASH stream |

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 3333 | Server port |
| `RITCHER_URL` | `http://localhost:3000` | Ritcher stitcher URL (auto-configured in Advanced Settings) |

## How It Works

```
Demo Page (localhost:3333)
  |
  |  1. User selects format, breaks, interval
  |  2. Builds URL → Ritcher
  v
Ritcher (localhost:3000)
  |  GET /demo/playlist.m3u8?breaks=3&interval=15
  |  → Generates origin playlist with SCTE-35 CUE markers
  |
  |  GET /stitch/{session}/playlist.m3u8?origin=...
  |  → Fetches origin, detects CUE-OUT/CUE-IN
  |  → Replaces ad segments with DemoAdProvider creatives
  |  → Returns stitched manifest
  v
Player (HLS.js / Shaka)
  → Plays stitched stream
  → Detects ad segments via /ad/ URL pattern
  → Shows overlay + timeline during ad breaks
  |
  v
Ad Segments ← served from Demo Page (localhost:3333/ads/)
  → 5 creatives × 10 segments × 1s = 50 .ts files
```

## Ad Creatives

Five visually distinct ad creatives are pre-generated in `public/ads/`:

| Creative | Color | Label |
|----------|-------|-------|
| creative-1 | Blue | Tech Solution |
| creative-2 | Red | Sport Event |
| creative-3 | Green | Eco Brand |
| creative-4 | Orange | Food & Drink |
| creative-5 | Purple | Entertainment |

Each creative is 10 seconds (10 × 1s HLS segments). To regenerate:

```bash
./scripts/generate-ads.sh
```

Requires FFmpeg with libx264 and AAC support.

## Deploy on Eyevinn OSC

### 1. Deploy ritcher-demo (Node.js)

Deploy as a My App on [Eyevinn Open Source Cloud](https://www.osaas.io):

```bash
# Create parameter store
osc setup-parameter-store ritcherdemo

# Set Ritcher URL
osc set-parameter ritcherdemo RITCHER_URL https://<your-ritcher-instance-url>

# Deploy
osc create-my-app ritcherdemo nodejs https://github.com/JoeldelPilar/ritcher-demo --config-service ritcherdemo
```

### 2. Deploy Ritcher (Rust/Docker)

Ritcher is available in the OSC catalog. Create an instance and point `DEMO_AD_BASE_URL` to the demo app:

```bash
osc create-service-instance joeldelpilar-ritcher \
  --name myritcher \
  --config AD_PROVIDER_TYPE=demo \
  --config DEMO_AD_BASE_URL=https://<your-demo-app-url>/ads
```

## License

MIT
