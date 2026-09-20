# Three things the data says about LILA BLACK

All numbers below are computed over the full dataset: 89,104 events, 796 matches, February 10–14 2026.

---

## 1. There is essentially no PvP. The game is one human against bots.

**What caught my eye:** I built a filter for "human vs human kills" and kept getting empty results. It was not a bug.

**The evidence:**

| Combat event | Count |
|---|---|
| `BotKill` (human killed a bot) | 2,415 |
| `BotKilled` (bot killed a human) | 700 |
| `Kill` (human killed a human) | **3** |
| `Killed` (human killed by human) | **3** |

99.8% of all combat is against bots. The cause shows up in the match composition: **779 of 796 matches contain exactly one human player.** One match had two. Sixteen had none. Players are never in a position to fight each other.

**Actionable:** Bot density and bot difficulty *are* the entire difficulty curve — there is no second system. Either matchmaking is failing to fill lobbies and needs fixing, or the game should be designed as PvE and stop paying the PvP tax.

Metrics to watch: humans per match (currently ~1.0), matchmaking fill rate and queue time, human-vs-human encounter rate, bot K/D (currently 3.45 in the player's favour).

**Why a Level Designer should care:** Map geometry built for player-versus-player contests is doing nothing. Chokepoints that assume two squads converging, sightlines balanced for third-partying, loot that is valuable because it is *contested* — none of those pressures exist. Cover, sightlines and engagement distances should be tuned against bot behaviour, which is what players actually meet.

---

## 2. Two-thirds of every map is never walked on.

**What caught my eye:** Turning on the traffic heatmap, whole regions of each minimap stayed empty — and on AmbroseValley the emptiness had a hard vertical edge.

**The evidence** (32×32 grid over each minimap, all matches):

| Map | Cells ever visited | Playable span observed |
|---|---|---|
| AmbroseValley | 443 / 1024 (**43.3%**) | u 0.05–0.75, v 0.10–0.93 |
| GrandRift | 376 / 1024 (**36.7%**) | u 0.11–0.94, v 0.17–0.79 |
| Lockdown | 333 / 1024 (**32.5%**) | u 0.09–0.85, v 0.21–0.83 |

On AmbroseValley — 71% of all matches — the rightmost **25% of the minimap is never entered once** across 61,013 position samples. And the traffic that does exist is highly concentrated: the busiest 10% of visited cells absorb **39–45%** of all movement.

**Actionable:** Either those regions are out of bounds and the minimap is misleading, or they are real space that nothing draws players toward. Both are fixable: move an extraction point or a high-tier loot spawn into dead territory, or cut it and tighten the play space.

Metrics to watch: map coverage %, traffic concentration in the top decile of cells, loot events per region, deaths per region.

**Why a Level Designer should care:** This is art and design budget spent on space no player sees. It also makes encounters predictable — when half the map is unused and 45% of traffic funnels through a tenth of the cells, routes are effectively on rails, and so are the fights.

---

## 3. The storm isn't creating any pressure — players are on a looting tour.

**What caught my eye:** `KilledByStorm` totals **39 events across 796 matches** — the storm kills someone in roughly 1 match in 20.

**The evidence:**

| Event | Count |
|---|---|
| `Loot` | 12,885 |
| `BotKill` | 2,415 |
| `BotKilled` | 700 |
| `KilledByStorm` | **39** |

Players loot **5.3 times for every kill** they get. Bots kill players **18× more often than the storm does**. Median match length is 6.0–7.5 minutes depending on map, and the storm is a non-event within it.

The game is described as an extraction shooter where "a one-directional storm pushes across the map, forcing players to move and extract before being consumed." The telemetry says it is not forcing anything.

**Actionable:** Tighten storm timing or increase its close rate until it actually shapes routes, and confirm the effect by watching storm deaths per match climb off the floor. If the storm is meant to be a soft timer rather than a threat, then the pacing pressure has to come from somewhere else — because right now nothing is rushing anyone.

Metrics to watch: storm deaths per match (currently 0.05), time spent inside the storm boundary, extraction rate versus match duration, loot events per minute.

**Why a Level Designer should care:** The storm is the intended pacing mechanism, and route choice should be a tension between where the loot is and where the storm is about to be. With the storm inert, players optimise purely for loot density — so loot placement alone is dictating traffic, which is very likely what is driving the dead-zone problem in insight 2.

---

## Where these connect

Insights 2 and 3 are plausibly the same problem. If loot placement is the only force directing movement, then traffic will concentrate wherever loot is dense and abandon everywhere else — exactly the pattern the coverage numbers show. The cheapest test is to redistribute loot toward unvisited regions and re-run the traffic heatmap over the following days.

A caveat on scope: the heatmaps in the tool are per-match, which is enough to inspect one journey but sparse for judging a map. The numbers above come from aggregating across all 796 matches, and making that aggregation a first-class view is the most valuable next feature.

**Note on February 14:** it holds 37 matches against 284 on February 10, but the dataset README states collection was still ongoing that day, so the daily counts (284 / 201 / 162 / 112 / 37) should not be read as a retention curve without confirming where collection was cut.
