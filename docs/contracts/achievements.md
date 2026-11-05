# Contract: achievements

Feature id: `achievements`. Always active when a pet exists.

## State key `achievements`

```
achievements: [ { id: string, title: string, text: string, category: string,
                  reward: int, earned: bool, date: string | null,   // "yyyy-MM-dd" local
                  hidden: bool } ]
```

## Messages

None. `HandleMessage` is not overridden, so the feature handles no messages from JS.

## Tick

Runs every 5 seconds at most. Newly earned achievements save the game, show a status message on the pet window, and post a toast when the home window is open.

## Toasts

- `Achievement: <title> +<reward> clovers`
