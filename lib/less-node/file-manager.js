const path = require('path')
const fs = require('fs')
const AbstractFileManager = require('../less/environment/abstract-file-manager.js')

class FileManager extends AbstractFileManager {
  supports(filename, currentDirectory, options, environment) {
    return true
  }

  supportsSync(filename, currentDirectory, options, environment) {
    return true
  }

  loadFile(filename, currentDirectory, options, environment, callback) {
    let fullFilename
    let data
    let isAbsoluteFilename = this.isPathAbsolute(filename)
    const filenamesTried = []

    options = options || {}

    if (options.syncImport || !Promise) {
      data = this.loadFileSync(
        filename,
        currentDirectory,
        options,
        environment,
        'utf-8'
      )
      callback(data.error, data)
      return
    }

    const paths = isAbsoluteFilename ? [''] : [currentDirectory]
    if (options.paths) {
      paths.push(...options.paths)
    }
    if (!isAbsoluteFilename && paths.indexOf('.') === -1) {
      paths.push('.')
    }

    // promise is guaranteed to be asyncronous
    // which helps as it allows the file handle
    // to be closed before it continues with the next file
    return new Promise((fulfill, reject) => {
      ;(function tryPathIndex(i) {
        if (i < paths.length) {
          fullFilename = filename
          if (paths[i]) {
            fullFilename = path.join(paths[i], fullFilename)
          }
          fs.stat(fullFilename, err => {
            if (err) {
              filenamesTried.push(fullFilename)
              tryPathIndex(i + 1)
            } else {
              fs.readFile(fullFilename, 'utf-8', (e, data) => {
                if (e) {
                  reject(e)
                  return
                }

                fulfill({ contents: data, filename: fullFilename })
              })
            }
          })
        } else {
          reject({
            type: 'File',
            message: `'${filename}' wasn't found. Tried - ${filenamesTried.join(
              ','
            )}`,
          })
        }
      })(0)
    })
  }

  loadFileSync(filename, currentDirectory, options, environment, encoding) {
    let fullFilename
    let paths
    const filenamesTried = []
    let isAbsoluteFilename = this.isPathAbsolute(filename)
    let data
    options = options || {}

    paths = isAbsoluteFilename ? [''] : [currentDirectory]
    if (options.paths) {
      paths.push(...options.paths)
    }
    if (!isAbsoluteFilename && paths.indexOf('.') === -1) {
      paths.push('.')
    }

    let err
    let result
    for (let i = 0; i < paths.length; i++) {
      try {
        fullFilename = filename
        if (paths[i]) {
          fullFilename = path.join(paths[i], fullFilename)
        }
        filenamesTried.push(fullFilename)
        fs.statSync(fullFilename)
        break
      } catch (e) {
        fullFilename = null
      }
    }

    if (!fullFilename) {
      err = {
        type: 'File',
        message: `'${filename}' wasn't found. Tried - ${filenamesTried.join(
          ','
        )}`,
      }
      result = { error: err }
    } else {
      data = fs.readFileSync(fullFilename, encoding)
      result = { contents: data, filename: fullFilename }
    }

    return result
  }
}

module.exports = FileManager
