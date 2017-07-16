/*jshint latedef: nofunc */

// This is used to copy a folder (the test/less/* files & sub-folders), adding a BOM to the start of each LESS and CSS file.
// This is a based on the copySync method from fs-extra (https://github.com/jprichardson/node-fs-extra/).

module.exports = () => {
  const path = require('path')
  const fs = require('fs')

  const BUF_LENGTH = 64 * 1024
  const _buff = new Buffer(BUF_LENGTH)

  function copyFolderWithBom(src, dest) {
    const stats = fs.lstatSync(src)
    const destFolder = path.dirname(dest)
    const destFolderExists = fs.existsSync(destFolder)
    const performCopy = false

    if (stats.isFile()) {
      if (!destFolderExists) {
        fs.mkdirSync(destFolder)
      }
      if (src.match(/\.(css|less)$/)) {
        copyFileAddingBomSync(src, dest)
      } else {
        copyFileSync(src, dest)
      }
    } else if (stats.isDirectory()) {
      if (!fs.existsSync(destFolder)) {
        fs.mkdirSync(destFolder)
      }
      if (!fs.existsSync(dest)) {
        fs.mkdirSync(dest)
      }
      fs.readdirSync(src).forEach(d => {
        if (d !== 'bom') {
          copyFolderWithBom(path.join(src, d), path.join(dest, d))
        }
      })
    }
  }

  function copyFileAddingBomSync(srcFile, destFile) {
    let contents = fs.readFileSync(srcFile, { encoding: 'utf8' })
    if (!contents.length || contents.charCodeAt(0) !== 0xfeff) {
      contents = `\ufeff${contents}`
    }
    fs.writeFileSync(destFile, contents, { encoding: 'utf8' })
  }

  function copyFileSync(srcFile, destFile) {
    const fdr = fs.openSync(srcFile, 'r')
    const stat = fs.fstatSync(fdr)
    const fdw = fs.openSync(destFile, 'w', stat.mode)
    let bytesRead = 1
    let pos = 0

    while (bytesRead > 0) {
      bytesRead = fs.readSync(fdr, _buff, 0, BUF_LENGTH, pos)
      fs.writeSync(fdw, _buff, 0, bytesRead)
      pos += bytesRead
    }

    fs.closeSync(fdr)
    fs.closeSync(fdw)
  }

  return {
    copyFolderWithBom,
  }
}
