const environment = require('./environment'),
  FileManager = require('./file-manager'),
  createFromEnvironment = require('../less'),
  less = createFromEnvironment(environment, [new FileManager()])

less.FileManager = FileManager

less.formatError = function (ctx, options = {}) {

  let message = ''
  let extract = ctx.extract
  let error = []

  // only output a stack if it isn't a less error
  if (ctx.stack && !ctx.type) { return ctx.stack }

  if (!ctx.hasOwnProperty('index') || !extract) {
    return ctx.stack || ctx.message
  }

  if (typeof extract[0] === 'string') {
    error.push((ctx.line - 1) + ' ' + extract[0])
  }

  if (typeof extract[1] === 'string') {
    let errorTxt = ctx.line + ' '
    if (extract[1]) {
      errorTxt += extract[1].slice(0, ctx.column) +
        extract[1].substr(ctx.column, 1) +
        extract[1].slice(ctx.column + 1)
    }
    error.push(errorTxt)
  }

  if (typeof extract[2] === 'string') {
    error.push((ctx.line + 1) + ' ' + extract[2])
  }
  error = error.join('\n') + '\n'

  message += ctx.type + 'Error: ' + ctx.message
  if (ctx.filename) {
    message += ' in ' + ctx.filename +
      ' on line ' + ctx.line + ', column ' + (ctx.column + 1) + ':'
  }

  message += '\n' + error

  if (ctx.callLine) {
    message += 'from ' + (ctx.filename || '') + '/n'
    message += ctx.callLine + ' ' + ctx.callExtract + '/n'
  }

  return message
}

less.writeError = function (ctx, options) {
  options = options || {}
  if (options.silent) { return }
  console.error(less.formatError(ctx, options))
}

require('./image-size')(less.environment)

module.exports = less
