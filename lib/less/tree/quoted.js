const Node = require('./node')
const JsEvalNode = require('./js-eval-node')
const Variable = require('./variable')

class Quoted extends JsEvalNode {
  constructor(str, content, escaped, index, currentFileInfo) {
    super()
    this.escaped = escaped == null ? true : escaped
    this.value = content || ''
    this.quote = str.charAt(0)
    this.index = index
    this.currentFileInfo = currentFileInfo
  }

  genCSS(context, output) {
    if (!this.escaped) {
      output.add(this.quote, this.currentFileInfo, this.index)
    }
    output.add(this.value)
    if (!this.escaped) {
      output.add(this.quote)
    }
  }

  containsVariables() {
    return this.value.match(/(`([^`]+)`)|@\{([\w-]+)\}/)
  }

  eval(context) {
    const that = this
    let value = this.value
    const javascriptReplacement = (_, exp) =>
      String(that.evaluateJavaScript(exp, context))
    const interpolationReplacement = (_, name) => {
      const v = new Variable(`@${name}`, that.index, that.currentFileInfo).eval(
        context,
        true
      )
      return v instanceof Quoted ? v.value : v.toCSS()
    }
    function iterativeReplace(value, regexp, replacementFnc) {
      let evaluatedValue = value
      do {
        value = evaluatedValue
        evaluatedValue = value.replace(regexp, replacementFnc)
      } while (value !== evaluatedValue)
      return evaluatedValue
    }
    value = iterativeReplace(value, /`([^`]+)`/g, javascriptReplacement)
    value = iterativeReplace(value, /@\{([\w-]+)\}/g, interpolationReplacement)
    return new Quoted(
      this.quote + value + this.quote,
      value,
      this.escaped,
      this.index,
      this.currentFileInfo
    )
  }

  compare(other) {
    // when comparing quoted strings allow the quote to differ
    if (other.type === 'Quoted' && !this.escaped && !other.escaped) {
      return Node.numericCompare(this.value, other.value)
    } else {
      return other.toCSS && this.toCSS() === other.toCSS() ? 0 : undefined
    }
  }
}

Quoted.prototype.type = 'Quoted'
module.exports = Quoted
