# Hay Hop Minigame Contract

## Message: `minigame.hay_hop.result`
Sent from Home/minigame to Core when a Hay Hop run finishes.

| Field | Type | Required | Range / Constraints |
| --- | --- | --- | --- |
| `score` | int | yes | `0..5000` |
| `durationMs` | int | yes | `0..3600000` |
| `seed` | string | no | max length `32` |

## Validation (`HayHopMessages`)
- `HayHopMessages : IMessageRuleSet` registers `minigame.hay_hop.result` for `MessageValidator` reflection discovery.
- `HayHopMessages.ValidateResultPayload(JObject)` returns `null` when valid or one of:
  - `"null_message"`
  - `"missing_score"`
  - `"invalid_score"` (non-integer, `NaN`, `Infinity`, float, `< 0`, `> 5000`)
  - `"missing_duration"`
  - `"invalid_duration"` (non-integer, `NaN`, `Infinity`, float, `< 0`, `> 3600000`)
  - `"invalid_seed"` (non-string or length `> 32`)

## Reward Rules (`HayHopReward`, `assets/data/hayhop.json`)
- Configurable via `assets/data/hayhop.json` (`HayHopConfig`).
- Scores `<= 0`, out-of-bounds duration/score, or rate `score > ceil((durationMs / 1000.0) * max_points_per_second)` earn `0` clovers and `0` mood (`RejectedAsImpossible = true` when `score > 0`).
- Daily limits from `EconomyConfig.Minigame` (`RewardedGamesPerDay`, `MaxCloversPerDay`) cap clovers; when exhausted, `Clovers = 0`, `Mood = mood_unrewarded`, `Rewarded = false`.
- Otherwise `Clovers = min(max_clovers_per_game, round(score * scoreMultiplier) / points_per_clover, remainingDailyAllowance)` and `Mood = mood_rewarded`.
