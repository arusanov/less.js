const Node = require('./node')
const FunctionCaller = require('../functions/function-caller')

//
// A function call node.
//
class Call extends Node {
  constructor(name, args, index, currentFileInfo) {
    super()
    this.name = name
    this.args = args
    this.index = index
    this.currentFileInfo = currentFileInfo
  }

  accept(visitor) {
    if (this.args) {
      this.args = visitor.visitArray(this.args)
    }
  }

  //
  // When evaluating a function call,
  // we either find the function in the functionRegistry,
  // in which case we call it, passing the  evaluated arguments,
  // if this returns null or we cannot find the function, we
  // simply print it out as it appeared originally [2].
  //
  // The reason why we evaluate the arguments, is in the case where
  // we try to pass a variable to a function, like: `saturate(@color)`.
  // The function should receive the value, not the variable.
  //
  eval(context) {
    context.inCall()
    const args = this.args.map(a => a.eval(context))
    context.outOfCall()
    let result
    const funcCaller = new FunctionCaller(
      this.name,
      context,
      this.index,
      this.currentFileInfo
    )
    //Check if any of root vars take place
    for (const arg of args) {
      if (arg.isRootVariable)
        return new Call(this.name, args, this.index, this.currentFileInfo)
    }

    if (funcCaller.isValid()) {
      try {
        result = funcCaller.call(args)
      } catch (e) {
        throw {
          type: e.type || 'Runtime',
          message: `error evaluating function \`${this.name}\`${
            e.message ? ': ' + e.message : ''
          }`,
          index: this.index,
          filename: this.currentFileInfo.filename,
        }
      }

      if (result != null) {
        result.index = this.index
        result.currentFileInfo = this.currentFileInfo
        return result
      }
    }

    return new Call(this.name, args, this.index, this.currentFileInfo)
  }

  genCSS(context, output) {
    output.add(`${this.name}(`, this.currentFileInfo, this.index)

    for (let i = 0; i < this.args.length; i++) {
      this.args[i].genCSS(context, output)
      if (i + 1 < this.args.length) {
        output.add(', ')
      }
    }

    output.add(')')
  }
}

Call.prototype.type = 'Call'
module.exports = Call
