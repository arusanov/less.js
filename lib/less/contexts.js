const contexts = {}
module.exports = contexts

const copyFromOriginal = function copyFromOriginal(
  original,
  destination,
  propertiesToCopy
) {
  if (!original) {
    return
  }

  for (let i = 0; i < propertiesToCopy.length; i++) {
    if (original.hasOwnProperty(propertiesToCopy[i])) {
      destination[propertiesToCopy[i]] = original[propertiesToCopy[i]]
    }
  }
}

/*
 parse is used whilst parsing
 */
const parseCopyProperties = [
  // options
  'paths', // option - unmodified - paths to search for imports on
  'relativeUrls', // option - whether to adjust URL's to be relative
  'rootpath', // option - rootpath to append to URL's
  'strictImports', // option -
  'insecure', // option - whether to allow imports from insecure ssl hosts
  'dumpLineNumbers', // option - whether to dump line numbers
  'compress', // option - whether to compress
  'syncImport', // option - whether to import synchronously
  'chunkInput', // option - whether to chunk input. more performant but causes parse issues.
  'mime', // browser only - mime type for sheet import
  'useFileCache', // browser only - whether to use the per file session cache
  // context
  'processImports', // option & context - whether to process imports. if false then imports will not be imported.
  // Used by the import manager to stop multiple import visitors being created.
  'pluginManager', // Used as the plugin manager for the session
]

contexts.Parse = function(options) {
  copyFromOriginal(options, this, parseCopyProperties)

  if (typeof this.paths === 'string') {
    this.paths = [this.paths]
  }
}

const evalCopyProperties = [
  'paths', // additional include paths
  'compress', // whether to compress
  'ieCompat', // whether to enforce IE compatibility (IE8 data-uri)
  'disableMath', // whether math enabled
  'strictMath', // whether math has to be within parenthesis
  'strictUnits', // whether units need to evaluate correctly
  'sourceMap', // whether to output a source map
  'importMultiple', // whether we are currently importing multiple copies
  'urlArgs', // whether to add args into url tokens
  'javascriptEnabled', // option - whether JavaScript is enabled. if undefined, defaults to true
  'pluginManager', // Used as the plugin manager for the session
  'importantScope', // used to bubble up !important statements,
  'simplify', //Simplify less
  'simplifyFilter', //Simplify variable filter
]

contexts.Eval = function(options, frames) {
  copyFromOriginal(options, this, evalCopyProperties)

  if (typeof this.paths === 'string') {
    this.paths = [this.paths]
  }

  this.frames = frames || []
  this.importantScope = this.importantScope || []
}

contexts.Eval.prototype.inParenthesis = function() {
  if (!this.parensStack) {
    this.parensStack = []
  }
  this.parensStack.push(true)
}

contexts.Eval.prototype.outOfParenthesis = function() {
  this.parensStack.pop()
}
contexts.Eval.prototype.isInParens = function() {
  return !!(this.parensStack && this.parensStack.length > 0)
}

contexts.Eval.prototype.inCall = function() {
  if (!this.callStack) {
    this.callStack = []
  }
  this.callStack.push(true)
}

contexts.Eval.prototype.outOfCall = function() {
  this.callStack.pop()
}

contexts.Eval.prototype.isInCall = function() {
  return !!(this.callStack && this.callStack.length > 0)
}

contexts.Eval.prototype.isMathOn = function() {
  return !this.disableMath && (this.strictMath ? this.isInParens() : true)
}

contexts.Eval.prototype.isPathRelative = path =>
  !/^(?:[a-z-]+:|\/|#)/i.test(path)

contexts.Eval.prototype.normalizePath = path => {
  const segments = path.split('/').reverse()
  let segment

  path = []
  while (segments.length !== 0) {
    segment = segments.pop()
    switch (segment) {
      case '.':
        break
      case '..':
        if (path.length === 0 || path[path.length - 1] === '..') {
          path.push(segment)
        } else {
          path.pop()
        }
        break
      default:
        path.push(segment)
        break
    }
  }

  return path.join('/')
}

//todo - do the same for the toCSS ?
