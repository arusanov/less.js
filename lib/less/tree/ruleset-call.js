const Node = require('./node')
const Variable = require('./variable')

class RulesetCall extends Node {
  constructor(variable) {
    super()
    this.variable = variable
    this.allowRoot = true
  }

  eval(context) {
    const detachedRuleset = new Variable(this.variable).eval(context)
    return detachedRuleset.callEval(context)
  }
}

RulesetCall.prototype.type = 'RulesetCall'
module.exports = RulesetCall
