const Node = require('./node')

class URL extends Node {
  constructor(val, index, currentFileInfo, isEvald) {
    super()
    this.value = val
    this.currentFileInfo = currentFileInfo
    this.index = index
    this.isEvald = isEvald
  }

  accept(visitor) {
    this.value = visitor.visit(this.value)
  }

  genCSS(context, output) {
    output.add('url(')
    this.value.genCSS(context, output)
    output.add(')')
  }

  eval(context) {
    const val = this.value.eval(context)
    let rootpath

    if (!this.isEvald) {
      // Add the base path if the URL is relative
      rootpath = this.currentFileInfo && this.currentFileInfo.rootpath
      if (
        rootpath &&
        typeof val.value === 'string' &&
        context.isPathRelative(val.value)
      ) {
        if (!val.quote) {
          rootpath = rootpath.replace(/[\(\)'"\s]/g, match => `\\${match}`)
        }
        val.value = rootpath + val.value
      }

      val.value = context.normalizePath(val.value)

      // Add url args if enabled
      if (context.urlArgs) {
        if (!val.value.match(/^\s*data:/)) {
          const delimiter = val.value.indexOf('?') === -1 ? '?' : '&'
          const urlArgs = delimiter + context.urlArgs
          if (val.value.indexOf('#') !== -1) {
            val.value = val.value.replace('#', `${urlArgs}#`)
          } else {
            val.value += urlArgs
          }
        }
      }
    }

    return new URL(val, this.index, this.currentFileInfo, true)
  }
}

URL.prototype.type = 'Url'
module.exports = URL
