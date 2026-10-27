# Diary Grammar (Tracery)

The diary uses a small C# implementation of the Tracery grammar format to dynamically generate entries based on templates and game state facts.

## Syntax

- **`#symbol#`**: Expands the text using the rules defined for `symbol`. It can be a custom grammar rule (e.g. `vegetable`) or a game fact (e.g. `name`, `fed`).
- **`#[key:value]symbol#`**: An inline action that sets the state `key` to `value` (or the expansion of a symbol) before expanding `symbol`.
  - For example, `#[my_act:#junior_action#]greeting#` evaluates `#junior_action#`, saves it into the variable `my_act`, and then evaluates `#greeting#`. You can later reuse `my_act` via `#my_act#`.
- **`[key:POP]`**: Pops the top value off the stack for the given `key`, restoring its previous state.

## Modifiers
Modifiers alter the resulting text and are appended to symbols using a dot `.` syntax:

- **`capitalize`**: Capitalizes the first letter of the string (e.g., `#baby_action.capitalize#`).
- **`capitalizeAll`**: Capitalizes the first letter of every word.
- **`lower`**: Converts the entire string to lowercase.
- **`a`**: Prepends "a " or "an " based on whether the string starts with a vowel sound.
- **`s`**: Pluralizes the word (e.g., `vegetable.s` -> `vegetables`, `cherry.s` -> `cherries`).
- **`ed`**: Converts verbs to past tense (e.g., `play.ed` -> `played`).
- **`inQuotes`** and **`comma`**: (Mentioned if supported or easily implementable, though our implementation focuses on core rules, user must be aware of custom overrides).

## Examples

### Example 1: Simple Expansion
**Template:**
`"My name is #name# and I love #vegetable.s#."`

**Output:**
`"My name is Barnaby and I love carrots."`

### Example 2: Reusing Actions for Consistency
**Template:**
`"#[snack:#vegetable#]greeting# I ate #snack# today. I love #snack.s#!"`

**Explanation:**
1. Evaluates `#vegetable#` and saves it to `snack` (e.g., `"cucumber"`).
2. Evaluates `#greeting#` (e.g., `"Dear diary,"`).
3. Uses `#snack#` again.
4. Uses `#snack.s#` (pluralized).

**Output:**
`"Dear diary, I ate cucumber today. I love cucumbers!"`
