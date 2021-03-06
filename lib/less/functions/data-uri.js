module.exports = environment => {
  const Quoted = require('../tree/quoted')
  const URL = require('../tree/url')
  const functionRegistry = require('./function-registry')
  const fallback = (functionThis, node) =>
    new URL(node, functionThis.index, functionThis.currentFileInfo).eval(
      functionThis.context
    )
  const logger = require('../logger')

  functionRegistry.add('data-uri', function(mimetypeNode, filePathNode) {
    if (!filePathNode) {
      filePathNode = mimetypeNode
      mimetypeNode = null
    }

    let mimetype = mimetypeNode && mimetypeNode.value
    let filePath = filePathNode.value
    const currentFileInfo = this.currentFileInfo
    const currentDirectory = currentFileInfo.relativeUrls
      ? currentFileInfo.currentDirectory
      : currentFileInfo.entryPath

    const fragmentStart = filePath.indexOf('#')
    let fragment = ''
    if (fragmentStart !== -1) {
      fragment = filePath.slice(fragmentStart)
      filePath = filePath.slice(0, fragmentStart)
    }

    const fileManager = environment.getFileManager(
      filePath,
      currentDirectory,
      this.context,
      environment,
      true
    )

    if (!fileManager) {
      return fallback(this, filePathNode)
    }

    let useBase64 = false

    // detect the mimetype if not given
    if (!mimetypeNode) {
      mimetype = environment.mimeLookup(filePath)

      if (mimetype === 'image/svg+xml') {
        useBase64 = false
      } else {
        // use base 64 unless it's an ASCII or UTF-8 format
        const charset = environment.charsetLookup(mimetype)
        useBase64 = ['US-ASCII', 'UTF-8'].indexOf(charset) < 0
      }
      if (useBase64) {
        mimetype += ';base64'
      }
    } else {
      useBase64 = /;base64$/.test(mimetype)
    }

    const fileSync = fileManager.loadFileSync(
      filePath,
      currentDirectory,
      this.context,
      environment
    )
    if (!fileSync.contents) {
      logger.warn(
        `Skipped data-uri embedding of ${filePath} because file not found`
      )
      return fallback(this, filePathNode || mimetypeNode)
    }
    let buf = fileSync.contents
    if (useBase64 && !environment.encodeBase64) {
      return fallback(this, filePathNode)
    }

    buf = useBase64 ? environment.encodeBase64(buf) : encodeURIComponent(buf)

    const uri = `data:${mimetype},${buf}${fragment}`

    // IE8 cannot handle a data-uri larger than 32,768 characters. If this is exceeded
    // and the --ieCompat flag is enabled, return a normal url() instead.
    const DATA_URI_MAX = 32768
    if (uri.length >= DATA_URI_MAX) {
      if (this.context.ieCompat !== false) {
        logger.warn(
          `Skipped data-uri embedding of ${filePath} because its size (${uri.length} characters) exceeds IE8-safe ${DATA_URI_MAX} characters!`
        )

        return fallback(this, filePathNode || mimetypeNode)
      }
    }

    return new URL(
      new Quoted(`"${uri}"`, uri, false, this.index, this.currentFileInfo),
      this.index,
      this.currentFileInfo
    )
  })
}
