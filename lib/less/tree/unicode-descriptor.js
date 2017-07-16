const Node = require('./node')

class UnicodeDescriptor extends Node {
  constructor(value) {
    super()
    this.value = value
  }
}

UnicodeDescriptor.prototype.type = 'UnicodeDescriptor'

module.exports = UnicodeDescriptor
