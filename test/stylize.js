module.exports = (str, style) => {
  const styles = {
    reset: [0, 0],
    bold: [1, 22],
    inverse: [7, 27],
    underline: [4, 24],
    yellow: [33, 39],
    green: [32, 39],
    red: [31, 39],
    grey: [90, 39],
  }
  return `\x1b[${styles[style][0]}m${str}\x1b[${styles[style][1]}m`
}
