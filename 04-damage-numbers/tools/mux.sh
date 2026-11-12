#!/bin/bash
# Mux build/video.mp4 with both mixes. Usage: tools/mux.sh [video.mp4]
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"; cd "$ROOT"
V="${1:-build/video.mp4}"; mkdir -p out
for pair in "mix_bgm.wav:跳字老虎机_解析.mp4" "mix_nobgm.wav:跳字老虎机-final_nobgm.mp4"; do
  A="build/${pair%%:*}"; O="out/${pair##*:}"
  ffmpeg -y -v error -i "$V" -i "$A" -map 0:v:0 -map 1:a:0 -c:v copy -c:a aac -b:a 192k -ar 48000 -ac 2 -movflags +faststart -shortest "$O"
  echo "$O  $(ffprobe -v error -show_entries format=duration -of csv=p=0 "$O")s"
done
