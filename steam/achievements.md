# FATHOM — Steamworks configuration

> Create these in the Steamworks partner site. The **API Name** column must match the
> strings in `src/steam/steam.js` exactly, or unlocks will silently fail.

## App ID
Replace the placeholder `480` (Valve's Spacewar test app) in:
- `steam/steam_appid.txt`
- `package.json` → `fathom.steamAppId`
- (optional) env var `FATHOM_STEAM_APPID`

## Leaderboards
| Name | Sort | Display | Notes |
| --- | --- | --- | --- |
| `DEEPEST_DESCENT` | Descending | Numeric | Primary board — how deep you got. |
| `HIGH_SCORE` | Descending | Numeric | Score tiebreaker / skill flex. |
| `DAILY_<seed>` 🔜 | Descending | Numeric | Optional daily-seed mode. |

The game calls `submitLeaderboard('DEEPEST_DESCENT', depth)` and
`submitLeaderboard('HIGH_SCORE', score)` on every death; the Electron main process
find-or-creates the board and uploads the best score.

## Achievements
| API Name | Display name | Trigger (already wired in code) |
| --- | --- | --- |
| `FIRST_DESCENT` | First Descent | Finish your first run (on any death). |
| `REACH_DEPTH_5` | The Shelf | Reach depth 5. |
| `REACH_DEPTH_10` | The Trench | Reach depth 10. |
| `REACH_DEPTH_15` | The Abyss | Reach depth 15. |
| `REACH_DEPTH_20` | The Fathomless | Reach depth 20. |
| `SILENT_DESCENT` | Hold Your Breath | Clear a depth without firing a single ping. |
| `SURVIVED_A_STANDOFF` | Don't Move | Out-wait an Angler that hunted you to within dread range, until it gives up. |

Suggested icons: cyan sonar-ring motifs on black; the locked state a dim outline.

## Steam Cloud
Auto-cloud the persisted JSON (localStorage in the Electron build maps to the app's
userData dir). Sync the settings + scores + run-meta keys (`fathom.settings.v1`,
`fathom.scores.v1`, `fathom.meta.v1`).

## Steam Input
Enable Steam Input; the game supports standard gamepads natively (A/RT = ping,
B/LB = quiet swim, Start = pause, left stick = swim).

## Rich Presence
The game sets the `status` token to `Diving — depth N`. Add a Rich Presence
localization token `#Status_Diving` → `Diving — depth %depth%` if you want it localized.
