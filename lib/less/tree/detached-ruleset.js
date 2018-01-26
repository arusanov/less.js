const Node = require('./node')
const contexts = require('../contexts')

class DetachedRuleset extends Node {
  constructor(ruleset, frames) {
    super()
    this.ruleset = ruleset
    this.frames = frames
  }

  accept(visitor) {
    this.ruleset = visitor.visit(this.ruleset)
  }

  eval(context) {
    const frames = this.frames || context.frames.slice(0)
    return new DetachedRuleset(this.ruleset, frames)
  }

  callEval(context) {
    return this.ruleset.eval(
      this.frames
        ? new contexts.Eval(context, this.frames.concat(context.frames))
        : context
    )
  }
}

DetachedRuleset.prototype.type = 'DetachedRuleset'
DetachedRuleset.prototype.evalFirst = true
module.exports = DetachedRuleset
