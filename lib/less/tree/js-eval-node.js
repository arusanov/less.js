const Node = require('./node')
const Variable = require('./variable')

const JsEvalNode = function() {}
JsEvalNode.prototype = new Node()

JsEvalNode.prototype.evaluateJavaScript = function(expression, context) {
  let result
  const that = this
  const evalContext = {}

  if (context.javascriptEnabled !== undefined && !context.javascriptEnabled) {
    throw {
      message: 'You are using JavaScript, which has been disabled.',
      filename: this.currentFileInfo.filename,
      index: this.index,
    }
  }

  expression = expression.replace(/@\{([\w-]+)\}/g, (_, name) =>
    that.jsify(
      new Variable(`@${name}`, that.index, that.currentFileInfo).eval(context)
    )
  )

  try {
    expression = new Function(`return (${expression})`)
  } catch (e) {
    throw {
      message: `JavaScript evaluation error: ${e.message} from \`${expression}\``,
      filename: this.currentFileInfo.filename,
      index: this.index,
    }
  }

  const variables = context.frames[0].variables()
  for (const k in variables) {
    if (variables.hasOwnProperty(k)) {
      /*jshint loopfunc:true */
      evalContext[k.slice(1)] = {
        value: variables[k].value,
        toJS() {
          return this.value.eval(context).toCSS()
        },
      }
    }
  }

  try {
    result = expression.call(evalContext)
  } catch (e) {
    throw {
      message: `JavaScript evaluation error: '${e.name}: ${e.message.replace(
        /["]/g,
        "'"
      )}'`,
      filename: this.currentFileInfo.filename,
      index: this.index,
    }
  }
  return result
}
JsEvalNode.prototype.jsify = obj => {
  if (Array.isArray(obj.value) && obj.value.length > 1) {
    return `[${obj.value.map(v => v.toCSS()).join(', ')}]`
  } else {
    return obj.toCSS()
  }
}

module.exports = JsEvalNode
