const Node = require('./node')

class Variable extends Node {
  constructor(name, index, currentFileInfo) {
    super()
    this.name = name
    this.index = index
    this.currentFileInfo = currentFileInfo || {}
  }

  eval(context) {
    let variable
    let name = this.name

    if (name.indexOf('@@') === 0) {
      name = `@${new Variable(
        name.slice(1),
        this.index,
        this.currentFileInfo
      ).eval(context).value}`
    }

    if (this.evaluating) {
      throw {
        type: 'Name',
        message: `Recursive variable definition for ${name}`,
        filename: this.currentFileInfo.filename,
        index: this.index,
      }
    }

    this.evaluating = true
    const current = this
    variable = this.find(context.frames, frame => {
      const v = frame.variable(name)
      if (v) {
        if (v.important) {
          const importantScope =
            context.importantScope[context.importantScope.length - 1]
          importantScope.important = v.important
        }
        if (
          frame.root &&
          context.simplify &&
          (!context.simplifyFilter || context.simplifyFilter.test(name))
        ) {
          // Wrap root
          current.isRootVariable = true

          //Add genCSS and toCSS
          current.genCSS = function(context, output) {
            if (context && context.frames) {
              //In eval context
              output.add(this.toCSS(context))
            } else {
              output.add(this.name)
            }
          }.bind(current)

          current.toCSS = function() {
            return `@{${this.name.slice(1)}}`
          }.bind(current)

          return current //don't eval root variables in simple mode
        }
        return v.value.eval(context)
      }
    })
    if (variable) {
      this.evaluating = false
      return variable
    } else {
      throw {
        type: 'Name',
        message: `variable ${name} is undefined`,
        filename: this.currentFileInfo.filename,
        index: this.index,
      }
    }
  }

  find(obj, fun) {
    for (let i = 0, r; i < obj.length; i++) {
      r = fun.call(obj, obj[i])
      if (r) {
        return r
      }
    }
    return null
  }
}

Variable.prototype.type = 'Variable'
module.exports = Variable
