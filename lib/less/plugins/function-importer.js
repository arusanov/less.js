const LessError = require('../less-error')
const tree = require('../tree')

const FunctionImporter = (module.exports = function FunctionImporter(
  context,
  fileInfo
) {
  this.fileInfo = fileInfo
})

FunctionImporter.prototype.eval = function(contents, callback) {
  const loaded = {}
  let loader
  let registry

  registry = {
    add(name, func) {
      loaded[name] = func
    },
    addMultiple(functions) {
      Object.keys(functions).forEach(name => {
        loaded[name] = functions[name]
      })
    },
  }

  try {
    loader = new Function('functions', 'tree', 'fileInfo', contents)
    loader(registry, tree, this.fileInfo)
  } catch (e) {
    callback(
      new LessError({
        message: `Plugin evaluation error: '${e.name}: ${e.message.replace(
          /["]/g,
          "'"
        )}'`,
        filename: this.fileInfo.filename,
      }),
      null
    )
  }

  callback(null, { functions: loaded })
}
