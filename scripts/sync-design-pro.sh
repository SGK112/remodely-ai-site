#!/usr/bin/env bash
# Copy the designer out of this repo into the standalone remodely-design-pro
# checkout. Every file below is byte-identical in both — the app moved to that
# repo's root, and its absolute /js, /css, /images and /data references resolve
# the same there, so nothing needs rewriting. That is deliberate: the moment a
# path has to be patched on the way across, the two copies start drifting.
#
#   scripts/sync-design-pro.sh ../remodely-design-pro
set -euo pipefail
DEST="${1:?usage: sync-design-pro.sh <path-to-remodely-design-pro>}"
[ -d "$DEST/.git" ] || { echo "not a git checkout: $DEST" >&2; exit 1; }

# App files (room-designer/* -> repo root).
#
# --delete is what keeps a file removed here from lingering there, but the
# destination has files of its own that were never in room-designer/ — its
# README, deploy config and .gitignore. Without these excludes the first sync
# deletes them.
rsync -a --delete --exclude '.git' \
      --exclude 'README.md' --exclude 'render.yaml' --exclude '.gitignore' \
      --exclude 'js/' --exclude 'css/' --exclude 'images/' \
      room-designer/ "$DEST/"

# the site-root files the app depends on
mkdir -p "$DEST/js" "$DEST/css" "$DEST/images"
cp js/config.js js/supabase-init.js js/remodely-auth.js js/auth-state.js \
   js/designer-pro-features.js js/image-fallback.js js/remodely-hub.js \
   js/tool-switcher.js js/_tenant.js "$DEST/js/"
cp css/marketplace-mobile-fix.css "$DEST/css/"
cp images/remodely-house-logo.svg "$DEST/images/"
for d in countertops tile flooring sinks faucets bravo-tile search-index; do
  cp "data/$d.json" "$DEST/data/"
done
cp scripts/sync-designer-data.js "$DEST/scripts/"

echo "synced into $DEST — review with: git -C \"$DEST\" status"
