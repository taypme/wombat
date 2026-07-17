const defaultBlacklist = [
  '\\',
  '"',
  "'",
  '`',
  '\n',
  '\r',
  '\t',
  '\0',
]

function utf8(blacklist = defaultBlacklist) {
  const characters = {}
  const blocked = new Set(blacklist)

  let codePoint = 0

  while (codePoint <= 0x10ffff) {
    if (codePoint >= 0xd800 && codePoint <= 0xdfff) {
      codePoint += 1
      continue
    }

    const character = String.fromCodePoint(codePoint)

    if (!blocked.has(character)) {
      characters[character] = false
    }

    codePoint += 1
  }

  return characters
}

function utf8ToBinary(text) {
  return Array.from(Buffer.from(text, 'utf8'), (byte) =>
    byte.toString(2).padStart(8, '0')
  ).join('')
}

function char(characters) {
  const available = Object.values(characters)
    .filter((value) => value === false)
    .length

  if (available === 0) {
    return {
      utf8: characters,
      c: undefined,
    }
  }

  const pick = Math.floor(Math.random() * available)
  let index = 0

  for (const character in characters) {
    if (characters[character] !== false) {
      continue
    }

    if (index === pick) {
      characters[character] = true

      return {
        utf8: characters,
        c: character,
      }
    }

    index += 1
  }

  return {
    utf8: characters,
    c: undefined,
  }
}

module.exports = {
  char,
  defaultBlacklist,
  utf8,
  utf8ToBinary,
}
