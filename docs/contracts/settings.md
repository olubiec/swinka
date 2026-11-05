# Contract: settings and updates (`settings`)

Feature id: `settings`. Update checks are started only by a page message, never at startup.

## State keys

```
settings: {
  petSize: "small" | "big",
  sounds: bool, autostart: bool, notifyHarvest: bool,
  volume: int, monitor: ..., monitors: ..., quietHours: ...,
  muteFullscreen: bool, soundSuppressed: bool
}
update: {
  available: bool, version: string, currentVersion: string,   // from the assembly version (major.minor.build)
  status: "idle" | "checking" | "available" | "up_to_date" | "downloading",
  notes: string, downloading: bool
}
```

## Messages

| Type | Payload | Rule |
|------|---------|------|
| `settings_pet_size` | `{ size }` | size from the pet size list |
| `settings_sounds` | `{ on: bool }` | |
| `settings_autostart` | `{ on: bool }` | |
| `settings_volume` | `{ value: int }` | 0 to 100 |
| `settings_quiet_hours` | `{ enabled: bool, start, end }` | times as strings |
| `settings_notify_harvest` | `{ on: bool }` | |
| `settings_mute_fullscreen` | `{ on: bool }` | |
| `check_update` / `settings_check_update` | `{ mock?, force_available? }` | mock flags set a fake update (test only); otherwise the status becomes `checking` and the update check runs in the background |
| `apply_update` / `settings_apply_update` | `{}` | sets status `downloading` |
| `settings_reset_confirmed` | `{}` | requests a save reset |

## Replies

State refresh through `HomeWindow.NotifyStateChanged()`. Toasts only for update download and close.

## Toasts

- `Update downloaded! Ready to restart.`
- `Cuy closes now. Start it again to meet your new pig.`
