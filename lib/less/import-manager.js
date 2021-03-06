const contexts = require('./contexts')
const Parser = require('./parser/parser')
const FunctionImporter = require('./plugins/function-importer')

module.exports = environment => {
  // FileInfo = {
  //  'relativeUrls' - option - whether to adjust URL's to be relative
  //  'filename' - full resolved filename of current file
  //  'rootpath' - path to append to normal URLs for this node
  //  'currentDirectory' - path to the current file, absolute
  //  'rootFilename' - filename of the base file
  //  'entryPath' - absolute path to the entry file
  //  'reference' - whether the file should not be output and only output parts that are referenced

  class ImportManager {
    constructor(context, rootFileInfo) {
      this.rootFilename = rootFileInfo.filename
      this.paths = context.paths || [] // Search paths, when importing
      this.contents = {} // map - filename to contents of all the files
      this.contentsIgnoredChars = {} // map - filename to lines at the beginning of each file to ignore
      this.mime = context.mime
      this.error = null
      this.context = context
      // Deprecated? Unused outside of here, could be useful.
      this.queue = [] // Files which haven't been imported yet
      this.files = {} // Holds the imported parse trees.
    }

    /**
         * Add an import to be imported
         * @param path - the raw path
         * @param tryAppendLessExtension - whether to try appending the less extension (if the path has no extension)
         * @param currentFileInfo - the current file info (used for instance to work out relative paths)
         * @param importOptions - import options
         * @param callback - callback for when it is imported
         */
    push(
      path,
      tryAppendLessExtension,
      currentFileInfo,
      importOptions,
      callback
    ) {
      const importManager = this
      this.queue.push(path)

      const fileParsedFunc = (e, root, fullPath) => {
        importManager.queue.splice(importManager.queue.indexOf(path), 1) // Remove the path from the queue

        const importedEqualsRoot = fullPath === importManager.rootFilename
        if (importOptions.optional && e) {
          callback(null, { rules: [] }, false, null)
        } else {
          importManager.files[fullPath] = root
          if (e && !importManager.error) {
            importManager.error = e
          }
          callback(e, root, importedEqualsRoot, fullPath)
        }
      }

      const newFileInfo = {
        relativeUrls: this.context.relativeUrls,
        entryPath: currentFileInfo.entryPath,
        rootpath: currentFileInfo.rootpath,
        rootFilename: currentFileInfo.rootFilename,
      }

      const fileManager = environment.getFileManager(
        path,
        currentFileInfo.currentDirectory,
        this.context,
        environment
      )

      if (!fileManager) {
        fileParsedFunc({ message: `Could not find a file-manager for ${path}` })
        return
      }

      if (tryAppendLessExtension) {
        path = fileManager.tryAppendExtension(
          path,
          importOptions.plugin ? '.js' : '.less'
        )
      }

      const loadFileCallback = loadedFile => {
        const resolvedFilename = loadedFile.filename
        const contents = loadedFile.contents.replace(/^\uFEFF/, '')

        // Pass on an updated rootpath if path of imported file is relative and file
        // is in a (sub|sup) directory
        //
        // Examples:
        // - If path of imported file is 'module/nav/nav.less' and rootpath is 'less/',
        //   then rootpath should become 'less/module/nav/'
        // - If path of imported file is '../mixins.less' and rootpath is 'less/',
        //   then rootpath should become 'less/../'
        newFileInfo.currentDirectory = fileManager.getPath(resolvedFilename)
        if (newFileInfo.relativeUrls) {
          newFileInfo.rootpath = fileManager.join(
            importManager.context.rootpath || '',
            fileManager.pathDiff(
              newFileInfo.currentDirectory,
              newFileInfo.entryPath
            )
          )

          if (
            !fileManager.isPathAbsolute(newFileInfo.rootpath) &&
            fileManager.alwaysMakePathsAbsolute()
          ) {
            newFileInfo.rootpath = fileManager.join(
              newFileInfo.entryPath,
              newFileInfo.rootpath
            )
          }
        }
        newFileInfo.filename = resolvedFilename

        const newEnv = new contexts.Parse(importManager.context)

        newEnv.processImports = false
        importManager.contents[resolvedFilename] = contents

        if (currentFileInfo.reference || importOptions.reference) {
          newFileInfo.reference = true
        }

        if (importOptions.plugin) {
          new FunctionImporter(
            newEnv,
            newFileInfo
          ).eval(contents, (e, root) => {
            fileParsedFunc(e, root, resolvedFilename)
          })
        } else if (importOptions.inline) {
          fileParsedFunc(null, contents, resolvedFilename)
        } else {
          new Parser(
            newEnv,
            importManager,
            newFileInfo
          ).parse(contents, (e, root) => {
            fileParsedFunc(e, root, resolvedFilename)
          })
        }
      }

      const promise = fileManager.loadFile(
        path,
        currentFileInfo.currentDirectory,
        this.context,
        environment,
        (err, loadedFile) => {
          if (err) {
            fileParsedFunc(err)
          } else {
            loadFileCallback(loadedFile)
          }
        }
      )
      if (promise) {
        promise.then(loadFileCallback, fileParsedFunc)
      }
    }
  }

  return ImportManager
}
