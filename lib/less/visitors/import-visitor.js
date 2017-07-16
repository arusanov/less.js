const contexts = require('../contexts')
const Visitor = require('./visitor')
const ImportSequencer = require('./import-sequencer')

const ImportVisitor = function(importer, finish) {
  this._visitor = new Visitor(this)
  this._importer = importer
  this._finish = finish
  this.context = new contexts.Eval()
  this.importCount = 0
  this.onceFileDetectionMap = {}
  this.recursionDetector = {}
  this._sequencer = new ImportSequencer(this._onSequencerEmpty.bind(this))
}

ImportVisitor.prototype = {
  isReplacing: false,
  run(root) {
    try {
      // process the contents
      this._visitor.visit(root)
    } catch (e) {
      this.error = e
    }

    this.isFinished = true
    this._sequencer.tryRun()
  },
  _onSequencerEmpty() {
    if (!this.isFinished) {
      return
    }
    this._finish(this.error)
  },
  visitImport(importNode, visitArgs) {
    const inlineCSS = importNode.options.inline

    if (!importNode.css || inlineCSS) {
      const context = new contexts.Eval(
        this.context,
        this.context.frames.slice(0)
      )
      const importParent = context.frames[0]

      this.importCount++
      if (importNode.isVariableImport()) {
        this._sequencer.addVariableImport(
          this.processImportNode.bind(this, importNode, context, importParent)
        )
      } else {
        this.processImportNode(importNode, context, importParent)
      }
    }
    visitArgs.visitDeeper = false
  },
  processImportNode(importNode, context, importParent) {
    let evaldImportNode
    const inlineCSS = importNode.options.inline

    try {
      evaldImportNode = importNode.evalForImport(context)
    } catch (e) {
      if (!e.filename) {
        e.index = importNode.index
        e.filename = importNode.currentFileInfo.filename
      }
      // attempt to eval properly and treat as css
      importNode.css = true
      // if that fails, this error will be thrown
      importNode.error = e
    }

    if (evaldImportNode && (!evaldImportNode.css || inlineCSS)) {
      if (evaldImportNode.options.multiple) {
        context.importMultiple = true
      }

      // try appending if we haven't determined if it is css or not
      const tryAppendLessExtension = evaldImportNode.css === undefined

      for (let i = 0; i < importParent.rules.length; i++) {
        if (importParent.rules[i] === importNode) {
          importParent.rules[i] = evaldImportNode
          break
        }
      }

      const onImported = this.onImported.bind(this, evaldImportNode, context)
      const sequencedOnImported = this._sequencer.addImport(onImported)

      this._importer.push(
        evaldImportNode.getPath(),
        tryAppendLessExtension,
        evaldImportNode.currentFileInfo,
        evaldImportNode.options,
        sequencedOnImported
      )
    } else {
      this.importCount--
      if (this.isFinished) {
        this._sequencer.tryRun()
      }
    }
  },
  onImported(importNode, context, e, root, importedAtRoot, fullPath) {
    if (e) {
      if (!e.filename) {
        e.index = importNode.index
        e.filename = importNode.currentFileInfo.filename
      }
      this.error = e
    }

    const importVisitor = this
    const inlineCSS = importNode.options.inline
    const isPlugin = importNode.options.plugin
    const isOptional = importNode.options.optional
    const duplicateImport =
      importedAtRoot || fullPath in importVisitor.recursionDetector

    if (!context.importMultiple) {
      if (duplicateImport) {
        importNode.skip = true
      } else {
        importNode.skip = () => {
          if (fullPath in importVisitor.onceFileDetectionMap) {
            return true
          }
          importVisitor.onceFileDetectionMap[fullPath] = true
          return false
        }
      }
    }

    if (!fullPath && isOptional) {
      importNode.skip = true
    }

    if (root) {
      importNode.root = root
      importNode.importedFilename = fullPath

      if (
        !inlineCSS &&
        !isPlugin &&
        (context.importMultiple || !duplicateImport)
      ) {
        importVisitor.recursionDetector[fullPath] = true

        const oldContext = this.context
        this.context = context
        try {
          this._visitor.visit(root)
        } catch (e) {
          this.error = e
        }
        this.context = oldContext
      }
    }

    importVisitor.importCount--

    if (importVisitor.isFinished) {
      importVisitor._sequencer.tryRun()
    }
  },
  visitRule(ruleNode, visitArgs) {
    if (ruleNode.value.type === 'DetachedRuleset') {
      this.context.frames.unshift(ruleNode)
    } else {
      visitArgs.visitDeeper = false
    }
  },
  visitRuleOut(ruleNode) {
    if (ruleNode.value.type === 'DetachedRuleset') {
      this.context.frames.shift()
    }
  },
  visitDirective(directiveNode, visitArgs) {
    this.context.frames.unshift(directiveNode)
  },
  visitDirectiveOut(directiveNode) {
    this.context.frames.shift()
  },
  visitMixinDefinition(mixinDefinitionNode, visitArgs) {
    this.context.frames.unshift(mixinDefinitionNode)
  },
  visitMixinDefinitionOut(mixinDefinitionNode) {
    this.context.frames.shift()
  },
  visitRuleset(rulesetNode, visitArgs) {
    this.context.frames.unshift(rulesetNode)
  },
  visitRulesetOut(rulesetNode) {
    this.context.frames.shift()
  },
  visitMedia(mediaNode, visitArgs) {
    this.context.frames.unshift(mediaNode.rules[0])
  },
  visitMediaOut(mediaNode) {
    this.context.frames.shift()
  },
}
module.exports = ImportVisitor
