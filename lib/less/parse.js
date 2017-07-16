let PromiseConstructor
const contexts = require('./contexts')
const Parser = require('./parser/parser')
const PluginManager = require('./plugin-manager')

module.exports = (environment, ParseTree, ImportManager) => {
  const parse = function(input, options = {}, callback) {
    if (typeof options === 'function') {
      callback = options
      options = {}
    }

    if (!callback) {
      if (!PromiseConstructor) {
        PromiseConstructor =
          typeof Promise === 'undefined' ? require('promise') : Promise
      }
      const self = this
      return new PromiseConstructor((resolve, reject) => {
        parse.call(self, input, options, (err, output) => {
          if (err) {
            reject(err)
          } else {
            resolve(output)
          }
        })
      })
    } else {
      let context
      let rootFileInfo
      const pluginManager = new PluginManager(this)

      pluginManager.addPlugins(options.plugins)
      options.pluginManager = pluginManager

      context = new contexts.Parse(options)

      if (options.rootFileInfo) {
        rootFileInfo = options.rootFileInfo
      } else {
        const filename = options.filename || 'input'
        const entryPath = filename.replace(/[^\/\\]*$/, '')
        rootFileInfo = {
          filename,
          relativeUrls: context.relativeUrls,
          rootpath: context.rootpath || '',
          currentDirectory: entryPath,
          entryPath,
          rootFilename: filename,
        }
        // add in a missing trailing slash
        if (rootFileInfo.rootpath && rootFileInfo.rootpath.slice(-1) !== '/') {
          rootFileInfo.rootpath += '/'
        }
      }

      const imports = new ImportManager(context, rootFileInfo)

      new Parser(context, imports, rootFileInfo).parse(
        input,
        (e, root) => {
          if (e) {
            return callback(e)
          }
          callback(null, root, imports, options)
        },
        options
      )
    }
  }
  return parse
}
