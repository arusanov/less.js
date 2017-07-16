const LessError = require('../less-error')
const tree = require('../tree')
const visitors = require('../visitors')
const getParserInput = require('./parser-input')
const utils = require('../utils')

//
// less.js - parser
//
//    A relatively straight-forward predictive parser.
//    There is no tokenization/lexing stage, the input is parsed
//    in one sweep.
//
//    To make the parser fast enough to run in the browser, several
//    optimization had to be made:
//
//    - Matching and slicing on a huge input is often cause of slowdowns.
//      The solution is to chunkify the input into smaller strings.
//      The chunks are stored in the `chunks` var,
//      `j` holds the current chunk index, and `currentPos` holds
//      the index of the current chunk in relation to `input`.
//      This gives us an almost 4x speed-up.
//
//    - In many cases, we don't need to match individual tokens;
//      for example, if a value doesn't hold any variables, operations
//      or dynamic references, the parser can effectively 'skip' it,
//      treating it as a literal.
//      An example would be '1px solid #000' - which evaluates to itself,
//      we don't need to know what the individual components are.
//      The drawback, of course is that you don't get the benefits of
//      syntax-checking on the CSS. This gives us a 50% speed-up in the parser,
//      and a smaller speed-up in the code-gen.
//
//
//    Token matching is done with the `$` function, which either takes
//    a terminal string or regexp, or a non-terminal function to call.
//    It also takes care of moving all the indices forwards.
//`
//
const Parser = function Parser(context, imports, fileInfo) {
  let parsers
  const parserInput = getParserInput()

  function error(msg, type) {
    throw new LessError(
      {
        index: parserInput.i,
        filename: fileInfo.filename,
        type: type || 'Syntax',
        message: msg,
      },
      imports
    )
  }

  function expect(arg, msg, index) {
    // some older browsers return typeof 'function' for RegExp
    const result =
      arg instanceof Function ? arg.call(parsers) : parserInput.$re(arg)
    if (result) {
      return result
    }
    error(
      msg ||
        (typeof arg === 'string'
          ? `expected '${arg}' got '${parserInput.currentChar()}'`
          : 'unexpected token')
    )
  }

  // Specialization of expect()
  function expectChar(arg, msg) {
    if (parserInput.$char(arg)) {
      return arg
    }
    error(msg || `expected '${arg}' got '${parserInput.currentChar()}'`)
  }

  function getDebugInfo(index) {
    const filename = fileInfo.filename

    return {
      lineNumber: utils.getLocation(index, parserInput.getInput()).line + 1,
      fileName: filename,
    }
  }

  //
  // The Parser
  //
  return {
    //
    // Parse an input string into an abstract syntax tree,
    // @param str A string containing 'less' markup
    // @param callback call `callback` when done.
    // @param [additionalData] An optional map which can contains vars - a map (key, value) of variables to apply
    //
    parse(str, callback, additionalData) {
      let root
      let error = null
      let globalVars
      let modifyVars
      let ignored
      let preText = ''

      globalVars =
        additionalData && additionalData.globalVars
          ? `${Parser.serializeVars(additionalData.globalVars)}\n`
          : ''
      modifyVars =
        additionalData && additionalData.modifyVars
          ? `\n${Parser.serializeVars(additionalData.modifyVars)}`
          : ''

      if (context.pluginManager) {
        const preProcessors = context.pluginManager.getPreProcessors()
        for (let i = 0; i < preProcessors.length; i++) {
          str = preProcessors[i].process(str, { context, imports, fileInfo })
        }
      }

      if (globalVars || (additionalData && additionalData.banner)) {
        preText =
          (additionalData && additionalData.banner
            ? additionalData.banner
            : '') + globalVars
        ignored = imports.contentsIgnoredChars
        ignored[fileInfo.filename] = ignored[fileInfo.filename] || 0
        ignored[fileInfo.filename] += preText.length
      }

      str = str.replace(/\r\n?/g, '\n')
      // Remove potential UTF Byte Order Mark
      str = preText + str.replace(/^\uFEFF/, '') + modifyVars
      imports.contents[fileInfo.filename] = str

      // Start with the primary rule.
      // The whole syntax tree is held under a Ruleset node,
      // with the `root` property set to true, so no `{}` are
      // output. The callback is called when the input is parsed.
      try {
        parserInput.start(str, context.chunkInput, function fail(msg, index) {
          throw new LessError(
            {
              index,
              type: 'Parse',
              message: msg,
              filename: fileInfo.filename,
            },
            imports
          )
        })

        root = new tree.Ruleset(null, this.parsers.primary())
        root.root = true
        root.firstRoot = true
      } catch (e) {
        return callback(new LessError(e, imports, fileInfo.filename))
      }

      // If `i` is smaller than the `input.length - 1`,
      // it means the parser wasn't able to parse the whole
      // string, so we've got a parsing error.
      //
      // We try to extract a \n delimited string,
      // showing the line where the parse error occurred.
      // We split it up into two parts (the part which parsed,
      // and the part which didn't), so we can color them differently.
      const endInfo = parserInput.end()
      if (!endInfo.isFinished) {
        let message = endInfo.furthestPossibleErrorMessage

        if (!message) {
          message = 'Unrecognised input'
          if (endInfo.furthestChar === '}') {
            message += ". Possibly missing opening '{'"
          } else if (endInfo.furthestChar === ')') {
            message += ". Possibly missing opening '('"
          } else if (endInfo.furthestReachedEnd) {
            message += '. Possibly missing something'
          }
        }

        error = new LessError(
          {
            type: 'Parse',
            message,
            index: endInfo.furthest,
            filename: fileInfo.filename,
          },
          imports
        )
      }

      const finish = e => {
        e = error || e || imports.error

        if (e) {
          if (!(e instanceof LessError)) {
            e = new LessError(e, imports, fileInfo.filename)
          }

          return callback(e)
        } else {
          return callback(null, root)
        }
      }

      if (context.processImports !== false) {
        new visitors.ImportVisitor(imports, finish).run(root)
      } else {
        return finish()
      }
    },

    //
    // Here in, the parsing rules/functions
    //
    // The basic structure of the syntax tree generated is as follows:
    //
    //   Ruleset ->  Rule -> Value -> Expression -> Entity
    //
    // Here's some Less code:
    //
    //    .class {
    //      color: #fff;
    //      border: 1px solid #000;
    //      width: @w + 4px;
    //      > .child {...}
    //    }
    //
    // And here's what the parse tree might look like:
    //
    //     Ruleset (Selector '.class', [
    //         Rule ("color",  Value ([Expression [Color #fff]]))
    //         Rule ("border", Value ([Expression [Dimension 1px][Keyword "solid"][Color #000]]))
    //         Rule ("width",  Value ([Expression [Operation " + " [Variable "@w"][Dimension 4px]]]))
    //         Ruleset (Selector [Element '>', '.child'], [...])
    //     ])
    //
    //  In general, most rules will try to parse a token with the `$re()` function, and if the return
    //  value is truly, will return a new node, of the relevant type. Sometimes, we need to check
    //  first, before parsing, that's when we use `peek()`.
    //
    parsers: (parsers = {
      //
      // The `primary` rule is the *entry* and *exit* point of the parser.
      // The rules here can appear at any level of the parse tree.
      //
      // The recursive nature of the grammar is an interplay between the `block`
      // rule, which represents `{ ... }`, the `ruleset` rule, and this `primary` rule,
      // as represented by this simplified grammar:
      //
      //     primary  →  (ruleset | rule)+
      //     ruleset  →  selector+ block
      //     block    →  '{' primary '}'
      //
      // Only at one point is the primary rule not called from the
      // block rule: at the root level.
      //
      primary() {
        const mixin = this.mixin
        let root = []
        let node

        while (true) {
          while (true) {
            node = this.comment()
            if (!node) {
              break
            }
            root.push(node)
          }
          // always process comments before deciding if finished
          if (parserInput.finished) {
            break
          }
          if (parserInput.peek('}')) {
            break
          }

          node = this.extendRule()
          if (node) {
            root = root.concat(node)
            continue
          }

          node =
            mixin.definition() ||
            this.rule() ||
            this.ruleset() ||
            mixin.call() ||
            this.rulesetCall() ||
            this.entities.call() ||
            this.directive()
          if (node) {
            root.push(node)
          } else {
            let foundSemiColon = false
            while (parserInput.$char(';')) {
              foundSemiColon = true
            }
            if (!foundSemiColon) {
              break
            }
          }
        }

        return root
      },

      // comments are collected by the main parsing mechanism and then assigned to nodes
      // where the current structure allows it
      comment() {
        if (parserInput.commentStore.length) {
          const comment = parserInput.commentStore.shift()
          return new tree.Comment(
            comment.text,
            comment.isLineComment,
            comment.index,
            fileInfo
          )
        }
      },

      //
      // Entities are tokens which can be found inside an Expression
      //
      entities: {
        //
        // A string, which supports escaping " and '
        //
        //     "milky way" 'he\'s the one!'
        //
        quoted() {
          let str
          const index = parserInput.i
          let isEscaped = false

          parserInput.save()
          if (parserInput.$char('~')) {
            isEscaped = true
          }
          str = parserInput.$quoted()
          if (!str) {
            parserInput.restore()
            return
          }
          parserInput.forget()

          return new tree.Quoted(
            str.charAt(0),
            str.substr(1, str.length - 2),
            isEscaped,
            index,
            fileInfo
          )
        },

        //
        // A catch-all word, such as:
        //
        //     black border-collapse
        //
        keyword() {
          const k =
            parserInput.$char('%') ||
            parserInput.$re(/^[_A-Za-z-][_A-Za-z0-9-]*/)
          if (k) {
            return tree.Color.fromKeyword(k) || new tree.Keyword(k)
          }
        },

        //
        // A function call
        //
        //     rgb(255, 0, 255)
        //
        // We also try to catch IE's `alpha()`, but let the `alpha` parser
        // deal with the details.
        //
        // The arguments are parsed with the `entities.arguments` parser.
        //
        call() {
          let name
          let nameLC
          let args
          let alpha
          const index = parserInput.i

          // http://jsperf.com/case-insensitive-regex-vs-strtolower-then-regex/18
          if (parserInput.peek(/^url\(/i)) {
            return
          }

          parserInput.save()

          name = parserInput.$re(/^([\w-]+|%|progid:[\w\.]+)\(/)
          if (!name) {
            parserInput.forget()
            return
          }

          name = name[1]
          nameLC = name.toLowerCase()

          if (nameLC === 'alpha') {
            alpha = parsers.alpha()
            if (alpha) {
              parserInput.forget()
              return alpha
            }
          }

          args = this.arguments()

          if (!parserInput.$char(')')) {
            parserInput.restore("Could not parse call arguments or missing ')'")
            return
          }

          parserInput.forget()
          return new tree.Call(name, args, index, fileInfo)
        },
        arguments() {
          const argsSemiColon = []
          const argsComma = []
          let expressions = []
          let isSemiColonSeparated
          let value
          let arg

          parserInput.save()

          while (true) {
            arg =
              parsers.detachedRuleset() ||
              this.assignment() ||
              parsers.expression()

            if (!arg) {
              break
            }

            value = arg

            if (arg.value && arg.value.length == 1) {
              value = arg.value[0]
            }

            if (value) {
              expressions.push(value)
            }

            argsComma.push(value)

            if (parserInput.$char(',')) {
              continue
            }

            if (parserInput.$char(';') || isSemiColonSeparated) {
              isSemiColonSeparated = true

              if (expressions.length > 1) {
                value = new tree.Value(expressions)
              }
              argsSemiColon.push(value)

              expressions = []
            }
          }

          parserInput.forget()
          return isSemiColonSeparated ? argsSemiColon : argsComma
        },
        literal() {
          return (
            this.dimension() ||
            this.color() ||
            this.quoted() ||
            this.unicodeDescriptor()
          )
        },

        // Assignments are argument entities for calls.
        // They are present in ie filter properties as shown below.
        //
        //     filter: progid:DXImageTransform.Microsoft.Alpha( *opacity=50* )
        //

        assignment() {
          let key
          let value
          parserInput.save()
          key = parserInput.$re(/^\w+(?=\s?=)/i)
          if (!key) {
            parserInput.restore()
            return
          }
          if (!parserInput.$char('=')) {
            parserInput.restore()
            return
          }
          value = parsers.entity()
          if (value) {
            parserInput.forget()
            return new tree.Assignment(key, value)
          } else {
            parserInput.restore()
          }
        },

        //
        // Parse url() tokens
        //
        // We use a specific rule for urls, because they don't really behave like
        // standard function calls. The difference is that the argument doesn't have
        // to be enclosed within a string, so it can't be parsed as an Expression.
        //
        url() {
          let value
          const index = parserInput.i

          parserInput.autoCommentAbsorb = false

          if (!parserInput.$str('url(')) {
            parserInput.autoCommentAbsorb = true
            return
          }

          value =
            this.quoted() ||
            this.variable() ||
            parserInput.$re(/^(?:(?:\\[\(\)'"])|[^\(\)'"])+/) ||
            ''

          parserInput.autoCommentAbsorb = true

          expectChar(')')

          return new tree.URL(
            value.value != null || value instanceof tree.Variable
              ? value
              : new tree.Anonymous(value),
            index,
            fileInfo
          )
        },

        //
        // A Variable entity, such as `@fink`, in
        //
        //     width: @fink + 2px
        //
        // We use a different parser for variable definitions,
        // see `parsers.variable`.
        //
        variable() {
          let name
          const index = parserInput.i

          if (
            parserInput.currentChar() === '@' &&
            (name = parserInput.$re(/^@@?[\w-]+/))
          ) {
            return new tree.Variable(name, index, fileInfo)
          }
        },

        // A variable entity using the protective {} e.g. @{var}
        variableCurly() {
          let curly
          const index = parserInput.i

          if (
            parserInput.currentChar() === '@' &&
            (curly = parserInput.$re(/^@\{([\w-]+)\}/))
          ) {
            return new tree.Variable(`@${curly[1]}`, index, fileInfo)
          }
        },

        //
        // A Hexadecimal color
        //
        //     #4F3C2F
        //
        // `rgb` and `hsl` colors are parsed through the `entities.call` parser.
        //
        color() {
          let rgb

          if (
            parserInput.currentChar() === '#' &&
            (rgb = parserInput.$re(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})/))
          ) {
            // strip colons, brackets, whitespaces and other characters that should not
            // definitely be part of color string
            let colorCandidateString = rgb.input.match(/^#([\w]+).*/)
            colorCandidateString = colorCandidateString[1]
            if (!colorCandidateString.match(/^[A-Fa-f0-9]+$/)) {
              // verify if candidate consists only of allowed HEX characters
              error('Invalid HEX color code')
            }
            return new tree.Color(rgb[1], undefined, `#${colorCandidateString}`)
          }
        },

        colorKeyword() {
          parserInput.save()
          const autoCommentAbsorb = parserInput.autoCommentAbsorb
          parserInput.autoCommentAbsorb = false
          const k = parserInput.$re(/^[_A-Za-z-][_A-Za-z0-9-]+/)
          parserInput.autoCommentAbsorb = autoCommentAbsorb
          if (!k) {
            parserInput.forget()
            return
          }
          parserInput.restore()
          const color = tree.Color.fromKeyword(k)
          if (color) {
            parserInput.$str(k)
            return color
          }
        },

        //
        // A Dimension, that is, a number and a unit
        //
        //     0.5em 95%
        //
        dimension() {
          if (parserInput.peekNotNumeric()) {
            return
          }

          const value = parserInput.$re(/^([+-]?\d*\.?\d+)(%|[a-z_]+)?/i)
          if (value) {
            return new tree.Dimension(value[1], value[2])
          }
        },

        //
        // A unicode descriptor, as is used in unicode-range
        //
        // U+0??  or U+00A1-00A9
        //
        unicodeDescriptor() {
          let ud

          ud = parserInput.$re(/^U\+[0-9a-fA-F?]+(\-[0-9a-fA-F?]+)?/)
          if (ud) {
            return new tree.UnicodeDescriptor(ud[0])
          }
        },

        //
        // JavaScript code to be evaluated
        //
        //     `window.location.href`
        //
        javascript() {
          let js
          const index = parserInput.i

          parserInput.save()

          const escape = parserInput.$char('~')
          const jsQuote = parserInput.$char('`')

          if (!jsQuote) {
            parserInput.restore()
            return
          }

          js = parserInput.$re(/^[^`]*`/)
          if (js) {
            parserInput.forget()
            return new tree.JavaScript(
              js.substr(0, js.length - 1),
              Boolean(escape),
              index,
              fileInfo
            )
          }
          parserInput.restore('invalid javascript definition')
        },
      },

      //
      // The variable part of a variable definition. Used in the `rule` parser
      //
      //     @fink:
      //
      variable() {
        let name

        if (
          parserInput.currentChar() === '@' &&
          (name = parserInput.$re(/^(@[\w-]+)\s*:/))
        ) {
          return name[1]
        }
      },

      //
      // The variable part of a variable definition. Used in the `rule` parser
      //
      //     @fink();
      //
      rulesetCall() {
        let name

        if (
          parserInput.currentChar() === '@' &&
          (name = parserInput.$re(/^(@[\w-]+)\(\s*\)\s*;/))
        ) {
          return new tree.RulesetCall(name[1])
        }
      },

      //
      // extend syntax - used to extend selectors
      //
      extend(isRule) {
        let elements
        let e
        const index = parserInput.i
        let option
        let extendList
        let extend

        if (!parserInput.$str(isRule ? '&:extend(' : ':extend(')) {
          return
        }

        do {
          option = null
          elements = null
          while (!(option = parserInput.$re(/^(all)(?=\s*(\)|,))/))) {
            e = this.element()
            if (!e) {
              break
            }
            if (elements) {
              elements.push(e)
            } else {
              elements = [e]
            }
          }

          option = option && option[1]
          if (!elements) {
            error('Missing target selector for :extend().')
          }
          extend = new tree.Extend(
            new tree.Selector(elements),
            option,
            index,
            fileInfo
          )
          if (extendList) {
            extendList.push(extend)
          } else {
            extendList = [extend]
          }
        } while (parserInput.$char(','))

        expect(/^\)/)

        if (isRule) {
          expect(/^;/)
        }

        return extendList
      },

      //
      // extendRule - used in a rule to extend all the parent selectors
      //
      extendRule() {
        return this.extend(true)
      },

      //
      // Mixins
      //
      mixin: {
        //
        // A Mixin call, with an optional argument list
        //
        //     #mixins > .square(#fff);
        //     .rounded(4px, black);
        //     .button;
        //
        // The `while` loop is there because mixins can be
        // namespaced, but we only support the child and descendant
        // selector for now.
        //
        call() {
          const s = parserInput.currentChar()
          let important = false
          const index = parserInput.i
          let elemIndex
          let elements
          let elem
          let e
          let c
          let args

          if (s !== '.' && s !== '#') {
            return
          }

          parserInput.save() // stop us absorbing part of an invalid selector

          while (true) {
            elemIndex = parserInput.i
            e = parserInput.$re(
              /^[#.](?:[\w-]|\\(?:[A-Fa-f0-9]{1,6} ?|[^A-Fa-f0-9]))+/
            )
            if (!e) {
              break
            }
            elem = new tree.Element(c, e, elemIndex, fileInfo)
            if (elements) {
              elements.push(elem)
            } else {
              elements = [elem]
            }
            c = parserInput.$char('>')
          }

          if (elements) {
            if (parserInput.$char('(')) {
              args = this.args(true).args
              expectChar(')')
            }

            if (parsers.important()) {
              important = true
            }

            if (parsers.end()) {
              parserInput.forget()
              return new tree.mixin.Call(
                elements,
                args,
                index,
                fileInfo,
                important
              )
            }
          }

          parserInput.restore()
        },
        args(isCall) {
          const entities = parsers.entities
          const returner = { args: null, variadic: false }
          let expressions = []
          const argsSemiColon = []
          const argsComma = []
          let isSemiColonSeparated
          let expressionContainsNamed
          let name
          let nameLoop
          let value
          let arg
          let expand

          parserInput.save()

          while (true) {
            if (isCall) {
              arg = parsers.detachedRuleset() || parsers.expression()
            } else {
              parserInput.commentStore.length = 0
              if (parserInput.$str('...')) {
                returner.variadic = true
                if (parserInput.$char(';') && !isSemiColonSeparated) {
                  isSemiColonSeparated = true
                }
                ;(isSemiColonSeparated ? argsSemiColon : argsComma).push({
                  variadic: true,
                })
                break
              }
              arg =
                entities.variable() || entities.literal() || entities.keyword()
            }

            if (!arg) {
              break
            }

            nameLoop = null
            if (arg.throwAwayComments) {
              arg.throwAwayComments()
            }
            value = arg
            let val = null

            if (isCall) {
              // Variable
              if (arg.value && arg.value.length == 1) {
                val = arg.value[0]
              }
            } else {
              val = arg
            }

            if (val && val instanceof tree.Variable) {
              if (parserInput.$char(':')) {
                if (expressions.length > 0) {
                  if (isSemiColonSeparated) {
                    error('Cannot mix ; and , as delimiter types')
                  }
                  expressionContainsNamed = true
                }

                value = parsers.detachedRuleset() || parsers.expression()

                if (!value) {
                  if (isCall) {
                    error('could not understand value for named argument')
                  } else {
                    parserInput.restore()
                    returner.args = []
                    return returner
                  }
                }
                nameLoop = name = val.name
              } else if (parserInput.$str('...')) {
                if (!isCall) {
                  returner.variadic = true
                  if (parserInput.$char(';') && !isSemiColonSeparated) {
                    isSemiColonSeparated = true
                  }
                  ;(isSemiColonSeparated ? argsSemiColon : argsComma).push({
                    name: arg.name,
                    variadic: true,
                  })
                  break
                } else {
                  expand = true
                }
              } else if (!isCall) {
                name = nameLoop = val.name
                value = null
              }
            }

            if (value) {
              expressions.push(value)
            }

            argsComma.push({ name: nameLoop, value, expand })

            if (parserInput.$char(',')) {
              continue
            }

            if (parserInput.$char(';') || isSemiColonSeparated) {
              if (expressionContainsNamed) {
                error('Cannot mix ; and , as delimiter types')
              }

              isSemiColonSeparated = true

              if (expressions.length > 1) {
                value = new tree.Value(expressions)
              }
              argsSemiColon.push({ name, value, expand })

              name = null
              expressions = []
              expressionContainsNamed = false
            }
          }

          parserInput.forget()
          returner.args = isSemiColonSeparated ? argsSemiColon : argsComma
          return returner
        },
        //
        // A Mixin definition, with a list of parameters
        //
        //     .rounded (@radius: 2px, @color) {
        //        ...
        //     }
        //
        // Until we have a finer grained state-machine, we have to
        // do a look-ahead, to make sure we don't have a mixin call.
        // See the `rule` function for more information.
        //
        // We start by matching `.rounded (`, and then proceed on to
        // the argument list, which has optional default values.
        // We store the parameters in `params`, with a `value` key,
        // if there is a value, such as in the case of `@radius`.
        //
        // Once we've got our params list, and a closing `)`, we parse
        // the `{...}` block.
        //
        definition() {
          let name
          let params = []
          let match
          let ruleset
          let cond
          let variadic = false
          if (
            (parserInput.currentChar() !== '.' &&
              parserInput.currentChar() !== '#') ||
            parserInput.peek(/^[^{]*\}/)
          ) {
            return
          }

          parserInput.save()

          match = parserInput.$re(
            /^([#.](?:[\w-]|\\(?:[A-Fa-f0-9]{1,6} ?|[^A-Fa-f0-9]))+)\s*\(/
          )
          if (match) {
            name = match[1]

            const argInfo = this.args(false)
            params = argInfo.args
            variadic = argInfo.variadic

            // .mixincall("@{a}");
            // looks a bit like a mixin definition..
            // also
            // .mixincall(@a: {rule: set;});
            // so we have to be nice and restore
            if (!parserInput.$char(')')) {
              parserInput.restore("Missing closing ')'")
              return
            }

            parserInput.commentStore.length = 0

            if (parserInput.$str('when')) {
              // Guard
              cond = expect(parsers.conditions, 'expected condition')
            }

            ruleset = parsers.block()

            if (ruleset) {
              parserInput.forget()
              return new tree.mixin.Definition(
                name,
                params,
                ruleset,
                cond,
                variadic
              )
            } else {
              parserInput.restore()
            }
          } else {
            parserInput.forget()
          }
        },
      },

      //
      // Entities are the smallest recognized token,
      // and can be found inside a rule's value.
      //
      entity() {
        const entities = this.entities

        return (
          this.comment() ||
          entities.literal() ||
          entities.variable() ||
          entities.url() ||
          entities.call() ||
          entities.keyword() ||
          entities.javascript()
        )
      },

      //
      // A Rule terminator. Note that we use `peek()` to check for '}',
      // because the `block` rule will be expecting it, but we still need to make sure
      // it's there, if ';' was omitted.
      //
      end() {
        return parserInput.$char(';') || parserInput.peek('}')
      },

      //
      // IE's alpha function
      //
      //     alpha(opacity=88)
      //
      alpha() {
        let value

        // http://jsperf.com/case-insensitive-regex-vs-strtolower-then-regex/18
        if (!parserInput.$re(/^opacity=/i)) {
          return
        }
        value = parserInput.$re(/^\d+/)
        if (!value) {
          value = expect(this.entities.variable, 'Could not parse alpha')
        }
        expectChar(')')
        return new tree.Alpha(value)
      },

      //
      // A Selector Element
      //
      //     div
      //     + h1
      //     #socks
      //     input[type="text"]
      //
      // Elements are the building blocks for Selectors,
      // they are made out of a `Combinator` (see combinator rule),
      // and an element name, such as a tag a class, or `*`.
      //
      element() {
        let e
        let c
        let v
        const index = parserInput.i

        c = this.combinator()

        e =
          parserInput.$re(/^(?:\d+\.\d+|\d+)%/) ||
          parserInput.$re(
            /^(?:[.#]?|:*)(?:[\w-]|[^\x00-\x9f]|\\(?:[A-Fa-f0-9]{1,6} ?|[^A-Fa-f0-9]))+/
          ) ||
          parserInput.$char('*') ||
          parserInput.$char('&') ||
          this.attribute() ||
          parserInput.$re(/^\([^&()@]+\)/) ||
          parserInput.$re(/^[\.#:](?=@)/) ||
          this.entities.variableCurly()

        if (!e) {
          parserInput.save()
          if (parserInput.$char('(')) {
            if ((v = this.selector()) && parserInput.$char(')')) {
              e = new tree.Paren(v)
              parserInput.forget()
            } else {
              parserInput.restore("Missing closing ')'")
            }
          } else {
            parserInput.forget()
          }
        }

        if (e) {
          return new tree.Element(c, e, index, fileInfo)
        }
      },

      //
      // Combinators combine elements together, in a Selector.
      //
      // Because our parser isn't white-space sensitive, special care
      // has to be taken, when parsing the descendant combinator, ` `,
      // as it's an empty space. We have to check the previous character
      // in the input, to see if it's a ` ` character. More info on how
      // we deal with this in *combinator.js*.
      //
      combinator() {
        let c = parserInput.currentChar()

        if (c === '/') {
          parserInput.save()
          const slashedCombinator = parserInput.$re(/^\/[a-z]+\//i)
          if (slashedCombinator) {
            parserInput.forget()
            return new tree.Combinator(slashedCombinator)
          }
          parserInput.restore()
        }

        if (c === '>' || c === '+' || c === '~' || c === '|' || c === '^') {
          parserInput.i++
          if (c === '^' && parserInput.currentChar() === '^') {
            c = '^^'
            parserInput.i++
          }
          while (parserInput.isWhitespace()) {
            parserInput.i++
          }
          return new tree.Combinator(c)
        } else if (parserInput.isWhitespace(-1)) {
          return new tree.Combinator(' ')
        } else {
          return new tree.Combinator(null)
        }
      },
      //
      // A CSS selector (see selector below)
      // with less extensions e.g. the ability to extend and guard
      //
      lessSelector() {
        return this.selector(true)
      },
      //
      // A CSS Selector
      //
      //     .class > div + h1
      //     li a:hover
      //
      // Selectors are made out of one or more Elements, see above.
      //
      selector(isLess) {
        const index = parserInput.i
        let elements
        let extendList
        let c
        let e
        let allExtends
        let when
        let condition

        while (
          (isLess && (extendList = this.extend())) ||
          (isLess && (when = parserInput.$str('when'))) ||
          (e = this.element())
        ) {
          if (when) {
            condition = expect(this.conditions, 'expected condition')
          } else if (condition) {
            error('CSS guard can only be used at the end of selector')
          } else if (extendList) {
            if (allExtends) {
              allExtends = allExtends.concat(extendList)
            } else {
              allExtends = extendList
            }
          } else {
            if (allExtends) {
              error('Extend can only be used at the end of selector')
            }
            c = parserInput.currentChar()
            if (elements) {
              elements.push(e)
            } else {
              elements = [e]
            }
            e = null
          }
          if (c === '{' || c === '}' || c === ';' || c === ',' || c === ')') {
            break
          }
        }

        if (elements) {
          return new tree.Selector(
            elements,
            allExtends,
            condition,
            index,
            fileInfo
          )
        }
        if (allExtends) {
          error(
            'Extend must be used to extend a selector, it cannot be used on its own'
          )
        }
      },
      attribute() {
        if (!parserInput.$char('[')) {
          return
        }

        const entities = this.entities
        let key
        let val
        let op

        if (!(key = entities.variableCurly())) {
          key = expect(/^(?:[_A-Za-z0-9-\*]*\|)?(?:[_A-Za-z0-9-]|\\.)+/)
        }

        op = parserInput.$re(/^[|~*$^]?=/)
        if (op) {
          val =
            entities.quoted() ||
            parserInput.$re(/^[0-9]+%/) ||
            parserInput.$re(/^[\w-]+/) ||
            entities.variableCurly()
        }

        expectChar(']')

        return new tree.Attribute(key, op, val)
      },

      //
      // The `block` rule is used by `ruleset` and `mixin.definition`.
      // It's a wrapper around the `primary` rule, with added `{}`.
      //
      block() {
        let content
        if (
          parserInput.$char('{') &&
          (content = this.primary()) &&
          parserInput.$char('}')
        ) {
          return content
        }
      },

      blockRuleset() {
        let block = this.block()

        if (block) {
          block = new tree.Ruleset(null, block)
        }
        return block
      },

      detachedRuleset() {
        const blockRuleset = this.blockRuleset()
        if (blockRuleset) {
          return new tree.DetachedRuleset(blockRuleset)
        }
      },

      //
      // div, .class, body > p {...}
      //
      ruleset() {
        let selectors
        let s
        let rules
        let debugInfo

        parserInput.save()

        if (context.dumpLineNumbers) {
          debugInfo = getDebugInfo(parserInput.i)
        }

        while (true) {
          s = this.lessSelector()
          if (!s) {
            break
          }
          if (selectors) {
            selectors.push(s)
          } else {
            selectors = [s]
          }
          parserInput.commentStore.length = 0
          if (s.condition && selectors.length > 1) {
            error('Guards are only currently allowed on a single selector.')
          }
          if (!parserInput.$char(',')) {
            break
          }
          if (s.condition) {
            error('Guards are only currently allowed on a single selector.')
          }
          parserInput.commentStore.length = 0
        }

        if (selectors && (rules = this.block())) {
          parserInput.forget()
          const ruleset = new tree.Ruleset(
            selectors,
            rules,
            context.strictImports
          )
          if (context.dumpLineNumbers) {
            ruleset.debugInfo = debugInfo
          }
          return ruleset
        } else {
          parserInput.restore()
        }
      },
      rule(tryAnonymous) {
        let name
        let value
        const startOfRule = parserInput.i
        const c = parserInput.currentChar()
        let important
        let merge
        let isVariable

        if (c === '.' || c === '#' || c === '&' || c === ':') {
          return
        }

        parserInput.save()

        name = this.variable() || this.ruleProperty()
        if (name) {
          isVariable = typeof name === 'string'

          if (isVariable) {
            value = this.detachedRuleset()
          }

          parserInput.commentStore.length = 0
          if (!value) {
            // a name returned by this.ruleProperty() is always an array of the form:
            // [string-1, ..., string-n, ""] or [string-1, ..., string-n, "+"]
            // where each item is a tree.Keyword or tree.Variable
            merge = !isVariable && name.length > 1 && name.pop().value

            // prefer to try to parse first if its a variable or we are compressing
            // but always fallback on the other one
            const tryValueFirst =
              !tryAnonymous && (context.compress || isVariable)

            if (tryValueFirst) {
              value = this.value()
            }
            if (!value) {
              value = this.anonymousValue()
              if (value) {
                parserInput.forget()
                // anonymous values absorb the end ';' which is required for them to work
                return new tree.Rule(
                  name,
                  value,
                  false,
                  merge,
                  startOfRule,
                  fileInfo
                )
              }
            }
            if (!tryValueFirst && !value) {
              value = this.value()
            }

            important = this.important()
          }

          if (value && this.end()) {
            parserInput.forget()
            return new tree.Rule(
              name,
              value,
              important,
              merge,
              startOfRule,
              fileInfo
            )
          } else {
            parserInput.restore()
            if (value && !tryAnonymous) {
              return this.rule(true)
            }
          }
        } else {
          parserInput.forget()
        }
      },
      anonymousValue() {
        const match = parserInput.$re(/^([^@+\/'"*`(;{}-]*);/)
        if (match) {
          return new tree.Anonymous(match[1])
        }
      },

      //
      // An @import directive
      //
      //     @import "lib";
      //
      // Depending on our environment, importing is done differently:
      // In the browser, it's an XHR request, in Node, it would be a
      // file-system operation. The function used for importing is
      // stored in `import`, which we pass to the Import constructor.
      //
      import: function() {
        let path
        let features
        const index = parserInput.i

        const dir = parserInput.$re(/^@import?\s+/)

        if (dir) {
          const options = (dir ? this.importOptions() : null) || {}

          if ((path = this.entities.quoted() || this.entities.url())) {
            features = this.mediaFeatures()

            if (!parserInput.$char(';')) {
              parserInput.i = index
              error(
                'missing semi-colon or unrecognised media features on import'
              )
            }
            features = features && new tree.Value(features)
            return new tree.Import(path, features, options, index, fileInfo)
          } else {
            parserInput.i = index
            error('malformed import statement')
          }
        }
      },

      importOptions() {
        let o
        const options = {}
        let optionName
        let value

        // list of options, surrounded by parens
        if (!parserInput.$char('(')) {
          return null
        }
        do {
          o = this.importOption()
          if (o) {
            optionName = o
            value = true
            switch (optionName) {
              case 'css':
                optionName = 'less'
                value = false
                break
              case 'once':
                optionName = 'multiple'
                value = false
                break
            }
            options[optionName] = value
            if (!parserInput.$char(',')) {
              break
            }
          }
        } while (o)
        expectChar(')')
        return options
      },

      importOption() {
        const opt = parserInput.$re(
          /^(less|css|multiple|once|inline|reference|optional)/
        )
        if (opt) {
          return opt[1]
        }
      },

      mediaFeature() {
        const entities = this.entities
        const nodes = []
        let e
        let p
        parserInput.save()
        do {
          e = entities.keyword() || entities.variable()
          if (e) {
            nodes.push(e)
          } else if (parserInput.$char('(')) {
            p = this.property()
            e = this.value()
            if (parserInput.$char(')')) {
              if (p && e) {
                nodes.push(
                  new tree.Paren(
                    new tree.Rule(
                      p,
                      e,
                      null,
                      null,
                      parserInput.i,
                      fileInfo,
                      true
                    )
                  )
                )
              } else if (e) {
                nodes.push(new tree.Paren(e))
              } else {
                error('badly formed media feature definition')
              }
            } else {
              error("Missing closing ')'", 'Parse')
            }
          }
        } while (e)

        parserInput.forget()
        if (nodes.length > 0) {
          return new tree.Expression(nodes)
        }
      },

      mediaFeatures() {
        const entities = this.entities
        const features = []
        let e
        do {
          e = this.mediaFeature()
          if (e) {
            features.push(e)
            if (!parserInput.$char(',')) {
              break
            }
          } else {
            e = entities.variable()
            if (e) {
              features.push(e)
              if (!parserInput.$char(',')) {
                break
              }
            }
          }
        } while (e)

        return features.length > 0 ? features : null
      },

      media() {
        let features
        let rules
        let media
        let debugInfo
        const index = parserInput.i

        if (context.dumpLineNumbers) {
          debugInfo = getDebugInfo(index)
        }

        parserInput.save()

        if (parserInput.$str('@media')) {
          features = this.mediaFeatures()

          rules = this.block()

          if (!rules) {
            error(
              'media definitions require block statements after any features'
            )
          }

          parserInput.forget()

          media = new tree.Media(rules, features, index, fileInfo)
          if (context.dumpLineNumbers) {
            media.debugInfo = debugInfo
          }

          return media
        }

        parserInput.restore()
      },

      //
      // A @plugin directive, used to import compiler extensions dynamically.
      //
      //     @plugin "lib";
      //
      // Depending on our environment, importing is done differently:
      // In the browser, it's an XHR request, in Node, it would be a
      // file-system operation. The function used for importing is
      // stored in `import`, which we pass to the Import constructor.
      //
      plugin() {
        let path
        const index = parserInput.i
        const dir = parserInput.$re(/^@plugin?\s+/)

        if (dir) {
          const options = { plugin: true }

          if ((path = this.entities.quoted() || this.entities.url())) {
            if (!parserInput.$char(';')) {
              parserInput.i = index
              error('missing semi-colon on plugin')
            }

            return new tree.Import(path, null, options, index, fileInfo)
          } else {
            parserInput.i = index
            error('malformed plugin statement')
          }
        }
      },

      //
      // A CSS Directive
      //
      //     @charset "utf-8";
      //
      directive() {
        const index = parserInput.i
        let name
        let value
        let rules
        let nonVendorSpecificName
        let hasIdentifier
        let hasExpression
        let hasUnknown
        let hasBlock = true
        let isRooted = true

        if (parserInput.currentChar() !== '@') {
          return
        }

        value = this['import']() || this.plugin() || this.media()
        if (value) {
          return value
        }

        parserInput.save()

        name = parserInput.$re(/^@[a-z-]+/)

        if (!name) {
          return
        }

        nonVendorSpecificName = name
        if (name.charAt(1) == '-' && name.indexOf('-', 2) > 0) {
          nonVendorSpecificName = `@${name.slice(name.indexOf('-', 2) + 1)}`
        }

        switch (nonVendorSpecificName) {
          case '@charset':
            hasIdentifier = true
            hasBlock = false
            break
          case '@namespace':
            hasExpression = true
            hasBlock = false
            break
          case '@keyframes':
          case '@counter-style':
            hasIdentifier = true
            break
          case '@document':
          case '@supports':
            hasUnknown = true
            isRooted = false
            break
          default:
            hasUnknown = true
            break
        }

        parserInput.commentStore.length = 0

        if (hasIdentifier) {
          value = this.entity()
          if (!value) {
            error(`expected ${name} identifier`)
          }
        } else if (hasExpression) {
          value = this.expression()
          if (!value) {
            error(`expected ${name} expression`)
          }
        } else if (hasUnknown) {
          value = (parserInput.$re(/^[^{;]+/) || '').trim()
          hasBlock = parserInput.currentChar() == '{'
          if (value) {
            value = new tree.Anonymous(value)
          }
        }

        if (hasBlock) {
          rules = this.blockRuleset()
        }

        if (rules || (!hasBlock && value && parserInput.$char(';'))) {
          parserInput.forget()
          return new tree.Directive(
            name,
            value,
            rules,
            index,
            fileInfo,
            context.dumpLineNumbers ? getDebugInfo(index) : null,
            isRooted
          )
        }

        parserInput.restore('directive options not recognised')
      },

      //
      // A Value is a comma-delimited list of Expressions
      //
      //     font-family: Baskerville, Georgia, serif;
      //
      // In a Rule, a Value represents everything after the `:`,
      // and before the `;`.
      //
      value() {
        let e
        const expressions = []

        do {
          e = this.expression()
          if (e) {
            expressions.push(e)
            if (!parserInput.$char(',')) {
              break
            }
          }
        } while (e)

        if (expressions.length > 0) {
          return new tree.Value(expressions)
        }
      },
      important() {
        if (parserInput.currentChar() === '!') {
          return parserInput.$re(/^! *important/)
        }
      },
      sub() {
        let a
        let e

        parserInput.save()
        if (parserInput.$char('(')) {
          a = this.addition()
          if (a && parserInput.$char(')')) {
            parserInput.forget()
            e = new tree.Expression([a])
            e.parens = true
            return e
          }
          parserInput.restore("Expected ')'")
          return
        }
        parserInput.restore()
      },
      multiplication() {
        let m
        let a
        let op
        let operation
        let isSpaced
        m = this.operand()
        if (m) {
          isSpaced = parserInput.isWhitespace(-1)
          while (true) {
            if (parserInput.peek(/^\/[*\/]/)) {
              break
            }

            parserInput.save()

            op = parserInput.$char('/') || parserInput.$char('*')

            if (!op) {
              parserInput.forget()
              break
            }

            a = this.operand()

            if (!a) {
              parserInput.restore()
              break
            }
            parserInput.forget()

            m.parensInOp = true
            a.parensInOp = true
            operation = new tree.Operation(op, [operation || m, a], isSpaced)
            isSpaced = parserInput.isWhitespace(-1)
          }
          return operation || m
        }
      },
      addition() {
        let m
        let a
        let op
        let operation
        let isSpaced
        m = this.multiplication()
        if (m) {
          isSpaced = parserInput.isWhitespace(-1)
          while (true) {
            op =
              parserInput.$re(/^[-+]\s+/) ||
              (!isSpaced && (parserInput.$char('+') || parserInput.$char('-')))
            if (!op) {
              break
            }
            a = this.multiplication()
            if (!a) {
              break
            }

            m.parensInOp = true
            a.parensInOp = true
            operation = new tree.Operation(op, [operation || m, a], isSpaced)
            isSpaced = parserInput.isWhitespace(-1)
          }
          return operation || m
        }
      },
      conditions() {
        let a
        let b
        const index = parserInput.i
        let condition

        a = this.condition()
        if (a) {
          while (true) {
            if (
              !parserInput.peek(/^,\s*(not\s*)?\(/) ||
              !parserInput.$char(',')
            ) {
              break
            }
            b = this.condition()
            if (!b) {
              break
            }
            condition = new tree.Condition('or', condition || a, b, index)
          }
          return condition || a
        }
      },
      condition() {
        let result
        let logical
        let next
        function or() {
          return parserInput.$str('or')
        }

        result = this.conditionAnd(this)
        if (!result) {
          return
        }
        logical = or()
        if (logical) {
          next = this.condition()
          if (next) {
            result = new tree.Condition(logical, result, next)
          } else {
            return
          }
        }
        return result
      },
      conditionAnd() {
        let result
        let logical
        let next
        function insideCondition(me) {
          return me.negatedCondition() || me.parenthesisCondition()
        }
        function and() {
          return parserInput.$str('and')
        }

        result = insideCondition(this)
        if (!result) {
          return
        }
        logical = and()
        if (logical) {
          next = this.conditionAnd()
          if (next) {
            result = new tree.Condition(logical, result, next)
          } else {
            return
          }
        }
        return result
      },
      negatedCondition() {
        if (parserInput.$str('not')) {
          const result = this.parenthesisCondition()
          if (result) {
            result.negate = !result.negate
          }
          return result
        }
      },
      parenthesisCondition() {
        function tryConditionFollowedByParenthesis(me) {
          let body
          parserInput.save()
          body = me.condition()
          if (!body) {
            parserInput.restore()
            return
          }
          if (!parserInput.$char(')')) {
            parserInput.restore()
            return
          }
          parserInput.forget()
          return body
        }

        let body
        parserInput.save()
        if (!parserInput.$str('(')) {
          parserInput.restore()
          return
        }
        body = tryConditionFollowedByParenthesis(this)
        if (body) {
          parserInput.forget()
          return body
        }

        body = this.atomicCondition()
        if (!body) {
          parserInput.restore()
          return
        }
        if (!parserInput.$char(')')) {
          parserInput.restore(`expected ')' got '${parserInput.currentChar()}'`)
          return
        }
        parserInput.forget()
        return body
      },
      atomicCondition() {
        const entities = this.entities
        const index = parserInput.i
        let a
        let b
        let c
        let op

        a = this.addition() || entities.keyword() || entities.quoted()
        if (a) {
          if (parserInput.$char('>')) {
            if (parserInput.$char('=')) {
              op = '>='
            } else {
              op = '>'
            }
          } else if (parserInput.$char('<')) {
            if (parserInput.$char('=')) {
              op = '<='
            } else {
              op = '<'
            }
          } else if (parserInput.$char('=')) {
            if (parserInput.$char('>')) {
              op = '=>'
            } else if (parserInput.$char('<')) {
              op = '=<'
            } else {
              op = '='
            }
          }
          if (op) {
            b = this.addition() || entities.keyword() || entities.quoted()
            if (b) {
              c = new tree.Condition(op, a, b, index, false)
            } else {
              error('expected expression')
            }
          } else {
            c = new tree.Condition(
              '=',
              a,
              new tree.Keyword('true'),
              index,
              false
            )
          }
          return c
        }
      },

      //
      // An operand is anything that can be part of an operation,
      // such as a Color, or a Variable
      //
      operand() {
        const entities = this.entities
        let negate

        if (parserInput.peek(/^-[@\(]/)) {
          negate = parserInput.$char('-')
        }

        let o =
          this.sub() ||
          entities.dimension() ||
          entities.color() ||
          entities.variable() ||
          entities.call() ||
          entities.colorKeyword()

        if (negate) {
          o.parensInOp = true
          o = new tree.Negative(o)
        }

        return o
      },

      //
      // Expressions either represent mathematical operations,
      // or white-space delimited Entities.
      //
      //     1px solid black
      //     @var * 2
      //
      expression() {
        const entities = []
        let e
        let delim

        do {
          e = this.comment()
          if (e) {
            entities.push(e)
            continue
          }
          e = this.addition() || this.entity()
          if (e) {
            entities.push(e)
            // operations do not allow keyword "/" dimension (e.g. small/20px) so we support that here
            if (!parserInput.peek(/^\/[\/*]/)) {
              delim = parserInput.$char('/')
              if (delim) {
                entities.push(new tree.Anonymous(delim))
              }
            }
          }
        } while (e)
        if (entities.length > 0) {
          return new tree.Expression(entities)
        }
      },
      property() {
        const name = parserInput.$re(/^(\*?-?[_a-zA-Z0-9-]+)\s*:/)
        if (name) {
          return name[1]
        }
      },
      ruleProperty() {
        let name = []
        const index = []
        let s
        let k

        parserInput.save()

        const simpleProperty = parserInput.$re(/^([_a-zA-Z0-9-]+)\s*:/)
        if (simpleProperty) {
          name = [new tree.Keyword(simpleProperty[1])]
          parserInput.forget()
          return name
        }

        function match(re) {
          const i = parserInput.i
          const chunk = parserInput.$re(re)
          if (chunk) {
            index.push(i)
            return name.push(chunk[1])
          }
        }

        match(/^(\*?)/)
        while (true) {
          if (!match(/^((?:[\w-]+)|(?:@\{[\w-]+\}))/)) {
            break
          }
        }

        if (name.length > 1 && match(/^((?:\+_|\+)?)\s*:/)) {
          parserInput.forget()

          // at last, we have the complete match now. move forward,
          // convert name particles to tree objects and return:
          if (name[0] === '') {
            name.shift()
            index.shift()
          }
          for (k = 0; k < name.length; k++) {
            s = name[k]
            name[k] =
              s.charAt(0) !== '@'
                ? new tree.Keyword(s)
                : new tree.Variable(`@${s.slice(2, -1)}`, index[k], fileInfo)
          }
          return name
        }
        parserInput.restore()
      },
    }),
  }
}
Parser.serializeVars = vars => {
  let s = ''

  for (const name in vars) {
    if (Object.hasOwnProperty.call(vars, name)) {
      const value = vars[name]
      s += `${(name[0] === '@' ? '' : '@') + name}: ${value}${String(
        value
      ).slice(-1) === ';'
        ? ''
        : ';'}`
    }
  }

  return s
}

module.exports = Parser
