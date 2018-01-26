const Node = require('./node')

class Alpha extends Node {
  constructor(val) {
    super()
    this.value = val
  }

  accept(visitor) {
    this.value = visitor.visit(this.value)
  }

  eval(context) {
    if (this.value.eval) {
      return new Alpha(this.value.eval(context))
    }
    return this
  }

  genCSS(context, output) {
    output.add('alpha(opacity=')

    if (this.value.genCSS) {
      this.value.genCSS(context, output)
    } else {
      output.add(this.value)
    }

    output.add(')')
  }
}

Alpha.prototype.type = 'Alpha'

module.exports = Alpha
