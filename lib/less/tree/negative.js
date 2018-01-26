const Node = require('./node')
const Operation = require('./operation')
const Dimension = require('./dimension')

class Negative extends Node {
  constructor(node) {
    super()
    this.value = node
  }

  genCSS(context, output) {
    output.add('-')
    this.value.genCSS(context, output)
  }

  eval(context) {
    if (context.isMathOn()) {
      return new Operation('*', [new Dimension(-1), this.value]).eval(context)
    }
    return new Negative(this.value.eval(context))
  }
}

Negative.prototype.type = 'Negative'
module.exports = Negative
