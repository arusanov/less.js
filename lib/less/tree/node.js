class Node {
  toCSS(context) {
    const strs = []
    this.genCSS(context, {
      add(chunk, fileInfo, index) {
        strs.push(chunk)
      },
      isEmpty() {
        return strs.length === 0
      },
    })
    return strs.join('')
  }

  genCSS(context, output) {
    output.add(this.value)
  }

  accept(visitor) {
    this.value = visitor.visit(this.value)
  }

  eval() {
    return this
  }

  _operate(context, op, a, b) {
    switch (op) {
      case '+':
        return a + b
      case '-':
        return a - b
      case '*':
        return a * b
      case '/':
        return a / b
    }
  }

  fround(context, value) {
    const precision = context && context.numPrecision
    //add "epsilon" to ensure numbers like 1.000000005 (represented as 1.000000004999....) are properly rounded...
    return precision == null
      ? value
      : Number((value + 2e-16).toFixed(precision))
  }

  // Returns true if this node represents root of ast imported by reference
  blocksVisibility() {
    if (this.visibilityBlocks == null) {
      this.visibilityBlocks = 0
    }
    return this.visibilityBlocks !== 0
  }

  addVisibilityBlock() {
    if (this.visibilityBlocks == null) {
      this.visibilityBlocks = 0
    }
    this.visibilityBlocks = this.visibilityBlocks + 1
  }

  removeVisibilityBlock() {
    if (this.visibilityBlocks == null) {
      this.visibilityBlocks = 0
    }
    this.visibilityBlocks = this.visibilityBlocks - 1
  }

  //Turns on node visibility - if called node will be shown in output regardless
  //of whether it comes from import by reference or not
  ensureVisibility() {
    this.nodeVisible = true
  }

  //Turns off node visibility - if called node will NOT be shown in output regardless
  //of whether it comes from import by reference or not
  ensureInvisibility() {
    this.nodeVisible = false
  }

  // return values:
  // false - the node must not be visible
  // true - the node must be visible
  // undefined or null - the node has the same visibility as its parent
  isVisible() {
    return this.nodeVisible
  }

  visibilityInfo() {
    return {
      visibilityBlocks: this.visibilityBlocks,
      nodeVisible: this.nodeVisible,
    }
  }

  copyVisibilityInfo(info) {
    if (!info) {
      return
    }
    this.visibilityBlocks = info.visibilityBlocks
    this.nodeVisible = info.nodeVisible
  }
}

Node.compare = (a, b) => {
  /* returns:
     -1: a < b
     0: a = b
     1: a > b
     and *any* other value for a != b (e.g. undefined, NaN, -2 etc.) */

  if (
    a.compare &&
    // for "symmetric results" force toCSS-based comparison
    // of Quoted or Anonymous if either value is one of those
    !(b.type === 'Quoted' || b.type === 'Anonymous')
  ) {
    return a.compare(b)
  } else if (b.compare) {
    return -b.compare(a)
  } else if (a.type !== b.type) {
    return undefined
  }

  a = a.value
  b = b.value
  if (!Array.isArray(a)) {
    return a === b ? 0 : undefined
  }
  if (a.length !== b.length) {
    return undefined
  }
  for (let i = 0; i < a.length; i++) {
    if (Node.compare(a[i], b[i]) !== 0) {
      return undefined
    }
  }
  return 0
}

Node.numericCompare = (a, b) =>
  a < b ? -1 : a === b ? 0 : a > b ? 1 : undefined
module.exports = Node
