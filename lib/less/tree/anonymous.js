const Node = require('./node')

class Anonymous extends Node {
  constructor(
    value,
    index,
    currentFileInfo,
    mapLines,
    rulesetLike,
    visibilityInfo
  ) {
    super()
    this.value = value
    this.index = index
    this.mapLines = mapLines
    this.currentFileInfo = currentFileInfo
    this.rulesetLike = typeof rulesetLike === 'undefined' ? false : rulesetLike
    this.allowRoot = true
    this.copyVisibilityInfo(visibilityInfo)
  }

  eval() {
    return new Anonymous(
      this.value,
      this.index,
      this.currentFileInfo,
      this.mapLines,
      this.rulesetLike,
      this.visibilityInfo()
    )
  }

  compare(other) {
    return other.toCSS && this.toCSS() === other.toCSS() ? 0 : undefined
  }

  isRulesetLike() {
    return this.rulesetLike
  }

  genCSS(context, output) {
    output.add(this.value, this.currentFileInfo, this.index, this.mapLines)
  }
}

Anonymous.prototype.type = 'Anonymous'
module.exports = Anonymous
