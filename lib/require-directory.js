const fs = require('node:fs')
const path = require('node:path')

function requireDirectory(directory) {
  const absoluteDirectory = path.resolve(process.cwd(), directory)

  return fs.readdirSync(absoluteDirectory, { withFileTypes: true })
    .filter((entry) => entry.isFile() && path.extname(entry.name) === '.js')
    .sort((left, right) => left.name.localeCompare(right.name))
    .reduce((modules, entry) => {
      const name = path.basename(entry.name, '.js')
      modules[name] = require(path.resolve(absoluteDirectory, entry.name))
      return modules
    }, {})
}

module.exports = {
  requireDirectory,
}
