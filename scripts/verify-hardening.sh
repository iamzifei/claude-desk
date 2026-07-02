#!/usr/bin/env bash
# Anti-reverse-engineering gate — runs after every mac/win package step.
#
# Packaging MUST fail if any hardening layer is missing from the artifact:
#   1. JS obfuscation applied to our bundles (not skipped via DISABLE_OBFUSCATION)
#   2. Electron fuses flipped (runAsNode off, inspect off, asar integrity on, …)
#   3. Valid code signature (mac only — fuses/asar integrity are only
#      tamper-proof when the binary is signed)
#
# Usage: scripts/verify-hardening.sh [path/to/App.app | path/to/win-unpacked]
# Defaults: dist/mac-arm64/*.app (mac) or dist/win-unpacked (windows CI).
set -euo pipefail

fail() { echo "✗ HARDENING FAILED: $1" >&2; exit 1; }
ok() { echo "✓ $1"; }

# Refuse to bless a build that was explicitly de-obfuscated.
[ -n "${DISABLE_OBFUSCATION:-}" ] && fail "DISABLE_OBFUSCATION is set — refusing to package a readable build"

APP="${1:-}"
if [ -z "$APP" ]; then
  APP=$(ls -d dist/mac-arm64/*.app 2>/dev/null | head -1) || true
  [ -z "$APP" ] && APP=$(ls -d dist/mac/*.app 2>/dev/null | head -1) || true
  [ -z "$APP" ] && [ -d dist/win-unpacked ] && APP="dist/win-unpacked"
fi
[ -d "${APP:-}" ] || fail "packaged app not found (pass the path explicitly)"
echo "Checking: $APP"

# Locate app.asar and the executable for the fuses check (platform-dependent).
if [[ "$APP" == *.app ]]; then
  ASAR="$APP/Contents/Resources/app.asar"
  FUSE_TARGET="$APP"
else
  # Windows unpacked layout: resources/app.asar next to the .exe.
  ASAR="$APP/resources/app.asar"
  FUSE_TARGET=$(ls "$APP"/*.exe 2>/dev/null | head -1) || true
  [ -z "${FUSE_TARGET:-}" ] && fail "executable not found under $APP"
fi
[ -f "$ASAR" ] || fail "app.asar missing (onlyLoadAppFromAsar requires it)"

# --- 1. Obfuscation ---------------------------------------------------------
# javascript-obfuscator encodes every string literal into a base64 string
# array decoded at runtime (stringArrayEncoding: ['base64']). That leaves a
# dense trail of atob/charCodeAt/fromCharCode calls throughout the bundle.
# We check THIS rather than the `_0x` hex identifiers, because esbuild's minify
# pass runs AFTER the obfuscator and renames `_0x…` back to short names (k1,
# K2, …) — so identifier-based detection is a false negative. A readable
# (DISABLE_OBFUSCATION) build has ~0 of these markers; an obfuscated one has
# hundreds. Threshold 20 clears incidental use with a wide margin.
MAIN_JS=$(npx --yes @electron/asar list "$ASAR" | grep -E '^/out/main/index\.js$' || true)
[ -z "$MAIN_JS" ] && fail "main bundle not found inside app.asar"
# `asar extract-file` writes the file (by basename) into the current dir, not
# stdout — so run it from a temp dir and read the result there.
TMP=$(mktemp -d)
ASAR_ABS=$(cd "$(dirname "$ASAR")" && pwd)/$(basename "$ASAR")
( cd "$TMP" && npx --yes @electron/asar extract-file "$ASAR_ABS" out/main/index.js >/dev/null 2>&1 )
[ -s "$TMP/index.js" ] || fail "could not read main bundle from app.asar"
MARKERS=$(grep -oE 'atob|charCodeAt|fromCharCode' "$TMP/index.js" | wc -l | tr -d ' ')
rm -rf "$TMP"
[ "$MARKERS" -ge 20 ] || fail "main bundle is NOT obfuscated (only $MARKERS string-array decode markers; expected ≥20)"
ok "obfuscation present in main bundle ($MARKERS string-array decode markers)"

# --- 2. Electron fuses ------------------------------------------------------
FUSES=$(npx --yes @electron/fuses read --app "$FUSE_TARGET" 2>/dev/null)
echo "$FUSES" | grep -q 'RunAsNode is Disabled' || fail "fuse RunAsNode not disabled"
echo "$FUSES" | grep -q 'EnableNodeCliInspectArguments is Disabled' || fail "fuse NodeCliInspect not disabled"
echo "$FUSES" | grep -q 'EnableNodeOptionsEnvironmentVariable is Disabled' || fail "fuse NodeOptions not disabled"
echo "$FUSES" | grep -q 'EnableEmbeddedAsarIntegrityValidation is Enabled' || fail "fuse AsarIntegrityValidation not enabled"
echo "$FUSES" | grep -q 'OnlyLoadAppFromAsar is Enabled' || fail "fuse OnlyLoadAppFromAsar not enabled"
echo "$FUSES" | grep -q 'EnableCookieEncryption is Enabled' || fail "fuse CookieEncryption not enabled"
ok "all 6 fuses flipped"

# --- 3. Code signature (mac) ------------------------------------------------
if [[ "$APP" == *.app ]]; then
  codesign --verify --deep --strict "$APP" 2>/dev/null || fail "code signature invalid or missing"
  ok "code signature valid"
fi

echo "── all hardening checks passed ──"
