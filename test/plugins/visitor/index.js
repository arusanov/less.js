;(exports => {
  const RemoveProperty = function(less) {
    this._visitor = new less.visitors.Visitor(this)
  }

  RemoveProperty.prototype = {
    isReplacing: true,
    run(root) {
      return this._visitor.visit(root)
    },
    visitRule(ruleNode, visitArgs) {
      if (ruleNode.name != '-some-aribitrary-property') {
        return ruleNode
      } else {
        return []
      }
    },
  }

  exports.install = (less, pluginManager) => {
    pluginManager.addVisitor(new RemoveProperty(less))
  }
})(typeof exports === 'undefined' ? (this['VisitorPlugin'] = {}) : exports)
