const Node = require('./node')
const Color = require('./color')
const Dimension = require('./dimension')

class Operation extends Node {
  constructor (op, operands, isSpaced, isParens = false, isRootVariable = false) {
    super()
    this.op = op.trim()
    this.operands = operands
    this.isSpaced = isSpaced
    this.isRootVariable = isRootVariable
    this.isParens = isParens
  }

  accept (visitor) {
    this.operands = visitor.visit(this.operands)
  }

  eval (context) {
    let a = this.operands[0].eval(context)
    let b = this.operands[1].eval(context)
    const isRootVariable = !!(a.isRootVariable || b.isRootVariable)
    if (context.isMathOn() && !isRootVariable) {
      if (a instanceof Dimension && b instanceof Color) {
        a = a.toColor()
      }
      if (b instanceof Dimension && a instanceof Color) {
        b = b.toColor()
      }
      if (!a.operate) {
        if (context.simplify) {
          return new Operation(this.op, [a, b], this.isSpaced, this.isParens, isRootVariable)
        } else {
          throw {
            type: 'Operation',
            message: 'Operation on an invalid type',
          }
        }
      }

      return a.operate(context, this.op, b)
    } else {
      return new Operation(this.op, [a, b], this.isSpaced, context.isInParens(), isRootVariable)
    }
  }

  genCSS (context, output) {
    if (this.isParens){
      output.add('(')
    }
    this.operands[0].genCSS(context, output)
    if (this.isSpaced) {
      output.add(' ')
    }
    output.add(this.op)
    if (this.isSpaced) {
      output.add(' ')
    }
    this.operands[1].genCSS(context, output)
    if (this.isParens){
      output.add(')')
    }
  }
}

Operation.prototype.type = 'Operation'

module.exports = Operation
