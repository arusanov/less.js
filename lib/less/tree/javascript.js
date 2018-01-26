const JsEvalNode = require('./js-eval-node')
const Dimension = require('./dimension')
const Quoted = require('./quoted')
const Anonymous = require('./anonymous')

class JavaScript extends JsEvalNode {
  constructor(string, escaped, index, currentFileInfo) {
    super()
    this.escaped = escaped
    this.expression = string
    this.index = index
    this.currentFileInfo = currentFileInfo
  }

  eval(context) {
    const result = this.evaluateJavaScript(this.expression, context)

    if (typeof result === 'number') {
      return new Dimension(result)
    } else if (typeof result === 'string') {
      return new Quoted(`"${result}"`, result, this.escaped, this.index)
    } else if (Array.isArray(result)) {
      return new Anonymous(result.join(', '))
    } else {
      return new Anonymous(result)
    }
  }
}

JavaScript.prototype.type = 'JavaScript'

module.exports = JavaScript
