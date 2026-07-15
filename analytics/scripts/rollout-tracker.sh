#!/usr/bin/env bash
#
# Rollt das WEBUNDO-Analytics-Tracker-Snippet in alle (oder ausgewählte)
# Kundenwebsites aus config/websites.json aus.
#
# Für jede Website:
#   - Repo flach klonen
#   - Snippet vor </body> in jede *.html einfügen (idempotent: übersprungen,
#     wenn bereits vorhanden)
#   - auf einen Branch committen und pushen (verändert NICHT den Live-Stand;
#     Merge/PR entscheidest du je Repo)
#   - lokalen Klon wieder löschen (schont Speicher)
#
# Voraussetzungen: git mit Push-Rechten (GitHub-Auth), jq, perl.
#
# Nutzung:
#   ANALYTICS_HOST=https://analytics.webundo.de \
#   BRANCH=claude/analytics-tracker \
#   scripts/rollout-tracker.sh [tracking_id ...]
#
# Ohne Argumente werden ALLE Einträge aus der Config verarbeitet.
# Mit Argumenten nur die genannten tracking_ids (z. B. zum Testen einzelner).

set -euo pipefail

HERE="$(cd "$(dirname "$0")/.." && pwd)"
CONFIG="$HERE/config/websites.json"
ANALYTICS_HOST="${ANALYTICS_HOST:-https://analytics.webundo.de}"
BRANCH="${BRANCH:-claude/analytics-tracker}"
GH_OWNER="${GH_OWNER:-SavioLD}"
WORKDIR="$(mktemp -d)"
trap 'rm -rf "$WORKDIR"' EXIT

command -v jq >/dev/null || { echo "jq wird benötigt"; exit 1; }

FILTER=("$@")
in_filter() { [ ${#FILTER[@]} -eq 0 ] && return 0; for f in "${FILTER[@]}"; do [ "$f" = "$1" ] && return 0; done; return 1; }

SNIPPET_FILE="$WORKDIR/snippet.html"

echo "Analytics-Host: $ANALYTICS_HOST"
echo "Branch:         $BRANCH"
echo

total=0; changed=0; skipped=0; failed=0

# Über alle Einträge iterieren.
jq -c '.websites[]' "$CONFIG" | while read -r row; do
  tid=$(echo "$row" | jq -r '.tracking_id')
  repo=$(echo "$row" | jq -r '.repo // empty')
  name=$(echo "$row" | jq -r '.name')
  in_filter "$tid" || continue
  [ -z "$repo" ] && { echo "· $name: kein Repo hinterlegt, übersprungen"; continue; }
  total=$((total+1))

  dir="$WORKDIR/$tid"
  if ! git clone --depth 1 "https://github.com/$repo.git" "$dir" >/dev/null 2>&1; then
    echo "✗ $name ($repo): Klonen fehlgeschlagen"; failed=$((failed+1)); continue
  fi

  # Snippet mit korrekter tracking_id vorbereiten.
  printf '<!-- WEBUNDO Analytics -->\n<script src="%s/tracker.js" data-website-id="%s" defer></script>\n</body>' \
    "$ANALYTICS_HOST" "$tid" > "$SNIPPET_FILE"

  files_changed=0
  while IFS= read -r -d '' html; do
    grep -q "$ANALYTICS_HOST/tracker.js" "$html" && continue      # schon vorhanden
    grep -q "</body>" "$html" || continue                          # kein </body>
    perl -0777 -pi -e "BEGIN{local \$/; open F,'<','$SNIPPET_FILE'; \$s=<F>} s/<\\/body>/\$s/" "$html"
    files_changed=$((files_changed+1))
  done < <(find "$dir" -maxdepth 2 -name '*.html' -print0)

  if [ "$files_changed" -eq 0 ]; then
    echo "= $name: bereits eingebunden, nichts zu tun"; skipped=$((skipped+1))
    rm -rf "$dir"; continue
  fi

  (
    cd "$dir"
    git checkout -b "$BRANCH" >/dev/null 2>&1 || git checkout "$BRANCH" >/dev/null 2>&1
    git add -A
    git -c user.name="WEBUNDO Analytics" -c user.email="analytics@webundo.de" \
      commit -q -m "WEBUNDO Analytics Tracker einbinden (data-website-id=$tid)"
    for i in 1 2 3 4; do
      git push -u origin "$BRANCH" >/dev/null 2>&1 && break || sleep $((2**i))
    done
  ) && { echo "✓ $name: $files_changed Seite(n) -> Branch $BRANCH gepusht"; changed=$((changed+1)); } \
     || { echo "✗ $name: Push fehlgeschlagen"; failed=$((failed+1)); }

  rm -rf "$dir"
done

echo
echo "Fertig. Gesamt: $total, geändert/gepusht: $changed, übersprungen: $skipped, fehlgeschlagen: $failed"
