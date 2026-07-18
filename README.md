# Wombat

Wombat is an experimental compression algorithm using sweep-based methods. It converts input text into UTF-8 bytes represented as binary, then repeatedly runs compression methods against the current string and keeps whichever attempt produces the smallest total payload.

The project is a prototype. The current goal is to test which repeated sections can be represented with less data than the original string.

## Usage

Run one compression pass:

```sh
node index.js 1 taytay
```

Run three compression passes:

```sh
node index.js 3 taytay
```

Pipe input through stdin:

```sh
printf 'taytay' | node index.js 3
```

The first argument is the number of compression attempts, or passes. Text after that argument is the input. If no text argument is provided, `index.js` reads from stdin.

## Current Flow

`index.js` coordinates the compression process:

1. Reads the pass count from `process.argv[2]`.
2. Reads input from remaining CLI args or from stdin.
3. Converts the input to binary with `utf8ToBinary()`.
4. Loads every method from `./methods`.
5. Runs every method with every value from that method's `arguments()` export.
6. Scores each attempt by total payload size.
7. Chooses the smallest attempt for the current pass.
8. Stores the cleaned candidate metadata when the pass actually compresses.
9. Loops until the requested number of passes has run.
10. Prints per-iteration compression and total compression after every pass.

The script no longer appends demo text to `str`. It compresses the actual input only.

## Why Input Is Binary

Input text is interpreted as UTF-8, then converted into a binary string.

For example:

```txt
tay
```

becomes:

```txt
011101000110000101111001
```

This gives compression methods a consistent input alphabet of `0` and `1`, no matter what text was entered. That makes repeated low-level byte patterns easier to compare.

## Project Layout

`index.js` is the CLI entrypoint and compression coordinator.

`lib/` contains shared helpers:

- `lib/require-directory.js` loads every `.js` file in a directory.
- `lib/utf8.js` contains UTF-8 helpers, binary conversion, and random marker selection.

`methods/` contains compression methods, one file per method:

- `methods/occurence.js`
- `methods/utf8.js`

Methods are loaded dynamically:

```js
const methods = requireDirectory('./methods')
```

That means a new compression method can be added by creating a new file in `methods/` with the expected exports.

## Method Contract

Each method should export:

```js
module.exports.arguments = () => {
  return [10, 11, 12]
}

module.exports.compress = (str, a) => {
  return { a_, s, n, v }
}

module.exports.decompress = (str, n, v) => {
  return str
}
```

The fields returned by `compress()` are:

- `a_`: the argument used for that attempt
- `s`: the mutated string
- `n`: method-specific metadata
- `v`: method-specific value metadata

The shape of `n` is intentionally method-specific. `index.js` treats it as opaque data and includes it in the candidate JSON. Each method's `decompress()` function is responsible for understanding its own `n` shape.

## Attempts And Passes

One pass tries every method and every argument for that method.

For each method argument, `index.js` calls:

```js
const { a_, s, n, v } = methodCompress(str, a)
```

Then it scores the attempt with:

```js
s.length + JSON.stringify([map[m], n, v]).length
```

This matters because compression is not just about making `s` shorter. The restore metadata also costs characters. A short string with a huge index list may be worse than the original.

After the best candidate is selected, the pass is rejected if it is not smaller than the input for that pass. Rejected passes keep the string unchanged and store no candidate metadata.

## Total Compression

The script reports two compression measurements.

Iteration compression compares only the current pass input against the current pass output:

```txt
iteration length: 48 to 37
iteration compressed: 22.92%
```

Total compression compares the original binary length against the current string plus all accepted candidate metadata:

```txt
total length: 48 to 39
total compressed: 18.75%
```

Percentages are rounded to two decimal places.

## Candidate Arrays

Candidates are arrays to reduce JSON size:

```js
[
  map[m],
  attempt.n,
  attempt.v,
  attempt.l,
  attempt.s,
  attempt.t,
]
```

The key constants in `index.js` define those positions:

```js
const key_m = 0
const key_n = 1
const key_v = 2
const key_l = 3
const key_s = 4
const key_t = 5
```

The meanings are:

- `key_m`: numeric method id
- `key_n`: method-specific restore metadata
- `key_v`: method-specific value metadata
- `key_l`: mutated string length
- `key_s`: mutated string
- `key_t`: total payload size for scoring

Before metadata is saved, `cleanCandidate()` removes `s` and `l`:

```js
function cleanCandidate (candidate) {
  candidate.splice(key_s, key_s)
  candidate.splice(key_l, key_l)
}
```

The cleaned candidate keeps only:

```js
[methodId, n, v]
```

This keeps the final JSON smaller because `s` is stored separately as the current mutated string, and `l` can be recomputed.

## Method Map

`map` converts method names into short numeric ids:

```js
let map = {}
let map_= 0

for (let m in methods) {
  map[m] = map_++
}
```

Instead of storing `"occurence"` or `"utf8"` in every candidate, the compressed metadata stores a number. This reduces JSON size.

Because methods are loaded from the filesystem, ids depend on the sorted method filenames returned by `requireDirectory()`. A stable decompression format will need to preserve or define this method id mapping.

## `methods/occurence.js`

`occurence.js` removes repeated sections and stores their original indexes.

Its arguments currently cover section lengths from `10` through `42`:

```js
let i = 10

while (i <= 42) {
  range.push(i)
  i++
}
```

For each section length, `compress(str, a)`:

1. Splits the string into characters.
2. Walks through every possible section of length `a`.
3. Counts how many non-overlapping times that section can be used.
4. Chooses the section with the highest usable count.
5. Sweeps the string again.
6. Removes each non-overlapping match.
7. Stores each removed index in `n`.
8. Stores the removed string in `v`.

The key fix in this method is that it counts non-overlapping occurrences. For a string like:

```txt
aaaaa
```

and a section length of `3`, `aaa` appears in three sliding windows, but only one copy can be removed without overlapping characters. The method now counts the usable removals, not every overlapping window.

If called directly with a section length of `3`, the compressed result can look like:

```js
{
  a_: 3,
  s: 'X',
  n: [0, 4],
  v: 'abc'
}
```

for a source like:

```txt
abcXabc
```

`decompress(str, n, v)` reinserts `v` at each index in `n`:

```js
s = s.slice(0, i) + v + s.slice(i)
```

The indexes are stored in original-string coordinates. Because reinserting from left to right grows the string, later indexes line back up as previous removals are restored.

## `methods/utf8.js`

`utf8.js` replaces repeated sections with marker characters that do not already exist in the string.

Its arguments currently cover section lengths from `10` through `32`.

The method uses:

```js
const { char, utf8 } = require('../lib/utf8')
```

At module load, it builds a UTF-8 character map:

```js
const characters = utf8()
```

On each compression attempt, it creates a fresh object that inherits from that base map:

```js
let chars = Object.create(characters)
```

Then it marks every character already present in the string as unavailable:

```js
markString(chars, s)
```

This prevents the method from choosing a marker that already exists in the current string.

For each section length, `compress(str, a)`:

1. Finds the best repeated section of length `a`.
2. Requires at least two usable occurrences.
3. Pulls a random unused UTF-8 marker with `char(chars)`.
4. Replaces each non-overlapping occurrence of the repeated section with that marker.
5. Stores `[marker, needle]` in `n`.
6. Repeats until no useful repeated section remains for that length.

The output shape is different from `occurence.js`:

```js
{
  a_: 3,
  s: '<marker>X<marker>Y<marker>',
  n: [
    ['<marker>', 'abc']
  ],
  v: ''
}
```

`n` is a list of marker replacement pairs. `v` is unused and returned as an empty string.

`decompress(str, n, v)` expands replacements in reverse order:

```js
s = s.split(marker).join(needle)
```

Reverse order matters because later marker replacements may contain strings that were created after earlier replacements.

The method also prints progress while it runs:

```txt
utf8 length:  10 start:  128
utf8 length:  10 count:  2 marker:  X needle:  0111010001
utf8 length:  10 done:  1
```

This is useful because this method can be slow when many section lengths are tested.

## `lib/utf8.js`

`utf8()` returns an object where each valid UTF-8 character is a key set to `false`.

The default blacklist excludes characters that would be awkward or unsafe in output:

- backslash
- double quote
- single quote
- backtick
- newline
- carriage return
- tab
- null byte

`char(characters)` chooses a random key whose value is `false`, marks it as `true`, and returns:

```js
{
  utf8: characters,
  c: picked,
}
```

It now uses a one-pass random selection approach, so it does not build a huge temporary array of every available character.

`utf8ToBinary(text)` converts input text into a binary string by reading UTF-8 bytes and rendering each byte as eight bits.

## Decompression Model

A compressed state needs two things:

```txt
mutated string
candidate metadata
```

Each candidate begins with a method id. The decompressor would use that id to select the right method, then pass that method the current string plus the candidate's `n` and `v`.

For `occurence`, `n` is an array of indexes and `v` is the removed repeated string.

For `utf8`, `n` is an array of `[marker, needle]` pairs and `v` is empty.

Because the meaning of `n` changes by method, shared decompression should not try to inspect or normalize `n`. It should route the data to the method that produced it.

For multi-pass compression, decompression should run the accepted candidates in reverse order, because the last compression pass must be undone first.

## Current Files

- `index.js`: CLI entrypoint, pass loop, candidate scoring, and reporting.
- `lib/require-directory.js`: directory module loader.
- `lib/utf8.js`: UTF-8 map, random marker picker, and binary conversion helper.
- `methods/occurence.js`: repeated-section removal using index metadata.
- `methods/utf8.js`: repeated-section replacement using unused UTF-8 marker characters.
- `AGENTS.md`: project instructions for coding agents.
- `.gitignore`: ignores `node_modules`.
- `package.json`: package metadata.

## Known Work Remaining

- Create a formal compressed payload format.
- Add shared decompression orchestration in `index.js` or `lib/`.
- Store or define a stable method id map for decompression.
- Add tests for `compress`, `decompress`, scoring, multi-pass behavior, stdin input, and binary conversion.
- Review whether random UTF-8 marker selection should become deterministic.
- Optimize method sweeps for larger inputs.
