const Node = require('./node')
const Element = require('./element')

class Selector extends Node {
  constructor(
    elements,
    extendList,
    condition,
    index,
    currentFileInfo,
    visibilityInfo
  ) {
    super()
    this.elements = elements
    this.extendList = extendList
    this.condition = condition
    this.currentFileInfo = currentFileInfo || {}
    if (!condition) {
      this.evaldCondition = true
    }
    this.copyVisibilityInfo(visibilityInfo)
  }

  accept(visitor) {
    if (this.elements) {
      this.elements = visitor.visitArray(this.elements)
    }
    if (this.extendList) {
      this.extendList = visitor.visitArray(this.extendList)
    }
    if (this.condition) {
      this.condition = visitor.visit(this.condition)
    }
  }

  createDerived(elements, extendList, evaldCondition) {
    const info = this.visibilityInfo()
    evaldCondition =
      evaldCondition != null ? evaldCondition : this.evaldCondition
    const newSelector = new Selector(
      elements,
      extendList || this.extendList,
      null,
      this.index,
      this.currentFileInfo,
      info
    )
    newSelector.evaldCondition = evaldCondition
    newSelector.mediaEmpty = this.mediaEmpty
    return newSelector
  }

  createEmptySelectors() {
    const el = new Element('', '&', this.index, this.currentFileInfo)
    const sels = [
      new Selector([el], null, null, this.index, this.currentFileInfo),
    ]
    sels[0].mediaEmpty = true
    return sels
  }

  match(other) {
    const elements = this.elements
    const len = elements.length
    let olen
    let i

    other.CacheElements()

    olen = other._elements.length
    if (olen === 0 || len < olen) {
      return 0
    } else {
      for (i = 0; i < olen; i++) {
        if (elements[i].value !== other._elements[i]) {
          return 0
        }
      }
    }

    return olen // return number of matched elements
  }

  CacheElements() {
    if (this._elements) {
      return
    }

    let elements = this.elements
      .map(v => v.combinator.value + (v.value.value || v.value))
      .join('')
      .match(/[,&#\*\.\w-]([\w-]|(\\.))*/g)

    if (elements) {
      if (elements[0] === '&') {
        elements.shift()
      }
    } else {
      elements = []
    }

    this._elements = elements
  }

  isJustParentSelector() {
    return (
      !this.mediaEmpty &&
      this.elements.length === 1 &&
      this.elements[0].value === '&' &&
      (this.elements[0].combinator.value === ' ' ||
        this.elements[0].combinator.value === '')
    )
  }

  eval(context) {
    const evaldCondition = this.condition && this.condition.eval(context)
    let elements = this.elements
    let extendList = this.extendList

    elements = elements && elements.map(e => e.eval(context))
    extendList = extendList && extendList.map(extend => extend.eval(context))

    return this.createDerived(elements, extendList, evaldCondition)
  }

  genCSS(context, output) {
    let i
    let element
    if (
      (!context || !context.firstSelector) &&
      this.elements[0].combinator.value === ''
    ) {
      output.add(' ', this.currentFileInfo, this.index)
    }
    if (!this._css) {
      //TODO caching? speed comparison?
      for (i = 0; i < this.elements.length; i++) {
        element = this.elements[i]
        element.genCSS(context, output)
      }
    }
  }

  getIsOutput() {
    return this.evaldCondition
  }
}

Selector.prototype.type = 'Selector'
module.exports = Selector
