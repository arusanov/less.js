const Node = require('./node')
const getDebugInfo = require('./debug-info')

class Comment extends Node {
  constructor(value, isLineComment, index, currentFileInfo) {
    super()
    this.value = value
    this.isLineComment = isLineComment
    this.index = index
    this.currentFileInfo = currentFileInfo
    this.allowRoot = true
  }

  genCSS(context, output) {
    if (this.debugInfo) {
      output.add(getDebugInfo(context, this), this.currentFileInfo, this.index)
    }
    output.add(this.value)
  }

  isSilent(context) {
    const isCompressed = context.compress && this.value[2] !== '!'
    return this.isLineComment || isCompressed
  }
}

Comment.prototype.type = 'Comment'
module.exports = Comment
