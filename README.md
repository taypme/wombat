# Wombat

Wombat is an experimental sweep-based compression algorithm. It converts input text to a binary string, searches for repeated sections, removes the most useful repeated section, and stores metadata that can restore the removed sections.

The project is a prototype. Its current compression implementation lives in `lib/occurence.js` and is intentionally named `occurence` to match the existing project API.

There are no runtime dependencies. The package is CommonJS and can be explored
with a current Node.js installation.

## Usage

Pass the input text after `index.js`:

```sh
node index.js taytaytaytay
```

The current CLI treats every argument after `index.js` as input and joins arguments with spaces. It prints diagnostic output for each section length that produces more than 10 percent compression.

The CLI does not currently implement the older pass-count or stdin interface. The reusable compression functions can be called directly from Node.js.

## Compression flow

`index.js` performs the following steps:

1. Joins command-line arguments into the input string
2. Converts the input to binary with `utf8ToBinary()`
3. Tries section lengths from 3 through 30
4. Calls `compress(binary, sectionLength)` for each length
5. Applies `compressMeta()` twice to the occurrence positions
6. Appends the compressed metadata and repeated value to the diagnostic payload
7. For results above the reporting threshold, decodes the metadata twice and calls `decompress()`

The script is exploratory and currently reports attempts rather than writing a finalized compressed file format.

## Binary input

`utf8ToBinary()` converts every UTF-8 byte into eight binary characters. For example:

```txt
tay
```

becomes:

```txt
011101000110000101111001
```

Working with binary strings gives the occurrence method a consistent input alphabet.

## Project layout

```txt
index.js
lib/
  occurence.js
  utf8.js
package.json
```

- `index.js` is the current command-line entrypoint and diagnostic runner
- `lib/occurence.js` contains occurrence compression, metadata encoding, and decompression
- `lib/utf8.js` contains UTF-8-to-binary conversion and related UTF-8 helpers

## Occurrence compression

`compress(str, a)` searches for repeated, non-overlapping sections of length `a`.

It returns:

```js
{
  s,
  n,
  v: needle
}
```

- `s` is the string after every selected occurrence has been removed
- `n` is an underscore-delimited string of absolute indexes in the original string
- `v` is the repeated section that was removed

For example, if the selected section occurs at positions 0, 8, and 10:

```js
const result = compress(str, sectionLength)
// result.n === '0_8_10'
```

Only non-overlapping occurrences are removed. This prevents overlapping matches from being counted as removable copies.

The section lengths currently tested by `arguments()` are 3 through 30:

```js
const { arguments: sectionLengths } = require('./lib/occurence')

sectionLengths()
// [3, 4, 5, ... , 30]
```

## Metadata compression

Occurrence indexes can take fewer characters when later indexes are stored as differences from the preceding index. `compressMeta()` performs one delta-encoding pass and returns a string joined with underscores.

```js
const { compressMeta } = require('./lib/occurence')

compressMeta('0_8_10')
// '0_8_2'
```

The first value remains absolute. Each later value is the current index minus the previous index.

Metadata is intentionally compressed twice by the current CLI:

```js
const once = compressMeta('0_8_10')
const twice = compressMeta(once)

// once  === '0_8_2'
// twice === '0_8_-6'
```

The second pass can produce negative values. Those values are valid because they are differences from the previous value, not indexes themselves.

## Metadata decompression

`decompressMeta()` reverses one metadata compression pass and returns an array of absolute positions. To reverse two compression passes, call it twice in reverse order:

```js
const { compressMeta, decompressMeta } = require('./lib/occurence')

const encoded = compressMeta(compressMeta('0_8_10'))
const decoded = decompressMeta(decompressMeta(encoded))

// decoded === [0, 8, 10]
```

The decoded array is passed to `decompress()`:

```js
const { compress, compressMeta, decompress, decompressMeta } = require('./lib/occurence')

const result = compress('abcXabcYabc', 3)
const metadata = compressMeta(compressMeta(result.n))
const indexes = decompressMeta(decompressMeta(metadata))
const restored = decompress(result.s, indexes, result.v)
```

`decompress()` accepts either an array of absolute indexes or an underscore-delimited string of absolute indexes. It inserts `v` at each index from left to right.

## Direct API example

```js
const {
  arguments: sectionLengths,
  compress,
  compressMeta,
  decompress,
  decompressMeta
} = require('./lib/occurence')

const source = 'abcXabcYabc'
const result = compress(source, 3)

const encodedMetadata = compressMeta(compressMeta(result.n))
const indexes = decompressMeta(decompressMeta(encodedMetadata))
const restored = decompress(result.s, indexes, result.v)

console.log({
  sectionLengths: sectionLengths(),
  compressed: result,
  encodedMetadata,
  restored
})
```

## Current limitations

- The CLI is diagnostic and does not save a portable compressed artifact
- The CLI tries each section length independently; it does not yet chain the best results into multiple compression passes
- Metadata compression depth is currently hard-coded to two passes in `index.js`
- There is no formal header describing the metadata encoding depth
- There is no automated test suite yet
- The project retains the historical `occurence` spelling in its filename and exports

## Development

Run the current CLI with a repeated input:

```sh
node index.js taytaytaytaytaytay
```

Run a direct metadata round-trip check:

```sh
node - <<'NODE'
const assert = require('node:assert/strict')
const { compressMeta, decompressMeta } = require('./lib/occurence')

const encoded = compressMeta(compressMeta('0_8_10'))
const decoded = decompressMeta(decompressMeta(encoded))

assert.deepEqual(decoded, [0, 8, 10])
console.log('metadata round trip passed')
NODE
```

No package installation is required for the current implementation.

## Status

Wombat is an experiment and does not yet define a stable file format or a
benchmark-backed compression claim. Changes to metadata encoding should be
accompanied by a round-trip test for both compression and decompression.
