#!/usr/bin/env bash
# Generate 5 visually distinct 10-second HLS ad creatives using FFmpeg.
# Each creative produces 10 × 1-second .ts segments + a playlist.m3u8.
#
# Usage: ./scripts/generate-ads.sh [output_dir]
#   output_dir defaults to public/ads

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
OUTPUT_DIR="${1:-$PROJECT_DIR/public/ads}"

# Creative definitions: NAME COLOR TEXT FREQ
CREATIVES=(
  "creative-1|#3498DB|Ad 1 - Tech Solution|440"
  "creative-2|#E74C3C|Ad 2 - Sport Event|523"
  "creative-3|#2ECC71|Ad 3 - Eco Brand|587"
  "creative-4|#F39C12|Ad 4 - Food & Drink|659"
  "creative-5|#9B59B6|Ad 5 - Entertainment|784"
)

echo "Generating ${#CREATIVES[@]} ad creatives in $OUTPUT_DIR ..."

for entry in "${CREATIVES[@]}"; do
  IFS='|' read -r name color text freq <<< "$entry"
  dir="$OUTPUT_DIR/$name"
  mkdir -p "$dir"

  echo "  [$name] color=$color text=\"$text\" freq=${freq}Hz"

  ffmpeg -y \
    -f lavfi -i "color=c=${color}:s=854x480:d=10:r=25,drawtext=text='${text}':fontsize=64:fontcolor=white:x=(w-tw)/2:y=(h-th)/2:borderw=3:bordercolor=black" \
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
