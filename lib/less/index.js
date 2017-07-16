module.exports = (environment, fileManagers) => {
  const Environment = require('./environment/environment')
  environment = new Environment(environment, fileManagers)

  const SourceMapOutput = require('./source-map-output')(environment)
  const SourceMapBuilder = require('./source-map-builder')(
    SourceMapOutput,
    environment
  )
  const ParseTree = require('./parse-tree')(SourceMapBuilder)
  const ImportManager = require('./import-manager')(environment)

  return {
    version: [2, 7, 2],
    data: require('./data'),
    tree: require('./tree'),
    Environment,
    environment,
    AbstractFileManager: require('./environment/abstract-file-manager'),
    visitors: require('./visitors'),
    Parser: require('./parser/parser'),
    functions: require('./functions')(environment),
    contexts: require('./contexts'),
    SourceMapOutput,
    SourceMapBuilder,
    ParseTree,
    ImportManager: ImportManager,
    render: require('./render')(environment, ParseTree, ImportManager),
    parse: require('./parse')(environment, ParseTree, ImportManager),
    LessError: require('./less-error'),
    transformTree: require('./transform-tree'),
    utils: require('./utils'),
    PluginManager: require('./plugin-manager'),
    logger: require('./logger'),
    writeError(ctx, options) {
      options = options || {}
      if (options.silent) {
        return
      }
      console.error(this.formatError(ctx, options))
    },
    formatError(ctx) {
      let message = ''
      let extract = ctx.extract
      let error = []

      // only output a stack if it isn't a less error
      if (ctx.stack && !ctx.type) {
        return ctx.stack
      }

      if (!ctx.hasOwnProperty('index') || !extract) {
        return ctx.stack || ctx.message
      }

      if (typeof extract[0] === 'string') {
        error.push(`${ctx.line - 1} ${extract[0]}`)
      }

      if (typeof extract[1] === 'string') {
        let errorTxt = `${ctx.line} `
        if (extract[1]) {
          errorTxt +=
            extract[1].slice(0, ctx.column) +
            extract[1].substr(ctx.column, 1) +
            extract[1].slice(ctx.column + 1)
        }
        error.push(errorTxt)
      }

      if (typeof extract[2] === 'string') {
        error.push(`${ctx.line + 1} ${extract[2]}`)
      }
      error = `${error.join('\n')}\n`

      message += `${ctx.type}Error: ${ctx.message}`
      if (ctx.filename) {
        message += ` in ${ctx.filename} on line ${ctx.line}, column ${ctx.column +
          1}:`
      }

      message += `\n${error}`

      if (ctx.callLine) {
        message += `from ${ctx.filename || ''}/n`
        message += `${ctx.callLine} ${ctx.callExtract}/n`
      }
      return message
    },
  }
}
