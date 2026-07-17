# Wombat

Wombat is an experimental compression algorithm using sweep-based methods. The current implementation converts input text into a binary string, runs one or more compression methods against that string, chooses the best attempt from each method's configured argument values, and emits a compact JSON description that can be paired with the mutated string for later decoding.

The project is still a work in progress. The current code is primarily a prototype for exploring how repeated sections can be removed from a string and represented as smaller metadata.

## Current Flow

Run the program with text after `node index.js`:

```sh
node index.js tay
```

The entrypoint in `index.js` does the following:

1. Reads the command line input.
2. Converts the input into UTF-8 bytes represented as binary.
3. Adds a demo suffix to `str` so the compressor has repeated data to find.
4. Loads all method files from `./methods`.
5. Runs each method with each value from that method's `arguments()` export.
6. Keeps the best attempt for each method.
7. Builds a candidate array for each method.
8. Selects one final candidate.
9. Removes values from the candidate that will be transmitted separately or are only needed during comparison.
10. Compares the final mutated string length plus JSON metadata length against the original demo string length.

## Why Input Is Interpreted As Binary

The input is interpreted as UTF-8 and then converted to binary with `utf8ToBinary()` from `lib/utf8.js`.

This gives the compression methods a uniform alphabet of `0` and `1` characters regardless of the original input text. That makes the sweeps easier to reason about because every input becomes one continuous binary string. For example, `tay` becomes:

```txt
011101000110000101111001
```

Binary also makes repeated low-level patterns visible. The current demo appends extra repeated binary-like sections to prove the compression method can find and remove repeated runs.

## The Demo `str` Suffix

`index.js` creates `str` from user input:

```js
let str = utf8ToBinary(input)
```

It then appends this demo content:

```txt
++00000111111111111111111111111111_01010101_00000111111111111111111111111111
```

The purpose of adding onto `str` is demonstration. Short inputs such as `tay` do not naturally contain enough repetition to show compression behavior clearly. The appended data includes repeated sections so `methods/occurence.js` has something useful to discover.

In a real compression path, this artificial suffix would be removed. The method would operate only on the actual encoded input or on a real input stream that naturally contains repeated patterns.

## Modular Structure

The project is intentionally split into a small entrypoint, shared helpers, and compression methods.

`index.js` is the coordinator. It reads input, prepares the binary string, loads compression methods, runs attempts, selects a candidate, and prints the result.

`lib/` contains shared helpers:

- `lib/require-directory.js` loads every `.js` file from a directory and returns an object keyed by filename.
- `lib/utf8.js` contains UTF-8 and binary helpers.

`methods/` contains compression methods. Each method gets one file. There is currently one method:

- `methods/occurence.js`

Even though there is only one method today, `index.js` already treats methods as a collection:

```js
const methods = requireDirectory('./methods')
```

It then loops through every loaded method. This lets future compression strategies be added by creating new files in `methods/` without rewriting the entrypoint.

## Shared UTF-8 Helpers

`lib/utf8.js` currently exports:

- `utf8()`: builds an object where each valid UTF-8 character key is set to `false`.
- `char(characters)`: chooses a random character from that object whose value is `false`, marks it as `true`, and returns `{ utf8, c }`.
- `utf8ToBinary(text)`: converts UTF-8 text into a binary string.
- `defaultBlacklist`: excludes escape-sensitive characters such as backslash, quotes, newlines, tabs, and the null byte from the generated UTF-8 object.

The `utf8()` and `char()` helpers are not yet wired into the main compression flow, but they are useful for future encoding work where the algorithm may need unused marker characters.

## Method Contract

Each compression method is expected to export at least:

```js
module.exports.arguments = () => {
  return [7, 32]
}

module.exports.encode = (str, a) => {
  return { a_, s, n, v }
}
```

The current `decode` export exists in `methods/occurence.js`, but it has not been implemented yet.

`arguments()` returns the argument values that should be tried for that method. For `occurence.js`, those values are currently `7` and `32`. In this method, the argument controls the sweep width.

`encode(str, a)` runs the method against `str` using the argument `a`.

## Attempt System

For each method, `index.js` tries every value returned by `method.arguments()`.

For each argument, it calls:

```js
const { a_, s, n, v } = encode(str, a)
```

The result fields currently mean:

- `a_`: the argument used for the attempt
- `s`: the mutated string after removing selected repeated sections
- `n`: the indexes where removed sections were found
- `v`: the repeated section value, also called the needle

`index.js` also computes:

```js
const l = s.length
```

The attempt with the smallest mutated string length is kept for that method. This is the best attempt for that method because a smaller `s` means more source characters were removed.

This lets one method test multiple sweep sizes and keep whichever size compresses best for the current input.

## Candidate System

After the best attempt is chosen for a method, `index.js` turns it into a candidate array:

```js
const result = [
  map[m],
  attempt.n,
  attempt.v,
  attempt.l,
  attempt.s,
]
```

That candidate is stored in `cans` under the method name.

The final candidate is selected from `cans`. With only one method, this always selects `occurence`. When multiple methods exist, this system is intended to compare method outputs and keep the best compression result.

Current note: the final candidate reducer currently compares candidate lengths with a greater-than check. Since smaller final length is better for compression, this should be reviewed when multiple methods are added.

## The `map` Variable

`map` is used to replace method names with small numeric ids:

```js
let map = {}
let map_= 0

for (let m in methods) {
  map[m] = map_++
}
```

Instead of storing a method name such as `"occurence"` in the final JSON, the candidate stores `0`.

This is meant to decrease the character count in the final JSON. Smaller metadata matters because the compressed payload is measured as:

```txt
mutated string length + JSON metadata length
```

If the metadata grows too large, it can cancel out the savings from removing repeated sections.

## The `key_*` Constants

The candidate is stored as an array instead of an object to reduce JSON size.

The `key_*` constants document the positions in that array:

```js
const key_m = 0
const key_n = 1
const key_v = 2
const key_l = 3
const key_s = 4
```

Those keys mean:

- `key_m`: method id from `map`
- `key_n`: occurrence indexes
- `key_v`: removed value, or needle
- `key_l`: mutated string length
- `key_s`: mutated string

The array form is shorter than an object with named fields. For example, `[0,[26,68],"needle"]` is shorter than `{"method":0,"indexes":[26,68],"value":"needle"}`.

## The `cleanCandidate` Function

`cleanCandidate()` removes values from the candidate before JSON encoding:

```js
function cleanCandidate () {
  candidate.splice(key_s, key_s)
  candidate.splice(key_l, key_l)
}
```

The candidate initially includes both `l` and `s` so the program can compare candidate quality and keep the mutated string. After a final candidate is selected:

- `s` is assigned back to `str`
- `l` can be recomputed from `str.length`
- neither value needs to be stored inside the final JSON metadata

Removing them decreases the final JSON character count.

After cleaning, the candidate keeps only:

```js
[methodId, indexes, value]
```

For the current `occurence` method, that is enough metadata to describe what was removed from the mutated string.

## The `occurence.js` Encode Method

`methods/occurence.js` is a compression method that searches for repeated sections of a fixed length.

Its arguments are:

```js
return [7, 32]
```

That means the method tries two sweep widths:

- `7`
- `32`

For each width, `encode(str, a)` sweeps through the string and slices out sections of length `a`:

```js
let o = full.slice(i, i + a).join('')
```

It counts how often each section appears in `c`.

After counting, it chooses the section with the highest count:

```js
const needle = Object.keys(c).reduce((best, current) =>
  c[current] > c[best] ? current : best
)
```

Then it sweeps again. When it sees the selected `needle`, it:

1. Pushes the index into `n`.
2. Skips ahead by the needle length.
3. Does not copy that section into `s`.

When the current section is not the needle, it copies the current character into `s`.

The result is:

```js
return { a_: a, s, n, v: needle }
```

### Counting Note

The counting system still needs work.

Right now, the first pass counts every matching section seen at every index. That means overlapping windows can inflate the count. For compression, the method should count unique usable occurrences that do not include or overlap other selected occurrences. It should count the occurrences that can actually be removed together, not just every raw appearance of a section.

The second pass already skips ahead after finding a needle, which avoids removing overlapping copies. The counting pass should eventually use the same kind of non-overlapping logic so the selected needle reflects real compression potential.

## Decode Plan

The `decode` function is not implemented yet, but the current metadata is enough to describe how it should work for `occurence`.

The compressed output has two parts:

1. The mutated string, which is `str` after repeated sections have been removed.
2. The cleaned candidate JSON, which contains `[methodId, indexes, value]`.

For the current example, the cleaned candidate looks like:

```json
[0,[26,68],"00000111111111111111111111111111"]
```

To decode:

1. Read the method id from the candidate.
2. Use the method id to find the matching method name from the method map.
3. Call that method's `decode`.
4. Reinsert `value` into the mutated string at each stored index.
5. Return the rebuilt binary string.
6. Convert the binary string back into UTF-8 bytes and then text if the original text is needed.

The decode process must be careful with indexes. Since insertions change the string length, it should either process indexes from lowest to highest while accounting for offset growth, or process from highest to lowest so earlier indexes remain stable.

## Using The Output With The Mutated String

The theoretical compressed payload is the mutated string plus the cleaned JSON candidate.

The mutated string contains the source data after selected repeated sections have been removed. The JSON candidate contains the instructions required to reconstruct the removed data.

For storage or transmission, a caller would need to keep both:

```txt
mutated string
candidate JSON
```

On decode, the candidate JSON identifies the method and the removed repeated section. The mutated string provides the remaining data. Together, they should reconstruct the original binary string.

The current CLI does not yet emit a formal payload format. It logs both the mutated string and the cleaned candidate while measuring their combined length.

## Demo: `node index.js tay`

Current output:

```txt
011101000110000101111001++00000111111111111111111111111111_01010101_00000111111111111111111111111111

-------------------
arg:  7
len:  100
needle:  1111111
-------------------
arg:  32
len:  100
needle:  00000111111111111111111111111111
-------------------

candidate:  [
  0,
  [ 26, 68 ],
  '00000111111111111111111111111111',
  36,
  '011101000110000101111001++_01010101_'
]

str:  011101000110000101111001++_01010101_
cleaned:  [ 0, [ 26, 68 ], '00000111111111111111111111111111' ]

string length from 100 to 82
18% compressed
```

The original demo string length is `100`. The final measured size is `82`, which is:

```txt
mutated string length + cleaned candidate JSON length
```

That gives the current demo an `18%` compression result.

## Current Files

- `index.js`: CLI entrypoint and compression coordinator.
- `lib/require-directory.js`: loads method modules from a directory.
- `lib/utf8.js`: UTF-8 map helper, random character selection helper, and UTF-8-to-binary conversion.
- `methods/occurence.js`: current sweep-based occurrence compression method.
- `AGENTS.md`: project instructions for coding agents.
- `.gitignore`: ignores `node_modules`.
- `package.json`: package metadata.

## Known Work Remaining

- Implement `decode` in `methods/occurence.js`.
- Decide on a formal payload format for storing or transmitting the mutated string plus candidate JSON.
- Fix occurrence counting so it counts unique non-overlapping occurrences that can actually be removed.
- Review final candidate selection before adding multiple methods.
- Remove the demo suffix when moving from prototype behavior to real compression input.
- Add tests for encode, decode, candidate cleaning, and binary conversion.
