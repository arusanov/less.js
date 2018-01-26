const tree = require('../tree')
const Visitor = require('./visitor')

class CSSVisitorUtils {
  constructor(context) {
    this._visitor = new Visitor(this)
    this._context = context
  }

  containsSilentNonBlockedChild(bodyRules) {
    let rule
    if (bodyRules == null) {
      return false
    }
    for (let r = 0; r < bodyRules.length; r++) {
      rule = bodyRules[r]
      if (
        rule.isSilent &&
        rule.isSilent(this._context) &&
        !rule.blocksVisibility()
      ) {
        //the directive contains something that was referenced (likely by extend)
        //therefore it needs to be shown in output too
        return true
      }
    }
    return false
  }

  keepOnlyVisibleChilds(owner) {
    if (owner == null || owner.rules == null) {
      return
    }

    owner.rules = owner.rules.filter(thing => thing.isVisible())
  }

  isEmpty(owner) {
    if (owner == null || owner.rules == null) {
      return true
    }
    return owner.rules.length === 0
  }

  hasVisibleSelector(rulesetNode) {
    if (rulesetNode == null || rulesetNode.paths == null) {
      return false
    }
    return rulesetNode.paths.length > 0
  }

  resolveVisibility(node, originalRules) {
    if (!node.blocksVisibility()) {
      if (
        this.isEmpty(node) &&
        !this.containsSilentNonBlockedChild(originalRules)
      ) {
        return
      }

      return node
    }

    const compiledRulesBody = node.rules[0]
    this.keepOnlyVisibleChilds(compiledRulesBody)

    if (this.isEmpty(compiledRulesBody)) {
      return
    }

    node.ensureVisibility()
    node.removeVisibilityBlock()

    return node
  }

  isVisibleRuleset(rulesetNode) {
    if (rulesetNode.firstRoot) {
      return true
    }

    if (this.isEmpty(rulesetNode)) {
      return false
    }

    if (!rulesetNode.root && !this.hasVisibleSelector(rulesetNode)) {
      return false
    }

    return true
  }
}

const ToCSSVisitor = function(context) {
  this._visitor = new Visitor(this)
  this._context = context
  this.utils = new CSSVisitorUtils(context)
  this._level = 0
}

ToCSSVisitor.prototype = {
  isReplacing: true,
  run(root) {
    return this._visitor.visit(root)
  },

  visitRule(ruleNode, visitArgs) {
    if (ruleNode.blocksVisibility()) {
      return
    }
    if (ruleNode.variable) {
      if (!this._context.simplify) return //We don't need any variables
      if (this._level > this._context.simplifyLevel) return //Variable is too deep
      if (
        this._context.simplifyFilter &&
        !this._context.simplifyFilter.test(ruleNode.name)
      )
        return //Variable didnt pass filter
    }
    return ruleNode
  },

  visitMixinDefinition(mixinNode, visitArgs) {
    // mixin definitions do not get eval'd - this means they keep state
    // so we have to clear that state here so it isn't used if toCSS is called twice
    mixinNode.frames = []
  },

  visitExtend(extendNode, visitArgs) {},

  visitComment(commentNode, visitArgs) {
    if (commentNode.blocksVisibility() || commentNode.isSilent(this._context)) {
      return
    }
    return commentNode
  },

  visitMedia(mediaNode, visitArgs) {
    const originalRules = mediaNode.rules[0].rules
    mediaNode.accept(this._visitor)
    visitArgs.visitDeeper = false

    return this.utils.resolveVisibility(mediaNode, originalRules)
  },

  visitImport(importNode, visitArgs) {
    if (importNode.blocksVisibility()) {
      return
    }
    return importNode
  },

  visitDirective(directiveNode, visitArgs) {
    if (directiveNode.rules && directiveNode.rules.length) {
      return this.visitDirectiveWithBody(directiveNode, visitArgs)
    } else {
      return this.visitDirectiveWithoutBody(directiveNode, visitArgs)
    }
  },

  visitDirectiveWithBody(directiveNode, visitArgs) {
    //if there is only one nested ruleset and that one has no path, then it is
    //just fake ruleset
    function hasFakeRuleset(directiveNode) {
      const bodyRules = directiveNode.rules
      return (
        bodyRules.length === 1 &&
        (!bodyRules[0].paths || bodyRules[0].paths.length === 0)
      )
    }
    function getBodyRules(directiveNode) {
      const nodeRules = directiveNode.rules
      if (hasFakeRuleset(directiveNode)) {
        return nodeRules[0].rules
      }

      return nodeRules
    }
    //it is still true that it is only one ruleset in array
    //this is last such moment
    //process childs
    const originalRules = getBodyRules(directiveNode)
    directiveNode.accept(this._visitor)
    visitArgs.visitDeeper = false

    if (!this.utils.isEmpty(directiveNode)) {
      this._mergeRules(directiveNode.rules[0].rules)
    }

    return this.utils.resolveVisibility(directiveNode, originalRules)
  },

  visitDirectiveWithoutBody(directiveNode, visitArgs) {
    if (directiveNode.blocksVisibility()) {
      return
    }

    if (directiveNode.name === '@charset') {
      // Only output the debug info together with subsequent @charset definitions
      // a comment (or @media statement) before the actual @charset directive would
      // be considered illegal css as it has to be on the first line
      if (this.charset) {
        if (directiveNode.debugInfo) {
          const comment = new tree.Comment(
            `/* ${directiveNode.toCSS(this._context).replace(/\n/g, '')} */\n`
          )
          comment.debugInfo = directiveNode.debugInfo
          return this._visitor.visit(comment)
        }
        return
      }
      this.charset = true
    }

    return directiveNode
  },

  checkValidNodes(rules, isRoot) {
    if (!rules) {
      return
    }

    for (let i = 0; i < rules.length; i++) {
      const ruleNode = rules[i]
      if (isRoot && ruleNode instanceof tree.Rule && !ruleNode.variable) {
        throw {
          message:
            'Properties must be inside selector blocks. They cannot be in the root',
          index: ruleNode.index,
          filename:
            ruleNode.currentFileInfo && ruleNode.currentFileInfo.filename,
        }
      }
      if (ruleNode instanceof tree.Call) {
        throw {
          message: `Function '${ruleNode.name}' is undefined`,
          index: ruleNode.index,
          filename:
            ruleNode.currentFileInfo && ruleNode.currentFileInfo.filename,
        }
      }
      if (ruleNode.type && !ruleNode.allowRoot) {
        throw {
          message: `${
            ruleNode.type
          } node returned by a function is not valid here`,
          index: ruleNode.index,
          filename:
            ruleNode.currentFileInfo && ruleNode.currentFileInfo.filename,
        }
      }
    }
  },
  visitRulesetOut(rulesetNode) {
    this._level--
  },
  visitRuleset(rulesetNode, visitArgs) {
    this._level++

    //at this point rulesets are nested into each other
    let rule

    const rulesets = []

    this.checkValidNodes(rulesetNode.rules, rulesetNode.firstRoot)

    if (!rulesetNode.root) {
      //remove invisible paths
      this._compileRulesetPaths(rulesetNode)

      // remove rulesets from this ruleset body and compile them separately
      const nodeRules = rulesetNode.rules

      let nodeRuleCnt = nodeRules ? nodeRules.length : 0
      for (let i = 0; i < nodeRuleCnt; ) {
        rule = nodeRules[i]
        if (rule && rule.rules) {
          // visit because we are moving them out from being a child
          rulesets.push(this._visitor.visit(rule))
          nodeRules.splice(i, 1)
          nodeRuleCnt--
          continue
        }
        i++
      }
      // accept the visitor to remove rules and refactor itself
      // then we can decide nogw whether we want it or not
      // compile body
      if (nodeRuleCnt > 0) {
        rulesetNode.accept(this._visitor)
      } else {
        rulesetNode.rules = null
      }
      visitArgs.visitDeeper = false
    } else {
      //if (! rulesetNode.root) {
      rulesetNode.accept(this._visitor)
      visitArgs.visitDeeper = false
    }

    if (rulesetNode.rules) {
      this._mergeRules(rulesetNode.rules)
      this._removeDuplicateRules(rulesetNode.rules)
    }

    //now decide whether we keep the ruleset
    if (this.utils.isVisibleRuleset(rulesetNode)) {
      rulesetNode.ensureVisibility()
      rulesets.splice(0, 0, rulesetNode)
    }

    if (rulesets.length === 1) {
      return rulesets[0]
    }
    return rulesets
  },

  _compileRulesetPaths(rulesetNode) {
    if (rulesetNode.paths) {
      rulesetNode.paths = rulesetNode.paths.filter(p => {
        let i
        if (p[0].elements[0].combinator.value === ' ') {
          p[0].elements[0].combinator = new tree.Combinator('')
        }
        for (i = 0; i < p.length; i++) {
          if (p[i].isVisible() && p[i].getIsOutput()) {
            return true
          }
        }
        return false
      })
    }
  },

  _removeDuplicateRules(rules) {
    if (!rules) {
      return
    }

    // remove duplicates
    const ruleCache = {}

    let ruleList
    let rule
    let i

    for (i = rules.length - 1; i >= 0; i--) {
      rule = rules[i]
      if (rule instanceof tree.Rule) {
        if (!ruleCache[rule.name]) {
          ruleCache[rule.name] = rule
        } else {
          ruleList = ruleCache[rule.name]
          if (ruleList instanceof tree.Rule) {
            ruleList = ruleCache[rule.name] = [
              ruleCache[rule.name].toCSS(this._context),
            ]
          }
          const ruleCSS = rule.toCSS(this._context)
          if (ruleList.indexOf(ruleCSS) !== -1) {
            rules.splice(i, 1)
          } else {
            ruleList.push(ruleCSS)
          }
        }
      }
    }
  },

  _mergeRules(rules) {
    if (!rules) {
      return
    }

    const groups = {}
    let parts
    let rule
    let key

    for (let i = 0; i < rules.length; i++) {
      rule = rules[i]

      if (rule instanceof tree.Rule && rule.merge) {
        key = [rule.name, rule.important ? '!' : ''].join(',')

        if (!groups[key]) {
          groups[key] = []
        } else {
          rules.splice(i--, 1)
        }

        groups[key].push(rule)
      }
    }

    Object.keys(groups).map(k => {
      function toExpression(values) {
        return new tree.Expression(values.map(p => p.value))
      }

      function toValue(values) {
        return new tree.Value(values.map(p => p))
      }

      parts = groups[k]

      if (parts.length > 1) {
        rule = parts[0]
        const spacedGroups = []
        let lastSpacedGroup = []
        parts.map(p => {
          if (p.merge === '+') {
            if (lastSpacedGroup.length > 0) {
              spacedGroups.push(toExpression(lastSpacedGroup))
            }
            lastSpacedGroup = []
          }
          lastSpacedGroup.push(p)
        })
        spacedGroups.push(toExpression(lastSpacedGroup))
        rule.value = toValue(spacedGroups)
      }
    })
  },

  visitAnonymous(anonymousNode, visitArgs) {
    if (anonymousNode.blocksVisibility()) {
      return
    }
    anonymousNode.accept(this._visitor)
    return anonymousNode
  },
}

module.exports = ToCSSVisitor
