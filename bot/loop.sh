#!/usr/bin/env bash
# ============================================================
#  Kör alla fyra botarna var 10:e minut i ca 5,5 timmar (GitHub Actions max är 6 h).
#  GitHubs egna schema (cron) körs bara några gånger per dygn i små repon, därför loopar vi själva.
#  Efter varje runda sparas läget på grenen bot-state så att hemsidan uppdateras direkt.
#  Varje runda hämtar senaste bot-koden från main, så ändringar slår igenom inom 10 minuter.
# ============================================================
set -u
ROUNDS=${ROUNDS:-33}          # 33 rundor x 10 min = 5 h 30 min
EVERY=${EVERY:-600}           # sekunder mellan rundor
REPO_URL="https://x-access-token:${GITHUB_TOKEN}@github.com/${GITHUB_REPOSITORY}.git"

save_state() {
    rm -rf state-repo && mkdir state-repo && (
        cd state-repo
        git init -q -b bot-state
        for f in state slow rotation ensemble; do cp ../state/$f.json . 2>/dev/null || true; done
        # Vercel läser inställningen från grenen som pushas: stäng av bygge/deploy för bot-state
        echo '{"git":{"deploymentEnabled":false}}' > vercel.json
        git add -A
        git -c user.name="crypto-bot" -c user.email="crypto-bot@users.noreply.github.com" commit -q -m "bot state $(date -u +%Y-%m-%dT%H:%M:%SZ)"
        git remote add origin "$REPO_URL"
        git push -q --force origin bot-state
    ) || echo "::warning::Kunde inte spara läget den här rundan"
}

run_bots() {
    # De fyra botarna är oberoende: ett fel i en får aldrig stoppa de andra
    node bot/run.mjs > log-main.txt 2>&1 & p1=$!
    BOT_CONFIG=bot/config-slow.json BOT_STATE=state/slow.json node bot/run.mjs > log-slow.txt 2>&1 & p2=$!
    node bot/rotation.mjs > log-rot.txt 2>&1 & p3=$!
    node bot/ensemble.mjs > log-ens.txt 2>&1 & p4=$!
    fail=0
    for p in $p1 $p2 $p3 $p4; do wait $p || fail=1; done
    for f in log-main.txt log-slow.txt log-rot.txt log-ens.txt; do echo "::group::$f"; cat $f; echo "::endgroup::"; done
    if [ $fail = 1 ]; then echo "::warning::En av botarna avslutades med fel (se loggen ovan)"; fi
}

for i in $(seq 1 "$ROUNDS"); do
    start=$(date +%s)
    echo "=== Runda $i av $ROUNDS ($(date -u +%H:%M) UTC) ==="
    # senaste bot-koden och inställningarna från main (workflow-filen själv byts först vid nästa körning)
    if git fetch -q --depth=1 origin main 2>/dev/null; then git checkout -q FETCH_HEAD -- bot/ 2>/dev/null || true; fi
    run_bots
    save_state
    [ "$i" -lt "$ROUNDS" ] || break
    left=$(( EVERY - ($(date +%s) - start) ))
    [ $left -gt 0 ] && sleep $left
done
