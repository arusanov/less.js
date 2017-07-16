;(exports => {
  const plugin = function(less) {
    const FileManager = less.FileManager
    const TestFileManager = new FileManager()
    TestFileManager.loadFile = (
      filename,
      currentDirectory,
      options,
      environment,
      callback
    ) => {
      if (filename.match(/.*\.test$/)) {
        return less.environment.fileManagers[0].loadFile(
          'colors.test',
          currentDirectory,
          options,
          environment,
          callback
        )
      }
      return less.environment.fileManagers[0].loadFile(
        filename,
        currentDirectory,
        options,
        environment,
        callback
      )
    }

    return TestFileManager
  }

  exports.install = (less, pluginManager) => {
    less.environment.addFileManager(new plugin(less))
  }
})(typeof exports === 'undefined' ? (this['AddFilePlugin'] = {}) : exports)
