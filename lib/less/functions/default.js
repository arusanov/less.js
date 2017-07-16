const Keyword = require('../tree/keyword')
const functionRegistry = require('./function-registry')

const defaultFunc = {
  eval() {
    const v = this.value_
    const e = this.error_
    if (e) {
      throw e
    }
    if (v != null) {
      return v ? Keyword.True : Keyword.False
    }
  },
  value(v) {
    this.value_ = v
  },
  error(e) {
    this.error_ = e
  },
  reset() {
    this.value_ = this.error_ = null
  },
}

functionRegistry.add('default', defaultFunc.eval.bind(defaultFunc))

module.exports = defaultFunc
