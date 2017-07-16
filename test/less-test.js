/*jshint latedef: nofunc */

module.exports = (less = require('../lib/less-node')) => {
  const path = require('path')
  const fs = require('fs')
  const copyBom = require('./copy-bom')()
  let doBomTest = false
  let endresolve, endreject
  const endPromise = new Promise((resolve, reject) => {
    endresolve = resolve
    endreject = reject
  })

  const stylize = require('./stylize')

  const globals = Object.keys(global)

  const oneTestOnly = process.argv[2]
  let isFinished = false

  const isVerbose = process.env.npm_config_loglevel === 'verbose'

  const normalFolder = 'test/less'
  const bomFolder = 'test/less-bom'

  less.logger.addListener({
    info(msg) {
      if (isVerbose) {
        process.stdout.write(`${msg}\n`)
      }
    },
    warn(msg) {
      process.stdout.write(`${msg}\n`)
    },
    error(msg) {
      process.stdout.write(`${msg}\n`)
    },
  })

  const queueList = []
  let queueRunning = false

  function queue(func) {
    if (queueRunning) {
      //console.log("adding to queue");
      queueList.push(func)
    } else {
      //console.log("first in queue - starting");
      queueRunning = true
      func()
    }
  }

  function release() {
    if (queueList.length) {
      //console.log("running next in queue");
      const func = queueList.shift()
      setTimeout(func, 0)
    } else {
      //console.log("stopping queue");
      queueRunning = false
    }
  }

  let totalTests = 0
  let failedTests = 0
  let passedTests = 0

  less.functions.functionRegistry.addMultiple({
    add(a, b) {
      return new less.tree.Dimension(a.value + b.value)
    },
    increment(a) {
      return new less.tree.Dimension(a.value + 1)
    },
    _color(str) {
      if (str.value === 'evil red') {
        return new less.tree.Color('600')
      }
    },
  })

  function testSourcemap(
    name,
    err,
    compiledLess,
    doReplacements,
    sourcemap,
    baseFolder
  ) {
    fs.readFile(
      `${path.join('test/', name)}.json`,
      'utf8',
      (e, expectedSourcemap) => {
        process.stdout.write(`- ${path.join(baseFolder, name)}: `)
        if (sourcemap === expectedSourcemap) {
          ok('OK')
        } else if (err) {
          fail(`ERROR: ${err && err.message}`)
          if (isVerbose) {
            process.stdout.write('\n')
            process.stdout.write(`${err.stack}\n`)
          }
        } else {
          difference('FAIL', expectedSourcemap, sourcemap)
        }
      }
    )
  }

  function testEmptySourcemap(
    name,
    err,
    compiledLess,
    doReplacements,
    sourcemap,
    baseFolder
  ) {
    process.stdout.write(`- ${path.join(baseFolder, name)}: `)
    if (err) {
      fail(`ERROR: ${err && err.message}`)
    } else {
      const expectedSourcemap = undefined
      if (compiledLess !== '') {
        difference('\nCompiledLess must be empty', '', compiledLess)
      } else if (sourcemap !== expectedSourcemap) {
        fail('Sourcemap must be undefined')
      } else {
        ok('OK')
      }
    }
  }

  function testErrors(
    name,
    err,
    compiledLess,
    doReplacements,
    sourcemap,
    baseFolder
  ) {
    fs.readFile(
      `${path.join(baseFolder, name)}.txt`,
      'utf8',
      (e, expectedErr) => {
        process.stdout.write(`- ${path.join(baseFolder, name)}: `)
        expectedErr = doReplacements(expectedErr, baseFolder)
        if (!err) {
          if (compiledLess) {
            fail('No Error', 'red')
          } else {
            fail('No Error, No Output')
          }
        } else {
          const errMessage = less.formatError(err)
          if (errMessage === expectedErr) {
            ok('OK')
          } else {
            difference('FAIL', expectedErr, errMessage)
          }
        }
      }
    )
  }

  function globalReplacements(input, directory) {
    const p = path.join(process.cwd(), directory)
    const pathimport = path.join(process.cwd(), `${directory}import/`)
    const pathesc = p.replace(/[.:/\\]/g, a => `\\${a == '\\' ? '/' : a}`)
    const pathimportesc = pathimport.replace(
      /[.:/\\]/g,
      a => `\\${a == '\\' ? '/' : a}`
    )

    return input
      .replace(/\{path\}/g, p)
      .replace(/\{pathesc\}/g, pathesc)
      .replace(/\{pathimport\}/g, pathimport)
      .replace(/\{pathimportesc\}/g, pathimportesc)
      .replace(/\r\n/g, '\n')
  }

  function checkGlobalLeaks() {
    return Object.keys(global).filter(v => globals.indexOf(v) < 0)
  }

  function testSyncronous(options, filenameNoExtension) {
    if (oneTestOnly && `Test Sync ${filenameNoExtension}` !== oneTestOnly) {
      return
    }
    totalTests++
    queue(() => {
      let isSync = true
      toCSS(
        options,
        path.join(normalFolder, `${filenameNoExtension}.less`),
        (err, result) => {
          process.stdout.write(`- Test Sync ${filenameNoExtension}: `)

          if (isSync) {
            ok('OK')
          } else {
            fail('Not Sync')
          }
          release()
        }
      )
      isSync = false
    })
  }

  function prepBomTest() {
    copyBom.copyFolderWithBom(normalFolder, bomFolder)
    doBomTest = true
  }

  function runTestSet(
    options,
    foldername,
    verifyFunction,
    nameModifier,
    doReplacements,
    getFilename
  ) {
    const options2 = options ? JSON.parse(JSON.stringify(options)) : {}
    runTestSetInternal(
      normalFolder,
      options,
      foldername,
      verifyFunction,
      nameModifier,
      doReplacements,
      getFilename
    )
    if (doBomTest) {
      runTestSetInternal(
        bomFolder,
        options2,
        foldername,
        verifyFunction,
        nameModifier,
        doReplacements,
        getFilename
      )
    }
  }

  function runTestSetNormalOnly(
    options,
    foldername,
    verifyFunction,
    nameModifier,
    doReplacements,
    getFilename
  ) {
    runTestSetInternal(
      normalFolder,
      options,
      foldername,
      verifyFunction,
      nameModifier,
      doReplacements,
      getFilename
    )
  }

  function runTestSetInternal(
    baseFolder,
    options,
    foldername = '',
    verifyFunction,
    nameModifier,
    doReplacements,
    getFilename
  ) {
    if (!doReplacements) {
      doReplacements = globalReplacements
    }

    function getBasename(file) {
      return foldername + path.basename(file, '.less')
    }

    fs.readdirSync(path.join(baseFolder, foldername)).forEach(file => {
      if (!/\.less/.test(file)) {
        return
      }

      const name = getBasename(file)

      if (oneTestOnly && name !== oneTestOnly) {
        return
      }

      totalTests++

      if (options.sourceMap && !options.sourceMap.sourceMapFileInline) {
        options.sourceMapOutputFilename = `${name}.css`
        options.sourceMapBasepath = path.join(process.cwd(), baseFolder)
        options.sourceMapRootpath = 'testweb/'
        // TODO separate options?
        options.sourceMap = options
      }

      options.getVars = file =>
        JSON.parse(
          fs.readFileSync(
            getFilename(getBasename(file), 'vars', baseFolder),
            'utf8'
          )
        )

      let doubleCallCheck = false
      queue(() => {
        toCSS(
          options,
          path.join(baseFolder, foldername + file),
          (err, result) => {
            if (doubleCallCheck) {
              totalTests++
              fail('less is calling back twice')
              process.stdout.write(`${doubleCallCheck}\n`)
              process.stdout.write(`${new Error().stack}\n`)
              return
            }
            doubleCallCheck = new Error().stack

            if (verifyFunction) {
              const verificationResult = verifyFunction(
                name,
                err,
                result && result.css,
                doReplacements,
                result && result.map,
                baseFolder
              )
              release()
              return verificationResult
            }
            if (err) {
              fail(`ERROR: ${err && err.message}`)
              if (isVerbose) {
                process.stdout.write('\n')
                if (err.stack) {
                  process.stdout.write(`${err.stack}\n`)
                } else {
                  //this sometimes happen - show the whole error object
                  console.log(err)
                }
              }
              release()
              return
            }
            let css_name = name
            if (nameModifier) {
              css_name = nameModifier(name)
            }
            fs.readFile(
              `${path.join('test/css', css_name)}.css`,
              'utf8',
              (e, css) => {
                process.stdout.write(`- ${path.join(baseFolder, css_name)}: `)

                css =
                  css && doReplacements(css, path.join(baseFolder, foldername))
                if (result.css.trim() === css.trim()) {
                  ok('OK')
                } else {
                  difference('FAIL', css.trim(), result.css.trim())
                }
                release()
              }
            )
          }
        )
      })
    })
  }

  function diff(left, right) {
    require('diff').diffLines(left, right).forEach(item => {
      if (item.added || item.removed) {
        const text =
          item.value &&
          item.value
            .replace('\n', `${String.fromCharCode(182)}\n`)
            .replace('\ufeff', '[[BOM]]')
        process.stdout.write(stylize(text, item.added ? 'green' : 'red'))
      } else {
        process.stdout.write(
          item.value && item.value.replace('\ufeff', '[[BOM]]')
        )
      }
    })
    process.stdout.write('\n')
  }

  function fail(msg) {
    process.stdout.write(`${stylize(msg, 'red')}\n`)
    failedTests++
    endTest()
  }

  function difference(msg, left, right) {
    process.stdout.write(`${stylize(msg, 'yellow')}\n`)
    failedTests++

    diff(left, right)
    endTest()
  }

  function ok(msg) {
    process.stdout.write(`${stylize(msg, 'green')}\n`)
    passedTests++
    endTest()
  }

  function finished() {
    isFinished = true
    return endTest()
  }

  function endTest() {
    if (isFinished && failedTests + passedTests >= totalTests) {
      const leaked = checkGlobalLeaks()

      process.stdout.write('\n')
      if (leaked.length > 0) {
        process.stdout.write('\n')
        process.stdout.write(
          `${stylize('Global leak detected: ', 'red') + leaked.join(', ')}\n`
        )
      }

      if (leaked.length || failedTests) {
        process.on('exit', () => {
          process.reallyExit(1)
        })
      }

      if (failedTests > 0) {
        process.stdout.write(
          `${failedTests + stylize(' Failed', 'red')}, ${passedTests} passed\n`
        )
        return endreject(new Error('failed'))
      } else {
        process.stdout.write(
          `${stylize('All Passed ', 'green') + passedTests} run\n`
        )
        return endresolve()
      }
    }
    return endPromise
  }

  function contains(fullArray, obj) {
    for (let i = 0; i < fullArray.length; i++) {
      if (fullArray[i] === obj) {
        return true
      }
    }
    return false
  }

  function toCSS(options = {}, path, callback) {
    const str = fs.readFileSync(path, 'utf8')
    const addPath = require('path').dirname(path)
    if (typeof options.paths !== 'string') {
      options.paths = options.paths || []
      if (!contains(options.paths, addPath)) {
        options.paths.push(addPath)
      }
    }
    options.filename = require('path').resolve(process.cwd(), path)
    options.optimization = options.optimization || 0

    if (options.globalVars) {
      options.globalVars = options.getVars(path)
    } else if (options.modifyVars) {
      options.modifyVars = options.getVars(path)
    }
    if (options.plugin) {
      const Plugin = require(require('path').resolve(
        process.cwd(),
        options.plugin
      ))
      options.plugins = [Plugin]
    }
    less.render(str, options, callback)
  }

  function testNoOptions() {
    if (oneTestOnly && 'Integration' !== oneTestOnly) {
      return
    }
    totalTests++
    try {
      process.stdout.write('- Integration - creating parser without options: ')
      less.render('')
    } catch (e) {
      fail(stylize('FAIL\n', 'red'))
      return
    }
    ok(stylize('OK\n', 'green'))
  }

  return {
    runTestSet,
    runTestSetNormalOnly,
    testSyncronous,
    testErrors,
    testSourcemap,
    testEmptySourcemap,
    testNoOptions,
    prepBomTest,
    finished,
  }
}
