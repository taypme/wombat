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

function utf8 (blacklist = defaultBlacklist) {
  
  const characters = {}
  const blocked = new Set (blacklist)

  let codePoint = 0

  while (codePoint <= 0x10ffff) {
    
    if (codePoint >= 0xd800 && codePoint <= 0xdfff) {
      codePoint += 1
      continue
    }

    const character = String.fromCodePoint (codePoint)

    if ( !blocked.has (character)) {
      characters[character] = false
    }

    codePoint += 1
  }

  return characters
}

function utf8ToBinary (text) {
  
  return Array.from ( Buffer.from (text, 'utf8'), byte =>
    
    byte
      .toString (2)
      .padStart (8, '0')

  ).join ('')
}

function char (characters) {
  
  let available = 0
  let picked

  for (const character in characters) {

    if (characters[character] !== false) {
      continue
    }

    available += 1

    if ( Math.random () < 1 / available) {
      picked = character
    }
  }

  if (picked !== undefined) {
    characters[picked] = true
  }

  return {
    utf8: characters,
    c: picked,
  }
}

module.exports = {
  char,
  defaultBlacklist,
  utf8,
  utf8ToBinary,
}
