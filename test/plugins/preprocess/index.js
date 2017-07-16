;(exports => {
  const preProcessor = function() {}

  preProcessor.prototype = {
    process(src, extra) {
      const injected = '@color: red;\n'
      const ignored = extra.imports.contentsIgnoredChars
      const fileInfo = extra.fileInfo
      ignored[fileInfo.filename] = ignored[fileInfo.filename] || 0
      ignored[fileInfo.filename] += injected.length
      return injected + src
    },
  }

  exports.install = (less, pluginManager) => {
    pluginManager.addPreProcessor(new preProcessor())
  }
})(typeof exports === 'undefined' ? (this['preProcessorPlugin'] = {}) : exports)
