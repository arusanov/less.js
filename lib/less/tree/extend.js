const Node = require('./node')
const Selector = require('./selector')

class Extend extends Node {
  constructor(selector, option, index, currentFileInfo, visibilityInfo) {
    super()
    this.selector = selector
    this.option = option
    this.index = index
    this.object_id = Extend.next_id++
    this.parent_ids = [this.object_id]
    this.currentFileInfo = currentFileInfo || {}
    this.copyVisibilityInfo(visibilityInfo)
    this.allowRoot = true

    switch (option) {
      case 'all':
        this.allowBefore = true
        this.allowAfter = true
        break
      default:
        this.allowBefore = false
        this.allowAfter = false
        break
    }
  }

  accept(visitor) {
    this.selector = visitor.visit(this.selector)
  }

  eval(context) {
    return new Extend(
      this.selector.eval(context),
      this.option,
      this.index,
      this.currentFileInfo,
      this.visibilityInfo()
    )
  }

  clone(context) {
    return new Extend(
      this.selector,
      this.option,
      this.index,
      this.currentFileInfo,
      this.visibilityInfo()
    )
  }

  //it concatenates (joins) all selectors in selector array
  findSelfSelectors(selectors) {
    let selfElements = []
    let i
    let selectorElements

    for (i = 0; i < selectors.length; i++) {
      selectorElements = selectors[i].elements
      // duplicate the logic in genCSS function inside the selector node.
      // future TODO - move both logics into the selector joiner visitor
      if (
        i > 0 &&
        selectorElements.length &&
        selectorElements[0].combinator.value === ''
      ) {
        selectorElements[0].combinator.value = ' '
      }
      selfElements = selfElements.concat(selectors[i].elements)
    }

    this.selfSelectors = [new Selector(selfElements)]
    this.selfSelectors[0].copyVisibilityInfo(this.visibilityInfo())
  }
}

Extend.next_id = 0

Extend.prototype.type = 'Extend'
module.exports = Extend
