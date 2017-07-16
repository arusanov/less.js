const lessTest = require('./less-test')
const lessTester = lessTest()
const path = require('path')
const stylize = require('./stylize')

function getErrorPathReplacementFunction(dir) {
  return (input, baseDir) =>
    input
      .replace(/\{path\}/g, path.join(process.cwd(), baseDir, `${dir}/`))
      .replace(/\{node\}/g, '')
      .replace(/\{\/node\}/g, '')
      .replace(/\{pathrel\}/g, path.join(baseDir, `${dir}/`))
      .replace(/\{pathhref\}/g, '')
      .replace(/\{404status\}/g, '')
      .replace(/\r\n/g, '\n')
}

console.log(`\n${stylize('Less', 'underline')}\n`)
lessTester.prepBomTest()
lessTester.runTestSet({ strictMath: true, relativeUrls: true, silent: true })
lessTester.runTestSet(
  { strictMath: true, strictUnits: true },
  'errors/',
  lessTester.testErrors,
  null,
  getErrorPathReplacementFunction('errors')
)
lessTester.runTestSet(
  { strictMath: true, strictUnits: true, javascriptEnabled: false },
  'no-js-errors/',
  lessTester.testErrors,
  null,
  getErrorPathReplacementFunction('no-js-errors')
)
lessTester.runTestSet(
  { strictMath: true, dumpLineNumbers: 'comments' },
  'debug/',
  null,
  name => `${name}-comments`
)
lessTester.runTestSet(
  { strictMath: true, dumpLineNumbers: 'mediaquery' },
  'debug/',
  null,
  name => `${name}-mediaquery`
)
lessTester.runTestSet(
  { strictMath: true, dumpLineNumbers: 'all' },
  'debug/',
  null,
  name => `${name}-all`
)
lessTester.runTestSet(
  { strictMath: true, relativeUrls: false, rootpath: 'folder (1)/' },
  'static-urls/'
)
lessTester.runTestSet({ strictMath: true, compress: true }, 'compression/')
lessTester.runTestSet({ strictMath: true, strictUnits: true }, 'strict-units/')
lessTester.runTestSet({}, 'legacy/')
lessTester.runTestSet(
  { strictMath: true, strictUnits: true, sourceMap: true, globalVars: true },
  'sourcemaps/',
  lessTester.testSourcemap,
  null,
  null,
  (filename, type, baseFolder) => {
    if (type === 'vars') {
      return `${path.join(baseFolder, filename)}.json`
    }
    return `${path.join('test/sourcemaps', filename)}.json`
  }
)
lessTester.runTestSet(
  {
    strictMath: true,
    strictUnits: true,
    sourceMap: { sourceMapFileInline: true },
  },
  'sourcemaps-empty/',
  lessTester.testEmptySourcemap
)
lessTester.runTestSet(
  { globalVars: true, banner: '/**\n  * Test\n  */\n' },
  'globalVars/',
  null,
  null,
  null,
  (name, type, baseFolder) => `${path.join(baseFolder, name)}.json`
)
lessTester.runTestSet(
  { modifyVars: true },
  'modifyVars/',
  null,
  null,
  null,
  (name, type, baseFolder) => `${path.join(baseFolder, name)}.json`
)
lessTester.runTestSet({ urlArgs: '424242' }, 'url-args/')
lessTester.runTestSet(
  { paths: ['test/data/', 'test/less/import/'] },
  'include-path/'
)
lessTester.runTestSet({ paths: 'test/data/' }, 'include-path-string/')
lessTester.runTestSet(
  { plugin: 'test/plugins/postprocess/' },
  'postProcessorPlugin/'
)
lessTester.runTestSet(
  { plugin: 'test/plugins/preprocess/' },
  'preProcessorPlugin/'
)
lessTester.runTestSet({ plugin: 'test/plugins/visitor/' }, 'visitorPlugin/')
lessTester.runTestSet(
  { plugin: 'test/plugins/filemanager/' },
  'filemanagerPlugin/'
)
lessTester.runTestSet({}, 'no-strict-math/')
lessTester.runTestSet({ simplify: true }, 'simplify/')
lessTester.testSyncronous({ syncImport: true }, 'import')
lessTester.testSyncronous({ syncImport: true }, 'css')
lessTester.testNoOptions()
lessTester.finished().then(() => {
  /***
   * TODO: Some of these test cant be run in browser
   */
  const browserTester = lessTest(require('../dist/less'))
  console.log(`\n${stylize('Less browser', 'underline')}\n`)
  browserTester.prepBomTest()
  browserTester.runTestSet({
    strictMath: true,
    relativeUrls: true,
    silent: true,
  })
  browserTester.runTestSet(
    { strictMath: true, strictUnits: true },
    'errors/',
    browserTester.testErrors,
    null,
    getErrorPathReplacementFunction('errors')
  )
  browserTester.runTestSet(
    { strictMath: true, strictUnits: true, javascriptEnabled: false },
    'no-js-errors/',
    browserTester.testErrors,
    null,
    getErrorPathReplacementFunction('no-js-errors')
  )
  browserTester.runTestSet(
    { strictMath: true, dumpLineNumbers: 'comments' },
    'debug/',
    null,
    name => `${name}-comments`
  )
  browserTester.runTestSet(
    { strictMath: true, dumpLineNumbers: 'mediaquery' },
    'debug/',
    null,
    name => `${name}-mediaquery`
  )
  browserTester.runTestSet(
    { strictMath: true, dumpLineNumbers: 'all' },
    'debug/',
    null,
    name => `${name}-all`
  )
  browserTester.runTestSet(
    { strictMath: true, relativeUrls: false, rootpath: 'folder (1)/' },
    'static-urls/'
  )
  browserTester.runTestSet({ strictMath: true, compress: true }, 'compression/')
  browserTester.runTestSet(
    { strictMath: true, strictUnits: true },
    'strict-units/'
  )
  browserTester.runTestSet({}, 'legacy/')
  browserTester.runTestSet(
    { strictMath: true, strictUnits: true, sourceMap: true, globalVars: true },
    'sourcemaps/',
    browserTester.testSourcemap,
    null,
    null,
    (filename, type, baseFolder) => {
      if (type === 'vars') {
        return `${path.join(baseFolder, filename)}.json`
      }
      return `${path.join('test/sourcemaps', filename)}.json`
    }
  )
  browserTester.runTestSet(
    {
      strictMath: true,
      strictUnits: true,
      sourceMap: { sourceMapFileInline: true },
    },
    'sourcemaps-empty/',
    browserTester.testEmptySourcemap
  )
  browserTester.runTestSet(
    { globalVars: true, banner: '/**\n  * Test\n  */\n' },
    'globalVars/',
    null,
    null,
    null,
    (name, type, baseFolder) => `${path.join(baseFolder, name)}.json`
  )
  browserTester.runTestSet(
    { modifyVars: true },
    'modifyVars/',
    null,
    null,
    null,
    (name, type, baseFolder) => `${path.join(baseFolder, name)}.json`
  )
  browserTester.runTestSet({ urlArgs: '424242' }, 'url-args/')
  browserTester.runTestSet(
    { paths: ['test/data/', 'test/less/import/'] },
    'include-path/'
  )
  browserTester.runTestSet({ paths: 'test/data/' }, 'include-path-string/')
  browserTester.runTestSet(
    { plugin: 'test/plugins/postprocess/' },
    'postProcessorPlugin/'
  )
  browserTester.runTestSet(
    { plugin: 'test/plugins/preprocess/' },
    'preProcessorPlugin/'
  )
  browserTester.runTestSet(
    { plugin: 'test/plugins/visitor/' },
    'visitorPlugin/'
  )
  browserTester.runTestSet(
    { plugin: 'test/plugins/filemanager/' },
    'filemanagerPlugin/'
  )
  browserTester.runTestSet({}, 'no-strict-math/')
  browserTester.runTestSet({ simplify: true }, 'simplify/')
  browserTester.testSyncronous({ syncImport: true }, 'import')
  browserTester.testSyncronous({ syncImport: true }, 'css')
  browserTester.testNoOptions()
  browserTester.finished().catch()
})
