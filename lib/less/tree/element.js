const Node = require('./node')
const Paren = require('./paren')
const Combinator = require('./combinator')

class Element extends Node {
  constructor(combinator, value, index, currentFileInfo, info) {
    super()
    this.combinator =
      combinator instanceof Combinator ? combinator : new Combinator(combinator)

    if (typeof value === 'string') {
      this.value = value.trim()
    } else if (value) {
      this.value = value
    } else {
      this.value = ''
    }
    this.index = index
    this.currentFileInfo = currentFileInfo
    this.copyVisibilityInfo(info)
  }

  accept(visitor) {
    const value = this.value
    this.combinator = visitor.visit(this.combinator)
    if (typeof value === 'object') {
      this.value = visitor.visit(value)
    }
  }

  eval(context) {
    return new Element(
      this.combinator,
      this.value.eval ? this.value.eval(context) : this.value,
      this.index,
      this.currentFileInfo,
      this.visibilityInfo()
    )
  }

  clone() {
    return new Element(
      this.combinator,
      this.value,
      this.index,
      this.currentFileInfo,
      this.visibilityInfo()
    )
  }

  genCSS(context, output) {
    output.add(this.toCSS(context), this.currentFileInfo, this.index)
  }

  toCSS(context = {}) {
    let value = this.value
    const firstSelector = context.firstSelector
    if (value instanceof Paren) {
      // selector in parens should not be affected by outer selector
      // flags (breaks only interpolated selectors - see #1973)
      context.firstSelector = true
    }
    value = value.toCSS ? value.toCSS(context) : value
    context.firstSelector = firstSelector
    if (value === '' && this.combinator.value.charAt(0) === '&') {
      return ''
    } else {
      return this.combinator.toCSS(context) + value
    }
  }
}

Element.prototype.type = 'Element'
module.exports = Element
