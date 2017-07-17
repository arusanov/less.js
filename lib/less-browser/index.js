const createFromEnvironment = require('../less')
const AbstractFileManager = require('../less/environment/abstract-file-manager.js')

class NotSupportedFileManager extends AbstractFileManager {
  supports() {
    return true
  }

  supportsSync() {
    return true
  }

  loadFile() {
    return Promise.reject(new Error('loading is not supported'))
  }

  loadFileSync() {
    new Error('loading is not supported')
  }
}

const less = createFromEnvironment(
  {
    getSourceMapGenerator: function() {
      return null
    },
  },
  [new NotSupportedFileManager()]
)
less.FileManager = NotSupportedFileManager

module.exports = less
