#!/bin/bash
# Run load tests and output results to JSON + HTML summary
# Usage: ./run.sh [small|medium|large|all]

SCENARIO=${1:-small}
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
OUT_DIR="./results/${TIMESTAMP}_${SCENARIO}"

mkdir -p "$OUT_DIR"

echo "▶ Running scenario: $SCENARIO"
echo "▶ Output: $OUT_DIR"

k6 run \
  -e SCENARIO="$SCENARIO" \
  --out json="$OUT_DIR/raw.json" \
  --summary-export="$OUT_DIR/summary.json" \
  gamefinder.test.js \
  2>&1 | tee "$OUT_DIR/run.log"

echo ""
echo "✓ Done. Results saved to $OUT_DIR"
echo ""
echo "Key metrics to watch:"
echo "  http_req_duration p(95)  — latence 95e percentile"
echo "  http_req_failed          — taux d'erreurs HTTP"
echo "  login_success            — taux de login réussis"
echo "  ws_connect_duration      — latence WebSocket"
