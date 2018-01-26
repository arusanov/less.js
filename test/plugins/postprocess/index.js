;(exports => {
  const postProcessor = function() {}

  postProcessor.prototype = {
    process(css) {
      return `hr {height:50px;}\n${css}`
    },
  }

  exports.install = (less, pluginManager) => {
    pluginManager.addPostProcessor(new postProcessor())
  }
})(
  typeof exports === 'undefined' ? (this['postProcessorPlugin'] = {}) : exports
)
