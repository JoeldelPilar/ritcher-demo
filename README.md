# Ritcher Demo

Demo page for [Ritcher](https://github.com/JoeldelPilar/ritcher) — an open-source live SSAI (Server-Side Ad Insertion) stitcher built in Rust.

## What This Does

A web-based HLS player that connects to a running Ritcher instance and demonstrates live ad insertion. When Ritcher detects SCTE-35 CUE markers in the origin stream, it replaces those segments with ads from a VAST ad server — and you see it happen in real-time in the player.

## Quick Start

### 1. Start Ritcher

```bash
cd /path/to/ritcher

# Minimal (built-in demo content + static ads)
DEV_MODE=true cargo run

# With VAST ad server
DEV_MODE=true \
VAST_ENDPOINT="https://your-adserver.example.com/api/v1/vast?dur=[DURATION]" \
cargo run
```

### 2. Start the Demo Page

```bash
npm install
npm start
```

Open [http://localhost:3333](http://localhost:3333), click **Load Stream**, then **Play**.

## Configuration

| Field | Default | Description |
|---|---|---|
| Stitcher Base URL | `http://localhost:3000` | Where Ritcher is running |
| Origin Playlist URL | *(empty)* | Custom HLS origin. Empty = Ritcher's built-in demo playlist with CUE markers |

## How It Works

```
Origin (demo/Channel Engine)
       |
       v
   Ritcher (localhost:3000)
   - Fetches origin playlist
   - Detects CUE-OUT/CUE-IN markers
   - Replaces ad break segments with VAST ads
   - Returns stitched playlist
       |
       v
   Demo Page (localhost:3333)
   - HLS.js player loads stitched playlist
   - Detects ad segments via URL pattern
   - Shows "AD" overlay during ad breaks
```

## Deploy on Eyevinn OSC

This demo page can be deployed on [Eyevinn Open Source Cloud](https://www.osaas.io) using Web Runner:

```
Service: eyevinn-web-runner
Config: {
  name: "ritcherdemo",
  SourceUrl: "https://github.com/JoeldelPilar/ritcher-demo"
}
```

## License

MIT
