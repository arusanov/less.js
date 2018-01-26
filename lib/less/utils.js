module.exports = {
  getLocation(index, inputStream) {
    let n = index + 1
    let line = null
    let column = -1

    while (--n >= 0 && inputStream.charAt(n) !== '\n') {
      column++
    }

    if (typeof index === 'number') {
      line = (inputStream.slice(0, index).match(/\n/g) || '').length
    }

    return {
      line,
      column,
    }
  },
}
