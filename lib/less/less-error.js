const utils = require('./utils')

const LessError = (module.exports = function LessError(
  e,
  importManager,
  currentFilename
) {
  Error.call(this)

  const filename = e.filename || currentFilename

  if (importManager && filename) {
    const input = importManager.contents[filename]
    const loc = utils.getLocation(e.index, input)
    const line = loc.line
    const col = loc.column
    const callLine = e.call && utils.getLocation(e.call, input).line
    const lines = input.split('\n')

    this.type = e.type || 'Syntax'
    this.filename = filename
    this.index = e.index
    this.line = typeof line === 'number' ? line + 1 : null
    this.callLine = callLine + 1
    this.callExtract = lines[callLine]
    this.column = col
    this.extract = [lines[line - 1], lines[line], lines[line + 1]]
  }
  this.message = e.message
  this.stack = e.stack
})

if (typeof Object.create === 'undefined') {
  const F = () => {}
  F.prototype = Error.prototype
  LessError.prototype = new F()
} else {
  LessError.prototype = Object.create(Error.prototype)
}

LessError.prototype.constructor = LessError
