const contexts = require('./contexts')
const visitor = require('./visitors')
const tree = require('./tree')

module.exports = (root, options) => {
  options = options || {}
  let evaldRoot
  let variables = options.variables
  const evalEnv = new contexts.Eval(options)

  //
  // Allows setting variables with a hash, so:
  //
  //   `{ color: new tree.Color('#f01') }` will become:
  //
  //   new tree.Rule('@color',
  //     new tree.Value([
  //       new tree.Expression([
  //         new tree.Color('#f01')
  //       ])
  //     ])
  //   )
  //
  if (typeof variables === 'object' && !Array.isArray(variables)) {
    variables = Object.keys(variables).map(k => {
      let value = variables[k]

      if (!(value instanceof tree.Value)) {
        if (!(value instanceof tree.Expression)) {
          value = new tree.Expression([value])
        }
        value = new tree.Value([value])
      }
      return new tree.Rule(`@${k}`, value, false, null, 0)
    })
    evalEnv.frames = [new tree.Ruleset(null, variables)]
  }

  const preEvalVisitors = []

  const visitors = [
    new visitor.JoinSelectorVisitor(),
    new visitor.MarkVisibleSelectorsVisitor(true),
    new visitor.ExtendVisitor(),
    new visitor.ToCSSVisitor({
      compress: Boolean(options.compress),
      simplify: Boolean(options.simplify),
    }),
  ]

  let i

  if (options.pluginManager) {
    const pluginVisitors = options.pluginManager.getVisitors()
    for (i = 0; i < pluginVisitors.length; i++) {
      const pluginVisitor = pluginVisitors[i]
      if (pluginVisitor.isPreEvalVisitor) {
        preEvalVisitors.push(pluginVisitor)
      } else {
        if (pluginVisitor.isPreVisitor) {
          visitors.splice(0, 0, pluginVisitor)
        } else {
          visitors.push(pluginVisitor)
        }
      }
    }
  }

  for (i = 0; i < preEvalVisitors.length; i++) {
    preEvalVisitors[i].run(root)
  }

  evaldRoot = root.eval(evalEnv)

  for (i = 0; i < visitors.length; i++) {
    visitors[i].run(evaldRoot)
  }

  return evaldRoot
}
