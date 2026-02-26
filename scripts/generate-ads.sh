#!/usr/bin/env bash
# Generate 5 visually distinct 10-second HLS ad creatives using FFmpeg.
# Each creative has: color background, brand text, countdown timer, progress bar,
# and a moving scan-line for visual motion.
# Produces 10 × 1-second .ts segments + a playlist.m3u8 per creative.
#
# Usage: ./scripts/generate-ads.sh [output_dir]
#   output_dir defaults to public/ads

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
OUTPUT_DIR="${1:-$PROJECT_DIR/public/ads}"

# Creative definitions: NAME|COLOR|TEXT|FREQ
CREATIVES=(
  "creative-1|0x3498DB|Ad 1 — Tech Solution|440"
  "creative-2|0xE74C3C|Ad 2 — Sport Event|523"
  "creative-3|0x2ECC71|Ad 3 — Eco Brand|587"
  "creative-4|0xF39C12|Ad 4 — Food & Drink|659"
  "creative-5|0x9B59B6|Ad 5 — Entertainment|784"
)

echo "Generating ${#CREATIVES[@]} animated ad creatives in $OUTPUT_DIR ..."

for entry in "${CREATIVES[@]}"; do
  IFS='|' read -r name color text freq <<< "$entry"
  dir="$OUTPUT_DIR/$name"
  mkdir -p "$dir"

  echo "  [$name] color=$color text=\"$text\" freq=${freq}Hz"

  # Build filter graph for animated ad creative:
  # 1. Solid color background
  # 2. Animated horizontal scan-line (moving white stripe)
  # 3. Brand text (centered, large)
  # 4. Countdown timer (large, center-bottom)
  # 5. Progress bar at very bottom

  ffmpeg -y \
    -f lavfi -i "color=c=${color}:s=854x480:d=10:r=25,format=yuv420p,drawbox=x=0:y='mod(t*80,ih+40)-20':w=iw:h=3:color=white@0.25:t=fill,drawbox=x=0:y='mod(t*80+200,ih+40)-20':w=iw:h=2:color=black@0.15:t=fill,drawtext=text='${text}':fontsize=48:fontcolor=white:x=(w-tw)/2:y=h*0.32:borderw=2:bordercolor=black@0.6,drawtext=text='%{eif\: 10-floor(t) \: d}':fontsize=120:fontcolor=white@0.9:x=(w-tw)/2:y=h*0.48:borderw=3:bordercolor=black@0.5,drawbox=x=0:y=ih-8:w='iw*t/10':h=8:color=white@0.8:t=fill" \
    -f lavfi -i "sine=frequency=${freq}:duration=10" \
    -r 25 \
    -c:v libx264 -preset fast -profile:v baseline -level 3.0 \
    -pix_fmt yuv420p -g 25 -keyint_min 25 -sc_threshold 0 \
    -c:a aac -b:a 128k -ar 44100 \
    -f hls -hls_time 1 -hls_list_size 0 -hls_flags split_by_time \
    -hls_segment_filename "$dir/out_%03d.ts" \
    "$dir/playlist.m3u8" \
    2>/dev/null

  segments=$(ls "$dir"/out_*.ts 2>/dev/null | wc -l | tr -d ' ')
  echo "    -> $segments segments generated"
done

echo "Done! All creatives ready in $OUTPUT_DIR"
