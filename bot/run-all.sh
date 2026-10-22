#!/usr/bin/env bash
# Kör alla botar en gång, parallellt. Anropas av loop.sh varje runda (hämtas färsk från main varje gång,
# så ändringar här slår igenom inom 10 minuter). Botarna är oberoende: ett fel i en stoppar aldrig de andra.
set -u
declare -A BOTS=(
  [ensemble]="node bot/ensemble.mjs"
  [btceth]="env BOT_CONFIG=bot/config-btceth.json BOT_STATE=state/btceth.json node bot/trendbot.mjs"
  [voltrend]="env BOT_CONFIG=bot/config-voltrend.json BOT_STATE=state/voltrend.json node bot/trendbot.mjs"
  [rotation]="node bot/rotation.mjs"
  [multi]="node bot/multibot.mjs"
  [lev]="env BOT_CONFIG=bot/config-lev.json BOT_STATE=state/lev.json node bot/trendbot.mjs"
  [dca]="node bot/dcabot.mjs"
  [stocks]="node bot/stockbot.mjs"
  [news]="node bot/news.mjs"
)
pids=()
for name in "${!BOTS[@]}"; do
  ${BOTS[$name]} > "log-$name.txt" 2>&1 & pids+=($!)
done
fail=0
for p in "${pids[@]}"; do wait "$p" || fail=1; done
for name in "${!BOTS[@]}"; do echo "::group::$name"; cat "log-$name.txt"; echo "::endgroup::"; done
[ $fail = 1 ] && echo "::warning::En av botarna avslutades med fel (se loggen ovan)"
# Push-notiser om nya köp/sälj (gör inget om NTFY_TOPIC saknas)
node bot/notify.mjs || echo "::warning::Notiserna misslyckades"
exit 0
