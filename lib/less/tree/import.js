const Node = require('./node')
const Media = require('./media')
const URL = require('./url')
const Quoted = require('./quoted')
const Ruleset = require('./ruleset')
const Anonymous = require('./anonymous')

//
// CSS @import node
//
// The general strategy here is that we don't want to wait
// for the parsing to be completed, before we start importing
// the file. That's because in the context of a browser,
// most of the time will be spent waiting for the server to respond.
//
// On creation, we push the import path to our import queue, though
// `import,push`, we also pass it a callback, which it'll call once
// the file has been fetched, and parsed.
//
class Import extends Node {
  constructor(path, features, options, index, currentFileInfo, visibilityInfo) {
    super()
    this.options = options
    this.index = index
    this.path = path
    this.features = features
    this.currentFileInfo = currentFileInfo
    this.allowRoot = true

    if (this.options.less !== undefined || this.options.inline) {
      this.css = !this.options.less || this.options.inline
    } else {
      const pathValue = this.getPath()
      if (pathValue && /[#\.\&\?\/]css([\?;].*)?$/.test(pathValue)) {
        this.css = true
      }
    }
    this.copyVisibilityInfo(visibilityInfo)
  }

  accept(visitor) {
    if (this.features) {
      this.features = visitor.visit(this.features)
    }
    this.path = visitor.visit(this.path)
    if (!this.options.plugin && !this.options.inline && this.root) {
      this.root = visitor.visit(this.root)
    }
  }

  genCSS(context, output) {
    if (this.css && this.path.currentFileInfo.reference === undefined) {
      output.add('@import ', this.currentFileInfo, this.index)
      this.path.genCSS(context, output)
      if (this.features) {
        output.add(' ')
        this.features.genCSS(context, output)
      }
      output.add(';')
    }
  }

  getPath() {
    return this.path instanceof URL ? this.path.value.value : this.path.value
  }

  isVariableImport() {
    let path = this.path
    if (path instanceof URL) {
      path = path.value
    }
    if (path instanceof Quoted) {
      return path.containsVariables()
    }

    return true
  }

  evalForImport(context) {
    let path = this.path

    if (path instanceof URL) {
      path = path.value
    }

    return new Import(
      path.eval(context),
      this.features,
      this.options,
      this.index,
      this.currentFileInfo,
      this.visibilityInfo()
    )
  }

  evalPath(context) {
    const path = this.path.eval(context)
    const rootpath = this.currentFileInfo && this.currentFileInfo.rootpath

    if (!(path instanceof URL)) {
      if (rootpath) {
        const pathValue = path.value
        // Add the base path if the import is relative
        if (pathValue && context.isPathRelative(pathValue)) {
          path.value = rootpath + pathValue
        }
      }
      path.value = context.normalizePath(path.value)
    }

    return path
  }

  eval(context) {
    const result = this.doEval(context)
    if (this.options.reference || this.blocksVisibility()) {
      if (result.length || result.length === 0) {
        result.forEach(node => {
          node.addVisibilityBlock()
        })
      } else {
        result.addVisibilityBlock()
      }
    }
    return result
  }

  doEval(context) {
    let ruleset
    let registry
    const features = this.features && this.features.eval(context)

    if (this.options.plugin) {
      registry = context.frames[0] && context.frames[0].functionRegistry
      if (registry && this.root && this.root.functions) {
        registry.addMultiple(this.root.functions)
      }
      return []
    }

    if (this.skip) {
      if (typeof this.skip === 'function') {
        this.skip = this.skip()
      }
      if (this.skip) {
        return []
      }
    }
    if (this.options.inline) {
      const contents = new Anonymous(
        this.root,
        0,
        {
          filename: this.importedFilename,
          reference:
            this.path.currentFileInfo && this.path.currentFileInfo.reference,
        },
        true,
        true
      )

      return this.features
        ? new Media([contents], this.features.value)
        : [contents]
    } else if (this.css) {
      const newImport = new Import(
        this.evalPath(context),
        features,
        this.options,
        this.index
      )
      if (!newImport.css && this.error) {
        throw this.error
      }
      return newImport
    } else {
      ruleset = new Ruleset(null, this.root.rules.slice(0))
      ruleset.evalImports(context)

      return this.features
        ? new Media(ruleset.rules, this.features.value)
        : ruleset.rules
    }
  }
}

Import.prototype.type = 'Import'
module.exports = Import
