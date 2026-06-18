#!/usr/bin/env bash
# Build a Developer-ID-signed AND Apple-notarized InkNest dmg/zip.
# Credentials live in scripts/notarize.env (gitignored) — never in the repo or chat.
set -euo pipefail

cd "$(dirname "$0")/.."
ENV_FILE="scripts/notarize.env"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "✗ Missing $ENV_FILE — copy scripts/notarize.env.example to it and fill in your Apple creds."
  exit 1
fi

# Load creds into the environment.
set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

# Validate that exactly one notarization method is configured.
have_api=0; have_id=0
[[ -n "${APPLE_API_KEY:-}" && -n "${APPLE_API_KEY_ID:-}" && -n "${APPLE_API_ISSUER:-}" ]] && have_api=1
[[ -n "${APPLE_ID:-}" && -n "${APPLE_APP_SPECIFIC_PASSWORD:-}" && -n "${APPLE_TEAM_ID:-}" ]] && have_id=1

if [[ $have_api -eq 1 ]]; then
  echo "→ Notarizing via App Store Connect API key (${APPLE_API_KEY_ID})"
  if [[ ! -f "${APPLE_API_KEY}" ]]; then
    echo "✗ APPLE_API_KEY file not found: ${APPLE_API_KEY}"; exit 1
  fi
elif [[ $have_id -eq 1 ]]; then
  echo "→ Notarizing via Apple ID (${APPLE_ID}, team ${APPLE_TEAM_ID})"
else
  echo "✗ No complete credential set found in $ENV_FILE."
  echo "  Fill EITHER Method A (APPLE_API_KEY + APPLE_API_KEY_ID + APPLE_API_ISSUER)"
  echo "  OR Method B (APPLE_ID + APPLE_APP_SPECIFIC_PASSWORD + APPLE_TEAM_ID)."
  exit 1
fi

echo "→ Building + signing + notarizing (this uploads to Apple; can take 5–15 min)…"
npx electron-vite build
# -c.mac.notarize=true flips on notarization just for this build; the committed
# config keeps it false so plain `npm run build:mac` stays fast/offline.
npx electron-builder --mac -c.mac.notarize=true

# electron-builder notarizes the .app but NOT the .dmg wrapper. Apple's
# Gatekeeper wants the dmg itself code-signed + notarized + stapled, otherwise
# the downloaded dmg still prompts. Do that here so the dmg is zero-friction.
DMG=$(ls -t dist/*.dmg 2>/dev/null | head -1)
if [[ -n "$DMG" ]]; then
  echo "→ Signing + notarizing the dmg itself: $DMG"
  codesign --force --timestamp --sign "$CSC_NAME" "$DMG"
  ARGS=()
  if [[ -n "${APPLE_API_KEY:-}" ]]; then
    ARGS=(--key "$APPLE_API_KEY" --key-id "$APPLE_API_KEY_ID" --issuer "$APPLE_API_ISSUER")
  else
    ARGS=(--apple-id "$APPLE_ID" --password "$APPLE_APP_SPECIFIC_PASSWORD" --team-id "$APPLE_TEAM_ID")
  fi
  xcrun notarytool submit "$DMG" "${ARGS[@]}" --wait
  xcrun stapler staple "$DMG"
fi

echo "✓ Done. Verifying…"
APP="dist/mac-arm64/InkNest.app"
[[ -d "$APP" ]] && { xcrun stapler validate "$APP" || true; spctl -a -vv -t exec "$APP" || true; }
[[ -n "$DMG" ]] && spctl -a -vv -t open --context context:primary-signature "$DMG" || true
