(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
	typeof define === 'function' && define.amd ? define(factory) :
	(global.less = factory());
}(this, (function () { 'use strict';

var logger = {
  error: function error(msg) {
    this._fireEvent('error', msg);
  },
  warn: function warn(msg) {
    this._fireEvent('warn', msg);
  },
  info: function info(msg) {
    this._fireEvent('info', msg);
  },
  debug: function debug(msg) {
    this._fireEvent('debug', msg);
  },
  addListener: function addListener(listener) {
    this._listeners.push(listener);
  },
  removeListener: function removeListener(listener) {
    for (var i = 0; i < this._listeners.length; i++) {
      if (this._listeners[i] === listener) {
        this._listeners.splice(i, 1);
        return;
      }
    }
  },
  _fireEvent: function _fireEvent(type, msg) {
    for (var i = 0; i < this._listeners.length; i++) {
      var logFunction = this._listeners[i][type];
      if (logFunction) {
        logFunction(msg);
      }
    }
  },

  _listeners: []
};

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) {
  return typeof obj;
} : function (obj) {
  return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj;
};











var classCallCheck = function (instance, Constructor) {
  if (!(instance instanceof Constructor)) {
    throw new TypeError("Cannot call a class as a function");
  }
};











var inherits = function (subClass, superClass) {
  if (typeof superClass !== "function" && superClass !== null) {
    throw new TypeError("Super expression must either be null or a function, not " + typeof superClass);
  }

  subClass.prototype = Object.create(superClass && superClass.prototype, {
    constructor: {
      value: subClass,
      enumerable: false,
      writable: true,
      configurable: true
    }
  });
  if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass;
};











var possibleConstructorReturn = function (self, call) {
  if (!self) {
    throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
  }

  return call && (typeof call === "object" || typeof call === "function") ? call : self;
};

var Environment = function () {
  function Environment(externalEnvironment, fileManagers) {
    classCallCheck(this, Environment);

    this.fileManagers = fileManagers || [];
    externalEnvironment = externalEnvironment || {};

    var optionalFunctions = ['encodeBase64', 'mimeLookup', 'charsetLookup', 'getSourceMapGenerator'];
    var requiredFunctions = [];
    var functions = requiredFunctions.concat(optionalFunctions);

    for (var i = 0; i < functions.length; i++) {
      var propName = functions[i];
      var environmentFunc = externalEnvironment[propName];
      if (environmentFunc) {
        this[propName] = environmentFunc.bind(externalEnvironment);
      } else if (i < requiredFunctions.length) {
        this.warn('missing required function in environment - ' + propName);
      }
    }
  }

  Environment.prototype.getFileManager = function getFileManager(filename, currentDirectory, options, environment, isSync) {
    if (!filename) {
      logger.warn('getFileManager called with no filename.. Please report this issue. continuing.');
    }
    if (!currentDirectory) {
      logger.warn('getFileManager called with null directory.. Please report this issue. continuing.');
    }

    var fileManagers = this.fileManagers;
    if (options.pluginManager) {
      fileManagers = [].concat(fileManagers).concat(options.pluginManager.getFileManagers());
    }
    for (var i = fileManagers.length - 1; i >= 0; i--) {
      var fileManager = fileManagers[i];
      if (fileManager[isSync ? 'supportsSync' : 'supports'](filename, currentDirectory, options, environment)) {
        return fileManager;
      }
    }
    return null;
  };

  Environment.prototype.addFileManager = function addFileManager(fileManager) {
    this.fileManagers.push(fileManager);
  };

  Environment.prototype.clearFileManagers = function clearFileManagers() {
    this.fileManagers = [];
  };

  return Environment;
}();

var environment = Environment;

var sourceMapOutput = function sourceMapOutput(environment) {
  var SourceMapOutput = function () {
    function SourceMapOutput(options) {
      classCallCheck(this, SourceMapOutput);

      this._css = [];
      this._rootNode = options.rootNode;
      this._contentsMap = options.contentsMap;
      this._contentsIgnoredCharsMap = options.contentsIgnoredCharsMap;
      if (options.sourceMapFilename) {
        this._sourceMapFilename = options.sourceMapFilename.replace(/\\/g, '/');
      }
      this._outputFilename = options.outputFilename;
      this.sourceMapURL = options.sourceMapURL;
      if (options.sourceMapBasepath) {
        this._sourceMapBasepath = options.sourceMapBasepath.replace(/\\/g, '/');
      }
      if (options.sourceMapRootpath) {
        this._sourceMapRootpath = options.sourceMapRootpath.replace(/\\/g, '/');
        if (this._sourceMapRootpath.charAt(this._sourceMapRootpath.length - 1) !== '/') {
          this._sourceMapRootpath += '/';
        }
      } else {
        this._sourceMapRootpath = '';
      }
      this._outputSourceFiles = options.outputSourceFiles;
      this._sourceMapGeneratorConstructor = environment.getSourceMapGenerator();

      this._lineNumber = 0;
      this._column = 0;
    }

    SourceMapOutput.prototype.normalizeFilename = function normalizeFilename(filename) {
      filename = filename.replace(/\\/g, '/');

      if (this._sourceMapBasepath && filename.indexOf(this._sourceMapBasepath) === 0) {
        filename = filename.substring(this._sourceMapBasepath.length);
        if (filename.charAt(0) === '\\' || filename.charAt(0) === '/') {
          filename = filename.substring(1);
        }
      }
      return (this._sourceMapRootpath || '') + filename;
    };

    SourceMapOutput.prototype.add = function add(chunk, fileInfo, index, mapLines) {
      //ignore adding empty strings
      if (!chunk) {
        return;
      }

      var lines = void 0;
      var sourceLines = void 0;
      var columns = void 0;
      var sourceColumns = void 0;
      var i = void 0;

      if (fileInfo) {
        var inputSource = this._contentsMap[fileInfo.filename];

        // remove vars/banner added to the top of the file
        if (this._contentsIgnoredCharsMap[fileInfo.filename]) {
          // adjust the index
          index -= this._contentsIgnoredCharsMap[fileInfo.filename];
          if (index < 0) {
            index = 0;
          }
          // adjust the source
          inputSource = inputSource.slice(this._contentsIgnoredCharsMap[fileInfo.filename]);
        }
        inputSource = inputSource.substring(0, index);
        sourceLines = inputSource.split('\n');
        sourceColumns = sourceLines[sourceLines.length - 1];
      }

      lines = chunk.split('\n');
      columns = lines[lines.length - 1];

      if (fileInfo) {
        if (!mapLines) {
          this._sourceMapGenerator.addMapping({
            generated: { line: this._lineNumber + 1, column: this._column },
            original: {
              line: sourceLines.length,
              column: sourceColumns.length
            },
            source: this.normalizeFilename(fileInfo.filename)
          });
        } else {
          for (i = 0; i < lines.length; i++) {
            this._sourceMapGenerator.addMapping({
              generated: {
                line: this._lineNumber + i + 1,
                column: i === 0 ? this._column : 0
              },
              original: {
                line: sourceLines.length + i,
                column: i === 0 ? sourceColumns.length : 0
              },
              source: this.normalizeFilename(fileInfo.filename)
            });
          }
        }
      }

      if (lines.length === 1) {
        this._column += columns.length;
      } else {
        this._lineNumber += lines.length - 1;
        this._column = columns.length;
      }

      this._css.push(chunk);
    };

    SourceMapOutput.prototype.isEmpty = function isEmpty() {
      return this._css.length === 0;
    };

    SourceMapOutput.prototype.toCSS = function toCSS(context) {
      this._sourceMapGenerator = new this._sourceMapGeneratorConstructor({
        file: this._outputFilename,
        sourceRoot: null
      });

      if (this._outputSourceFiles) {
        for (var filename in this._contentsMap) {
          if (this._contentsMap.hasOwnProperty(filename)) {
            var source = this._contentsMap[filename];
            if (this._contentsIgnoredCharsMap[filename]) {
              source = source.slice(this._contentsIgnoredCharsMap[filename]);
            }
            this._sourceMapGenerator.setSourceContent(this.normalizeFilename(filename), source);
          }
        }
      }

      this._rootNode.genCSS(context, this);

      if (this._css.length > 0) {
        var sourceMapURL = void 0;
        var sourceMapContent = JSON.stringify(this._sourceMapGenerator.toJSON());

        if (this.sourceMapURL) {
          sourceMapURL = this.sourceMapURL;
        } else if (this._sourceMapFilename) {
          sourceMapURL = this._sourceMapFilename;
        }
        this.sourceMapURL = sourceMapURL;

        this.sourceMap = sourceMapContent;
      }

      return this._css.join('');
    };

    return SourceMapOutput;
  }();

  return SourceMapOutput;
};

var sourceMapBuilder = function sourceMapBuilder(SourceMapOutput, environment) {
  var SourceMapBuilder = function () {
    function SourceMapBuilder(options) {
      classCallCheck(this, SourceMapBuilder);

      this.options = options;
    }

    SourceMapBuilder.prototype.toCSS = function toCSS(rootNode, options, imports) {
      var sourceMapOutput = new SourceMapOutput({
        contentsIgnoredCharsMap: imports.contentsIgnoredChars,
        rootNode: rootNode,
        contentsMap: imports.contents,
        sourceMapFilename: this.options.sourceMapFilename,
        sourceMapURL: this.options.sourceMapURL,
        outputFilename: this.options.sourceMapOutputFilename,
        sourceMapBasepath: this.options.sourceMapBasepath,
        sourceMapRootpath: this.options.sourceMapRootpath,
        outputSourceFiles: this.options.outputSourceFiles,
        sourceMapGenerator: this.options.sourceMapGenerator,
        sourceMapFileInline: this.options.sourceMapFileInline
      });

      var css = sourceMapOutput.toCSS(options);
      this.sourceMap = sourceMapOutput.sourceMap;
      this.sourceMapURL = sourceMapOutput.sourceMapURL;
      if (this.options.sourceMapInputFilename) {
        this.sourceMapInputFilename = sourceMapOutput.normalizeFilename(this.options.sourceMapInputFilename);
      }
      return css + this.getCSSAppendage();
    };

    SourceMapBuilder.prototype.getCSSAppendage = function getCSSAppendage() {
      var sourceMapURL = this.sourceMapURL;
      if (this.options.sourceMapFileInline) {
        if (this.sourceMap === undefined) {
          return '';
        }
        sourceMapURL = 'data:application/json;base64,' + environment.encodeBase64(this.sourceMap);
      }

      if (sourceMapURL) {
        return '/*# sourceMappingURL=' + sourceMapURL + ' */';
      }
      return '';
    };

    SourceMapBuilder.prototype.getExternalSourceMap = function getExternalSourceMap() {
      return this.sourceMap;
    };

    SourceMapBuilder.prototype.setExternalSourceMap = function setExternalSourceMap(sourceMap) {
      this.sourceMap = sourceMap;
    };

    SourceMapBuilder.prototype.isInline = function isInline() {
      return this.options.sourceMapFileInline;
    };

    SourceMapBuilder.prototype.getSourceMapURL = function getSourceMapURL() {
      return this.sourceMapURL;
    };

    SourceMapBuilder.prototype.getOutputFilename = function getOutputFilename() {
      return this.options.sourceMapOutputFilename;
    };

    SourceMapBuilder.prototype.getInputFilename = function getInputFilename() {
      return this.sourceMapInputFilename;
    };

    return SourceMapBuilder;
  }();

  return SourceMapBuilder;
};

function createCommonjsModule(fn, module) {
	return module = { exports: {} }, fn(module, module.exports), module.exports;
}

var utils = {
  getLocation: function getLocation(index, inputStream) {
    var n = index + 1;
    var line = null;
    var column = -1;

    while (--n >= 0 && inputStream.charAt(n) !== '\n') {
      column++;
    }

    if (typeof index === 'number') {
      line = (inputStream.slice(0, index).match(/\n/g) || '').length;
    }

    return {
      line: line,
      column: column
    };
  }
};

var lessError = createCommonjsModule(function (module) {
  var LessError = module.exports = function LessError(e, importManager, currentFilename) {
    Error.call(this);

    var filename = e.filename || currentFilename;

    if (importManager && filename) {
      var input = importManager.contents[filename];
      var loc = utils.getLocation(e.index, input);
      var line = loc.line;
      var col = loc.column;
      var callLine = e.call && utils.getLocation(e.call, input).line;
      var lines = input.split('\n');

      this.type = e.type || 'Syntax';
      this.filename = filename;
      this.index = e.index;
      this.line = typeof line === 'number' ? line + 1 : null;
      this.callLine = callLine + 1;
      this.callExtract = lines[callLine];
      this.column = col;
      this.extract = [lines[line - 1], lines[line], lines[line + 1]];
    }
    this.message = e.message;
    this.stack = e.stack;
  };

  if (typeof Object.create === 'undefined') {
    var F = function F() {};
    F.prototype = Error.prototype;
    LessError.prototype = new F();
  } else {
    LessError.prototype = Object.create(Error.prototype);
  }

  LessError.prototype.constructor = LessError;
});

var contexts = {};
var contexts_1 = contexts;

var copyFromOriginal = function copyFromOriginal(original, destination, propertiesToCopy) {
  if (!original) {
    return;
  }

  for (var i = 0; i < propertiesToCopy.length; i++) {
    if (original.hasOwnProperty(propertiesToCopy[i])) {
      destination[propertiesToCopy[i]] = original[propertiesToCopy[i]];
    }
  }
};

/*
 parse is used whilst parsing
 */
var parseCopyProperties = [
// options
'paths', // option - unmodified - paths to search for imports on
'relativeUrls', // option - whether to adjust URL's to be relative
'rootpath', // option - rootpath to append to URL's
'strictImports', // option -
'insecure', // option - whether to allow imports from insecure ssl hosts
'dumpLineNumbers', // option - whether to dump line numbers
'compress', // option - whether to compress
'syncImport', // option - whether to import synchronously
'chunkInput', // option - whether to chunk input. more performant but causes parse issues.
'mime', // browser only - mime type for sheet import
'useFileCache', // browser only - whether to use the per file session cache
// context
'processImports', // option & context - whether to process imports. if false then imports will not be imported.
// Used by the import manager to stop multiple import visitors being created.
'pluginManager'];

contexts.Parse = function (options) {
  copyFromOriginal(options, this, parseCopyProperties);

  if (typeof this.paths === 'string') {
    this.paths = [this.paths];
  }
};

var evalCopyProperties = ['paths', // additional include paths
'compress', // whether to compress
'ieCompat', // whether to enforce IE compatibility (IE8 data-uri)
'strictMath', // whether math has to be within parenthesis
'strictUnits', // whether units need to evaluate correctly
'sourceMap', // whether to output a source map
'importMultiple', // whether we are currently importing multiple copies
'urlArgs', // whether to add args into url tokens
'javascriptEnabled', // option - whether JavaScript is enabled. if undefined, defaults to true
'pluginManager', // Used as the plugin manager for the session
'importantScope', // used to bubble up !important statements,
'simplify', //Simplify less
'simplifyFilter'];

contexts.Eval = function (options, frames) {
  copyFromOriginal(options, this, evalCopyProperties);

  if (typeof this.paths === 'string') {
    this.paths = [this.paths];
  }

  this.frames = frames || [];
  this.importantScope = this.importantScope || [];
};

contexts.Eval.prototype.inParenthesis = function () {
  if (!this.parensStack) {
    this.parensStack = [];
  }
  this.parensStack.push(true);
};

contexts.Eval.prototype.outOfParenthesis = function () {
  this.parensStack.pop();
};

contexts.Eval.prototype.isInParens = function () {
  return !!(this.parensStack && this.parensStack.length > 0);
};

contexts.Eval.prototype.isMathOn = function () {
  return this.strictMath ? this.isInParens() : true;
};

contexts.Eval.prototype.isPathRelative = function (path) {
  return !/^(?:[a-z-]+:|\/|#)/i.test(path);
};

contexts.Eval.prototype.normalizePath = function (path) {
  var segments = path.split('/').reverse();
  var segment = void 0;

  path = [];
  while (segments.length !== 0) {
    segment = segments.pop();
    switch (segment) {
      case '.':
        break;
      case '..':
        if (path.length === 0 || path[path.length - 1] === '..') {
          path.push(segment);
        } else {
          path.pop();
        }
        break;
      default:
        path.push(segment);
        break;
    }
  }

  return path.join('/');
};

//todo - do the same for the toCSS ?

var Node = function () {
  function Node() {
    classCallCheck(this, Node);
  }

  Node.prototype.toCSS = function toCSS(context) {
    var strs = [];
    this.genCSS(context, {
      add: function add(chunk, fileInfo, index) {
        strs.push(chunk);
      },
      isEmpty: function isEmpty() {
        return strs.length === 0;
      }
    });
    return strs.join('');
  };

  Node.prototype.genCSS = function genCSS(context, output) {
    output.add(this.value);
  };

  Node.prototype.accept = function accept(visitor) {
    this.value = visitor.visit(this.value);
  };

  Node.prototype.eval = function _eval() {
    return this;
  };

  Node.prototype._operate = function _operate(context, op, a, b) {
    switch (op) {
      case '+':
        return a + b;
      case '-':
        return a - b;
      case '*':
        return a * b;
      case '/':
        return a / b;
    }
  };

  Node.prototype.fround = function fround(context, value) {
    var precision = context && context.numPrecision;
    //add "epsilon" to ensure numbers like 1.000000005 (represented as 1.000000004999....) are properly rounded...
    return precision == null ? value : Number((value + 2e-16).toFixed(precision));
  };

  // Returns true if this node represents root of ast imported by reference


  Node.prototype.blocksVisibility = function blocksVisibility() {
    if (this.visibilityBlocks == null) {
      this.visibilityBlocks = 0;
    }
    return this.visibilityBlocks !== 0;
  };

  Node.prototype.addVisibilityBlock = function addVisibilityBlock() {
    if (this.visibilityBlocks == null) {
      this.visibilityBlocks = 0;
    }
    this.visibilityBlocks = this.visibilityBlocks + 1;
  };

  Node.prototype.removeVisibilityBlock = function removeVisibilityBlock() {
    if (this.visibilityBlocks == null) {
      this.visibilityBlocks = 0;
    }
    this.visibilityBlocks = this.visibilityBlocks - 1;
  };

  //Turns on node visibility - if called node will be shown in output regardless
  //of whether it comes from import by reference or not


  Node.prototype.ensureVisibility = function ensureVisibility() {
    this.nodeVisible = true;
  };

  //Turns off node visibility - if called node will NOT be shown in output regardless
  //of whether it comes from import by reference or not


  Node.prototype.ensureInvisibility = function ensureInvisibility() {
    this.nodeVisible = false;
  };

  // return values:
  // false - the node must not be visible
  // true - the node must be visible
  // undefined or null - the node has the same visibility as its parent


  Node.prototype.isVisible = function isVisible() {
    return this.nodeVisible;
  };

  Node.prototype.visibilityInfo = function visibilityInfo() {
    return {
      visibilityBlocks: this.visibilityBlocks,
      nodeVisible: this.nodeVisible
    };
  };

  Node.prototype.copyVisibilityInfo = function copyVisibilityInfo(info) {
    if (!info) {
      return;
    }
    this.visibilityBlocks = info.visibilityBlocks;
    this.nodeVisible = info.nodeVisible;
  };

  return Node;
}();

Node.compare = function (a, b) {
  /* returns:
     -1: a < b
     0: a = b
     1: a > b
     and *any* other value for a != b (e.g. undefined, NaN, -2 etc.) */

  if (a.compare &&
  // for "symmetric results" force toCSS-based comparison
  // of Quoted or Anonymous if either value is one of those
  !(b.type === 'Quoted' || b.type === 'Anonymous')) {
    return a.compare(b);
  } else if (b.compare) {
    return -b.compare(a);
  } else if (a.type !== b.type) {
    return undefined;
  }

  a = a.value;
  b = b.value;
  if (!Array.isArray(a)) {
    return a === b ? 0 : undefined;
  }
  if (a.length !== b.length) {
    return undefined;
  }
  for (var i = 0; i < a.length; i++) {
    if (Node.compare(a[i], b[i]) !== 0) {
      return undefined;
    }
  }
  return 0;
};

Node.numericCompare = function (a, b) {
  return a < b ? -1 : a === b ? 0 : a > b ? 1 : undefined;
};
var node = Node;

var Alpha = function (_Node) {
  inherits(Alpha, _Node);

  function Alpha(val) {
    classCallCheck(this, Alpha);

    var _this = possibleConstructorReturn(this, _Node.call(this));

    _this.value = val;
    return _this;
  }

  Alpha.prototype.accept = function accept(visitor) {
    this.value = visitor.visit(this.value);
  };

  Alpha.prototype.eval = function _eval(context) {
    if (this.value.eval) {
      return new Alpha(this.value.eval(context));
    }
    return this;
  };

  Alpha.prototype.genCSS = function genCSS(context, output) {
    output.add('alpha(opacity=');

    if (this.value.genCSS) {
      this.value.genCSS(context, output);
    } else {
      output.add(this.value);
    }

    output.add(')');
  };

  return Alpha;
}(node);

Alpha.prototype.type = 'Alpha';

var alpha = Alpha;

var colors = {
  aliceblue: '#f0f8ff',
  antiquewhite: '#faebd7',
  aqua: '#00ffff',
  aquamarine: '#7fffd4',
  azure: '#f0ffff',
  beige: '#f5f5dc',
  bisque: '#ffe4c4',
  black: '#000000',
  blanchedalmond: '#ffebcd',
  blue: '#0000ff',
  blueviolet: '#8a2be2',
  brown: '#a52a2a',
  burlywood: '#deb887',
  cadetblue: '#5f9ea0',
  chartreuse: '#7fff00',
  chocolate: '#d2691e',
  coral: '#ff7f50',
  cornflowerblue: '#6495ed',
  cornsilk: '#fff8dc',
  crimson: '#dc143c',
  cyan: '#00ffff',
  darkblue: '#00008b',
  darkcyan: '#008b8b',
  darkgoldenrod: '#b8860b',
  darkgray: '#a9a9a9',
  darkgrey: '#a9a9a9',
  darkgreen: '#006400',
  darkkhaki: '#bdb76b',
  darkmagenta: '#8b008b',
  darkolivegreen: '#556b2f',
  darkorange: '#ff8c00',
  darkorchid: '#9932cc',
  darkred: '#8b0000',
  darksalmon: '#e9967a',
  darkseagreen: '#8fbc8f',
  darkslateblue: '#483d8b',
  darkslategray: '#2f4f4f',
  darkslategrey: '#2f4f4f',
  darkturquoise: '#00ced1',
  darkviolet: '#9400d3',
  deeppink: '#ff1493',
  deepskyblue: '#00bfff',
  dimgray: '#696969',
  dimgrey: '#696969',
  dodgerblue: '#1e90ff',
  firebrick: '#b22222',
  floralwhite: '#fffaf0',
  forestgreen: '#228b22',
  fuchsia: '#ff00ff',
  gainsboro: '#dcdcdc',
  ghostwhite: '#f8f8ff',
  gold: '#ffd700',
  goldenrod: '#daa520',
  gray: '#808080',
  grey: '#808080',
  green: '#008000',
  greenyellow: '#adff2f',
  honeydew: '#f0fff0',
  hotpink: '#ff69b4',
  indianred: '#cd5c5c',
  indigo: '#4b0082',
  ivory: '#fffff0',
  khaki: '#f0e68c',
  lavender: '#e6e6fa',
  lavenderblush: '#fff0f5',
  lawngreen: '#7cfc00',
  lemonchiffon: '#fffacd',
  lightblue: '#add8e6',
  lightcoral: '#f08080',
  lightcyan: '#e0ffff',
  lightgoldenrodyellow: '#fafad2',
  lightgray: '#d3d3d3',
  lightgrey: '#d3d3d3',
  lightgreen: '#90ee90',
  lightpink: '#ffb6c1',
  lightsalmon: '#ffa07a',
  lightseagreen: '#20b2aa',
  lightskyblue: '#87cefa',
  lightslategray: '#778899',
  lightslategrey: '#778899',
  lightsteelblue: '#b0c4de',
  lightyellow: '#ffffe0',
  lime: '#00ff00',
  limegreen: '#32cd32',
  linen: '#faf0e6',
  magenta: '#ff00ff',
  maroon: '#800000',
  mediumaquamarine: '#66cdaa',
  mediumblue: '#0000cd',
  mediumorchid: '#ba55d3',
  mediumpurple: '#9370d8',
  mediumseagreen: '#3cb371',
  mediumslateblue: '#7b68ee',
  mediumspringgreen: '#00fa9a',
  mediumturquoise: '#48d1cc',
  mediumvioletred: '#c71585',
  midnightblue: '#191970',
  mintcream: '#f5fffa',
  mistyrose: '#ffe4e1',
  moccasin: '#ffe4b5',
  navajowhite: '#ffdead',
  navy: '#000080',
  oldlace: '#fdf5e6',
  olive: '#808000',
  olivedrab: '#6b8e23',
  orange: '#ffa500',
  orangered: '#ff4500',
  orchid: '#da70d6',
  palegoldenrod: '#eee8aa',
  palegreen: '#98fb98',
  paleturquoise: '#afeeee',
  palevioletred: '#d87093',
  papayawhip: '#ffefd5',
  peachpuff: '#ffdab9',
  peru: '#cd853f',
  pink: '#ffc0cb',
  plum: '#dda0dd',
  powderblue: '#b0e0e6',
  purple: '#800080',
  rebeccapurple: '#663399',
  red: '#ff0000',
  rosybrown: '#bc8f8f',
  royalblue: '#4169e1',
  saddlebrown: '#8b4513',
  salmon: '#fa8072',
  sandybrown: '#f4a460',
  seagreen: '#2e8b57',
  seashell: '#fff5ee',
  sienna: '#a0522d',
  silver: '#c0c0c0',
  skyblue: '#87ceeb',
  slateblue: '#6a5acd',
  slategray: '#708090',
  slategrey: '#708090',
  snow: '#fffafa',
  springgreen: '#00ff7f',
  steelblue: '#4682b4',
  tan: '#d2b48c',
  teal: '#008080',
  thistle: '#d8bfd8',
  tomato: '#ff6347',
  turquoise: '#40e0d0',
  violet: '#ee82ee',
  wheat: '#f5deb3',
  white: '#ffffff',
  whitesmoke: '#f5f5f5',
  yellow: '#ffff00',
  yellowgreen: '#9acd32'
};

//
// RGB Colors - #ff0014, #eee
//

var Color = function (_Node) {
  inherits(Color, _Node);

  function Color(rgb, a, originalForm) {
    classCallCheck(this, Color);

    //
    // The end goal here, is to parse the arguments
    // into an integer triplet, such as `128, 255, 0`
    //
    // This facilitates operations and conversions.
    //
    var _this = possibleConstructorReturn(this, _Node.call(this));

    if (Array.isArray(rgb)) {
      _this.rgb = rgb;
    } else if (rgb.length == 6) {
      _this.rgb = rgb.match(/.{2}/g).map(function (c) {
        return parseInt(c, 16);
      });
    } else {
      _this.rgb = rgb.split('').map(function (c) {
        return parseInt(c + c, 16);
      });
    }
    _this.alpha = typeof a === 'number' ? a : 1;
    if (typeof originalForm !== 'undefined') {
      _this.value = originalForm;
    }
    return _this;
  }

  Color.prototype.luma = function luma() {
    var r = this.rgb[0] / 255;
    var g = this.rgb[1] / 255;
    var b = this.rgb[2] / 255;

    r = r <= 0.03928 ? r / 12.92 : Math.pow((r + 0.055) / 1.055, 2.4);
    g = g <= 0.03928 ? g / 12.92 : Math.pow((g + 0.055) / 1.055, 2.4);
    b = b <= 0.03928 ? b / 12.92 : Math.pow((b + 0.055) / 1.055, 2.4);

    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };

  Color.prototype.genCSS = function genCSS(context, output) {
    output.add(this.toCSS(context));
  };

  Color.prototype.toCSS = function toCSS(context, doNotCompress) {
    var compress = context && context.compress && !doNotCompress;
    var color = void 0;
    var alpha = void 0;

    // `value` is set if this color was originally
    // converted from a named color string so we need
    // to respect this and try to output named color too.
    if (this.value) {
      return this.value;
    }

    // If we have some transparency, the only way to represent it
    // is via `rgba`. Otherwise, we use the hex representation,
    // which has better compatibility with older browsers.
    // Values are capped between `0` and `255`, rounded and zero-padded.
    alpha = this.fround(context, this.alpha);
    if (alpha < 1) {
      return 'rgba(' + this.rgb.map(function (c) {
        return clamp(Math.round(c), 255);
      }).concat(clamp(alpha, 1)).join(',' + (compress ? '' : ' ')) + ')';
    }

    color = this.toRGB();

    if (compress) {
      var splitcolor = color.split('');

      // Convert color to short format
      if (splitcolor[1] === splitcolor[2] && splitcolor[3] === splitcolor[4] && splitcolor[5] === splitcolor[6]) {
        color = '#' + splitcolor[1] + splitcolor[3] + splitcolor[5];
      }
    }

    return color;
  };

  //
  // Operations have to be done per-channel, if not,
  // channels will spill onto each other. Once we have
  // our result, in the form of an integer triplet,
  // we create a new Color node to hold the result.
  //


  Color.prototype.operate = function operate(context, op, other) {
    var rgb = [];
    var alpha = this.alpha * (1 - other.alpha) + other.alpha;
    for (var c = 0; c < 3; c++) {
      rgb[c] = this._operate(context, op, this.rgb[c], other.rgb[c]);
    }
    return new Color(rgb, alpha);
  };

  Color.prototype.toRGB = function toRGB() {
    return toHex(this.rgb);
  };

  Color.prototype.toHSL = function toHSL() {
    var r = this.rgb[0] / 255;
    var g = this.rgb[1] / 255;
    var b = this.rgb[2] / 255;
    var a = this.alpha;
    var max = Math.max(r, g, b);
    var min = Math.min(r, g, b);
    var h = void 0;
    var s = void 0;
    var l = (max + min) / 2;
    var d = max - min;

    if (max === min) {
      h = s = 0;
    } else {
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

      switch (max) {
        case r:
          h = (g - b) / d + (g < b ? 6 : 0);
          break;
        case g:
          h = (b - r) / d + 2;
          break;
        case b:
          h = (r - g) / d + 4;
          break;
      }
      h /= 6;
    }
    return { h: h * 360, s: s, l: l, a: a };
  };

  //Adapted from http://mjijackson.com/2008/02/rgb-to-hsl-and-rgb-to-hsv-color-model-conversion-algorithms-in-javascript


  Color.prototype.toHSV = function toHSV() {
    var r = this.rgb[0] / 255;
    var g = this.rgb[1] / 255;
    var b = this.rgb[2] / 255;
    var a = this.alpha;
    var max = Math.max(r, g, b);
    var min = Math.min(r, g, b);
    var h = void 0;
    var s = void 0;
    var v = max;

    var d = max - min;
    if (max === 0) {
      s = 0;
    } else {
      s = d / max;
    }

    if (max === min) {
      h = 0;
    } else {
      switch (max) {
        case r:
          h = (g - b) / d + (g < b ? 6 : 0);
          break;
        case g:
          h = (b - r) / d + 2;
          break;
        case b:
          h = (r - g) / d + 4;
          break;
      }
      h /= 6;
    }
    return { h: h * 360, s: s, v: v, a: a };
  };

  Color.prototype.toARGB = function toARGB() {
    return toHex([this.alpha * 255].concat(this.rgb));
  };

  Color.prototype.compare = function compare(x) {
    return x.rgb && x.rgb[0] === this.rgb[0] && x.rgb[1] === this.rgb[1] && x.rgb[2] === this.rgb[2] && x.alpha === this.alpha ? 0 : undefined;
  };

  return Color;
}(node);

Color.prototype.type = 'Color';

function clamp(v, max) {
  return Math.min(Math.max(v, 0), max);
}

function toHex(v) {
  return '#' + v.map(function (c) {
    c = clamp(Math.round(c), 255);
    return (c < 16 ? '0' : '') + c.toString(16);
  }).join('');
}

Color.fromKeyword = function (keyword) {
  var c = void 0;
  var key = keyword.toLowerCase();
  if (colors.hasOwnProperty(key)) {
    c = new Color(colors[key].slice(1));
  } else if (key === 'transparent') {
    c = new Color([0, 0, 0], 0);
  }

  if (c) {
    c.value = keyword;
    return c;
  }
};
var color = Color;

var Paren = function (_Node) {
  inherits(Paren, _Node);

  function Paren(node$$1) {
    classCallCheck(this, Paren);

    var _this = possibleConstructorReturn(this, _Node.call(this));

    _this.value = node$$1;
    return _this;
  }

  Paren.prototype.genCSS = function genCSS(context, output) {
    output.add('(');
    this.value.genCSS(context, output);
    output.add(')');
  };

  Paren.prototype.eval = function _eval(context) {
    return new Paren(this.value.eval(context));
  };

  return Paren;
}(node);

Paren.prototype.type = 'Paren';
var paren = Paren;

var Combinator = function (_Node) {
  inherits(Combinator, _Node);

  function Combinator(value) {
    classCallCheck(this, Combinator);

    var _this = possibleConstructorReturn(this, _Node.call(this));

    if (value === ' ') {
      _this.value = ' ';
      _this.emptyOrWhitespace = true;
    } else {
      _this.value = value ? value.trim() : '';
      _this.emptyOrWhitespace = _this.value === '';
    }
    return _this;
  }

  Combinator.prototype.genCSS = function genCSS(context, output) {
    var spaceOrEmpty = context.compress || _noSpaceCombinators[this.value] ? '' : ' ';
    output.add(spaceOrEmpty + this.value + spaceOrEmpty);
  };

  return Combinator;
}(node);

Combinator.prototype.type = 'Combinator';
var _noSpaceCombinators = {
  '': true,
  ' ': true,
  '|': true
};
var combinator = Combinator;

var Element = function (_Node) {
  inherits(Element, _Node);

  function Element(combinator$$1, value, index, currentFileInfo, info) {
    classCallCheck(this, Element);

    var _this = possibleConstructorReturn(this, _Node.call(this));

    _this.combinator = combinator$$1 instanceof combinator ? combinator$$1 : new combinator(combinator$$1);

    if (typeof value === 'string') {
      _this.value = value.trim();
    } else if (value) {
      _this.value = value;
    } else {
      _this.value = '';
    }
    _this.index = index;
    _this.currentFileInfo = currentFileInfo;
    _this.copyVisibilityInfo(info);
    return _this;
  }

  Element.prototype.accept = function accept(visitor) {
    var value = this.value;
    this.combinator = visitor.visit(this.combinator);
    if ((typeof value === 'undefined' ? 'undefined' : _typeof(value)) === 'object') {
      this.value = visitor.visit(value);
    }
  };

  Element.prototype.eval = function _eval(context) {
    return new Element(this.combinator, this.value.eval ? this.value.eval(context) : this.value, this.index, this.currentFileInfo, this.visibilityInfo());
  };

  Element.prototype.clone = function clone() {
    return new Element(this.combinator, this.value, this.index, this.currentFileInfo, this.visibilityInfo());
  };

  Element.prototype.genCSS = function genCSS(context, output) {
    output.add(this.toCSS(context), this.currentFileInfo, this.index);
  };

  Element.prototype.toCSS = function toCSS() {
    var context = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

    var value = this.value;
    var firstSelector = context.firstSelector;
    if (value instanceof paren) {
      // selector in parens should not be affected by outer selector
      // flags (breaks only interpolated selectors - see #1973)
      context.firstSelector = true;
    }
    value = value.toCSS ? value.toCSS(context) : value;
    context.firstSelector = firstSelector;
    if (value === '' && this.combinator.value.charAt(0) === '&') {
      return '';
    } else {
      return this.combinator.toCSS(context) + value;
    }
  };

  return Element;
}(node);

Element.prototype.type = 'Element';
var element = Element;

var Selector = function (_Node) {
  inherits(Selector, _Node);

  function Selector(elements, extendList, condition, index, currentFileInfo, visibilityInfo) {
    classCallCheck(this, Selector);

    var _this = possibleConstructorReturn(this, _Node.call(this));

    _this.elements = elements;
    _this.extendList = extendList;
    _this.condition = condition;
    _this.currentFileInfo = currentFileInfo || {};
    if (!condition) {
      _this.evaldCondition = true;
    }
    _this.copyVisibilityInfo(visibilityInfo);
    return _this;
  }

  Selector.prototype.accept = function accept(visitor) {
    if (this.elements) {
      this.elements = visitor.visitArray(this.elements);
    }
    if (this.extendList) {
      this.extendList = visitor.visitArray(this.extendList);
    }
    if (this.condition) {
      this.condition = visitor.visit(this.condition);
    }
  };

  Selector.prototype.createDerived = function createDerived(elements, extendList, evaldCondition) {
    var info = this.visibilityInfo();
    evaldCondition = evaldCondition != null ? evaldCondition : this.evaldCondition;
    var newSelector = new Selector(elements, extendList || this.extendList, null, this.index, this.currentFileInfo, info);
    newSelector.evaldCondition = evaldCondition;
    newSelector.mediaEmpty = this.mediaEmpty;
    return newSelector;
  };

  Selector.prototype.createEmptySelectors = function createEmptySelectors() {
    var el = new element('', '&', this.index, this.currentFileInfo);
    var sels = [new Selector([el], null, null, this.index, this.currentFileInfo)];
    sels[0].mediaEmpty = true;
    return sels;
  };

  Selector.prototype.match = function match(other) {
    var elements = this.elements;
    var len = elements.length;
    var olen = void 0;
    var i = void 0;

    other.CacheElements();

    olen = other._elements.length;
    if (olen === 0 || len < olen) {
      return 0;
    } else {
      for (i = 0; i < olen; i++) {
        if (elements[i].value !== other._elements[i]) {
          return 0;
        }
      }
    }

    return olen; // return number of matched elements
  };

  Selector.prototype.CacheElements = function CacheElements() {
    if (this._elements) {
      return;
    }

    var elements = this.elements.map(function (v) {
      return v.combinator.value + (v.value.value || v.value);
    }).join('').match(/[,&#\*\.\w-]([\w-]|(\\.))*/g);

    if (elements) {
      if (elements[0] === '&') {
        elements.shift();
      }
    } else {
      elements = [];
    }

    this._elements = elements;
  };

  Selector.prototype.isJustParentSelector = function isJustParentSelector() {
    return !this.mediaEmpty && this.elements.length === 1 && this.elements[0].value === '&' && (this.elements[0].combinator.value === ' ' || this.elements[0].combinator.value === '');
  };

  Selector.prototype.eval = function _eval(context) {
    var evaldCondition = this.condition && this.condition.eval(context);
    var elements = this.elements;
    var extendList = this.extendList;

    elements = elements && elements.map(function (e) {
      return e.eval(context);
    });
    extendList = extendList && extendList.map(function (extend) {
      return extend.eval(context);
    });

    return this.createDerived(elements, extendList, evaldCondition);
  };

  Selector.prototype.genCSS = function genCSS(context, output) {
    var i = void 0;
    var element$$1 = void 0;
    if ((!context || !context.firstSelector) && this.elements[0].combinator.value === '') {
      output.add(' ', this.currentFileInfo, this.index);
    }
    if (!this._css) {
      //TODO caching? speed comparison?
      for (i = 0; i < this.elements.length; i++) {
        element$$1 = this.elements[i];
        element$$1.genCSS(context, output);
      }
    }
  };

  Selector.prototype.getIsOutput = function getIsOutput() {
    return this.evaldCondition;
  };

  return Selector;
}(node);

Selector.prototype.type = 'Selector';
var selector = Selector;

var Value = function (_Node) {
  inherits(Value, _Node);

  function Value(value) {
    classCallCheck(this, Value);

    var _this = possibleConstructorReturn(this, _Node.call(this));

    _this.value = value;
    if (!value) {
      throw new Error('Value requires an array argument');
    }
    return _this;
  }

  Value.prototype.accept = function accept(visitor) {
    if (this.value) {
      this.value = visitor.visitArray(this.value);
    }
  };

  Value.prototype.eval = function _eval(context) {
    if (this.value.length === 1) {
      return this.value[0].eval(context);
    } else {
      return new Value(this.value.map(function (v) {
        return v.eval(context);
      }));
    }
  };

  Value.prototype.genCSS = function genCSS(context, output) {
    var i = void 0;
    for (i = 0; i < this.value.length; i++) {
      this.value[i].genCSS(context, output);
      if (i + 1 < this.value.length) {
        output.add(context && context.compress ? ',' : ', ');
      }
    }
  };

  return Value;
}(node);

Value.prototype.type = 'Value';
var value = Value;

var Keyword = function (_Node) {
  inherits(Keyword, _Node);

  function Keyword(value) {
    classCallCheck(this, Keyword);

    var _this = possibleConstructorReturn(this, _Node.call(this));

    _this.value = value;
    return _this;
  }

  Keyword.prototype.genCSS = function genCSS(context, output) {
    if (this.value === '%') {
      throw { type: 'Syntax', message: 'Invalid % without number' };
    }
    output.add(this.value);
  };

  return Keyword;
}(node);

Keyword.prototype.type = 'Keyword';

Keyword.True = new Keyword('true');
Keyword.False = new Keyword('false');

var keyword = Keyword;

var Rule = function (_Node) {
  inherits(Rule, _Node);

  function Rule(name, value$$1, important, merge, index, currentFileInfo, inline, variable) {
    classCallCheck(this, Rule);

    var _this = possibleConstructorReturn(this, _Node.call(this));

    _this.name = name;
    _this.value = value$$1 instanceof node ? value$$1 : new value([value$$1]); //value instanceof tree.Value || value instanceof tree.Ruleset ??
    _this.important = important ? ' ' + important.trim() : '';
    _this.merge = merge;
    _this.index = index;
    _this.currentFileInfo = currentFileInfo;
    _this.inline = inline || false;
    _this.variable = variable !== undefined ? variable : name.charAt && name.charAt(0) === '@';
    _this.allowRoot = true;
    return _this;
  }

  Rule.prototype.genCSS = function genCSS(context, output) {
    output.add(this.name + (context.compress ? ':' : ': '), this.currentFileInfo, this.index);
    try {
      this.value.genCSS(context, output);
    } catch (e) {
      e.index = this.index;
      e.filename = this.currentFileInfo.filename;
      throw e;
    }
    output.add(this.important + (this.inline || context.lastRule && context.compress ? '' : ';'), this.currentFileInfo, this.index);
  };

  Rule.prototype.eval = function _eval(context) {
    var strictMathBypass = false;
    var name = this.name;
    var evaldValue = void 0;
    var variable = this.variable;
    if (typeof name !== 'string') {
      // expand 'primitive' name directly to get
      // things faster (~10% for benchmark.less):
      name = name.length === 1 && name[0] instanceof keyword ? name[0].value : evalName(context, name);
      variable = false; // never treat expanded interpolation as new variable name
    }
    if (name === 'font' && !context.strictMath) {
      strictMathBypass = true;
      context.strictMath = true;
    }
    try {
      context.importantScope.push({});
      evaldValue = this.value.eval(context);

      if (!this.variable && evaldValue.type === 'DetachedRuleset') {
        throw {
          message: 'Rulesets cannot be evaluated on a property.',
          index: this.index,
          filename: this.currentFileInfo.filename
        };
      }
      var important = this.important;
      var importantResult = context.importantScope.pop();
      if (!important && importantResult.important) {
        important = importantResult.important;
      }

      return new Rule(name, evaldValue, important, this.merge, this.index, this.currentFileInfo, this.inline, variable);
    } catch (e) {
      if (typeof e.index !== 'number') {
        e.index = this.index;
        e.filename = this.currentFileInfo.filename;
      }
      throw e;
    } finally {
      if (strictMathBypass) {
        context.strictMath = false;
      }
    }
  };

  Rule.prototype.makeImportant = function makeImportant() {
    return new Rule(this.name, this.value, '!important', this.merge, this.index, this.currentFileInfo, this.inline);
  };

  return Rule;
}(node);

function evalName(context, name) {
  var value$$1 = '';
  var i = void 0;
  var n = name.length;
  var output = {
    add: function add(s) {
      value$$1 += s;
    }
  };
  for (i = 0; i < n; i++) {
    name[i].eval(context).genCSS(context, output);
  }
  return value$$1;
}

Rule.prototype.type = 'Rule';

var rule = Rule;

function makeRegistry(base) {
  return {
    _data: {},
    add: function add(name, func) {
      // precautionary case conversion, as later querying of
      // the registry by function-caller uses lower case as well.
      name = name.toLowerCase();

      if (this._data.hasOwnProperty(name)) {
        //TODO warn
      }
      this._data[name] = func;
    },
    addMultiple: function addMultiple(functions) {
      var _this = this;

      Object.keys(functions).forEach(function (name) {
        _this.add(name, functions[name]);
      });
    },
    get: function get(name) {
      return this._data[name] || base && base.get(name);
    },
    inherit: function inherit() {
      return makeRegistry(this);
    }
  };
}

var functionRegistry = makeRegistry(null);

var defaultFunc = {
  eval: function _eval() {
    var v = this.value_;
    var e = this.error_;
    if (e) {
      throw e;
    }
    if (v != null) {
      return v ? keyword.True : keyword.False;
    }
  },
  value: function value(v) {
    this.value_ = v;
  },
  error: function error(e) {
    this.error_ = e;
  },
  reset: function reset() {
    this.value_ = this.error_ = null;
  }
};

functionRegistry.add('default', defaultFunc.eval.bind(defaultFunc));

var _default = defaultFunc;

var debugInfo = function debugInfo(context, ctx, lineSeparator) {
  var result = '';
  if (context.dumpLineNumbers && !context.compress) {
    switch (context.dumpLineNumbers) {
      case 'comments':
        result = debugInfo.asComment(ctx);
        break;
      case 'mediaquery':
        result = debugInfo.asMediaQuery(ctx);
        break;
      case 'all':
        result = debugInfo.asComment(ctx) + (lineSeparator || '') + debugInfo.asMediaQuery(ctx);
        break;
    }
  }
  return result;
};

debugInfo.asComment = function (ctx) {
  return '/* line ' + ctx.debugInfo.lineNumber + ', ' + ctx.debugInfo.fileName + ' */\n';
};

debugInfo.asMediaQuery = function (ctx) {
  var filenameWithProtocol = ctx.debugInfo.fileName;
  if (!/^[a-z]+:\/\//i.test(filenameWithProtocol)) {
    filenameWithProtocol = 'file://' + filenameWithProtocol;
  }
  return '@media -sass-debug-info{filename{font-family:' + filenameWithProtocol.replace(/([.:\/\\])/g, function (a) {
    if (a == '\\') {
      a = '/';
    }
    return '\\' + a;
  }) + '}line{font-family:\\00003' + ctx.debugInfo.lineNumber + '}}\n';
};

var debugInfo_1 = debugInfo;

var Ruleset = function (_Node) {
  inherits(Ruleset, _Node);

  function Ruleset(selectors, rules, strictImports, visibilityInfo) {
    classCallCheck(this, Ruleset);

    var _this = possibleConstructorReturn(this, _Node.call(this));

    _this.selectors = selectors;
    _this.rules = rules;
    _this._lookups = {};
    _this.strictImports = strictImports;
    _this.copyVisibilityInfo(visibilityInfo);
    _this.allowRoot = true;
    return _this;
  }

  Ruleset.prototype.accept = function accept(visitor) {
    if (this.paths) {
      this.paths = visitor.visitArray(this.paths, true);
    } else if (this.selectors) {
      this.selectors = visitor.visitArray(this.selectors);
    }
    if (this.rules && this.rules.length) {
      this.rules = visitor.visitArray(this.rules);
    }
  };

  Ruleset.prototype.eval = function _eval(context) {
    var thisSelectors = this.selectors;
    var selectors = void 0;
    var selCnt = void 0;
    var selector$$1 = void 0;
    var i = void 0;
    var hasOnePassingSelector = false;

    if (thisSelectors && (selCnt = thisSelectors.length)) {
      selectors = [];
      _default.error({
        type: 'Syntax',
        message: 'it is currently only allowed in parametric mixin guards,'
      });
      for (i = 0; i < selCnt; i++) {
        selector$$1 = thisSelectors[i].eval(context);
        selectors.push(selector$$1);
        if (selector$$1.evaldCondition) {
          hasOnePassingSelector = true;
        }
      }
      _default.reset();
    } else {
      hasOnePassingSelector = true;
    }

    var rules = this.rules ? this.rules.slice(0) : null;
    var ruleset = new Ruleset(selectors, rules, this.strictImports, this.visibilityInfo());
    var rule$$1 = void 0;
    var subRule = void 0;

    ruleset.originalRuleset = this;
    ruleset.root = this.root;
    ruleset.firstRoot = this.firstRoot;
    ruleset.allowImports = this.allowImports;

    if (this.debugInfo) {
      ruleset.debugInfo = this.debugInfo;
    }

    if (!hasOnePassingSelector) {
      rules.length = 0;
    }

    // inherit a function registry from the frames stack when possible;
    // otherwise from the global registry
    ruleset.functionRegistry = function (frames) {
      var i = 0;
      var n = frames.length;
      var found = void 0;
      for (; i !== n; ++i) {
        found = frames[i].functionRegistry;
        if (found) {
          return found;
        }
      }
      return functionRegistry;
    }(context.frames).inherit();

    // push the current ruleset to the frames stack
    var ctxFrames = context.frames;
    ctxFrames.unshift(ruleset);

    // currrent selectors
    var ctxSelectors = context.selectors;
    if (!ctxSelectors) {
      context.selectors = ctxSelectors = [];
    }
    ctxSelectors.unshift(this.selectors);

    // Evaluate imports
    if (ruleset.root || ruleset.allowImports || !ruleset.strictImports) {
      ruleset.evalImports(context);
    }

    // Store the frames around mixin definitions,
    // so they can be evaluated like closures when the time comes.
    var rsRules = ruleset.rules;

    var rsRuleCnt = rsRules ? rsRules.length : 0;
    for (i = 0; i < rsRuleCnt; i++) {
      if (rsRules[i].evalFirst) {
        rsRules[i] = rsRules[i].eval(context);
      }
    }

    var mediaBlockCount = context.mediaBlocks && context.mediaBlocks.length || 0;

    // Evaluate mixin calls.
    for (i = 0; i < rsRuleCnt; i++) {
      if (rsRules[i].type === 'MixinCall') {
        /*jshint loopfunc:true */
        rules = rsRules[i].eval(context).filter(function (r) {
          if (r instanceof rule && r.variable) {
            // do not pollute the scope if the variable is
            // already there. consider returning false here
            // but we need a way to "return" variable from mixins
            return !ruleset.variable(r.name);
          }
          return true;
        });
        rsRules.splice.apply(rsRules, [i, 1].concat(rules));
        rsRuleCnt += rules.length - 1;
        i += rules.length - 1;
        ruleset.resetCache();
      } else if (rsRules[i].type === 'RulesetCall') {
        /*jshint loopfunc:true */
        rules = rsRules[i].eval(context).rules.filter(function (r) {
          if (r instanceof rule && r.variable) {
            // do not pollute the scope at all
            return false;
          }
          return true;
        });
        rsRules.splice.apply(rsRules, [i, 1].concat(rules));
        rsRuleCnt += rules.length - 1;
        i += rules.length - 1;
        ruleset.resetCache();
      }
    }

    // Evaluate everything else
    for (i = 0; i < rsRules.length; i++) {
      rule$$1 = rsRules[i];
      if (!rule$$1.evalFirst) {
        rsRules[i] = rule$$1 = rule$$1.eval ? rule$$1.eval(context) : rule$$1;
      }
    }

    // Evaluate everything else
    for (i = 0; i < rsRules.length; i++) {
      rule$$1 = rsRules[i];
      // for rulesets, check if it is a css guard and can be removed
      if (rule$$1 instanceof Ruleset && rule$$1.selectors && rule$$1.selectors.length === 1) {
        // check if it can be folded in (e.g. & where)
        if (rule$$1.selectors[0].isJustParentSelector()) {
          rsRules.splice(i--, 1);

          for (var j = 0; j < rule$$1.rules.length; j++) {
            subRule = rule$$1.rules[j];
            subRule.copyVisibilityInfo(rule$$1.visibilityInfo());
            if (!(subRule instanceof rule) || !subRule.variable) {
              rsRules.splice(++i, 0, subRule);
            }
          }
        }
      }
    }

    // Pop the stack
    ctxFrames.shift();
    ctxSelectors.shift();

    if (context.mediaBlocks) {
      for (i = mediaBlockCount; i < context.mediaBlocks.length; i++) {
        context.mediaBlocks[i].bubbleSelectors(selectors);
      }
    }

    return ruleset;
  };

  Ruleset.prototype.evalImports = function evalImports(context) {
    var rules = this.rules;
    var i = void 0;
    var importRules = void 0;
    if (!rules) {
      return;
    }

    for (i = 0; i < rules.length; i++) {
      if (rules[i].type === 'Import') {
        importRules = rules[i].eval(context);
        if (importRules && (importRules.length || importRules.length === 0)) {
          rules.splice.apply(rules, [i, 1].concat(importRules));
          i += importRules.length - 1;
        } else {
          rules.splice(i, 1, importRules);
        }
        this.resetCache();
      }
    }
  };

  Ruleset.prototype.makeImportant = function makeImportant() {
    var result = new Ruleset(this.selectors, this.rules.map(function (r) {
      if (r.makeImportant) {
        return r.makeImportant();
      } else {
        return r;
      }
    }), this.strictImports, this.visibilityInfo());

    return result;
  };

  Ruleset.prototype.matchArgs = function matchArgs(args) {
    return !args || args.length === 0;
  };

  // lets you call a css selector with a guard


  Ruleset.prototype.matchCondition = function matchCondition(args, context) {
    var lastSelector = this.selectors[this.selectors.length - 1];
    if (!lastSelector.evaldCondition) {
      return false;
    }
    if (lastSelector.condition && !lastSelector.condition.eval(new contexts_1.Eval(context, context.frames))) {
      return false;
    }
    return true;
  };

  Ruleset.prototype.resetCache = function resetCache() {
    this._rulesets = null;
    this._variables = null;
    this._lookups = {};
  };

  Ruleset.prototype.variables = function variables() {
    if (!this._variables) {
      this._variables = !this.rules ? {} : this.rules.reduce(function (hash, r) {
        if (r instanceof rule && r.variable === true) {
          hash[r.name] = r;
        }
        // when evaluating variables in an import statement, imports have not been eval'd
        // so we need to go inside import statements.
        // guard against root being a string (in the case of inlined less)
        if (r.type === 'Import' && r.root && r.root.variables) {
          var vars = r.root.variables();
          for (var name in vars) {
            if (vars.hasOwnProperty(name)) {
              hash[name] = vars[name];
            }
          }
        }
        return hash;
      }, {});
    }
    return this._variables;
  };

  Ruleset.prototype.variable = function variable(name) {
    return this.variables()[name];
  };

  Ruleset.prototype.rulesets = function rulesets() {
    if (!this.rules) {
      return [];
    }

    var filtRules = [];
    var rules = this.rules;
    var cnt = rules.length;
    var i = void 0;
    var rule$$1 = void 0;

    for (i = 0; i < cnt; i++) {
      rule$$1 = rules[i];
      if (rule$$1.isRuleset) {
        filtRules.push(rule$$1);
      }
    }

    return filtRules;
  };

  Ruleset.prototype.prependRule = function prependRule(rule$$1) {
    var rules = this.rules;
    if (rules) {
      rules.unshift(rule$$1);
    } else {
      this.rules = [rule$$1];
    }
  };

  Ruleset.prototype.find = function find(selector$$1) {
    var self = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : this;
    var filter = arguments[2];

    var rules = [];
    var match = void 0;
    var foundMixins = void 0;
    var key = selector$$1.toCSS();

    if (key in this._lookups) {
      return this._lookups[key];
    }

    this.rulesets().forEach(function (rule$$1) {
      if (rule$$1 !== self) {
        for (var j = 0; j < rule$$1.selectors.length; j++) {
          match = selector$$1.match(rule$$1.selectors[j]);
          if (match) {
            if (selector$$1.elements.length > match) {
              if (!filter || filter(rule$$1)) {
                foundMixins = rule$$1.find(new selector(selector$$1.elements.slice(match)), self, filter);
                for (var i = 0; i < foundMixins.length; ++i) {
                  foundMixins[i].path.push(rule$$1);
                }
                Array.prototype.push.apply(rules, foundMixins);
              }
            } else {
              rules.push({ rule: rule$$1, path: [] });
            }
            break;
          }
        }
      }
    });
    this._lookups[key] = rules;
    return rules;
  };

  Ruleset.prototype.genCSS = function genCSS(context, output) {
    var i = void 0;
    var j = void 0;
    var charsetRuleNodes = [];
    var ruleNodes = [];

    var // Line number debugging
    debugInfo = void 0;

    var rule$$1 = void 0;
    var path = void 0;

    context.tabLevel = context.tabLevel || 0;

    if (!this.root) {
      context.tabLevel++;
    }

    var tabRuleStr = context.compress ? '' : Array(context.tabLevel + 1).join('  ');
    var tabSetStr = context.compress ? '' : Array(context.tabLevel).join('  ');
    var sep = void 0;

    function isRulesetLikeNode(rule$$1) {
      // if it has nested rules, then it should be treated like a ruleset
      // medias and comments do not have nested rules, but should be treated like rulesets anyway
      // some directives and anonymous nodes are ruleset like, others are not
      if (typeof rule$$1.isRulesetLike === 'boolean') {
        return rule$$1.isRulesetLike;
      } else if (typeof rule$$1.isRulesetLike === 'function') {
        return rule$$1.isRulesetLike();
      }

      //anything else is assumed to be a rule
      return false;
    }

    var charsetNodeIndex = 0;
    var importNodeIndex = 0;
    for (i = 0; i < this.rules.length; i++) {
      rule$$1 = this.rules[i];
      if (rule$$1.type === 'Comment') {
        if (importNodeIndex === i) {
          importNodeIndex++;
        }
        ruleNodes.push(rule$$1);
      } else if (rule$$1.isCharset && rule$$1.isCharset()) {
        ruleNodes.splice(charsetNodeIndex, 0, rule$$1);
        charsetNodeIndex++;
        importNodeIndex++;
      } else if (rule$$1.type === 'Import') {
        ruleNodes.splice(importNodeIndex, 0, rule$$1);
        importNodeIndex++;
      } else {
        ruleNodes.push(rule$$1);
      }
    }
    ruleNodes = charsetRuleNodes.concat(ruleNodes);

    // If this is the root node, we don't render
    // a selector, or {}.
    if (!this.root) {
      debugInfo = debugInfo_1(context, this, tabSetStr);

      if (debugInfo) {
        output.add(debugInfo);
        output.add(tabSetStr);
      }

      var paths = this.paths;
      var pathCnt = paths.length;
      var pathSubCnt = void 0;

      sep = context.compress ? ',' : ',\n' + tabSetStr;

      for (i = 0; i < pathCnt; i++) {
        path = paths[i];
        if (!(pathSubCnt = path.length)) {
          continue;
        }
        if (i > 0) {
          output.add(sep);
        }

        context.firstSelector = true;
        path[0].genCSS(context, output);

        context.firstSelector = false;
        for (j = 1; j < pathSubCnt; j++) {
          path[j].genCSS(context, output);
        }
      }

      output.add((context.compress ? '{' : ' {\n') + tabRuleStr);
    }

    // Compile rules and rulesets
    for (i = 0; i < ruleNodes.length; i++) {
      rule$$1 = ruleNodes[i];

      if (i + 1 === ruleNodes.length) {
        context.lastRule = true;
      }

      var currentLastRule = context.lastRule;
      if (isRulesetLikeNode(rule$$1)) {
        context.lastRule = false;
      }

      if (rule$$1.genCSS) {
        rule$$1.genCSS(context, output);
      } else if (rule$$1.value) {
        output.add(rule$$1.value.toString());
      }

      context.lastRule = currentLastRule;

      if (!context.lastRule) {
        output.add(context.compress ? '' : '\n' + tabRuleStr);
      } else {
        context.lastRule = false;
      }
    }

    if (!this.root) {
      output.add(context.compress ? '}' : '\n' + tabSetStr + '}');
      context.tabLevel--;
    }

    if (!output.isEmpty() && !context.compress && this.firstRoot) {
      output.add('\n');
    }
  };

  Ruleset.prototype.joinSelectors = function joinSelectors(paths, context, selectors) {
    for (var s = 0; s < selectors.length; s++) {
      this.joinSelector(paths, context, selectors[s]);
    }
  };

  Ruleset.prototype.joinSelector = function joinSelector(paths, context, selector$$1) {
    function createParenthesis(elementsToPak, originalElement) {
      var replacementParen = void 0;
      var j = void 0;
      if (elementsToPak.length === 0) {
        replacementParen = new paren(elementsToPak[0]);
      } else {
        var insideParent = [];
        for (j = 0; j < elementsToPak.length; j++) {
          insideParent.push(new element(null, elementsToPak[j], originalElement.index, originalElement.currentFileInfo));
        }
        replacementParen = new paren(new selector(insideParent));
      }
      return replacementParen;
    }

    function createSelector(containedElement, originalElement) {
      var element$$1 = void 0;
      var selector$$1 = void 0;
      element$$1 = new element(null, containedElement, originalElement.index, originalElement.currentFileInfo);
      selector$$1 = new selector([element$$1]);
      return selector$$1;
    }

    // joins selector path from `beginningPath` with selector path in `addPath`
    // `replacedElement` contains element that is being replaced by `addPath`
    // returns concatenated path
    function addReplacementIntoPath(beginningPath, addPath, replacedElement, originalSelector) {
      var newSelectorPath = void 0;
      var lastSelector = void 0;
      var newJoinedSelector = void 0;
      // our new selector path
      newSelectorPath = [];

      //construct the joined selector - if & is the first thing this will be empty,
      // if not newJoinedSelector will be the last set of elements in the selector
      if (beginningPath.length > 0) {
        newSelectorPath = beginningPath.slice(0);
        lastSelector = newSelectorPath.pop();
        newJoinedSelector = originalSelector.createDerived(lastSelector.elements.slice(0));
      } else {
        newJoinedSelector = originalSelector.createDerived([]);
      }

      if (addPath.length > 0) {
        // /deep/ is a combinator that is valid without anything in front of it
        // so if the & does not have a combinator that is "" or " " then
        // and there is a combinator on the parent, then grab that.
        // this also allows + a { & .b { .a & { ... though not sure why you would want to do that
        var combinator = replacedElement.combinator;

        var parentEl = addPath[0].elements[0];
        if (combinator.emptyOrWhitespace && !parentEl.combinator.emptyOrWhitespace) {
          combinator = parentEl.combinator;
        }
        // join the elements so far with the first part of the parent
        newJoinedSelector.elements.push(new element(combinator, parentEl.value, replacedElement.index, replacedElement.currentFileInfo));
        newJoinedSelector.elements = newJoinedSelector.elements.concat(addPath[0].elements.slice(1));
      }

      // now add the joined selector - but only if it is not empty
      if (newJoinedSelector.elements.length !== 0) {
        newSelectorPath.push(newJoinedSelector);
      }

      //put together the parent selectors after the join (e.g. the rest of the parent)
      if (addPath.length > 1) {
        var restOfPath = addPath.slice(1);
        restOfPath = restOfPath.map(function (selector$$1) {
          return selector$$1.createDerived(selector$$1.elements, []);
        });
        newSelectorPath = newSelectorPath.concat(restOfPath);
      }
      return newSelectorPath;
    }

    // joins selector path from `beginningPath` with every selector path in `addPaths` array
    // `replacedElement` contains element that is being replaced by `addPath`
    // returns array with all concatenated paths
    function addAllReplacementsIntoPath(beginningPath, addPaths, replacedElement, originalSelector, result) {
      var j = void 0;
      for (j = 0; j < beginningPath.length; j++) {
        var newSelectorPath = addReplacementIntoPath(beginningPath[j], addPaths, replacedElement, originalSelector);
        result.push(newSelectorPath);
      }
      return result;
    }

    function mergeElementsOnToSelectors(elements, selectors) {
      var i = void 0;
      var sel = void 0;

      if (elements.length === 0) {
        return;
      }
      if (selectors.length === 0) {
        selectors.push([new selector(elements)]);
        return;
      }

      for (i = 0; i < selectors.length; i++) {
        sel = selectors[i];

        // if the previous thing in sel is a parent this needs to join on to it
        if (sel.length > 0) {
          sel[sel.length - 1] = sel[sel.length - 1].createDerived(sel[sel.length - 1].elements.concat(elements));
        } else {
          sel.push(new selector(elements));
        }
      }
    }

    // replace all parent selectors inside `inSelector` by content of `context` array
    // resulting selectors are returned inside `paths` array
    // returns true if `inSelector` contained at least one parent selector
    function replaceParentSelector(paths, context, inSelector) {
      // The paths are [[Selector]]
      // The first list is a list of comma separated selectors
      // The inner list is a list of inheritance separated selectors
      // e.g.
      // .a, .b {
      //   .c {
      //   }
      // }
      // == [[.a] [.c]] [[.b] [.c]]
      //
      var i = void 0;

      var j = void 0;
      var k = void 0;
      var currentElements = void 0;
      var newSelectors = void 0;
      var selectorsMultiplied = void 0;
      var sel = void 0;
      var el = void 0;
      var hadParentSelector = false;
      var length = void 0;
      var lastSelector = void 0;
      function findNestedSelector(element$$1) {
        var maybeSelector = void 0;
        if (element$$1.value.type !== 'Paren') {
          return null;
        }

        maybeSelector = element$$1.value.value;
        if (maybeSelector.type !== 'Selector') {
          return null;
        }

        return maybeSelector;
      }

      // the elements from the current selector so far
      currentElements = [];
      // the current list of new selectors to add to the path.
      // We will build it up. We initiate it with one empty selector as we "multiply" the new selectors
      // by the parents
      newSelectors = [[]];

      for (i = 0; i < inSelector.elements.length; i++) {
        el = inSelector.elements[i];
        // non parent reference elements just get added
        if (el.value !== '&') {
          var nestedSelector = findNestedSelector(el);
          if (nestedSelector != null) {
            // merge the current list of non parent selector elements
            // on to the current list of selectors to add
            mergeElementsOnToSelectors(currentElements, newSelectors);

            var nestedPaths = [];
            var replaced = void 0;
            var replacedNewSelectors = [];
            replaced = replaceParentSelector(nestedPaths, context, nestedSelector);
            hadParentSelector = hadParentSelector || replaced;
            //the nestedPaths array should have only one member - replaceParentSelector does not multiply selectors
            for (k = 0; k < nestedPaths.length; k++) {
              var replacementSelector = createSelector(createParenthesis(nestedPaths[k], el), el);
              addAllReplacementsIntoPath(newSelectors, [replacementSelector], el, inSelector, replacedNewSelectors);
            }
            newSelectors = replacedNewSelectors;
            currentElements = [];
          } else {
            currentElements.push(el);
          }
        } else {
          hadParentSelector = true;
          // the new list of selectors to add
          selectorsMultiplied = [];

          // merge the current list of non parent selector elements
          // on to the current list of selectors to add
          mergeElementsOnToSelectors(currentElements, newSelectors);

          // loop through our current selectors
          for (j = 0; j < newSelectors.length; j++) {
            sel = newSelectors[j];
            // if we don't have any parent paths, the & might be in a mixin so that it can be used
            // whether there are parents or not
            if (context.length === 0) {
              // the combinator used on el should now be applied to the next element instead so that
              // it is not lost
              if (sel.length > 0) {
                sel[0].elements.push(new element(el.combinator, '', el.index, el.currentFileInfo));
              }
              selectorsMultiplied.push(sel);
            } else {
              // and the parent selectors
              for (k = 0; k < context.length; k++) {
                // We need to put the current selectors
                // then join the last selector's elements on to the parents selectors
                var newSelectorPath = addReplacementIntoPath(sel, context[k], el, inSelector);
                // add that to our new set of selectors
                selectorsMultiplied.push(newSelectorPath);
              }
            }
          }

          // our new selectors has been multiplied, so reset the state
          newSelectors = selectorsMultiplied;
          currentElements = [];
        }
      }

      // if we have any elements left over (e.g. .a& .b == .b)
      // add them on to all the current selectors
      mergeElementsOnToSelectors(currentElements, newSelectors);

      for (i = 0; i < newSelectors.length; i++) {
        length = newSelectors[i].length;
        if (length > 0) {
          paths.push(newSelectors[i]);
          lastSelector = newSelectors[i][length - 1];
          newSelectors[i][length - 1] = lastSelector.createDerived(lastSelector.elements, inSelector.extendList);
          //newSelectors[i][length - 1].copyVisibilityInfo(inSelector.visibilityInfo());
        }
      }

      return hadParentSelector;
    }

    function deriveSelector(visibilityInfo, deriveFrom) {
      var newSelector = deriveFrom.createDerived(deriveFrom.elements, deriveFrom.extendList, deriveFrom.evaldCondition);
      newSelector.copyVisibilityInfo(visibilityInfo);
      return newSelector;
    }

    // joinSelector code follows
    var i = void 0;

    var newPaths = void 0;
    var hadParentSelector = void 0;

    newPaths = [];
    hadParentSelector = replaceParentSelector(newPaths, context, selector$$1);

    if (!hadParentSelector) {
      if (context.length > 0) {
        newPaths = [];
        for (i = 0; i < context.length; i++) {
          //var concatenated = [];
          //context[i].forEach(function(entry) {
          //    var newEntry = entry.createDerived(entry.elements, entry.extendList, entry.evaldCondition);
          //    newEntry.copyVisibilityInfo(selector.visibilityInfo());
          //    concatenated.push(newEntry);
          //}, this);
          var concatenated = context[i].map(deriveSelector.bind(this, selector$$1.visibilityInfo()));

          concatenated.push(selector$$1);
          newPaths.push(concatenated);
        }
      } else {
        newPaths = [[selector$$1]];
      }
    }

    for (i = 0; i < newPaths.length; i++) {
      paths.push(newPaths[i]);
    }
  };

  return Ruleset;
}(node);

Ruleset.prototype.type = 'Ruleset';
Ruleset.prototype.isRuleset = true;
Ruleset.prototype.isRulesetLike = true;
var ruleset = Ruleset;

var Directive = function (_Node) {
  inherits(Directive, _Node);

  function Directive(name, value, rules, index, currentFileInfo, debugInfo, isRooted, visibilityInfo) {
    classCallCheck(this, Directive);

    var _this = possibleConstructorReturn(this, _Node.call(this));

    var i = void 0;

    _this.name = name;
    _this.value = value;
    if (rules) {
      if (Array.isArray(rules)) {
        _this.rules = rules;
      } else {
        _this.rules = [rules];
        _this.rules[0].selectors = new selector([], null, null, _this.index, currentFileInfo).createEmptySelectors();
      }
      for (i = 0; i < _this.rules.length; i++) {
        _this.rules[i].allowImports = true;
      }
    }
    _this.index = index;
    _this.currentFileInfo = currentFileInfo;
    _this.debugInfo = debugInfo;
    _this.isRooted = isRooted || false;
    _this.copyVisibilityInfo(visibilityInfo);
    _this.allowRoot = true;
    return _this;
  }

  Directive.prototype.accept = function accept(visitor) {
    var value = this.value;
    var rules = this.rules;
    if (rules) {
      this.rules = visitor.visitArray(rules);
    }
    if (value) {
      this.value = visitor.visit(value);
    }
  };

  Directive.prototype.isRulesetLike = function isRulesetLike() {
    return this.rules || !this.isCharset();
  };

  Directive.prototype.isCharset = function isCharset() {
    return '@charset' === this.name;
  };

  Directive.prototype.genCSS = function genCSS(context, output) {
    var value = this.value;
    var rules = this.rules;
    output.add(this.name, this.currentFileInfo, this.index);
    if (value) {
      output.add(' ');
      value.genCSS(context, output);
    }
    if (rules) {
      this.outputRuleset(context, output, rules);
    } else {
      output.add(';');
    }
  };

  Directive.prototype.eval = function _eval(context) {
    var mediaPathBackup = void 0;
    var mediaBlocksBackup = void 0;
    var value = this.value;
    var rules = this.rules;

    //media stored inside other directive should not bubble over it
    //backpup media bubbling information
    mediaPathBackup = context.mediaPath;
    mediaBlocksBackup = context.mediaBlocks;
    //deleted media bubbling information
    context.mediaPath = [];
    context.mediaBlocks = [];

    if (value) {
      value = value.eval(context);
    }
    if (rules) {
      // assuming that there is only one rule at this point - that is how parser constructs the rule
      rules = [rules[0].eval(context)];
      rules[0].root = true;
    }
    //restore media bubbling information
    context.mediaPath = mediaPathBackup;
    context.mediaBlocks = mediaBlocksBackup;

    return new Directive(this.name, value, rules, this.index, this.currentFileInfo, this.debugInfo, this.isRooted, this.visibilityInfo());
  };

  Directive.prototype.variable = function variable(name) {
    if (this.rules) {
      // assuming that there is only one rule at this point - that is how parser constructs the rule
      return ruleset.prototype.variable.call(this.rules[0], name);
    }
  };

  Directive.prototype.find = function find() {
    if (this.rules) {
      for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
        args[_key] = arguments[_key];
      }

      // assuming that there is only one rule at this point - that is how parser constructs the rule
      return ruleset.prototype.find.apply(this.rules[0], args);
    }
  };

  Directive.prototype.rulesets = function rulesets() {
    if (this.rules) {
      // assuming that there is only one rule at this point - that is how parser constructs the rule
      return ruleset.prototype.rulesets.apply(this.rules[0]);
    }
  };

  Directive.prototype.outputRuleset = function outputRuleset(context, output, rules) {
    var ruleCnt = rules.length;
    var i = void 0;
    context.tabLevel = (context.tabLevel | 0) + 1;

    // Compressed
    if (context.compress) {
      output.add('{');
      for (i = 0; i < ruleCnt; i++) {
        rules[i].genCSS(context, output);
      }
      output.add('}');
      context.tabLevel--;
      return;
    }

    // Non-compressed
    var tabSetStr = '\n' + Array(context.tabLevel).join('  ');

    var tabRuleStr = tabSetStr + '  ';
    if (!ruleCnt) {
      output.add(' {' + tabSetStr + '}');
    } else {
      output.add(' {' + tabRuleStr);
      rules[0].genCSS(context, output);
      for (i = 1; i < ruleCnt; i++) {
        output.add(tabRuleStr);
        rules[i].genCSS(context, output);
      }
      output.add(tabSetStr + '}');
    }

    context.tabLevel--;
  };

  return Directive;
}(node);

Directive.prototype.type = 'Directive';
var directive = Directive;

var DetachedRuleset = function (_Node) {
  inherits(DetachedRuleset, _Node);

  function DetachedRuleset(ruleset, frames) {
    classCallCheck(this, DetachedRuleset);

    var _this = possibleConstructorReturn(this, _Node.call(this));

    _this.ruleset = ruleset;
    _this.frames = frames;
    return _this;
  }

  DetachedRuleset.prototype.accept = function accept(visitor) {
    this.ruleset = visitor.visit(this.ruleset);
  };

  DetachedRuleset.prototype.eval = function _eval(context) {
    var frames = this.frames || context.frames.slice(0);
    return new DetachedRuleset(this.ruleset, frames);
  };

  DetachedRuleset.prototype.callEval = function callEval(context) {
    return this.ruleset.eval(this.frames ? new contexts_1.Eval(context, this.frames.concat(context.frames)) : context);
  };

  return DetachedRuleset;
}(node);

DetachedRuleset.prototype.type = 'DetachedRuleset';
DetachedRuleset.prototype.evalFirst = true;
var detachedRuleset = DetachedRuleset;

var unitConversions = {
  length: {
    m: 1,
    cm: 0.01,
    mm: 0.001,
    in: 0.0254,
    px: 0.0254 / 96,
    pt: 0.0254 / 72,
    pc: 0.0254 / 72 * 12
  },
  duration: {
    s: 1,
    ms: 0.001
  },
  angle: {
    rad: 1 / (2 * Math.PI),
    deg: 1 / 360,
    grad: 1 / 400,
    turn: 1
  }
};

var Unit = function (_Node) {
  inherits(Unit, _Node);

  function Unit(numerator, denominator, backupUnit) {
    classCallCheck(this, Unit);

    var _this = possibleConstructorReturn(this, _Node.call(this));

    _this.numerator = numerator ? numerator.slice(0).sort() : [];
    _this.denominator = denominator ? denominator.slice(0).sort() : [];
    if (backupUnit) {
      _this.backupUnit = backupUnit;
    } else if (numerator && numerator.length) {
      _this.backupUnit = numerator[0];
    }
    return _this;
  }

  Unit.prototype.clone = function clone() {
    return new Unit(this.numerator.slice(0), this.denominator.slice(0), this.backupUnit);
  };

  Unit.prototype.genCSS = function genCSS(context, output) {
    // Dimension checks the unit is singular and throws an error if in strict math mode.
    var strictUnits = context && context.strictUnits;
    if (this.numerator.length === 1) {
      output.add(this.numerator[0]); // the ideal situation
    } else if (!strictUnits && this.backupUnit) {
      output.add(this.backupUnit);
    } else if (!strictUnits && this.denominator.length) {
      output.add(this.denominator[0]);
    }
  };

  Unit.prototype.toString = function toString() {
    var i = void 0;
    var returnStr = this.numerator.join('*');
    for (i = 0; i < this.denominator.length; i++) {
      returnStr += '/' + this.denominator[i];
    }
    return returnStr;
  };

  Unit.prototype.compare = function compare(other) {
    return this.is(other.toString()) ? 0 : undefined;
  };

  Unit.prototype.is = function is(unitString) {
    return this.toString().toUpperCase() === unitString.toUpperCase();
  };

  Unit.prototype.isLength = function isLength() {
    return Boolean(this.toCSS().match(/px|em|%|in|cm|mm|pc|pt|ex/));
  };

  Unit.prototype.isEmpty = function isEmpty() {
    return this.numerator.length === 0 && this.denominator.length === 0;
  };

  Unit.prototype.isSingular = function isSingular() {
    return this.numerator.length <= 1 && this.denominator.length === 0;
  };

  Unit.prototype.map = function map(callback) {
    var i = void 0;

    for (i = 0; i < this.numerator.length; i++) {
      this.numerator[i] = callback(this.numerator[i], false);
    }

    for (i = 0; i < this.denominator.length; i++) {
      this.denominator[i] = callback(this.denominator[i], true);
    }
  };

  Unit.prototype.usedUnits = function usedUnits() {
    var group = void 0;
    var result = {};
    var mapUnit = void 0;
    var groupName = void 0;

    mapUnit = function mapUnit(atomicUnit) {
      /*jshint loopfunc:true */
      if (group.hasOwnProperty(atomicUnit) && !result[groupName]) {
        result[groupName] = atomicUnit;
      }

      return atomicUnit;
    };

    for (groupName in unitConversions) {
      if (unitConversions.hasOwnProperty(groupName)) {
        group = unitConversions[groupName];

        this.map(mapUnit);
      }
    }

    return result;
  };

  Unit.prototype.cancel = function cancel() {
    var counter = {};
    var atomicUnit = void 0;
    var i = void 0;

    for (i = 0; i < this.numerator.length; i++) {
      atomicUnit = this.numerator[i];
      counter[atomicUnit] = (counter[atomicUnit] || 0) + 1;
    }

    for (i = 0; i < this.denominator.length; i++) {
      atomicUnit = this.denominator[i];
      counter[atomicUnit] = (counter[atomicUnit] || 0) - 1;
    }

    this.numerator = [];
    this.denominator = [];

    for (atomicUnit in counter) {
      if (counter.hasOwnProperty(atomicUnit)) {
        var count = counter[atomicUnit];

        if (count > 0) {
          for (i = 0; i < count; i++) {
            this.numerator.push(atomicUnit);
          }
        } else if (count < 0) {
          for (i = 0; i < -count; i++) {
            this.denominator.push(atomicUnit);
          }
        }
      }
    }

    this.numerator.sort();
    this.denominator.sort();
  };

  return Unit;
}(node);

Unit.prototype.type = 'Unit';
var unit = Unit;

//
// A number with a unit
//

var Dimension = function (_Node) {
  inherits(Dimension, _Node);

  function Dimension(value, unit$$1) {
    classCallCheck(this, Dimension);

    var _this = possibleConstructorReturn(this, _Node.call(this));

    _this.value = parseFloat(value);
    _this.unit = unit$$1 && unit$$1 instanceof unit ? unit$$1 : new unit(unit$$1 ? [unit$$1] : undefined);
    return _this;
  }

  Dimension.prototype.accept = function accept(visitor) {
    this.unit = visitor.visit(this.unit);
  };

  Dimension.prototype.eval = function _eval(context) {
    return this;
  };

  Dimension.prototype.toColor = function toColor() {
    return new color([this.value, this.value, this.value]);
  };

  Dimension.prototype.genCSS = function genCSS(context, output) {
    if (context && context.strictUnits && !this.unit.isSingular()) {
      throw new Error('Multiple units in dimension. Correct the units or use the unit function. Bad unit: ' + this.unit.toString());
    }

    var value = this.fround(context, this.value);
    var strValue = String(value);

    if (value !== 0 && value < 0.000001 && value > -0.000001) {
      // would be output 1e-6 etc.
      strValue = value.toFixed(20).replace(/0+$/, '');
    }

    if (context && context.compress) {
      // Zero values doesn't need a unit
      if (value === 0 && this.unit.isLength()) {
        output.add(strValue);
        return;
      }

      // Float values doesn't need a leading zero
      if (value > 0 && value < 1) {
        strValue = strValue.substr(1);
      }
    }

    output.add(strValue);
    this.unit.genCSS(context, output);
  };

  // In an operation between two Dimensions,
  // we default to the first Dimension's unit,
  // so `1px + 2` will yield `3px`.


  Dimension.prototype.operate = function operate(context, op, other) {
    /*jshint noempty:false */
    var value = this._operate(context, op, this.value, other.value);

    var unit$$1 = this.unit.clone();

    if (op === '+' || op === '-') {
      if (unit$$1.numerator.length === 0 && unit$$1.denominator.length === 0) {
        unit$$1 = other.unit.clone();
        if (this.unit.backupUnit) {
          unit$$1.backupUnit = this.unit.backupUnit;
        }
      } else if (other.unit.numerator.length === 0 && unit$$1.denominator.length === 0) {
        // do nothing
      } else {
        other = other.convertTo(this.unit.usedUnits());

        if (context.strictUnits && other.unit.toString() !== unit$$1.toString()) {
          throw new Error('Incompatible units. Change the units or use the unit function. Bad units: \'' + unit$$1.toString() + '\' and \'' + other.unit.toString() + '\'.');
        }

        value = this._operate(context, op, this.value, other.value);
      }
    } else if (op === '*') {
      unit$$1.numerator = unit$$1.numerator.concat(other.unit.numerator).sort();
      unit$$1.denominator = unit$$1.denominator.concat(other.unit.denominator).sort();
      unit$$1.cancel();
    } else if (op === '/') {
      unit$$1.numerator = unit$$1.numerator.concat(other.unit.denominator).sort();
      unit$$1.denominator = unit$$1.denominator.concat(other.unit.numerator).sort();
      unit$$1.cancel();
    }
    return new Dimension(value, unit$$1);
  };

  Dimension.prototype.compare = function compare(other) {
    var a = void 0;
    var b = void 0;

    if (!(other instanceof Dimension)) {
      return undefined;
    }

    if (this.unit.isEmpty() || other.unit.isEmpty()) {
      a = this;
      b = other;
    } else {
      a = this.unify();
      b = other.unify();
      if (a.unit.compare(b.unit) !== 0) {
        return undefined;
      }
    }

    return node.numericCompare(a.value, b.value);
  };

  Dimension.prototype.unify = function unify() {
    return this.convertTo({ length: 'px', duration: 's', angle: 'rad' });
  };

  Dimension.prototype.convertTo = function convertTo(conversions) {
    var value = this.value;
    var unit$$1 = this.unit.clone();
    var i = void 0;
    var groupName = void 0;
    var group = void 0;
    var targetUnit = void 0;
    var derivedConversions = {};
    var applyUnit = void 0;

    if (typeof conversions === 'string') {
      for (i in unitConversions) {
        if (unitConversions[i].hasOwnProperty(conversions)) {
          derivedConversions = {};
          derivedConversions[i] = conversions;
        }
      }
      conversions = derivedConversions;
    }
    applyUnit = function applyUnit(atomicUnit, denominator) {
      /* jshint loopfunc:true */
      if (group.hasOwnProperty(atomicUnit)) {
        if (denominator) {
          value = value / (group[atomicUnit] / group[targetUnit]);
        } else {
          value = value * (group[atomicUnit] / group[targetUnit]);
        }

        return targetUnit;
      }

      return atomicUnit;
    };

    for (groupName in conversions) {
      if (conversions.hasOwnProperty(groupName)) {
        targetUnit = conversions[groupName];
        group = unitConversions[groupName];

        unit$$1.map(applyUnit);
      }
    }

    unit$$1.cancel();

    return new Dimension(value, unit$$1);
  };

  return Dimension;
}(node);

Dimension.prototype.type = 'Dimension';
var dimension = Dimension;

var Operation = function (_Node) {
  inherits(Operation, _Node);

  function Operation(op, operands, isSpaced) {
    var isParens = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : false;
    var isRootVariable = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : false;
    classCallCheck(this, Operation);

    var _this = possibleConstructorReturn(this, _Node.call(this));

    _this.op = op.trim();
    _this.operands = operands;
    _this.isSpaced = isSpaced;
    _this.isRootVariable = isRootVariable;
    _this.isParens = isParens;
    return _this;
  }

  Operation.prototype.accept = function accept(visitor) {
    this.operands = visitor.visit(this.operands);
  };

  Operation.prototype.eval = function _eval(context) {
    var a = this.operands[0].eval(context);
    var b = this.operands[1].eval(context);
    var isRootVariable = !!(a.isRootVariable || b.isRootVariable);
    if (context.isMathOn() && !isRootVariable) {
      if (a instanceof dimension && b instanceof color) {
        a = a.toColor();
      }
      if (b instanceof dimension && a instanceof color) {
        b = b.toColor();
      }
      if (!a.operate) {
        if (context.simplify) {
          return new Operation(this.op, [a, b], this.isSpaced, this.isParens, isRootVariable);
        } else {
          throw {
            type: 'Operation',
            message: 'Operation on an invalid type'
          };
        }
      }

      return a.operate(context, this.op, b);
    } else {
      return new Operation(this.op, [a, b], this.isSpaced, context.isInParens(), isRootVariable);
    }
  };

  Operation.prototype.genCSS = function genCSS(context, output) {
    if (this.isParens) {
      output.add('(');
    }
    this.operands[0].genCSS(context, output);
    if (this.isSpaced) {
      output.add(' ');
    }
    output.add(this.op);
    if (this.isSpaced) {
      output.add(' ');
    }
    this.operands[1].genCSS(context, output);
    if (this.isParens) {
      output.add(')');
    }
  };

  return Operation;
}(node);

Operation.prototype.type = 'Operation';

var operation = Operation;

var Variable = function (_Node) {
  inherits(Variable, _Node);

  function Variable(name, index, currentFileInfo) {
    classCallCheck(this, Variable);

    var _this = possibleConstructorReturn(this, _Node.call(this));

    _this.name = name;
    _this.index = index;
    _this.currentFileInfo = currentFileInfo || {};
    return _this;
  }

  Variable.prototype.eval = function _eval(context) {
    var variable = void 0;
    var name = this.name;

    if (name.indexOf('@@') === 0) {
      name = '@' + new Variable(name.slice(1), this.index, this.currentFileInfo).eval(context).value;
    }

    if (this.evaluating) {
      throw {
        type: 'Name',
        message: 'Recursive variable definition for ' + name,
        filename: this.currentFileInfo.filename,
        index: this.index
      };
    }

    this.evaluating = true;
    var current = this;
    variable = this.find(context.frames, function (frame) {
      var v = frame.variable(name);
      if (v) {
        if (v.important) {
          var importantScope = context.importantScope[context.importantScope.length - 1];
          importantScope.important = v.important;
        }
        if (frame.root && context.simplify && (!context.simplifyFilter || context.simplifyFilter.test(name))) {
          // Wrap root
          current.isRootVariable = true;

          //Add genCSS and toCSS
          current.genCSS = function (context, output) {
            if (context && context.frames) {
              //In eval context
              output.add(this.toCSS(context));
            } else {
              output.add(this.name);
            }
          }.bind(current);

          current.toCSS = function () {
            return '@{' + this.name.slice(1) + '}';
          }.bind(current);

          return current; //don't eval root variables in simple mode
        }
        return v.value.eval(context);
      }
    });
    if (variable) {
      this.evaluating = false;
      return variable;
    } else {
      throw {
        type: 'Name',
        message: 'variable ' + name + ' is undefined',
        filename: this.currentFileInfo.filename,
        index: this.index
      };
    }
  };

  Variable.prototype.find = function find(obj, fun) {
    for (var i = 0, r; i < obj.length; i++) {
      r = fun.call(obj, obj[i]);
      if (r) {
        return r;
      }
    }
    return null;
  };

  return Variable;
}(node);

Variable.prototype.type = 'Variable';
var variable = Variable;

var Attribute = function (_Node) {
  inherits(Attribute, _Node);

  function Attribute(key, op, value) {
    classCallCheck(this, Attribute);

    var _this = possibleConstructorReturn(this, _Node.call(this));

    _this.key = key;
    _this.op = op;
    _this.value = value;
    return _this;
  }

  Attribute.prototype.eval = function _eval(context) {
    return new Attribute(this.key.eval ? this.key.eval(context) : this.key, this.op, this.value && this.value.eval ? this.value.eval(context) : this.value);
  };

  Attribute.prototype.genCSS = function genCSS(context, output) {
    output.add(this.toCSS(context));
  };

  Attribute.prototype.toCSS = function toCSS(context) {
    var value = this.key.toCSS ? this.key.toCSS(context) : this.key;

    if (this.op) {
      value += this.op;
      value += this.value.toCSS ? this.value.toCSS(context) : this.value;
    }

    return '[' + value + ']';
  };

  return Attribute;
}(node);

Attribute.prototype.type = 'Attribute';
var attribute = Attribute;

var JsEvalNode = function (_Node) {
  inherits(JsEvalNode, _Node);

  function JsEvalNode() {
    classCallCheck(this, JsEvalNode);
    return possibleConstructorReturn(this, _Node.apply(this, arguments));
  }

  JsEvalNode.prototype.evaluateJavaScript = function evaluateJavaScript(expression, context) {
    var result = void 0;
    var that = this;
    var evalContext = {};

    if (context.javascriptEnabled !== undefined && !context.javascriptEnabled) {
      throw {
        message: 'You are using JavaScript, which has been disabled.',
        filename: this.currentFileInfo.filename,
        index: this.index
      };
    }

    expression = expression.replace(/@\{([\w-]+)\}/g, function (_, name) {
      return that.jsify(new variable('@' + name, that.index, that.currentFileInfo).eval(context));
    });

    try {
      expression = new Function('return (' + expression + ')');
    } catch (e) {
      throw {
        message: 'JavaScript evaluation error: ' + e.message + ' from `' + expression + '`',
        filename: this.currentFileInfo.filename,
        index: this.index
      };
    }

    var variables = context.frames[0].variables();
    for (var k in variables) {
      if (variables.hasOwnProperty(k)) {
        /*jshint loopfunc:true */
        evalContext[k.slice(1)] = {
          value: variables[k].value,
          toJS: function toJS() {
            return this.value.eval(context).toCSS();
          }
        };
      }
    }

    try {
      result = expression.call(evalContext);
    } catch (e) {
      throw {
        message: 'JavaScript evaluation error: \'' + e.name + ': ' + e.message.replace(/["]/g, "'") + '\'',
        filename: this.currentFileInfo.filename,
        index: this.index
      };
    }
    return result;
  };

  JsEvalNode.prototype.jsify = function jsify(obj) {
    if (Array.isArray(obj.value) && obj.value.length > 1) {
      return '[' + obj.value.map(function (v) {
        return v.toCSS();
      }).join(', ') + ']';
    } else {
      return obj.toCSS();
    }
  };

  return JsEvalNode;
}(node);

var jsEvalNode = JsEvalNode;

var Quoted = function (_JsEvalNode) {
  inherits(Quoted, _JsEvalNode);

  function Quoted(str, content, escaped, index, currentFileInfo) {
    classCallCheck(this, Quoted);

    var _this = possibleConstructorReturn(this, _JsEvalNode.call(this));

    _this.escaped = escaped == null ? true : escaped;
    _this.value = content || '';
    _this.quote = str.charAt(0);
    _this.index = index;
    _this.currentFileInfo = currentFileInfo;
    return _this;
  }

  Quoted.prototype.genCSS = function genCSS(context, output) {
    if (!this.escaped) {
      output.add(this.quote, this.currentFileInfo, this.index);
    }
    output.add(this.value);
    if (!this.escaped) {
      output.add(this.quote);
    }
  };

  Quoted.prototype.containsVariables = function containsVariables() {
    return this.value.match(/(`([^`]+)`)|@\{([\w-]+)\}/);
  };

  Quoted.prototype.eval = function _eval(context) {
    var that = this;
    var value = this.value;
    var javascriptReplacement = function javascriptReplacement(_, exp) {
      return String(that.evaluateJavaScript(exp, context));
    };
    var interpolationReplacement = function interpolationReplacement(_, name) {
      var v = new variable('@' + name, that.index, that.currentFileInfo).eval(context, true);
      return v instanceof Quoted ? v.value : v.toCSS();
    };
    function iterativeReplace(value, regexp, replacementFnc) {
      var evaluatedValue = value;
      do {
        value = evaluatedValue;
        evaluatedValue = value.replace(regexp, replacementFnc);
      } while (value !== evaluatedValue);
      return evaluatedValue;
    }
    value = iterativeReplace(value, /`([^`]+)`/g, javascriptReplacement);
    value = iterativeReplace(value, /@\{([\w-]+)\}/g, interpolationReplacement);
    return new Quoted(this.quote + value + this.quote, value, this.escaped, this.index, this.currentFileInfo);
  };

  Quoted.prototype.compare = function compare(other) {
    // when comparing quoted strings allow the quote to differ
    if (other.type === 'Quoted' && !this.escaped && !other.escaped) {
      return node.numericCompare(this.value, other.value);
    } else {
      return other.toCSS && this.toCSS() === other.toCSS() ? 0 : undefined;
    }
  };

  return Quoted;
}(jsEvalNode);

Quoted.prototype.type = 'Quoted';
var quoted = Quoted;

var Comment = function (_Node) {
  inherits(Comment, _Node);

  function Comment(value, isLineComment, index, currentFileInfo) {
    classCallCheck(this, Comment);

    var _this = possibleConstructorReturn(this, _Node.call(this));

    _this.value = value;
    _this.isLineComment = isLineComment;
    _this.index = index;
    _this.currentFileInfo = currentFileInfo;
    _this.allowRoot = true;
    return _this;
  }

  Comment.prototype.genCSS = function genCSS(context, output) {
    if (this.debugInfo) {
      output.add(debugInfo_1(context, this), this.currentFileInfo, this.index);
    }
    output.add(this.value);
  };

  Comment.prototype.isSilent = function isSilent(context) {
    var isCompressed = context.compress && this.value[2] !== '!';
    return this.isLineComment || isCompressed;
  };

  return Comment;
}(node);

Comment.prototype.type = 'Comment';
var comment = Comment;

var Expression = function (_Node) {
  inherits(Expression, _Node);

  function Expression(value) {
    classCallCheck(this, Expression);

    var _this = possibleConstructorReturn(this, _Node.call(this));

    _this.value = value;
    if (!value) {
      throw new Error('Expression requires an array parameter');
    }
    return _this;
  }

  Expression.prototype.accept = function accept(visitor) {
    this.value = visitor.visitArray(this.value);
  };

  Expression.prototype.eval = function _eval(context) {
    var returnValue = void 0;
    var inParenthesis = this.parens && !this.parensInOp;
    var doubleParen = false;
    if (inParenthesis) {
      context.inParenthesis();
    }
    if (this.value.length > 1) {
      returnValue = new Expression(this.value.map(function (e) {
        return e.eval(context);
      }));
    } else if (this.value.length === 1) {
      if (this.value[0].parens && !this.value[0].parensInOp) {
        doubleParen = true;
      }
      returnValue = this.value[0].eval(context);
    } else {
      returnValue = this;
    }
    if (inParenthesis) {
      context.outOfParenthesis();
    }
    if (this.parens && this.parensInOp && !context.isMathOn() && !doubleParen) {
      returnValue = new paren(returnValue);
    }
    return returnValue;
  };

  Expression.prototype.genCSS = function genCSS(context, output) {
    for (var i = 0; i < this.value.length; i++) {
      this.value[i].genCSS(context, output);
      if (i + 1 < this.value.length) {
        output.add(' ');
      }
    }
  };

  Expression.prototype.throwAwayComments = function throwAwayComments() {
    this.value = this.value.filter(function (v) {
      return !(v instanceof comment);
    });
  };

  return Expression;
}(node);

Expression.prototype.type = 'Expression';
var expression = Expression;

var functionCaller = function () {
  function functionCaller(name, context, index, currentFileInfo) {
    classCallCheck(this, functionCaller);

    this.name = name.toLowerCase();
    this.index = index;
    this.context = context;
    this.currentFileInfo = currentFileInfo;

    this.func = context.frames[0].functionRegistry.get(this.name);
  }

  functionCaller.prototype.isValid = function isValid() {
    return Boolean(this.func);
  };

  functionCaller.prototype.call = function call(args) {
    // This code is terrible and should be replaced as per this issue...
    // https://github.com/less/less.js/issues/2477
    if (Array.isArray(args)) {
      args = args.filter(function (item) {
        if (item.type === 'Comment') {
          return false;
        }
        return true;
      }).map(function (item) {
        if (item.type === 'Expression') {
          var subNodes = item.value.filter(function (item) {
            if (item.type === 'Comment') {
              return false;
            }
            return true;
          });
          if (subNodes.length === 1) {
            return subNodes[0];
          } else {
            return new expression(subNodes);
          }
        }
        return item;
      });
    }

    return this.func.apply(this, args);
  };

  return functionCaller;
}();

var functionCaller_1 = functionCaller;

//
// A function call node.
//

var Call = function (_Node) {
  inherits(Call, _Node);

  function Call(name, args, index, currentFileInfo) {
    classCallCheck(this, Call);

    var _this = possibleConstructorReturn(this, _Node.call(this));

    _this.name = name;
    _this.args = args;
    _this.index = index;
    _this.currentFileInfo = currentFileInfo;
    return _this;
  }

  Call.prototype.accept = function accept(visitor) {
    if (this.args) {
      this.args = visitor.visitArray(this.args);
    }
  };

  //
  // When evaluating a function call,
  // we either find the function in the functionRegistry,
  // in which case we call it, passing the  evaluated arguments,
  // if this returns null or we cannot find the function, we
  // simply print it out as it appeared originally [2].
  //
  // The reason why we evaluate the arguments, is in the case where
  // we try to pass a variable to a function, like: `saturate(@color)`.
  // The function should receive the value, not the variable.
  //


  Call.prototype.eval = function _eval(context) {
    var args = this.args.map(function (a) {
      return a.eval(context);
    });
    var result = void 0;
    var funcCaller = new functionCaller_1(this.name, context, this.index, this.currentFileInfo);
    //Check if any of root vars take place
    for (var _iterator = args, _isArray = Array.isArray(_iterator), _i = 0, _iterator = _isArray ? _iterator : _iterator[Symbol.iterator]();;) {
      var _ref;

      if (_isArray) {
        if (_i >= _iterator.length) break;
        _ref = _iterator[_i++];
      } else {
        _i = _iterator.next();
        if (_i.done) break;
        _ref = _i.value;
      }

      var arg = _ref;

      if (arg.isRootVariable) return new Call(this.name, args, this.index, this.currentFileInfo);
    }

    if (funcCaller.isValid()) {
      try {
        result = funcCaller.call(args);
      } catch (e) {
        throw {
          type: e.type || 'Runtime',
          message: 'error evaluating function `' + this.name + '`' + (e.message ? ': ' + e.message : ''),
          index: this.index,
          filename: this.currentFileInfo.filename
        };
      }

      if (result != null) {
        result.index = this.index;
        result.currentFileInfo = this.currentFileInfo;
        return result;
      }
    }

    return new Call(this.name, args, this.index, this.currentFileInfo);
  };

  Call.prototype.genCSS = function genCSS(context, output) {
    output.add(this.name + '(', this.currentFileInfo, this.index);

    for (var i = 0; i < this.args.length; i++) {
      this.args[i].genCSS(context, output);
      if (i + 1 < this.args.length) {
        output.add(', ');
      }
    }

    output.add(')');
  };

  return Call;
}(node);

Call.prototype.type = 'Call';
var call = Call;

var URL = function (_Node) {
  inherits(URL, _Node);

  function URL(val, index, currentFileInfo, isEvald) {
    classCallCheck(this, URL);

    var _this = possibleConstructorReturn(this, _Node.call(this));

    _this.value = val;
    _this.currentFileInfo = currentFileInfo;
    _this.index = index;
    _this.isEvald = isEvald;
    return _this;
  }

  URL.prototype.accept = function accept(visitor) {
    this.value = visitor.visit(this.value);
  };

  URL.prototype.genCSS = function genCSS(context, output) {
    output.add('url(');
    this.value.genCSS(context, output);
    output.add(')');
  };

  URL.prototype.eval = function _eval(context) {
    var val = this.value.eval(context);
    var rootpath = void 0;

    if (!this.isEvald) {
      // Add the base path if the URL is relative
      rootpath = this.currentFileInfo && this.currentFileInfo.rootpath;
      if (rootpath && typeof val.value === 'string' && context.isPathRelative(val.value)) {
        if (!val.quote) {
          rootpath = rootpath.replace(/[\(\)'"\s]/g, function (match) {
            return '\\' + match;
          });
        }
        val.value = rootpath + val.value;
      }

      val.value = context.normalizePath(val.value);

      // Add url args if enabled
      if (context.urlArgs) {
        if (!val.value.match(/^\s*data:/)) {
          var delimiter = val.value.indexOf('?') === -1 ? '?' : '&';
          var urlArgs = delimiter + context.urlArgs;
          if (val.value.indexOf('#') !== -1) {
            val.value = val.value.replace('#', urlArgs + '#');
          } else {
            val.value += urlArgs;
          }
        }
      }
    }

    return new URL(val, this.index, this.currentFileInfo, true);
  };

  return URL;
}(node);

URL.prototype.type = 'Url';
var url = URL;

var Anonymous = function (_Node) {
  inherits(Anonymous, _Node);

  function Anonymous(value, index, currentFileInfo, mapLines, rulesetLike, visibilityInfo) {
    classCallCheck(this, Anonymous);

    var _this = possibleConstructorReturn(this, _Node.call(this));

    _this.value = value;
    _this.index = index;
    _this.mapLines = mapLines;
    _this.currentFileInfo = currentFileInfo;
    _this.rulesetLike = typeof rulesetLike === 'undefined' ? false : rulesetLike;
    _this.allowRoot = true;
    _this.copyVisibilityInfo(visibilityInfo);
    return _this;
  }

  Anonymous.prototype.eval = function _eval() {
    return new Anonymous(this.value, this.index, this.currentFileInfo, this.mapLines, this.rulesetLike, this.visibilityInfo());
  };

  Anonymous.prototype.compare = function compare(other) {
    return other.toCSS && this.toCSS() === other.toCSS() ? 0 : undefined;
  };

  Anonymous.prototype.isRulesetLike = function isRulesetLike() {
    return this.rulesetLike;
  };

  Anonymous.prototype.genCSS = function genCSS(context, output) {
    output.add(this.value, this.currentFileInfo, this.index, this.mapLines);
  };

  return Anonymous;
}(node);

Anonymous.prototype.type = 'Anonymous';
var anonymous = Anonymous;

var Media = function (_Directive) {
  inherits(Media, _Directive);

  function Media(value$$1, features, index, currentFileInfo, visibilityInfo) {
    classCallCheck(this, Media);

    var _this = possibleConstructorReturn(this, _Directive.call(this));

    _this.index = index;
    _this.currentFileInfo = currentFileInfo;

    var selectors = new selector([], null, null, _this.index, _this.currentFileInfo).createEmptySelectors();

    _this.features = new value(features);
    _this.rules = [new ruleset(selectors, value$$1)];
    _this.rules[0].allowImports = true;
    _this.copyVisibilityInfo(visibilityInfo);
    _this.allowRoot = true;
    return _this;
  }

  Media.prototype.accept = function accept(visitor) {
    if (this.features) {
      this.features = visitor.visit(this.features);
    }
    if (this.rules) {
      this.rules = visitor.visitArray(this.rules);
    }
  };

  Media.prototype.genCSS = function genCSS(context, output) {
    output.add('@media ', this.currentFileInfo, this.index);
    this.features.genCSS(context, output);
    this.outputRuleset(context, output, this.rules);
  };

  Media.prototype.eval = function _eval(context) {
    if (!context.mediaBlocks) {
      context.mediaBlocks = [];
      context.mediaPath = [];
    }

    var media = new Media(null, [], this.index, this.currentFileInfo, this.visibilityInfo());
    if (this.debugInfo) {
      this.rules[0].debugInfo = this.debugInfo;
      media.debugInfo = this.debugInfo;
    }
    var strictMathBypass = false;
    if (!context.strictMath) {
      strictMathBypass = true;
      context.strictMath = true;
    }
    try {
      media.features = this.features.eval(context);
    } finally {
      if (strictMathBypass) {
        context.strictMath = false;
      }
    }

    context.mediaPath.push(media);
    context.mediaBlocks.push(media);

    this.rules[0].functionRegistry = context.frames[0].functionRegistry.inherit();
    context.frames.unshift(this.rules[0]);
    media.rules = [this.rules[0].eval(context)];
    context.frames.shift();

    context.mediaPath.pop();

    return context.mediaPath.length === 0 ? media.evalTop(context) : media.evalNested(context);
  };

  Media.prototype.evalTop = function evalTop(context) {
    var result = this;

    // Render all dependent Media blocks.
    if (context.mediaBlocks.length > 1) {
      var selectors = new selector([], null, null, this.index, this.currentFileInfo).createEmptySelectors();
      result = new ruleset(selectors, context.mediaBlocks);
      result.multiMedia = true;
      result.copyVisibilityInfo(this.visibilityInfo());
    }

    delete context.mediaBlocks;
    delete context.mediaPath;

    return result;
  };

  Media.prototype.evalNested = function evalNested(context) {
    var i = void 0;
    var value$$1 = void 0;
    var path = context.mediaPath.concat([this]);

    // Extract the media-query conditions separated with `,` (OR).
    for (i = 0; i < path.length; i++) {
      value$$1 = path[i].features instanceof value ? path[i].features.value : path[i].features;
      path[i] = Array.isArray(value$$1) ? value$$1 : [value$$1];
    }

    // Trace all permutations to generate the resulting media-query.
    //
    // (a, b and c) with nested (d, e) ->
    //    a and d
    //    a and e
    //    b and c and d
    //    b and c and e
    this.features = new value(this.permute(path).map(function (path) {
      path = path.map(function (fragment) {
        return fragment.toCSS ? fragment : new anonymous(fragment);
      });

      for (i = path.length - 1; i > 0; i--) {
        path.splice(i, 0, new anonymous('and'));
      }

      return new expression(path);
    }));

    // Fake a tree-node that doesn't output anything.
    return new ruleset([], []);
  };

  Media.prototype.permute = function permute(arr) {
    if (arr.length === 0) {
      return [];
    } else if (arr.length === 1) {
      return arr[0];
    } else {
      var result = [];
      var rest = this.permute(arr.slice(1));
      for (var i = 0; i < rest.length; i++) {
        for (var j = 0; j < arr[0].length; j++) {
          result.push([arr[0][j]].concat(rest[i]));
        }
      }
      return result;
    }
  };

  Media.prototype.bubbleSelectors = function bubbleSelectors(selectors) {
    if (!selectors) {
      return;
    }
    this.rules = [new ruleset(selectors.slice(0), [this.rules[0]])];
  };

  return Media;
}(directive);

Media.prototype.type = 'Media';
Media.prototype.isRulesetLike = true;
var media = Media;

//
// CSS @import node
//
// The general strategy here is that we don't want to wait
// for the parsing to be completed, before we start importing
// the file. That's because in the context of a browser,
// most of the time will be spent waiting for the server to respond.
//
// On creation, we push the import path to our import queue, though
// `import,push`, we also pass it a callback, which it'll call once
// the file has been fetched, and parsed.
//

var Import = function (_Node) {
  inherits(Import, _Node);

  function Import(path, features, options, index, currentFileInfo, visibilityInfo) {
    classCallCheck(this, Import);

    var _this = possibleConstructorReturn(this, _Node.call(this));

    _this.options = options;
    _this.index = index;
    _this.path = path;
    _this.features = features;
    _this.currentFileInfo = currentFileInfo;
    _this.allowRoot = true;

    if (_this.options.less !== undefined || _this.options.inline) {
      _this.css = !_this.options.less || _this.options.inline;
    } else {
      var pathValue = _this.getPath();
      if (pathValue && /[#\.\&\?\/]css([\?;].*)?$/.test(pathValue)) {
        _this.css = true;
      }
    }
    _this.copyVisibilityInfo(visibilityInfo);
    return _this;
  }

  Import.prototype.accept = function accept(visitor) {
    if (this.features) {
      this.features = visitor.visit(this.features);
    }
    this.path = visitor.visit(this.path);
    if (!this.options.plugin && !this.options.inline && this.root) {
      this.root = visitor.visit(this.root);
    }
  };

  Import.prototype.genCSS = function genCSS(context, output) {
    if (this.css && this.path.currentFileInfo.reference === undefined) {
      output.add('@import ', this.currentFileInfo, this.index);
      this.path.genCSS(context, output);
      if (this.features) {
        output.add(' ');
        this.features.genCSS(context, output);
      }
      output.add(';');
    }
  };

  Import.prototype.getPath = function getPath() {
    return this.path instanceof url ? this.path.value.value : this.path.value;
  };

  Import.prototype.isVariableImport = function isVariableImport() {
    var path = this.path;
    if (path instanceof url) {
      path = path.value;
    }
    if (path instanceof quoted) {
      return path.containsVariables();
    }

    return true;
  };

  Import.prototype.evalForImport = function evalForImport(context) {
    var path = this.path;

    if (path instanceof url) {
      path = path.value;
    }

    return new Import(path.eval(context), this.features, this.options, this.index, this.currentFileInfo, this.visibilityInfo());
  };

  Import.prototype.evalPath = function evalPath(context) {
    var path = this.path.eval(context);
    var rootpath = this.currentFileInfo && this.currentFileInfo.rootpath;

    if (!(path instanceof url)) {
      if (rootpath) {
        var pathValue = path.value;
        // Add the base path if the import is relative
        if (pathValue && context.isPathRelative(pathValue)) {
          path.value = rootpath + pathValue;
        }
      }
      path.value = context.normalizePath(path.value);
    }

    return path;
  };

  Import.prototype.eval = function _eval(context) {
    var result = this.doEval(context);
    if (this.options.reference || this.blocksVisibility()) {
      if (result.length || result.length === 0) {
        result.forEach(function (node$$1) {
          node$$1.addVisibilityBlock();
        });
      } else {
        result.addVisibilityBlock();
      }
    }
    return result;
  };

  Import.prototype.doEval = function doEval(context) {
    var ruleset$$1 = void 0;
    var registry = void 0;
    var features = this.features && this.features.eval(context);

    if (this.options.plugin) {
      registry = context.frames[0] && context.frames[0].functionRegistry;
      if (registry && this.root && this.root.functions) {
        registry.addMultiple(this.root.functions);
      }
      return [];
    }

    if (this.skip) {
      if (typeof this.skip === 'function') {
        this.skip = this.skip();
      }
      if (this.skip) {
        return [];
      }
    }
    if (this.options.inline) {
      var contents = new anonymous(this.root, 0, {
        filename: this.importedFilename,
        reference: this.path.currentFileInfo && this.path.currentFileInfo.reference
      }, true, true);

      return this.features ? new media([contents], this.features.value) : [contents];
    } else if (this.css) {
      var newImport = new Import(this.evalPath(context), features, this.options, this.index);
      if (!newImport.css && this.error) {
        throw this.error;
      }
      return newImport;
    } else {
      ruleset$$1 = new ruleset(null, this.root.rules.slice(0));
      ruleset$$1.evalImports(context);

      return this.features ? new media(ruleset$$1.rules, this.features.value) : ruleset$$1.rules;
    }
  };

  return Import;
}(node);

Import.prototype.type = 'Import';
var _import = Import;

var Definition = function (_Ruleset) {
  inherits(Definition, _Ruleset);

  function Definition(name, params, rules, condition, variadic, frames, visibilityInfo) {
    classCallCheck(this, Definition);

    var _this = possibleConstructorReturn(this, _Ruleset.call(this));

    _this.name = name;
    _this.selectors = [new selector([new element(null, name, _this.index, _this.currentFileInfo)])];
    _this.params = params;
    _this.condition = condition;
    _this.variadic = variadic;
    _this.arity = params.length;
    _this.rules = rules;
    _this._lookups = {};
    var optionalParameters = [];
    _this.required = params.reduce(function (count, p) {
      if (!p.name || p.name && !p.value) {
        return count + 1;
      } else {
        optionalParameters.push(p.name);
        return count;
      }
    }, 0);
    _this.optionalParameters = optionalParameters;
    _this.frames = frames;
    _this.copyVisibilityInfo(visibilityInfo);
    _this.allowRoot = true;
    return _this;
  }

  Definition.prototype.accept = function accept(visitor) {
    if (this.params && this.params.length) {
      this.params = visitor.visitArray(this.params);
    }
    this.rules = visitor.visitArray(this.rules);
    if (this.condition) {
      this.condition = visitor.visit(this.condition);
    }
  };

  Definition.prototype.evalParams = function evalParams(context, mixinEnv, args, evaldArguments) {
    /*jshint boss:true */
    var frame = new ruleset(null, null);

    var varargs = void 0;
    var arg = void 0;
    var params = this.params.slice(0);
    var i = void 0;
    var j = void 0;
    var val = void 0;
    var name = void 0;
    var isNamedFound = void 0;
    var argIndex = void 0;
    var argsLength = 0;

    if (mixinEnv.frames && mixinEnv.frames[0] && mixinEnv.frames[0].functionRegistry) {
      frame.functionRegistry = mixinEnv.frames[0].functionRegistry.inherit();
    }
    mixinEnv = new contexts_1.Eval(mixinEnv, [frame].concat(mixinEnv.frames));

    if (args) {
      args = args.slice(0);
      argsLength = args.length;

      for (i = 0; i < argsLength; i++) {
        arg = args[i];
        if (name = arg && arg.name) {
          isNamedFound = false;
          for (j = 0; j < params.length; j++) {
            if (!evaldArguments[j] && name === params[j].name) {
              evaldArguments[j] = arg.value.eval(context);
              frame.prependRule(new rule(name, arg.value.eval(context)));
              isNamedFound = true;
              break;
            }
          }
          if (isNamedFound) {
            args.splice(i, 1);
            i--;
            continue;
          } else {
            throw {
              type: 'Runtime',
              message: 'Named argument for ' + this.name + ' ' + args[i].name + ' not found'
            };
          }
        }
      }
    }
    argIndex = 0;
    for (i = 0; i < params.length; i++) {
      if (evaldArguments[i]) {
        continue;
      }

      arg = args && args[argIndex];

      if (name = params[i].name) {
        if (params[i].variadic) {
          varargs = [];
          for (j = argIndex; j < argsLength; j++) {
            varargs.push(args[j].value.eval(context));
          }
          frame.prependRule(new rule(name, new expression(varargs).eval(context)));
        } else {
          val = arg && arg.value;
          if (val) {
            val = val.eval(context);
          } else if (params[i].value) {
            val = params[i].value.eval(mixinEnv);
            frame.resetCache();
          } else {
            throw {
              type: 'Runtime',
              message: 'wrong number of arguments for ' + this.name + ' (' + argsLength + ' for ' + this.arity + ')'
            };
          }

          frame.prependRule(new rule(name, val));
          evaldArguments[i] = val;
        }
      }

      if (params[i].variadic && args) {
        for (j = argIndex; j < argsLength; j++) {
          evaldArguments[j] = args[j].value.eval(context);
        }
      }
      argIndex++;
    }

    return frame;
  };

  Definition.prototype.makeImportant = function makeImportant() {
    var rules = !this.rules ? this.rules : this.rules.map(function (r) {
      if (r.makeImportant) {
        return r.makeImportant(true);
      } else {
        return r;
      }
    });
    var result = new Definition(this.name, this.params, rules, this.condition, this.variadic, this.frames);
    return result;
  };

  Definition.prototype.eval = function _eval(context) {
    return new Definition(this.name, this.params, this.rules, this.condition, this.variadic, this.frames || context.frames.slice(0));
  };

  Definition.prototype.evalCall = function evalCall(context, args, important) {
    var _arguments = [];
    var mixinFrames = this.frames ? this.frames.concat(context.frames) : context.frames;
    var frame = this.evalParams(context, new contexts_1.Eval(context, mixinFrames), args, _arguments);
    var rules = void 0;
    var ruleset$$1 = void 0;

    frame.prependRule(new rule('@arguments', new expression(_arguments).eval(context)));

    rules = this.rules.slice(0);

    ruleset$$1 = new ruleset(null, rules);
    ruleset$$1.originalRuleset = this;
    ruleset$$1 = ruleset$$1.eval(new contexts_1.Eval(context, [this, frame].concat(mixinFrames)));
    if (important) {
      ruleset$$1 = ruleset$$1.makeImportant();
    }
    return ruleset$$1;
  };

  Definition.prototype.matchCondition = function matchCondition(args, context) {
    if (this.condition && !this.condition.eval(new contexts_1.Eval(context, [this.evalParams(context /* the parameter variables*/
    , new contexts_1.Eval(context, this.frames ? this.frames.concat(context.frames) : context.frames), args, [])].concat(this.frames || []) // the parent namespace/mixin frames
    .concat(context.frames)))) {
      // the current environment frames
      return false;
    }
    return true;
  };

  Definition.prototype.matchArgs = function matchArgs(args, context) {
    var allArgsCnt = args && args.length || 0;
    var len = void 0;
    var optionalParameters = this.optionalParameters;
    var requiredArgsCnt = !args ? 0 : args.reduce(function (count, p) {
      if (optionalParameters.indexOf(p.name) < 0) {
        return count + 1;
      } else {
        return count;
      }
    }, 0);

    if (!this.variadic) {
      if (requiredArgsCnt < this.required) {
        return false;
      }
      if (allArgsCnt > this.params.length) {
        return false;
      }
    } else {
      if (requiredArgsCnt < this.required - 1) {
        return false;
      }
    }

    // check patterns
    len = Math.min(requiredArgsCnt, this.arity);

    for (var i = 0; i < len; i++) {
      if (!this.params[i].name && !this.params[i].variadic) {
        if (args[i].value.eval(context).toCSS() != this.params[i].value.eval(context).toCSS()) {
          return false;
        }
      }
    }
    return true;
  };

  return Definition;
}(ruleset);

Definition.prototype.type = 'MixinDefinition';
Definition.prototype.evalFirst = true;
var mixinDefinition = Definition;

var MixinCall = function (_Node) {
  inherits(MixinCall, _Node);

  function MixinCall(elements, args, index, currentFileInfo, important) {
    classCallCheck(this, MixinCall);

    var _this = possibleConstructorReturn(this, _Node.call(this));

    _this.selector = new selector(elements);
    _this.arguments = args || [];
    _this.index = index;
    _this.currentFileInfo = currentFileInfo;
    _this.important = important;
    _this.allowRoot = true;
    return _this;
  }

  MixinCall.prototype.accept = function accept(visitor) {
    if (this.selector) {
      this.selector = visitor.visit(this.selector);
    }
    if (this.arguments.length) {
      this.arguments = visitor.visitArray(this.arguments);
    }
  };

  MixinCall.prototype.eval = function _eval(context) {
    var mixins = void 0;
    var mixin = void 0;
    var mixinPath = void 0;
    var args = [];
    var arg = void 0;
    var argValue = void 0;
    var rules = [];
    var match = false;
    var i = void 0;
    var m = void 0;
    var f = void 0;
    var isRecursive = void 0;
    var isOneFound = void 0;
    var candidates = [];
    var candidate = void 0;
    var conditionResult = [];
    var defaultResult = void 0;
    var defFalseEitherCase = -1;
    var defNone = 0;
    var defTrue = 1;
    var defFalse = 2;
    var count = void 0;
    var originalRuleset = void 0;
    var noArgumentsFilter = void 0;

    function calcDefGroup(mixin, mixinPath) {
      var f = void 0;
      var p = void 0;
      var namespace = void 0;

      for (f = 0; f < 2; f++) {
        conditionResult[f] = true;
        _default.value(f);
        for (p = 0; p < mixinPath.length && conditionResult[f]; p++) {
          namespace = mixinPath[p];
          if (namespace.matchCondition) {
            conditionResult[f] = conditionResult[f] && namespace.matchCondition(null, context);
          }
        }
        if (mixin.matchCondition) {
          conditionResult[f] = conditionResult[f] && mixin.matchCondition(args, context);
        }
      }
      if (conditionResult[0] || conditionResult[1]) {
        if (conditionResult[0] != conditionResult[1]) {
          return conditionResult[1] ? defTrue : defFalse;
        }

        return defNone;
      }
      return defFalseEitherCase;
    }

    for (i = 0; i < this.arguments.length; i++) {
      arg = this.arguments[i];
      argValue = arg.value.eval(context);
      if (arg.expand && Array.isArray(argValue.value)) {
        argValue = argValue.value;
        for (m = 0; m < argValue.length; m++) {
          args.push({ value: argValue[m] });
        }
      } else {
        args.push({ name: arg.name, value: argValue });
      }
    }

    noArgumentsFilter = function noArgumentsFilter(rule) {
      return rule.matchArgs(null, context);
    };

    for (i = 0; i < context.frames.length; i++) {
      if ((mixins = context.frames[i].find(this.selector, null, noArgumentsFilter)).length > 0) {
        isOneFound = true;

        // To make `default()` function independent of definition order we have two "subpasses" here.
        // At first we evaluate each guard *twice* (with `default() == true` and `default() == false`),
        // and build candidate list with corresponding flags. Then, when we know all possible matches,
        // we make a final decision.

        for (m = 0; m < mixins.length; m++) {
          mixin = mixins[m].rule;
          mixinPath = mixins[m].path;
          isRecursive = false;
          for (f = 0; f < context.frames.length; f++) {
            if (!(mixin instanceof mixinDefinition) && mixin === (context.frames[f].originalRuleset || context.frames[f])) {
              isRecursive = true;
              break;
            }
          }
          if (isRecursive) {
            continue;
          }

          if (mixin.matchArgs(args, context)) {
            candidate = { mixin: mixin, group: calcDefGroup(mixin, mixinPath) };

            if (candidate.group !== defFalseEitherCase) {
              candidates.push(candidate);
            }

            match = true;
          }
        }

        _default.reset();

        count = [0, 0, 0];
        for (m = 0; m < candidates.length; m++) {
          count[candidates[m].group]++;
        }

        if (count[defNone] > 0) {
          defaultResult = defFalse;
        } else {
          defaultResult = defTrue;
          if (count[defTrue] + count[defFalse] > 1) {
            throw {
              type: 'Runtime',
              message: 'Ambiguous use of `default()` found when matching for `' + this.format(args) + '`',
              index: this.index,
              filename: this.currentFileInfo.filename
            };
          }
        }

        for (m = 0; m < candidates.length; m++) {
          candidate = candidates[m].group;
          if (candidate === defNone || candidate === defaultResult) {
            try {
              mixin = candidates[m].mixin;
              if (!(mixin instanceof mixinDefinition)) {
                originalRuleset = mixin.originalRuleset || mixin;
                mixin = new mixinDefinition('', [], mixin.rules, null, false, null, originalRuleset.visibilityInfo());
                mixin.originalRuleset = originalRuleset;
              }
              var newRules = mixin.evalCall(context, args, this.important).rules;
              this._setVisibilityToReplacement(newRules);
              Array.prototype.push.apply(rules, newRules);
            } catch (e) {
              throw {
                message: e.message,
                index: this.index,
                filename: this.currentFileInfo.filename,
                stack: e.stack
              };
            }
          }
        }

        if (match) {
          return rules;
        }
      }
    }
    if (isOneFound) {
      throw {
        type: 'Runtime',
        message: 'No matching definition was found for `' + this.format(args) + '`',
        index: this.index,
        filename: this.currentFileInfo.filename
      };
    } else {
      throw {
        type: 'Name',
        message: this.selector.toCSS().trim() + ' is undefined',
        index: this.index,
        filename: this.currentFileInfo.filename
      };
    }
  };

  MixinCall.prototype._setVisibilityToReplacement = function _setVisibilityToReplacement(replacement) {
    var i = void 0;
    var rule = void 0;
    if (this.blocksVisibility()) {
      for (i = 0; i < replacement.length; i++) {
        rule = replacement[i];
        rule.addVisibilityBlock();
      }
    }
  };

  MixinCall.prototype.format = function format(args) {
    return this.selector.toCSS().trim() + '(' + (args ? args.map(function (a) {
      var argValue = '';
      if (a.name) {
        argValue += a.name + ':';
      }
      if (a.value.toCSS) {
        argValue += a.value.toCSS();
      } else {
        argValue += '???';
      }
      return argValue;
    }).join(', ') : '') + ')';
  };

  return MixinCall;
}(node);

MixinCall.prototype.type = 'MixinCall';
var mixinCall = MixinCall;

var JavaScript = function (_JsEvalNode) {
  inherits(JavaScript, _JsEvalNode);

  function JavaScript(string, escaped, index, currentFileInfo) {
    classCallCheck(this, JavaScript);

    var _this = possibleConstructorReturn(this, _JsEvalNode.call(this));

    _this.escaped = escaped;
    _this.expression = string;
    _this.index = index;
    _this.currentFileInfo = currentFileInfo;
    return _this;
  }

  JavaScript.prototype.eval = function _eval(context) {
    var result = this.evaluateJavaScript(this.expression, context);

    if (typeof result === 'number') {
      return new dimension(result);
    } else if (typeof result === 'string') {
      return new quoted('"' + result + '"', result, this.escaped, this.index);
    } else if (Array.isArray(result)) {
      return new anonymous(result.join(', '));
    } else {
      return new anonymous(result);
    }
  };

  return JavaScript;
}(jsEvalNode);

JavaScript.prototype.type = 'JavaScript';

var javascript = JavaScript;

var Assignment = function (_Node) {
  inherits(Assignment, _Node);

  function Assignment(key, val) {
    classCallCheck(this, Assignment);

    var _this = possibleConstructorReturn(this, _Node.call(this));

    _this.key = key;
    _this.value = val;
    return _this;
  }

  Assignment.prototype.accept = function accept(visitor) {
    this.value = visitor.visit(this.value);
  };

  Assignment.prototype.eval = function _eval(context) {
    if (this.value.eval) {
      return new Assignment(this.key, this.value.eval(context));
    }
    return this;
  };

  Assignment.prototype.genCSS = function genCSS(context, output) {
    output.add(this.key + '=');
    if (this.value.genCSS) {
      this.value.genCSS(context, output);
    } else {
      output.add(this.value);
    }
  };

  return Assignment;
}(node);

Assignment.prototype.type = 'Assignment';
var assignment = Assignment;

var Condition = function (_Node) {
  inherits(Condition, _Node);

  function Condition(op, l, r, i, negate) {
    classCallCheck(this, Condition);

    var _this = possibleConstructorReturn(this, _Node.call(this));

    _this.op = op.trim();
    _this.lvalue = l;
    _this.rvalue = r;
    _this.index = i;
    _this.negate = negate;
    return _this;
  }

  Condition.prototype.accept = function accept(visitor) {
    this.lvalue = visitor.visit(this.lvalue);
    this.rvalue = visitor.visit(this.rvalue);
  };

  Condition.prototype.eval = function _eval(context) {
    var result = function (op, a, b) {
      switch (op) {
        case 'and':
          return a && b;
        case 'or':
          return a || b;
        default:
          switch (node.compare(a, b)) {
            case -1:
              return op === '<' || op === '=<' || op === '<=';
            case 0:
              return op === '=' || op === '>=' || op === '=<' || op === '<=';
            case 1:
              return op === '>' || op === '>=';
            default:
              return false;
          }
      }
    }(this.op, this.lvalue.eval(context), this.rvalue.eval(context));

    return this.negate ? !result : result;
  };

  return Condition;
}(node);

Condition.prototype.type = 'Condition';
var condition = Condition;

var UnicodeDescriptor = function (_Node) {
  inherits(UnicodeDescriptor, _Node);

  function UnicodeDescriptor(value) {
    classCallCheck(this, UnicodeDescriptor);

    var _this = possibleConstructorReturn(this, _Node.call(this));

    _this.value = value;
    return _this;
  }

  return UnicodeDescriptor;
}(node);

UnicodeDescriptor.prototype.type = 'UnicodeDescriptor';

var unicodeDescriptor = UnicodeDescriptor;

var Negative = function (_Node) {
  inherits(Negative, _Node);

  function Negative(node$$1) {
    classCallCheck(this, Negative);

    var _this = possibleConstructorReturn(this, _Node.call(this));

    _this.value = node$$1;
    return _this;
  }

  Negative.prototype.genCSS = function genCSS(context, output) {
    output.add('-');
    this.value.genCSS(context, output);
  };

  Negative.prototype.eval = function _eval(context) {
    if (context.isMathOn()) {
      return new operation('*', [new dimension(-1), this.value]).eval(context);
    }
    return new Negative(this.value.eval(context));
  };

  return Negative;
}(node);

Negative.prototype.type = 'Negative';
var negative = Negative;

var Extend = function (_Node) {
  inherits(Extend, _Node);

  function Extend(selector$$1, option, index, currentFileInfo, visibilityInfo) {
    classCallCheck(this, Extend);

    var _this = possibleConstructorReturn(this, _Node.call(this));

    _this.selector = selector$$1;
    _this.option = option;
    _this.index = index;
    _this.object_id = Extend.next_id++;
    _this.parent_ids = [_this.object_id];
    _this.currentFileInfo = currentFileInfo || {};
    _this.copyVisibilityInfo(visibilityInfo);
    _this.allowRoot = true;

    switch (option) {
      case 'all':
        _this.allowBefore = true;
        _this.allowAfter = true;
        break;
      default:
        _this.allowBefore = false;
        _this.allowAfter = false;
        break;
    }
    return _this;
  }

  Extend.prototype.accept = function accept(visitor) {
    this.selector = visitor.visit(this.selector);
  };

  Extend.prototype.eval = function _eval(context) {
    return new Extend(this.selector.eval(context), this.option, this.index, this.currentFileInfo, this.visibilityInfo());
  };

  Extend.prototype.clone = function clone(context) {
    return new Extend(this.selector, this.option, this.index, this.currentFileInfo, this.visibilityInfo());
  };

  //it concatenates (joins) all selectors in selector array


  Extend.prototype.findSelfSelectors = function findSelfSelectors(selectors) {
    var selfElements = [];
    var i = void 0;
    var selectorElements = void 0;

    for (i = 0; i < selectors.length; i++) {
      selectorElements = selectors[i].elements;
      // duplicate the logic in genCSS function inside the selector node.
      // future TODO - move both logics into the selector joiner visitor
      if (i > 0 && selectorElements.length && selectorElements[0].combinator.value === '') {
        selectorElements[0].combinator.value = ' ';
      }
      selfElements = selfElements.concat(selectors[i].elements);
    }

    this.selfSelectors = [new selector(selfElements)];
    this.selfSelectors[0].copyVisibilityInfo(this.visibilityInfo());
  };

  return Extend;
}(node);

Extend.next_id = 0;

Extend.prototype.type = 'Extend';
var extend = Extend;

var RulesetCall = function (_Node) {
  inherits(RulesetCall, _Node);

  function RulesetCall(variable$$1) {
    classCallCheck(this, RulesetCall);

    var _this = possibleConstructorReturn(this, _Node.call(this));

    _this.variable = variable$$1;
    _this.allowRoot = true;
    return _this;
  }

  RulesetCall.prototype.eval = function _eval(context) {
    var detachedRuleset = new variable(this.variable).eval(context);
    return detachedRuleset.callEval(context);
  };

  return RulesetCall;
}(node);

RulesetCall.prototype.type = 'RulesetCall';
var rulesetCall = RulesetCall;

var tree = {};

tree.Node = node;
tree.Alpha = alpha;
tree.Color = color;
tree.Directive = directive;
tree.DetachedRuleset = detachedRuleset;
tree.Operation = operation;
tree.Dimension = dimension;
tree.Unit = unit;
tree.Keyword = keyword;
tree.Variable = variable;
tree.Ruleset = ruleset;
tree.Element = element;
tree.Attribute = attribute;
tree.Combinator = combinator;
tree.Selector = selector;
tree.Quoted = quoted;
tree.Expression = expression;
tree.Rule = rule;
tree.Call = call;
tree.URL = url;
tree.Import = _import;
tree.mixin = {
  Call: mixinCall,
  Definition: mixinDefinition
};
tree.Comment = comment;
tree.Anonymous = anonymous;
tree.Value = value;
tree.JavaScript = javascript;
tree.Assignment = assignment;
tree.Condition = condition;
tree.Paren = paren;
tree.Media = media;
tree.UnicodeDescriptor = unicodeDescriptor;
tree.Negative = negative;
tree.Extend = extend;
tree.RulesetCall = rulesetCall;

var index$6 = tree;

var _visitArgs = { visitDeeper: true };
var _hasIndexed = false;

function _noop(node) {
  return node;
}

function indexNodeTypes(parent, ticker) {
  // add .typeIndex to tree node types for lookup table
  var key = void 0;

  var child = void 0;
  for (key in parent) {
    if (parent.hasOwnProperty(key)) {
      child = parent[key];
      switch (typeof child === 'undefined' ? 'undefined' : _typeof(child)) {
        case 'function':
          // ignore bound functions directly on tree which do not have a prototype
          // or aren't nodes
          if (child.prototype && child.prototype.type) {
            child.prototype.typeIndex = ticker++;
          }
          break;
        case 'object':
          ticker = indexNodeTypes(child, ticker);
          break;
      }
    }
  }
  return ticker;
}

var Visitor = function () {
  function Visitor(implementation) {
    classCallCheck(this, Visitor);

    this._implementation = implementation;
    this._visitFnCache = [];

    if (!_hasIndexed) {
      indexNodeTypes(index$6, 1);
      _hasIndexed = true;
    }
  }

  Visitor.prototype.visit = function visit(node) {
    if (!node) {
      return node;
    }

    var nodeTypeIndex = node.typeIndex;
    if (!nodeTypeIndex) {
      return node;
    }

    var visitFnCache = this._visitFnCache;
    var impl = this._implementation;
    var aryIndx = nodeTypeIndex << 1;
    var outAryIndex = aryIndx | 1;
    var func = visitFnCache[aryIndx];
    var funcOut = visitFnCache[outAryIndex];
    var visitArgs = _visitArgs;
    var fnName = void 0;

    visitArgs.visitDeeper = true;

    if (!func) {
      fnName = 'visit' + node.type;
      func = impl[fnName] || _noop;
      funcOut = impl[fnName + 'Out'] || _noop;
      visitFnCache[aryIndx] = func;
      visitFnCache[outAryIndex] = funcOut;
    }

    if (func !== _noop) {
      var newNode = func.call(impl, node, visitArgs);
      if (impl.isReplacing) {
        node = newNode;
      }
    }

    if (visitArgs.visitDeeper && node && node.accept) {
      node.accept(this);
    }

    if (funcOut != _noop) {
      funcOut.call(impl, node);
    }

    return node;
  };

  Visitor.prototype.visitArray = function visitArray(nodes, nonReplacing) {
    if (!nodes) {
      return nodes;
    }

    var cnt = nodes.length;
    var i = void 0;

    // Non-replacing
    if (nonReplacing || !this._implementation.isReplacing) {
      for (i = 0; i < cnt; i++) {
        this.visit(nodes[i]);
      }
      return nodes;
    }

    // Replacing
    var out = [];
    for (i = 0; i < cnt; i++) {
      var evald = this.visit(nodes[i]);
      if (evald === undefined) {
        continue;
      }
      if (!evald.splice) {
        out.push(evald);
      } else if (evald.length) {
        this.flatten(evald, out);
      }
    }
    return out;
  };

  Visitor.prototype.flatten = function flatten(arr, out) {
    if (!out) {
      out = [];
    }

    var cnt = void 0;
    var i = void 0;
    var item = void 0;
    var nestedCnt = void 0;
    var j = void 0;
    var nestedItem = void 0;

    for (i = 0, cnt = arr.length; i < cnt; i++) {
      item = arr[i];
      if (item === undefined) {
        continue;
      }
      if (!item.splice) {
        out.push(item);
        continue;
      }

      for (j = 0, nestedCnt = item.length; j < nestedCnt; j++) {
        nestedItem = item[j];
        if (nestedItem === undefined) {
          continue;
        }
        if (!nestedItem.splice) {
          out.push(nestedItem);
        } else if (nestedItem.length) {
          this.flatten(nestedItem, out);
        }
      }
    }

    return out;
  };

  return Visitor;
}();

var visitor = Visitor;

var ImportSequencer = function () {
  function ImportSequencer(onSequencerEmpty) {
    classCallCheck(this, ImportSequencer);

    this.imports = [];
    this.variableImports = [];
    this._onSequencerEmpty = onSequencerEmpty;
    this._currentDepth = 0;
  }

  ImportSequencer.prototype.addImport = function addImport(callback) {
    var importSequencer = this;

    var importItem = {
      callback: callback,
      args: null,
      isReady: false
    };

    this.imports.push(importItem);
    return function () {
      for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
        args[_key] = arguments[_key];
      }

      importItem.args = Array.prototype.slice.call(args, 0);
      importItem.isReady = true;
      importSequencer.tryRun();
    };
  };

  ImportSequencer.prototype.addVariableImport = function addVariableImport(callback) {
    this.variableImports.push(callback);
  };

  ImportSequencer.prototype.tryRun = function tryRun() {
    this._currentDepth++;
    try {
      while (true) {
        while (this.imports.length > 0) {
          var importItem = this.imports[0];
          if (!importItem.isReady) {
            return;
          }
          this.imports = this.imports.slice(1);
          importItem.callback.apply(null, importItem.args);
        }
        if (this.variableImports.length === 0) {
          break;
        }
        var variableImport = this.variableImports[0];
        this.variableImports = this.variableImports.slice(1);
        variableImport();
      }
    } finally {
      this._currentDepth--;
    }
    if (this._currentDepth === 0 && this._onSequencerEmpty) {
      this._onSequencerEmpty();
    }
  };

  return ImportSequencer;
}();

var importSequencer = ImportSequencer;

var ImportVisitor = function ImportVisitor(importer, finish) {
  this._visitor = new visitor(this);
  this._importer = importer;
  this._finish = finish;
  this.context = new contexts_1.Eval();
  this.importCount = 0;
  this.onceFileDetectionMap = {};
  this.recursionDetector = {};
  this._sequencer = new importSequencer(this._onSequencerEmpty.bind(this));
};

ImportVisitor.prototype = {
  isReplacing: false,
  run: function run(root) {
    try {
      // process the contents
      this._visitor.visit(root);
    } catch (e) {
      this.error = e;
    }

    this.isFinished = true;
    this._sequencer.tryRun();
  },
  _onSequencerEmpty: function _onSequencerEmpty() {
    if (!this.isFinished) {
      return;
    }
    this._finish(this.error);
  },
  visitImport: function visitImport(importNode, visitArgs) {
    var inlineCSS = importNode.options.inline;

    if (!importNode.css || inlineCSS) {
      var context = new contexts_1.Eval(this.context, this.context.frames.slice(0));
      var importParent = context.frames[0];

      this.importCount++;
      if (importNode.isVariableImport()) {
        this._sequencer.addVariableImport(this.processImportNode.bind(this, importNode, context, importParent));
      } else {
        this.processImportNode(importNode, context, importParent);
      }
    }
    visitArgs.visitDeeper = false;
  },
  processImportNode: function processImportNode(importNode, context, importParent) {
    var evaldImportNode = void 0;
    var inlineCSS = importNode.options.inline;

    try {
      evaldImportNode = importNode.evalForImport(context);
    } catch (e) {
      if (!e.filename) {
        e.index = importNode.index;
        e.filename = importNode.currentFileInfo.filename;
      }
      // attempt to eval properly and treat as css
      importNode.css = true;
      // if that fails, this error will be thrown
      importNode.error = e;
    }

    if (evaldImportNode && (!evaldImportNode.css || inlineCSS)) {
      if (evaldImportNode.options.multiple) {
        context.importMultiple = true;
      }

      // try appending if we haven't determined if it is css or not
      var tryAppendLessExtension = evaldImportNode.css === undefined;

      for (var i = 0; i < importParent.rules.length; i++) {
        if (importParent.rules[i] === importNode) {
          importParent.rules[i] = evaldImportNode;
          break;
        }
      }

      var onImported = this.onImported.bind(this, evaldImportNode, context);
      var sequencedOnImported = this._sequencer.addImport(onImported);

      this._importer.push(evaldImportNode.getPath(), tryAppendLessExtension, evaldImportNode.currentFileInfo, evaldImportNode.options, sequencedOnImported);
    } else {
      this.importCount--;
      if (this.isFinished) {
        this._sequencer.tryRun();
      }
    }
  },
  onImported: function onImported(importNode, context, e, root, importedAtRoot, fullPath) {
    if (e) {
      if (!e.filename) {
        e.index = importNode.index;
        e.filename = importNode.currentFileInfo.filename;
      }
      this.error = e;
    }

    var importVisitor = this;
    var inlineCSS = importNode.options.inline;
    var isPlugin = importNode.options.plugin;
    var isOptional = importNode.options.optional;
    var duplicateImport = importedAtRoot || fullPath in importVisitor.recursionDetector;

    if (!context.importMultiple) {
      if (duplicateImport) {
        importNode.skip = true;
      } else {
        importNode.skip = function () {
          if (fullPath in importVisitor.onceFileDetectionMap) {
            return true;
          }
          importVisitor.onceFileDetectionMap[fullPath] = true;
          return false;
        };
      }
    }

    if (!fullPath && isOptional) {
      importNode.skip = true;
    }

    if (root) {
      importNode.root = root;
      importNode.importedFilename = fullPath;

      if (!inlineCSS && !isPlugin && (context.importMultiple || !duplicateImport)) {
        importVisitor.recursionDetector[fullPath] = true;

        var oldContext = this.context;
        this.context = context;
        try {
          this._visitor.visit(root);
        } catch (e) {
          this.error = e;
        }
        this.context = oldContext;
      }
    }

    importVisitor.importCount--;

    if (importVisitor.isFinished) {
      importVisitor._sequencer.tryRun();
    }
  },
  visitRule: function visitRule(ruleNode, visitArgs) {
    if (ruleNode.value.type === 'DetachedRuleset') {
      this.context.frames.unshift(ruleNode);
    } else {
      visitArgs.visitDeeper = false;
    }
  },
  visitRuleOut: function visitRuleOut(ruleNode) {
    if (ruleNode.value.type === 'DetachedRuleset') {
      this.context.frames.shift();
    }
  },
  visitDirective: function visitDirective(directiveNode, visitArgs) {
    this.context.frames.unshift(directiveNode);
  },
  visitDirectiveOut: function visitDirectiveOut(directiveNode) {
    this.context.frames.shift();
  },
  visitMixinDefinition: function visitMixinDefinition(mixinDefinitionNode, visitArgs) {
    this.context.frames.unshift(mixinDefinitionNode);
  },
  visitMixinDefinitionOut: function visitMixinDefinitionOut(mixinDefinitionNode) {
    this.context.frames.shift();
  },
  visitRuleset: function visitRuleset(rulesetNode, visitArgs) {
    this.context.frames.unshift(rulesetNode);
  },
  visitRulesetOut: function visitRulesetOut(rulesetNode) {
    this.context.frames.shift();
  },
  visitMedia: function visitMedia(mediaNode, visitArgs) {
    this.context.frames.unshift(mediaNode.rules[0]);
  },
  visitMediaOut: function visitMediaOut(mediaNode) {
    this.context.frames.shift();
  }
};
var importVisitor = ImportVisitor;

var SetTreeVisibilityVisitor = function () {
  function SetTreeVisibilityVisitor(visible) {
    classCallCheck(this, SetTreeVisibilityVisitor);

    this.visible = visible;
  }

  SetTreeVisibilityVisitor.prototype.run = function run(root) {
    this.visit(root);
  };

  SetTreeVisibilityVisitor.prototype.visitArray = function visitArray(nodes) {
    if (!nodes) {
      return nodes;
    }

    var cnt = nodes.length;
    var i = void 0;
    for (i = 0; i < cnt; i++) {
      this.visit(nodes[i]);
    }
    return nodes;
  };

  SetTreeVisibilityVisitor.prototype.visit = function visit(node) {
    if (!node) {
      return node;
    }
    if (node.constructor === Array) {
      return this.visitArray(node);
    }

    if (!node.blocksVisibility || node.blocksVisibility()) {
      return node;
    }
    if (this.visible) {
      node.ensureVisibility();
    } else {
      node.ensureInvisibility();
    }

    node.accept(this);
    return node;
  };

  return SetTreeVisibilityVisitor;
}();

var setTreeVisibilityVisitor = SetTreeVisibilityVisitor;

/*jshint loopfunc:true */

var ExtendFinderVisitor = function () {
  function ExtendFinderVisitor() {
    classCallCheck(this, ExtendFinderVisitor);

    this._visitor = new visitor(this);
    this.contexts = [];
    this.allExtendsStack = [[]];
  }

  ExtendFinderVisitor.prototype.run = function run(root) {
    root = this._visitor.visit(root);
    root.allExtends = this.allExtendsStack[0];
    return root;
  };

  ExtendFinderVisitor.prototype.visitRule = function visitRule(ruleNode, visitArgs) {
    visitArgs.visitDeeper = false;
  };

  ExtendFinderVisitor.prototype.visitMixinDefinition = function visitMixinDefinition(mixinDefinitionNode, visitArgs) {
    visitArgs.visitDeeper = false;
  };

  ExtendFinderVisitor.prototype.visitRuleset = function visitRuleset(rulesetNode, visitArgs) {
    if (rulesetNode.root) {
      return;
    }

    var i = void 0;
    var j = void 0;
    var extend = void 0;
    var allSelectorsExtendList = [];
    var extendList = void 0;

    // get &:extend(.a); rules which apply to all selectors in this ruleset
    var rules = rulesetNode.rules;

    var ruleCnt = rules ? rules.length : 0;
    for (i = 0; i < ruleCnt; i++) {
      if (rulesetNode.rules[i] instanceof index$6.Extend) {
        allSelectorsExtendList.push(rules[i]);
        rulesetNode.extendOnEveryPath = true;
      }
    }

    // now find every selector and apply the extends that apply to all extends
    // and the ones which apply to an individual extend
    var paths = rulesetNode.paths;
    for (i = 0; i < paths.length; i++) {
      var selectorPath = paths[i];
      var selector = selectorPath[selectorPath.length - 1];
      var selExtendList = selector.extendList;

      extendList = selExtendList ? selExtendList.slice(0).concat(allSelectorsExtendList) : allSelectorsExtendList;

      if (extendList) {
        extendList = extendList.map(function (allSelectorsExtend) {
          return allSelectorsExtend.clone();
        });
      }

      for (j = 0; j < extendList.length; j++) {
        this.foundExtends = true;
        extend = extendList[j];
        extend.findSelfSelectors(selectorPath);
        extend.ruleset = rulesetNode;
        if (j === 0) {
          extend.firstExtendOnThisSelectorPath = true;
        }
        this.allExtendsStack[this.allExtendsStack.length - 1].push(extend);
      }
    }

    this.contexts.push(rulesetNode.selectors);
  };

  ExtendFinderVisitor.prototype.visitRulesetOut = function visitRulesetOut(rulesetNode) {
    if (!rulesetNode.root) {
      this.contexts.length = this.contexts.length - 1;
    }
  };

  ExtendFinderVisitor.prototype.visitMedia = function visitMedia(mediaNode, visitArgs) {
    mediaNode.allExtends = [];
    this.allExtendsStack.push(mediaNode.allExtends);
  };

  ExtendFinderVisitor.prototype.visitMediaOut = function visitMediaOut(mediaNode) {
    this.allExtendsStack.length = this.allExtendsStack.length - 1;
  };

  ExtendFinderVisitor.prototype.visitDirective = function visitDirective(directiveNode, visitArgs) {
    directiveNode.allExtends = [];
    this.allExtendsStack.push(directiveNode.allExtends);
  };

  ExtendFinderVisitor.prototype.visitDirectiveOut = function visitDirectiveOut(directiveNode) {
    this.allExtendsStack.length = this.allExtendsStack.length - 1;
  };

  return ExtendFinderVisitor;
}();

var ProcessExtendsVisitor = function () {
  function ProcessExtendsVisitor() {
    classCallCheck(this, ProcessExtendsVisitor);

    this._visitor = new visitor(this);
  }

  ProcessExtendsVisitor.prototype.run = function run(root) {
    var extendFinder = new ExtendFinderVisitor();
    this.extendIndices = {};
    extendFinder.run(root);
    if (!extendFinder.foundExtends) {
      return root;
    }
    root.allExtends = root.allExtends.concat(this.doExtendChaining(root.allExtends, root.allExtends));
    this.allExtendsStack = [root.allExtends];
    var newRoot = this._visitor.visit(root);
    this.checkExtendsForNonMatched(root.allExtends);
    return newRoot;
  };

  ProcessExtendsVisitor.prototype.checkExtendsForNonMatched = function checkExtendsForNonMatched(extendList) {
    var indices = this.extendIndices;
    extendList.filter(function (extend) {
      return !extend.hasFoundMatches && extend.parent_ids.length == 1;
    }).forEach(function (extend) {
      var selector = '_unknown_';
      try {
        selector = extend.selector.toCSS({});
      } catch (_) {}

      if (!indices[extend.index + ' ' + selector]) {
        indices[extend.index + ' ' + selector] = true;
        logger.warn('extend \'' + selector + '\' has no matches');
      }
    });
  };

  ProcessExtendsVisitor.prototype.doExtendChaining = function doExtendChaining(extendsList, extendsListTarget, iterationCount) {
    //
    // chaining is different from normal extension.. if we extend an extend then we are not just copying, altering
    // and pasting the selector we would do normally, but we are also adding an extend with the same target selector
    // this means this new extend can then go and alter other extends
    //
    // this method deals with all the chaining work - without it, extend is flat and doesn't work on other extend selectors
    // this is also the most expensive.. and a match on one selector can cause an extension of a selector we had already
    // processed if we look at each selector at a time, as is done in visitRuleset

    var extendIndex = void 0;

    var targetExtendIndex = void 0;
    var matches = void 0;
    var extendsToAdd = [];
    var newSelector = void 0;
    var extendVisitor = this;
    var selectorPath = void 0;
    var extend = void 0;
    var targetExtend = void 0;
    var newExtend = void 0;

    iterationCount = iterationCount || 0;

    //loop through comparing every extend with every target extend.
    // a target extend is the one on the ruleset we are looking at copy/edit/pasting in place
    // e.g.  .a:extend(.b) {}  and .b:extend(.c) {} then the first extend extends the second one
    // and the second is the target.
    // the separation into two lists allows us to process a subset of chains with a bigger set, as is the
    // case when processing media queries
    for (extendIndex = 0; extendIndex < extendsList.length; extendIndex++) {
      for (targetExtendIndex = 0; targetExtendIndex < extendsListTarget.length; targetExtendIndex++) {
        extend = extendsList[extendIndex];
        targetExtend = extendsListTarget[targetExtendIndex];

        // look for circular references
        if (extend.parent_ids.indexOf(targetExtend.object_id) >= 0) {
          continue;
        }

        // find a match in the target extends self selector (the bit before :extend)
        selectorPath = [targetExtend.selfSelectors[0]];
        matches = extendVisitor.findMatch(extend, selectorPath);

        if (matches.length) {
          extend.hasFoundMatches = true;

          // we found a match, so for each self selector..
          extend.selfSelectors.forEach(function (selfSelector) {
            var info = targetExtend.visibilityInfo();

            // process the extend as usual
            newSelector = extendVisitor.extendSelector(matches, selectorPath, selfSelector, extend.isVisible());

            // but now we create a new extend from it
            newExtend = new index$6.Extend(targetExtend.selector, targetExtend.option, 0, targetExtend.currentFileInfo, info);
            newExtend.selfSelectors = newSelector;

            // add the extend onto the list of extends for that selector
            newSelector[newSelector.length - 1].extendList = [newExtend];

            // record that we need to add it.
            extendsToAdd.push(newExtend);
            newExtend.ruleset = targetExtend.ruleset;

            //remember its parents for circular references
            newExtend.parent_ids = newExtend.parent_ids.concat(targetExtend.parent_ids, extend.parent_ids);

            // only process the selector once.. if we have :extend(.a,.b) then multiple
            // extends will look at the same selector path, so when extending
            // we know that any others will be duplicates in terms of what is added to the css
            if (targetExtend.firstExtendOnThisSelectorPath) {
              newExtend.firstExtendOnThisSelectorPath = true;
              targetExtend.ruleset.paths.push(newSelector);
            }
          });
        }
      }
    }

    if (extendsToAdd.length) {
      // try to detect circular references to stop a stack overflow.
      // may no longer be needed.
      this.extendChainCount++;
      if (iterationCount > 100) {
        var selectorOne = '{unable to calculate}';
        var selectorTwo = '{unable to calculate}';
        try {
          selectorOne = extendsToAdd[0].selfSelectors[0].toCSS();
          selectorTwo = extendsToAdd[0].selector.toCSS();
        } catch (e) {}
        throw {
          message: 'extend circular reference detected. One of the circular extends is currently:' + selectorOne + ':extend(' + selectorTwo + ')'
        };
      }

      // now process the new extends on the existing rules so that we can handle a extending b extending c extending
      // d extending e...
      return extendsToAdd.concat(extendVisitor.doExtendChaining(extendsToAdd, extendsListTarget, iterationCount + 1));
    } else {
      return extendsToAdd;
    }
  };

  ProcessExtendsVisitor.prototype.visitRule = function visitRule(ruleNode, visitArgs) {
    visitArgs.visitDeeper = false;
  };

  ProcessExtendsVisitor.prototype.visitMixinDefinition = function visitMixinDefinition(mixinDefinitionNode, visitArgs) {
    visitArgs.visitDeeper = false;
  };

  ProcessExtendsVisitor.prototype.visitSelector = function visitSelector(selectorNode, visitArgs) {
    visitArgs.visitDeeper = false;
  };

  ProcessExtendsVisitor.prototype.visitRuleset = function visitRuleset(rulesetNode, visitArgs) {
    if (rulesetNode.root) {
      return;
    }
    var matches = void 0;
    var pathIndex = void 0;
    var extendIndex = void 0;
    var allExtends = this.allExtendsStack[this.allExtendsStack.length - 1];
    var selectorsToAdd = [];
    var extendVisitor = this;
    var selectorPath = void 0;

    // look at each selector path in the ruleset, find any extend matches and then copy, find and replace

    for (extendIndex = 0; extendIndex < allExtends.length; extendIndex++) {
      for (pathIndex = 0; pathIndex < rulesetNode.paths.length; pathIndex++) {
        selectorPath = rulesetNode.paths[pathIndex];

        // extending extends happens initially, before the main pass
        if (rulesetNode.extendOnEveryPath) {
          continue;
        }
        var extendList = selectorPath[selectorPath.length - 1].extendList;
        if (extendList && extendList.length) {
          continue;
        }

        matches = this.findMatch(allExtends[extendIndex], selectorPath);

        if (matches.length) {
          allExtends[extendIndex].hasFoundMatches = true;

          allExtends[extendIndex].selfSelectors.forEach(function (selfSelector) {
            var extendedSelectors = void 0;
            extendedSelectors = extendVisitor.extendSelector(matches, selectorPath, selfSelector, allExtends[extendIndex].isVisible());
            selectorsToAdd.push(extendedSelectors);
          });
        }
      }
    }
    rulesetNode.paths = rulesetNode.paths.concat(selectorsToAdd);
  };

  ProcessExtendsVisitor.prototype.findMatch = function findMatch(extend, haystackSelectorPath) {
    //
    // look through the haystack selector path to try and find the needle - extend.selector
    // returns an array of selector matches that can then be replaced
    //
    var haystackSelectorIndex = void 0;

    var hackstackSelector = void 0;
    var hackstackElementIndex = void 0;
    var haystackElement = void 0;
    var targetCombinator = void 0;
    var i = void 0;
    var extendVisitor = this;
    var needleElements = extend.selector.elements;
    var potentialMatches = [];
    var potentialMatch = void 0;
    var matches = [];

    // loop through the haystack elements
    for (haystackSelectorIndex = 0; haystackSelectorIndex < haystackSelectorPath.length; haystackSelectorIndex++) {
      hackstackSelector = haystackSelectorPath[haystackSelectorIndex];

      for (hackstackElementIndex = 0; hackstackElementIndex < hackstackSelector.elements.length; hackstackElementIndex++) {
        haystackElement = hackstackSelector.elements[hackstackElementIndex];

        // if we allow elements before our match we can add a potential match every time. otherwise only at the first element.
        if (extend.allowBefore || haystackSelectorIndex === 0 && hackstackElementIndex === 0) {
          potentialMatches.push({
            pathIndex: haystackSelectorIndex,
            index: hackstackElementIndex,
            matched: 0,
            initialCombinator: haystackElement.combinator
          });
        }

        for (i = 0; i < potentialMatches.length; i++) {
          potentialMatch = potentialMatches[i];

          // selectors add " " onto the first element. When we use & it joins the selectors together, but if we don't
          // then each selector in haystackSelectorPath has a space before it added in the toCSS phase. so we need to
          // work out what the resulting combinator will be
          targetCombinator = haystackElement.combinator.value;
          if (targetCombinator === '' && hackstackElementIndex === 0) {
            targetCombinator = ' ';
          }

          // if we don't match, null our match to indicate failure
          if (!extendVisitor.isElementValuesEqual(needleElements[potentialMatch.matched].value, haystackElement.value) || potentialMatch.matched > 0 && needleElements[potentialMatch.matched].combinator.value !== targetCombinator) {
            potentialMatch = null;
          } else {
            potentialMatch.matched++;
          }

          // if we are still valid and have finished, test whether we have elements after and whether these are allowed
          if (potentialMatch) {
            potentialMatch.finished = potentialMatch.matched === needleElements.length;
            if (potentialMatch.finished && !extend.allowAfter && (hackstackElementIndex + 1 < hackstackSelector.elements.length || haystackSelectorIndex + 1 < haystackSelectorPath.length)) {
              potentialMatch = null;
            }
          }
          // if null we remove, if not, we are still valid, so either push as a valid match or continue
          if (potentialMatch) {
            if (potentialMatch.finished) {
              potentialMatch.length = needleElements.length;
              potentialMatch.endPathIndex = haystackSelectorIndex;
              potentialMatch.endPathElementIndex = hackstackElementIndex + 1; // index after end of match
              potentialMatches.length = 0; // we don't allow matches to overlap, so start matching again
              matches.push(potentialMatch);
            }
          } else {
            potentialMatches.splice(i, 1);
            i--;
          }
        }
      }
    }
    return matches;
  };

  ProcessExtendsVisitor.prototype.isElementValuesEqual = function isElementValuesEqual(elementValue1, elementValue2) {
    if (typeof elementValue1 === 'string' || typeof elementValue2 === 'string') {
      return elementValue1 === elementValue2;
    }
    if (elementValue1 instanceof index$6.Attribute) {
      if (elementValue1.op !== elementValue2.op || elementValue1.key !== elementValue2.key) {
        return false;
      }
      if (!elementValue1.value || !elementValue2.value) {
        if (elementValue1.value || elementValue2.value) {
          return false;
        }
        return true;
      }
      elementValue1 = elementValue1.value.value || elementValue1.value;
      elementValue2 = elementValue2.value.value || elementValue2.value;
      return elementValue1 === elementValue2;
    }
    elementValue1 = elementValue1.value;
    elementValue2 = elementValue2.value;
    if (elementValue1 instanceof index$6.Selector) {
      if (!(elementValue2 instanceof index$6.Selector) || elementValue1.elements.length !== elementValue2.elements.length) {
        return false;
      }
      for (var i = 0; i < elementValue1.elements.length; i++) {
        if (elementValue1.elements[i].combinator.value !== elementValue2.elements[i].combinator.value) {
          if (i !== 0 || (elementValue1.elements[i].combinator.value || ' ') !== (elementValue2.elements[i].combinator.value || ' ')) {
            return false;
          }
        }
        if (!this.isElementValuesEqual(elementValue1.elements[i].value, elementValue2.elements[i].value)) {
          return false;
        }
      }
      return true;
    }
    return false;
  };

  ProcessExtendsVisitor.prototype.extendSelector = function extendSelector(matches, selectorPath, replacementSelector, isVisible) {
    //for a set of matches, replace each match with the replacement selector

    var currentSelectorPathIndex = 0;

    var currentSelectorPathElementIndex = 0;
    var path = [];
    var matchIndex = void 0;
    var selector = void 0;
    var firstElement = void 0;
    var match = void 0;
    var newElements = void 0;

    for (matchIndex = 0; matchIndex < matches.length; matchIndex++) {
      match = matches[matchIndex];
      selector = selectorPath[match.pathIndex];
      firstElement = new index$6.Element(match.initialCombinator, replacementSelector.elements[0].value, replacementSelector.elements[0].index, replacementSelector.elements[0].currentFileInfo);

      if (match.pathIndex > currentSelectorPathIndex && currentSelectorPathElementIndex > 0) {
        path[path.length - 1].elements = path[path.length - 1].elements.concat(selectorPath[currentSelectorPathIndex].elements.slice(currentSelectorPathElementIndex));
        currentSelectorPathElementIndex = 0;
        currentSelectorPathIndex++;
      }

      newElements = selector.elements.slice(currentSelectorPathElementIndex, match.index).concat([firstElement]).concat(replacementSelector.elements.slice(1));

      if (currentSelectorPathIndex === match.pathIndex && matchIndex > 0) {
        path[path.length - 1].elements = path[path.length - 1].elements.concat(newElements);
      } else {
        path = path.concat(selectorPath.slice(currentSelectorPathIndex, match.pathIndex));

        path.push(new index$6.Selector(newElements));
      }
      currentSelectorPathIndex = match.endPathIndex;
      currentSelectorPathElementIndex = match.endPathElementIndex;
      if (currentSelectorPathElementIndex >= selectorPath[currentSelectorPathIndex].elements.length) {
        currentSelectorPathElementIndex = 0;
        currentSelectorPathIndex++;
      }
    }

    if (currentSelectorPathIndex < selectorPath.length && currentSelectorPathElementIndex > 0) {
      path[path.length - 1].elements = path[path.length - 1].elements.concat(selectorPath[currentSelectorPathIndex].elements.slice(currentSelectorPathElementIndex));
      currentSelectorPathIndex++;
    }

    path = path.concat(selectorPath.slice(currentSelectorPathIndex, selectorPath.length));
    path = path.map(function (currentValue) {
      // we can re-use elements here, because the visibility property matters only for selectors
      var derived = currentValue.createDerived(currentValue.elements);
      if (isVisible) {
        derived.ensureVisibility();
      } else {
        derived.ensureInvisibility();
      }
      return derived;
    });
    return path;
  };

  ProcessExtendsVisitor.prototype.visitMedia = function visitMedia(mediaNode, visitArgs) {
    var newAllExtends = mediaNode.allExtends.concat(this.allExtendsStack[this.allExtendsStack.length - 1]);
    newAllExtends = newAllExtends.concat(this.doExtendChaining(newAllExtends, mediaNode.allExtends));
    this.allExtendsStack.push(newAllExtends);
  };

  ProcessExtendsVisitor.prototype.visitMediaOut = function visitMediaOut(mediaNode) {
    var lastIndex = this.allExtendsStack.length - 1;
    this.allExtendsStack.length = lastIndex;
  };

  ProcessExtendsVisitor.prototype.visitDirective = function visitDirective(directiveNode, visitArgs) {
    var newAllExtends = directiveNode.allExtends.concat(this.allExtendsStack[this.allExtendsStack.length - 1]);
    newAllExtends = newAllExtends.concat(this.doExtendChaining(newAllExtends, directiveNode.allExtends));
    this.allExtendsStack.push(newAllExtends);
  };

  ProcessExtendsVisitor.prototype.visitDirectiveOut = function visitDirectiveOut(directiveNode) {
    var lastIndex = this.allExtendsStack.length - 1;
    this.allExtendsStack.length = lastIndex;
  };

  return ProcessExtendsVisitor;
}();

var extendVisitor = ProcessExtendsVisitor;

var JoinSelectorVisitor = function () {
  function JoinSelectorVisitor() {
    classCallCheck(this, JoinSelectorVisitor);

    this.contexts = [[]];
    this._visitor = new visitor(this);
  }

  JoinSelectorVisitor.prototype.run = function run(root) {
    return this._visitor.visit(root);
  };

  JoinSelectorVisitor.prototype.visitRule = function visitRule(ruleNode, visitArgs) {
    visitArgs.visitDeeper = false;
  };

  JoinSelectorVisitor.prototype.visitMixinDefinition = function visitMixinDefinition(mixinDefinitionNode, visitArgs) {
    visitArgs.visitDeeper = false;
  };

  JoinSelectorVisitor.prototype.visitRuleset = function visitRuleset(rulesetNode, visitArgs) {
    var context = this.contexts[this.contexts.length - 1];
    var paths = [];
    var selectors = void 0;

    this.contexts.push(paths);

    if (!rulesetNode.root) {
      selectors = rulesetNode.selectors;
      if (selectors) {
        selectors = selectors.filter(function (selector) {
          return selector.getIsOutput();
        });
        rulesetNode.selectors = selectors.length ? selectors : selectors = null;
        if (selectors) {
          rulesetNode.joinSelectors(paths, context, selectors);
        }
      }
      if (!selectors) {
        rulesetNode.rules = null;
      }
      rulesetNode.paths = paths;
    }
  };

  JoinSelectorVisitor.prototype.visitRulesetOut = function visitRulesetOut(rulesetNode) {
    this.contexts.length = this.contexts.length - 1;
  };

  JoinSelectorVisitor.prototype.visitMedia = function visitMedia(mediaNode, visitArgs) {
    var context = this.contexts[this.contexts.length - 1];
    mediaNode.rules[0].root = context.length === 0 || context[0].multiMedia;
  };

  JoinSelectorVisitor.prototype.visitDirective = function visitDirective(directiveNode, visitArgs) {
    var context = this.contexts[this.contexts.length - 1];
    if (directiveNode.rules && directiveNode.rules.length) {
      directiveNode.rules[0].root = directiveNode.isRooted || context.length === 0 || null;
    }
  };

  return JoinSelectorVisitor;
}();

var joinSelectorVisitor = JoinSelectorVisitor;

var CSSVisitorUtils = function () {
  function CSSVisitorUtils(context) {
    classCallCheck(this, CSSVisitorUtils);

    this._visitor = new visitor(this);
    this._context = context;
  }

  CSSVisitorUtils.prototype.containsSilentNonBlockedChild = function containsSilentNonBlockedChild(bodyRules) {
    var rule = void 0;
    if (bodyRules == null) {
      return false;
    }
    for (var r = 0; r < bodyRules.length; r++) {
      rule = bodyRules[r];
      if (rule.isSilent && rule.isSilent(this._context) && !rule.blocksVisibility()) {
        //the directive contains something that was referenced (likely by extend)
        //therefore it needs to be shown in output too
        return true;
      }
    }
    return false;
  };

  CSSVisitorUtils.prototype.keepOnlyVisibleChilds = function keepOnlyVisibleChilds(owner) {
    if (owner == null || owner.rules == null) {
      return;
    }

    owner.rules = owner.rules.filter(function (thing) {
      return thing.isVisible();
    });
  };

  CSSVisitorUtils.prototype.isEmpty = function isEmpty(owner) {
    if (owner == null || owner.rules == null) {
      return true;
    }
    return owner.rules.length === 0;
  };

  CSSVisitorUtils.prototype.hasVisibleSelector = function hasVisibleSelector(rulesetNode) {
    if (rulesetNode == null || rulesetNode.paths == null) {
      return false;
    }
    return rulesetNode.paths.length > 0;
  };

  CSSVisitorUtils.prototype.resolveVisibility = function resolveVisibility(node, originalRules) {
    if (!node.blocksVisibility()) {
      if (this.isEmpty(node) && !this.containsSilentNonBlockedChild(originalRules)) {
        return;
      }

      return node;
    }

    var compiledRulesBody = node.rules[0];
    this.keepOnlyVisibleChilds(compiledRulesBody);

    if (this.isEmpty(compiledRulesBody)) {
      return;
    }

    node.ensureVisibility();
    node.removeVisibilityBlock();

    return node;
  };

  CSSVisitorUtils.prototype.isVisibleRuleset = function isVisibleRuleset(rulesetNode) {
    if (rulesetNode.firstRoot) {
      return true;
    }

    if (this.isEmpty(rulesetNode)) {
      return false;
    }

    if (!rulesetNode.root && !this.hasVisibleSelector(rulesetNode)) {
      return false;
    }

    return true;
  };

  return CSSVisitorUtils;
}();

var ToCSSVisitor = function ToCSSVisitor(context) {
  this._visitor = new visitor(this);
  this._context = context;
  this.utils = new CSSVisitorUtils(context);
  this._level = 0;
};

ToCSSVisitor.prototype = {
  isReplacing: true,
  run: function run(root) {
    return this._visitor.visit(root);
  },
  visitRule: function visitRule(ruleNode, visitArgs) {
    if (ruleNode.blocksVisibility()) {
      return;
    }
    if (ruleNode.variable) {
      if (!this._context.simplify) return; //We don't need any variables
      if (this._level > this._context.simplifyLevel) return; //Variable is too deep
      if (this._context.simplifyFilter && !this._context.simplifyFilter.test(ruleNode.name)) return; //Variable didnt pass filter
    }
    return ruleNode;
  },
  visitMixinDefinition: function visitMixinDefinition(mixinNode, visitArgs) {
    // mixin definitions do not get eval'd - this means they keep state
    // so we have to clear that state here so it isn't used if toCSS is called twice
    mixinNode.frames = [];
  },
  visitExtend: function visitExtend(extendNode, visitArgs) {},
  visitComment: function visitComment(commentNode, visitArgs) {
    if (commentNode.blocksVisibility() || commentNode.isSilent(this._context)) {
      return;
    }
    return commentNode;
  },
  visitMedia: function visitMedia(mediaNode, visitArgs) {
    var originalRules = mediaNode.rules[0].rules;
    mediaNode.accept(this._visitor);
    visitArgs.visitDeeper = false;

    return this.utils.resolveVisibility(mediaNode, originalRules);
  },
  visitImport: function visitImport(importNode, visitArgs) {
    if (importNode.blocksVisibility()) {
      return;
    }
    return importNode;
  },
  visitDirective: function visitDirective(directiveNode, visitArgs) {
    if (directiveNode.rules && directiveNode.rules.length) {
      return this.visitDirectiveWithBody(directiveNode, visitArgs);
    } else {
      return this.visitDirectiveWithoutBody(directiveNode, visitArgs);
    }
  },
  visitDirectiveWithBody: function visitDirectiveWithBody(directiveNode, visitArgs) {
    //if there is only one nested ruleset and that one has no path, then it is
    //just fake ruleset
    function hasFakeRuleset(directiveNode) {
      var bodyRules = directiveNode.rules;
      return bodyRules.length === 1 && (!bodyRules[0].paths || bodyRules[0].paths.length === 0);
    }
    function getBodyRules(directiveNode) {
      var nodeRules = directiveNode.rules;
      if (hasFakeRuleset(directiveNode)) {
        return nodeRules[0].rules;
      }

      return nodeRules;
    }
    //it is still true that it is only one ruleset in array
    //this is last such moment
    //process childs
    var originalRules = getBodyRules(directiveNode);
    directiveNode.accept(this._visitor);
    visitArgs.visitDeeper = false;

    if (!this.utils.isEmpty(directiveNode)) {
      this._mergeRules(directiveNode.rules[0].rules);
    }

    return this.utils.resolveVisibility(directiveNode, originalRules);
  },
  visitDirectiveWithoutBody: function visitDirectiveWithoutBody(directiveNode, visitArgs) {
    if (directiveNode.blocksVisibility()) {
      return;
    }

    if (directiveNode.name === '@charset') {
      // Only output the debug info together with subsequent @charset definitions
      // a comment (or @media statement) before the actual @charset directive would
      // be considered illegal css as it has to be on the first line
      if (this.charset) {
        if (directiveNode.debugInfo) {
          var comment = new index$6.Comment('/* ' + directiveNode.toCSS(this._context).replace(/\n/g, '') + ' */\n');
          comment.debugInfo = directiveNode.debugInfo;
          return this._visitor.visit(comment);
        }
        return;
      }
      this.charset = true;
    }

    return directiveNode;
  },
  checkValidNodes: function checkValidNodes(rules, isRoot) {
    if (!rules) {
      return;
    }

    for (var i = 0; i < rules.length; i++) {
      var ruleNode = rules[i];
      if (isRoot && ruleNode instanceof index$6.Rule && !ruleNode.variable) {
        throw {
          message: 'Properties must be inside selector blocks. They cannot be in the root',
          index: ruleNode.index,
          filename: ruleNode.currentFileInfo && ruleNode.currentFileInfo.filename
        };
      }
      if (ruleNode instanceof index$6.Call) {
        throw {
          message: 'Function \'' + ruleNode.name + '\' is undefined',
          index: ruleNode.index,
          filename: ruleNode.currentFileInfo && ruleNode.currentFileInfo.filename
        };
      }
      if (ruleNode.type && !ruleNode.allowRoot) {
        throw {
          message: ruleNode.type + ' node returned by a function is not valid here',
          index: ruleNode.index,
          filename: ruleNode.currentFileInfo && ruleNode.currentFileInfo.filename
        };
      }
    }
  },
  visitRulesetOut: function visitRulesetOut(rulesetNode) {
    this._level--;
  },
  visitRuleset: function visitRuleset(rulesetNode, visitArgs) {
    this._level++;

    //at this point rulesets are nested into each other
    var rule = void 0;

    var rulesets = [];

    this.checkValidNodes(rulesetNode.rules, rulesetNode.firstRoot);

    if (!rulesetNode.root) {
      //remove invisible paths
      this._compileRulesetPaths(rulesetNode);

      // remove rulesets from this ruleset body and compile them separately
      var nodeRules = rulesetNode.rules;

      var nodeRuleCnt = nodeRules ? nodeRules.length : 0;
      for (var i = 0; i < nodeRuleCnt;) {
        rule = nodeRules[i];
        if (rule && rule.rules) {
          // visit because we are moving them out from being a child
          rulesets.push(this._visitor.visit(rule));
          nodeRules.splice(i, 1);
          nodeRuleCnt--;
          continue;
        }
        i++;
      }
      // accept the visitor to remove rules and refactor itself
      // then we can decide nogw whether we want it or not
      // compile body
      if (nodeRuleCnt > 0) {
        rulesetNode.accept(this._visitor);
      } else {
        rulesetNode.rules = null;
      }
      visitArgs.visitDeeper = false;
    } else {
      //if (! rulesetNode.root) {
      rulesetNode.accept(this._visitor);
      visitArgs.visitDeeper = false;
    }

    if (rulesetNode.rules) {
      this._mergeRules(rulesetNode.rules);
      this._removeDuplicateRules(rulesetNode.rules);
    }

    //now decide whether we keep the ruleset
    if (this.utils.isVisibleRuleset(rulesetNode)) {
      rulesetNode.ensureVisibility();
      rulesets.splice(0, 0, rulesetNode);
    }

    if (rulesets.length === 1) {
      return rulesets[0];
    }
    return rulesets;
  },
  _compileRulesetPaths: function _compileRulesetPaths(rulesetNode) {
    if (rulesetNode.paths) {
      rulesetNode.paths = rulesetNode.paths.filter(function (p) {
        var i = void 0;
        if (p[0].elements[0].combinator.value === ' ') {
          p[0].elements[0].combinator = new index$6.Combinator('');
        }
        for (i = 0; i < p.length; i++) {
          if (p[i].isVisible() && p[i].getIsOutput()) {
            return true;
          }
        }
        return false;
      });
    }
  },
  _removeDuplicateRules: function _removeDuplicateRules(rules) {
    if (!rules) {
      return;
    }

    // remove duplicates
    var ruleCache = {};

    var ruleList = void 0;
    var rule = void 0;
    var i = void 0;

    for (i = rules.length - 1; i >= 0; i--) {
      rule = rules[i];
      if (rule instanceof index$6.Rule) {
        if (!ruleCache[rule.name]) {
          ruleCache[rule.name] = rule;
        } else {
          ruleList = ruleCache[rule.name];
          if (ruleList instanceof index$6.Rule) {
            ruleList = ruleCache[rule.name] = [ruleCache[rule.name].toCSS(this._context)];
          }
          var ruleCSS = rule.toCSS(this._context);
          if (ruleList.indexOf(ruleCSS) !== -1) {
            rules.splice(i, 1);
          } else {
            ruleList.push(ruleCSS);
          }
        }
      }
    }
  },
  _mergeRules: function _mergeRules(rules) {
    if (!rules) {
      return;
    }

    var groups = {};
    var parts = void 0;
    var rule = void 0;
    var key = void 0;

    for (var i = 0; i < rules.length; i++) {
      rule = rules[i];

      if (rule instanceof index$6.Rule && rule.merge) {
        key = [rule.name, rule.important ? '!' : ''].join(',');

        if (!groups[key]) {
          groups[key] = [];
        } else {
          rules.splice(i--, 1);
        }

        groups[key].push(rule);
      }
    }

    Object.keys(groups).map(function (k) {
      function toExpression(values) {
        return new index$6.Expression(values.map(function (p) {
          return p.value;
        }));
      }

      function toValue(values) {
        return new index$6.Value(values.map(function (p) {
          return p;
        }));
      }

      parts = groups[k];

      if (parts.length > 1) {
        rule = parts[0];
        var spacedGroups = [];
        var lastSpacedGroup = [];
        parts.map(function (p) {
          if (p.merge === '+') {
            if (lastSpacedGroup.length > 0) {
              spacedGroups.push(toExpression(lastSpacedGroup));
            }
            lastSpacedGroup = [];
          }
          lastSpacedGroup.push(p);
        });
        spacedGroups.push(toExpression(lastSpacedGroup));
        rule.value = toValue(spacedGroups);
      }
    });
  },
  visitAnonymous: function visitAnonymous(anonymousNode, visitArgs) {
    if (anonymousNode.blocksVisibility()) {
      return;
    }
    anonymousNode.accept(this._visitor);
    return anonymousNode;
  }
};

var toCssVisitor = ToCSSVisitor;

var visitors = {
  Visitor: visitor,
  ImportVisitor: importVisitor,
  MarkVisibleSelectorsVisitor: setTreeVisibilityVisitor,
  ExtendVisitor: extendVisitor,
  JoinSelectorVisitor: joinSelectorVisitor,
  ToCSSVisitor: toCssVisitor
};

var index$4 = visitors;

var transformTree = function transformTree(root, options) {
  options = options || {};
  var evaldRoot = void 0;
  var variables = options.variables;
  var evalEnv = new contexts_1.Eval(options);

  //
  // Allows setting variables with a hash, so:
  //
  //   `{ color: new tree.Color('#f01') }` will become:
  //
  //   new tree.Rule('@color',
  //     new tree.Value([
  //       new tree.Expression([
  //         new tree.Color('#f01')
  //       ])
  //     ])
  //   )
  //
  if ((typeof variables === 'undefined' ? 'undefined' : _typeof(variables)) === 'object' && !Array.isArray(variables)) {
    variables = Object.keys(variables).map(function (k) {
      var value = variables[k];

      if (!(value instanceof index$6.Value)) {
        if (!(value instanceof index$6.Expression)) {
          value = new index$6.Expression([value]);
        }
        value = new index$6.Value([value]);
      }
      return new index$6.Rule('@' + k, value, false, null, 0);
    });
    evalEnv.frames = [new index$6.Ruleset(null, variables)];
  }

  var preEvalVisitors = [];

  var visitors = [new index$4.JoinSelectorVisitor(), new index$4.MarkVisibleSelectorsVisitor(true), new index$4.ExtendVisitor(), new index$4.ToCSSVisitor({
    compress: Boolean(options.compress),
    simplify: Boolean(options.simplify),
    simplifyLevel: Number(options.simplifyLevel || 1),
    simplifyFilter: options.simplifyFilter
  })];

  var i = void 0;

  if (options.pluginManager) {
    var pluginVisitors = options.pluginManager.getVisitors();
    for (i = 0; i < pluginVisitors.length; i++) {
      var pluginVisitor = pluginVisitors[i];
      if (pluginVisitor.isPreEvalVisitor) {
        preEvalVisitors.push(pluginVisitor);
      } else {
        if (pluginVisitor.isPreVisitor) {
          visitors.splice(0, 0, pluginVisitor);
        } else {
          visitors.push(pluginVisitor);
        }
      }
    }
  }

  for (i = 0; i < preEvalVisitors.length; i++) {
    preEvalVisitors[i].run(root);
  }

  evaldRoot = root.eval(evalEnv);

  for (i = 0; i < visitors.length; i++) {
    visitors[i].run(evaldRoot);
  }

  return evaldRoot;
};

var parseTree = function parseTree(SourceMapBuilder) {
  var ParseTree = function () {
    function ParseTree(root, imports) {
      classCallCheck(this, ParseTree);

      this.root = root;
      this.imports = imports;
    }

    ParseTree.prototype.toCSS = function toCSS(options) {
      var evaldRoot = void 0;
      var result = {};
      var sourceMapBuilder = void 0;
      try {
        evaldRoot = transformTree(this.root, options);
      } catch (e) {
        throw new lessError(e, this.imports);
      }

      try {
        var compress = Boolean(options.compress);
        if (compress) {
          logger.warn('The compress option has been deprecated. We recommend you use a dedicated css minifier, for instance see less-plugin-clean-css.');
        }

        var toCSSOptions = {
          compress: compress,
          dumpLineNumbers: options.dumpLineNumbers,
          strictUnits: Boolean(options.strictUnits),
          numPrecision: 8
        };

        if (options.sourceMap) {
          sourceMapBuilder = new SourceMapBuilder(options.sourceMap);
          result.css = sourceMapBuilder.toCSS(evaldRoot, toCSSOptions, this.imports);
        } else {
          result.css = evaldRoot.toCSS(toCSSOptions);
        }
      } catch (e) {
        throw new lessError(e, this.imports);
      }

      if (options.pluginManager) {
        var postProcessors = options.pluginManager.getPostProcessors();
        for (var i = 0; i < postProcessors.length; i++) {
          result.css = postProcessors[i].process(result.css, {
            sourceMap: sourceMapBuilder,
            options: options,
            imports: this.imports
          });
        }
      }
      if (options.sourceMap) {
        result.map = sourceMapBuilder.getExternalSourceMap();
      }

      result.imports = [];
      for (var file in this.imports.files) {
        if (this.imports.files.hasOwnProperty(file) && file !== this.imports.rootFilename) {
          result.imports.push(file);
        }
      }
      return result;
    };

    return ParseTree;
  }();

  return ParseTree;
};

// Split the input into chunks.
var chunker = function chunker(input, fail) {
  var len = input.length;
  var level = 0;
  var parenLevel = 0;
  var lastOpening = void 0;
  var lastOpeningParen = void 0;
  var lastMultiComment = void 0;
  var lastMultiCommentEndBrace = void 0;
  var chunks = [];
  var emitFrom = 0;
  var chunkerCurrentIndex = void 0;
  var currentChunkStartIndex = void 0;
  var cc = void 0;
  var cc2 = void 0;
  var matched = void 0;

  function emitChunk(force) {
    var len = chunkerCurrentIndex - emitFrom;
    if (len < 512 && !force || !len) {
      return;
    }
    chunks.push(input.slice(emitFrom, chunkerCurrentIndex + 1));
    emitFrom = chunkerCurrentIndex + 1;
  }

  for (chunkerCurrentIndex = 0; chunkerCurrentIndex < len; chunkerCurrentIndex++) {
    cc = input.charCodeAt(chunkerCurrentIndex);
    if (cc >= 97 && cc <= 122 || cc < 34) {
      // a-z or whitespace
      continue;
    }

    switch (cc) {
      case 40:
        // (
        parenLevel++;
        lastOpeningParen = chunkerCurrentIndex;
        continue;
      case 41:
        // )
        if (--parenLevel < 0) {
          return fail('missing opening `(`', chunkerCurrentIndex);
        }
        continue;
      case 59:
        // ;
        if (!parenLevel) {
          emitChunk();
        }
        continue;
      case 123:
        // {
        level++;
        lastOpening = chunkerCurrentIndex;
        continue;
      case 125:
        // }
        if (--level < 0) {
          return fail('missing opening `{`', chunkerCurrentIndex);
        }
        if (!level && !parenLevel) {
          emitChunk();
        }
        continue;
      case 92:
        // \
        if (chunkerCurrentIndex < len - 1) {
          chunkerCurrentIndex++;
          continue;
        }
        return fail('unescaped `\\`', chunkerCurrentIndex);
      case 34:
      case 39:
      case 96:
        // ", ' and `
        matched = 0;
        currentChunkStartIndex = chunkerCurrentIndex;
        for (chunkerCurrentIndex = chunkerCurrentIndex + 1; chunkerCurrentIndex < len; chunkerCurrentIndex++) {
          cc2 = input.charCodeAt(chunkerCurrentIndex);
          if (cc2 > 96) {
            continue;
          }
          if (cc2 == cc) {
            matched = 1;
            break;
          }
          if (cc2 == 92) {
            // \
            if (chunkerCurrentIndex == len - 1) {
              return fail('unescaped `\\`', chunkerCurrentIndex);
            }
            chunkerCurrentIndex++;
          }
        }
        if (matched) {
          continue;
        }
        return fail('unmatched `' + String.fromCharCode(cc) + '`', currentChunkStartIndex);
      case 47:
        // /, check for comment
        if (parenLevel || chunkerCurrentIndex == len - 1) {
          continue;
        }
        cc2 = input.charCodeAt(chunkerCurrentIndex + 1);
        if (cc2 == 47) {
          // //, find lnfeed
          for (chunkerCurrentIndex = chunkerCurrentIndex + 2; chunkerCurrentIndex < len; chunkerCurrentIndex++) {
            cc2 = input.charCodeAt(chunkerCurrentIndex);
            if (cc2 <= 13 && (cc2 == 10 || cc2 == 13)) {
              break;
            }
          }
        } else if (cc2 == 42) {
          // /*, find */
          lastMultiComment = currentChunkStartIndex = chunkerCurrentIndex;
          for (chunkerCurrentIndex = chunkerCurrentIndex + 2; chunkerCurrentIndex < len - 1; chunkerCurrentIndex++) {
            cc2 = input.charCodeAt(chunkerCurrentIndex);
            if (cc2 == 125) {
              lastMultiCommentEndBrace = chunkerCurrentIndex;
            }
            if (cc2 != 42) {
              continue;
            }
            if (input.charCodeAt(chunkerCurrentIndex + 1) == 47) {
              break;
            }
          }
          if (chunkerCurrentIndex == len - 1) {
            return fail('missing closing `*/`', currentChunkStartIndex);
          }
          chunkerCurrentIndex++;
        }
        continue;
      case 42:
        // *, check for unmatched */
        if (chunkerCurrentIndex < len - 1 && input.charCodeAt(chunkerCurrentIndex + 1) == 47) {
          return fail('unmatched `/*`', chunkerCurrentIndex);
        }
        continue;
    }
  }

  if (level !== 0) {
    if (lastMultiComment > lastOpening && lastMultiCommentEndBrace > lastMultiComment) {
      return fail('missing closing `}` or `*/`', lastOpening);
    } else {
      return fail('missing closing `}`', lastOpening);
    }
  } else if (parenLevel !== 0) {
    return fail('missing closing `)`', lastOpeningParen);
  }

  emitChunk(true);
  return chunks;
};

var parserInput = function parserInput() {
  var // LeSS input string
  input = void 0;

  var // current chunk
  j = void 0;

  var // holds state for backtracking
  saveStack = [];

  var // furthest index the parser has gone to
  furthest = void 0;

  var // if this is furthest we got to, this is the probably cause
  furthestPossibleErrorMessage = void 0;

  var // chunkified input
  chunks = void 0;

  var // current chunk
  current = void 0;

  var // index of current chunk, in `input`
  currentPos = void 0;

  var parserInput = {};
  var CHARCODE_SPACE = 32;
  var CHARCODE_TAB = 9;
  var CHARCODE_LF = 10;
  var CHARCODE_CR = 13;
  var CHARCODE_PLUS = 43;
  var CHARCODE_COMMA = 44;
  var CHARCODE_FORWARD_SLASH = 47;
  var CHARCODE_9 = 57;

  function skipWhitespace(length) {
    var oldi = parserInput.i;
    var oldj = j;
    var curr = parserInput.i - currentPos;
    var endIndex = parserInput.i + current.length - curr;
    var mem = parserInput.i += length;
    var inp = input;
    var c = void 0;
    var nextChar = void 0;
    var comment = void 0;

    for (; parserInput.i < endIndex; parserInput.i++) {
      c = inp.charCodeAt(parserInput.i);

      if (parserInput.autoCommentAbsorb && c === CHARCODE_FORWARD_SLASH) {
        nextChar = inp.charAt(parserInput.i + 1);
        if (nextChar === '/') {
          comment = { index: parserInput.i, isLineComment: true };
          var nextNewLine = inp.indexOf('\n', parserInput.i + 2);
          if (nextNewLine < 0) {
            nextNewLine = endIndex;
          }
          parserInput.i = nextNewLine;
          comment.text = inp.substr(comment.index, parserInput.i - comment.index);
          parserInput.commentStore.push(comment);
          continue;
        } else if (nextChar === '*') {
          var nextStarSlash = inp.indexOf('*/', parserInput.i + 2);
          if (nextStarSlash >= 0) {
            comment = {
              index: parserInput.i,
              text: inp.substr(parserInput.i, nextStarSlash + 2 - parserInput.i),
              isLineComment: false
            };
            parserInput.i += comment.text.length - 1;
            parserInput.commentStore.push(comment);
            continue;
          }
        }
        break;
      }

      if (c !== CHARCODE_SPACE && c !== CHARCODE_LF && c !== CHARCODE_TAB && c !== CHARCODE_CR) {
        break;
      }
    }

    current = current.slice(length + parserInput.i - mem + curr);
    currentPos = parserInput.i;

    if (!current.length) {
      if (j < chunks.length - 1) {
        current = chunks[++j];
        skipWhitespace(0); // skip space at the beginning of a chunk
        return true; // things changed
      }
      parserInput.finished = true;
    }

    return oldi !== parserInput.i || oldj !== j;
  }

  parserInput.save = function () {
    currentPos = parserInput.i;
    saveStack.push({ current: current, i: parserInput.i, j: j });
  };
  parserInput.restore = function (possibleErrorMessage) {
    if (parserInput.i > furthest || parserInput.i === furthest && possibleErrorMessage && !furthestPossibleErrorMessage) {
      furthest = parserInput.i;
      furthestPossibleErrorMessage = possibleErrorMessage;
    }
    var state = saveStack.pop();
    current = state.current;
    currentPos = parserInput.i = state.i;
    j = state.j;
  };
  parserInput.forget = function () {
    saveStack.pop();
  };
  parserInput.isWhitespace = function (offset) {
    var pos = parserInput.i + (offset || 0);
    var code = input.charCodeAt(pos);
    return code === CHARCODE_SPACE || code === CHARCODE_CR || code === CHARCODE_TAB || code === CHARCODE_LF;
  };

  // Specialization of $(tok)
  parserInput.$re = function (tok) {
    if (parserInput.i > currentPos) {
      current = current.slice(parserInput.i - currentPos);
      currentPos = parserInput.i;
    }

    var m = tok.exec(current);
    if (!m) {
      return null;
    }

    skipWhitespace(m[0].length);
    if (typeof m === 'string') {
      return m;
    }

    return m.length === 1 ? m[0] : m;
  };

  parserInput.$char = function (tok) {
    if (input.charAt(parserInput.i) !== tok) {
      return null;
    }
    skipWhitespace(1);
    return tok;
  };

  parserInput.$str = function (tok) {
    var tokLength = tok.length;

    // https://jsperf.com/string-startswith/21
    for (var i = 0; i < tokLength; i++) {
      if (input.charAt(parserInput.i + i) !== tok.charAt(i)) {
        return null;
      }
    }

    skipWhitespace(tokLength);
    return tok;
  };

  parserInput.$quoted = function () {
    var startChar = input.charAt(parserInput.i);
    if (startChar !== "'" && startChar !== '"') {
      return;
    }
    var length = input.length;
    var currentPosition = parserInput.i;

    for (var i = 1; i + currentPosition < length; i++) {
      var nextChar = input.charAt(i + currentPosition);
      switch (nextChar) {
        case '\\':
          i++;
          continue;
        case '\r':
        case '\n':
          break;
        case startChar:
          var str = input.substr(currentPosition, i + 1);
          skipWhitespace(i + 1);
          return str;
        default:
      }
    }
    return null;
  };

  parserInput.autoCommentAbsorb = true;
  parserInput.commentStore = [];
  parserInput.finished = false;

  // Same as $(), but don't change the state of the parser,
  // just return the match.
  parserInput.peek = function (tok) {
    if (typeof tok === 'string') {
      // https://jsperf.com/string-startswith/21
      for (var i = 0; i < tok.length; i++) {
        if (input.charAt(parserInput.i + i) !== tok.charAt(i)) {
          return false;
        }
      }
      return true;
    } else {
      return tok.test(current);
    }
  };

  // Specialization of peek()
  // TODO remove or change some currentChar calls to peekChar
  parserInput.peekChar = function (tok) {
    return input.charAt(parserInput.i) === tok;
  };

  parserInput.currentChar = function () {
    return input.charAt(parserInput.i);
  };

  parserInput.getInput = function () {
    return input;
  };

  parserInput.peekNotNumeric = function () {
    var c = input.charCodeAt(parserInput.i);
    //Is the first char of the dimension 0-9, '.', '+' or '-'
    return c > CHARCODE_9 || c < CHARCODE_PLUS || c === CHARCODE_FORWARD_SLASH || c === CHARCODE_COMMA;
  };

  parserInput.start = function (str, chunkInput, failFunction) {
    input = str;
    parserInput.i = j = currentPos = furthest = 0;

    // chunking apparently makes things quicker (but my tests indicate
    // it might actually make things slower in node at least)
    // and it is a non-perfect parse - it can't recognise
    // unquoted urls, meaning it can't distinguish comments
    // meaning comments with quotes or {}() in them get 'counted'
    // and then lead to parse errors.
    // In addition if the chunking chunks in the wrong place we might
    // not be able to parse a parser statement in one go
    // this is officially deprecated but can be switched on via an option
    // in the case it causes too much performance issues.
    if (chunkInput) {
      chunks = chunker(str, failFunction);
    } else {
      chunks = [str];
    }

    current = chunks[0];

    skipWhitespace(0);
  };

  parserInput.end = function () {
    var message = void 0;
    var isFinished = parserInput.i >= input.length;

    if (parserInput.i < furthest) {
      message = furthestPossibleErrorMessage;
      parserInput.i = furthest;
    }
    return {
      isFinished: isFinished,
      furthest: parserInput.i,
      furthestPossibleErrorMessage: message,
      furthestReachedEnd: parserInput.i >= input.length - 1,
      furthestChar: input[parserInput.i]
    };
  };

  return parserInput;
};

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
var Parser = function Parser(context, imports, fileInfo) {
  var parsers = void 0;
  var parserInput$$1 = parserInput();

  function error(msg, type) {
    throw new lessError({
      index: parserInput$$1.i,
      filename: fileInfo.filename,
      type: type || 'Syntax',
      message: msg
    }, imports);
  }

  function expect(arg, msg, index) {
    // some older browsers return typeof 'function' for RegExp
    var result = arg instanceof Function ? arg.call(parsers) : parserInput$$1.$re(arg);
    if (result) {
      return result;
    }
    error(msg || (typeof arg === 'string' ? 'expected \'' + arg + '\' got \'' + parserInput$$1.currentChar() + '\'' : 'unexpected token'));
  }

  // Specialization of expect()
  function expectChar(arg, msg) {
    if (parserInput$$1.$char(arg)) {
      return arg;
    }
    error(msg || 'expected \'' + arg + '\' got \'' + parserInput$$1.currentChar() + '\'');
  }

  function getDebugInfo(index) {
    var filename = fileInfo.filename;

    return {
      lineNumber: utils.getLocation(index, parserInput$$1.getInput()).line + 1,
      fileName: filename
    };
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
    parse: function parse(str, callback, additionalData) {
      var root = void 0;
      var error = null;
      var globalVars = void 0;
      var modifyVars = void 0;
      var ignored = void 0;
      var preText = '';

      globalVars = additionalData && additionalData.globalVars ? Parser.serializeVars(additionalData.globalVars) + '\n' : '';
      modifyVars = additionalData && additionalData.modifyVars ? '\n' + Parser.serializeVars(additionalData.modifyVars) : '';

      if (context.pluginManager) {
        var preProcessors = context.pluginManager.getPreProcessors();
        for (var i = 0; i < preProcessors.length; i++) {
          str = preProcessors[i].process(str, { context: context, imports: imports, fileInfo: fileInfo });
        }
      }

      if (globalVars || additionalData && additionalData.banner) {
        preText = (additionalData && additionalData.banner ? additionalData.banner : '') + globalVars;
        ignored = imports.contentsIgnoredChars;
        ignored[fileInfo.filename] = ignored[fileInfo.filename] || 0;
        ignored[fileInfo.filename] += preText.length;
      }

      str = str.replace(/\r\n?/g, '\n');
      // Remove potential UTF Byte Order Mark
      str = preText + str.replace(/^\uFEFF/, '') + modifyVars;
      imports.contents[fileInfo.filename] = str;

      // Start with the primary rule.
      // The whole syntax tree is held under a Ruleset node,
      // with the `root` property set to true, so no `{}` are
      // output. The callback is called when the input is parsed.
      try {
        parserInput$$1.start(str, context.chunkInput, function fail(msg, index) {
          throw new lessError({
            index: index,
            type: 'Parse',
            message: msg,
            filename: fileInfo.filename
          }, imports);
        });

        root = new index$6.Ruleset(null, this.parsers.primary());
        root.root = true;
        root.firstRoot = true;
      } catch (e) {
        return callback(new lessError(e, imports, fileInfo.filename));
      }

      // If `i` is smaller than the `input.length - 1`,
      // it means the parser wasn't able to parse the whole
      // string, so we've got a parsing error.
      //
      // We try to extract a \n delimited string,
      // showing the line where the parse error occurred.
      // We split it up into two parts (the part which parsed,
      // and the part which didn't), so we can color them differently.
      var endInfo = parserInput$$1.end();
      if (!endInfo.isFinished) {
        var message = endInfo.furthestPossibleErrorMessage;

        if (!message) {
          message = 'Unrecognised input';
          if (endInfo.furthestChar === '}') {
            message += ". Possibly missing opening '{'";
          } else if (endInfo.furthestChar === ')') {
            message += ". Possibly missing opening '('";
          } else if (endInfo.furthestReachedEnd) {
            message += '. Possibly missing something';
          }
        }

        error = new lessError({
          type: 'Parse',
          message: message,
          index: endInfo.furthest,
          filename: fileInfo.filename
        }, imports);
      }

      var finish = function finish(e) {
        e = error || e || imports.error;

        if (e) {
          if (!(e instanceof lessError)) {
            e = new lessError(e, imports, fileInfo.filename);
          }

          return callback(e);
        } else {
          return callback(null, root);
        }
      };

      if (context.processImports !== false) {
        new index$4.ImportVisitor(imports, finish).run(root);
      } else {
        return finish();
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
    parsers: parsers = {
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
      primary: function primary() {
        var mixin = this.mixin;
        var root = [];
        var node = void 0;

        while (true) {
          while (true) {
            node = this.comment();
            if (!node) {
              break;
            }
            root.push(node);
          }
          // always process comments before deciding if finished
          if (parserInput$$1.finished) {
            break;
          }
          if (parserInput$$1.peek('}')) {
            break;
          }

          node = this.extendRule();
          if (node) {
            root = root.concat(node);
            continue;
          }

          node = mixin.definition() || this.rule() || this.ruleset() || mixin.call() || this.rulesetCall() || this.entities.call() || this.directive();
          if (node) {
            root.push(node);
          } else {
            var foundSemiColon = false;
            while (parserInput$$1.$char(';')) {
              foundSemiColon = true;
            }
            if (!foundSemiColon) {
              break;
            }
          }
        }

        return root;
      },


      // comments are collected by the main parsing mechanism and then assigned to nodes
      // where the current structure allows it
      comment: function comment() {
        if (parserInput$$1.commentStore.length) {
          var comment = parserInput$$1.commentStore.shift();
          return new index$6.Comment(comment.text, comment.isLineComment, comment.index, fileInfo);
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
        quoted: function quoted() {
          var str = void 0;
          var index = parserInput$$1.i;
          var isEscaped = false;

          parserInput$$1.save();
          if (parserInput$$1.$char('~')) {
            isEscaped = true;
          }
          str = parserInput$$1.$quoted();
          if (!str) {
            parserInput$$1.restore();
            return;
          }
          parserInput$$1.forget();

          return new index$6.Quoted(str.charAt(0), str.substr(1, str.length - 2), isEscaped, index, fileInfo);
        },


        //
        // A catch-all word, such as:
        //
        //     black border-collapse
        //
        keyword: function keyword() {
          var k = parserInput$$1.$char('%') || parserInput$$1.$re(/^[_A-Za-z-][_A-Za-z0-9-]*/);
          if (k) {
            return index$6.Color.fromKeyword(k) || new index$6.Keyword(k);
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
        call: function call() {
          var name = void 0;
          var nameLC = void 0;
          var args = void 0;
          var alpha = void 0;
          var index = parserInput$$1.i;

          // http://jsperf.com/case-insensitive-regex-vs-strtolower-then-regex/18
          if (parserInput$$1.peek(/^url\(/i)) {
            return;
          }

          parserInput$$1.save();

          name = parserInput$$1.$re(/^([\w-]+|%|progid:[\w\.]+)\(/);
          if (!name) {
            parserInput$$1.forget();
            return;
          }

          name = name[1];
          nameLC = name.toLowerCase();

          if (nameLC === 'alpha') {
            alpha = parsers.alpha();
            if (alpha) {
              parserInput$$1.forget();
              return alpha;
            }
          }

          args = this.arguments();

          if (!parserInput$$1.$char(')')) {
            parserInput$$1.restore("Could not parse call arguments or missing ')'");
            return;
          }

          parserInput$$1.forget();
          return new index$6.Call(name, args, index, fileInfo);
        },
        arguments: function _arguments() {
          var argsSemiColon = [];
          var argsComma = [];
          var expressions = [];
          var isSemiColonSeparated = void 0;
          var value = void 0;
          var arg = void 0;

          parserInput$$1.save();

          while (true) {
            arg = parsers.detachedRuleset() || this.assignment() || parsers.expression();

            if (!arg) {
              break;
            }

            value = arg;

            if (arg.value && arg.value.length == 1) {
              value = arg.value[0];
            }

            if (value) {
              expressions.push(value);
            }

            argsComma.push(value);

            if (parserInput$$1.$char(',')) {
              continue;
            }

            if (parserInput$$1.$char(';') || isSemiColonSeparated) {
              isSemiColonSeparated = true;

              if (expressions.length > 1) {
                value = new index$6.Value(expressions);
              }
              argsSemiColon.push(value);

              expressions = [];
            }
          }

          parserInput$$1.forget();
          return isSemiColonSeparated ? argsSemiColon : argsComma;
        },
        literal: function literal() {
          return this.dimension() || this.color() || this.quoted() || this.unicodeDescriptor();
        },


        // Assignments are argument entities for calls.
        // They are present in ie filter properties as shown below.
        //
        //     filter: progid:DXImageTransform.Microsoft.Alpha( *opacity=50* )
        //

        assignment: function assignment() {
          var key = void 0;
          var value = void 0;
          parserInput$$1.save();
          key = parserInput$$1.$re(/^\w+(?=\s?=)/i);
          if (!key) {
            parserInput$$1.restore();
            return;
          }
          if (!parserInput$$1.$char('=')) {
            parserInput$$1.restore();
            return;
          }
          value = parsers.entity();
          if (value) {
            parserInput$$1.forget();
            return new index$6.Assignment(key, value);
          } else {
            parserInput$$1.restore();
          }
        },


        //
        // Parse url() tokens
        //
        // We use a specific rule for urls, because they don't really behave like
        // standard function calls. The difference is that the argument doesn't have
        // to be enclosed within a string, so it can't be parsed as an Expression.
        //
        url: function url() {
          var value = void 0;
          var index = parserInput$$1.i;

          parserInput$$1.autoCommentAbsorb = false;

          if (!parserInput$$1.$str('url(')) {
            parserInput$$1.autoCommentAbsorb = true;
            return;
          }

          value = this.quoted() || this.variable() || parserInput$$1.$re(/^(?:(?:\\[\(\)'"])|[^\(\)'"])+/) || '';

          parserInput$$1.autoCommentAbsorb = true;

          expectChar(')');

          return new index$6.URL(value.value != null || value instanceof index$6.Variable ? value : new index$6.Anonymous(value), index, fileInfo);
        },


        //
        // A Variable entity, such as `@fink`, in
        //
        //     width: @fink + 2px
        //
        // We use a different parser for variable definitions,
        // see `parsers.variable`.
        //
        variable: function variable() {
          var name = void 0;
          var index = parserInput$$1.i;

          if (parserInput$$1.currentChar() === '@' && (name = parserInput$$1.$re(/^@@?[\w-]+/))) {
            return new index$6.Variable(name, index, fileInfo);
          }
        },


        // A variable entity using the protective {} e.g. @{var}
        variableCurly: function variableCurly() {
          var curly = void 0;
          var index = parserInput$$1.i;

          if (parserInput$$1.currentChar() === '@' && (curly = parserInput$$1.$re(/^@\{([\w-]+)\}/))) {
            return new index$6.Variable('@' + curly[1], index, fileInfo);
          }
        },


        //
        // A Hexadecimal color
        //
        //     #4F3C2F
        //
        // `rgb` and `hsl` colors are parsed through the `entities.call` parser.
        //
        color: function color() {
          var rgb = void 0;

          if (parserInput$$1.currentChar() === '#' && (rgb = parserInput$$1.$re(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})/))) {
            // strip colons, brackets, whitespaces and other characters that should not
            // definitely be part of color string
            var colorCandidateString = rgb.input.match(/^#([\w]+).*/);
            colorCandidateString = colorCandidateString[1];
            if (!colorCandidateString.match(/^[A-Fa-f0-9]+$/)) {
              // verify if candidate consists only of allowed HEX characters
              error('Invalid HEX color code');
            }
            return new index$6.Color(rgb[1], undefined, '#' + colorCandidateString);
          }
        },
        colorKeyword: function colorKeyword() {
          parserInput$$1.save();
          var autoCommentAbsorb = parserInput$$1.autoCommentAbsorb;
          parserInput$$1.autoCommentAbsorb = false;
          var k = parserInput$$1.$re(/^[_A-Za-z-][_A-Za-z0-9-]+/);
          parserInput$$1.autoCommentAbsorb = autoCommentAbsorb;
          if (!k) {
            parserInput$$1.forget();
            return;
          }
          parserInput$$1.restore();
          var color = index$6.Color.fromKeyword(k);
          if (color) {
            parserInput$$1.$str(k);
            return color;
          }
        },


        //
        // A Dimension, that is, a number and a unit
        //
        //     0.5em 95%
        //
        dimension: function dimension() {
          if (parserInput$$1.peekNotNumeric()) {
            return;
          }

          var value = parserInput$$1.$re(/^([+-]?\d*\.?\d+)(%|[a-z_]+)?/i);
          if (value) {
            return new index$6.Dimension(value[1], value[2]);
          }
        },


        //
        // A unicode descriptor, as is used in unicode-range
        //
        // U+0??  or U+00A1-00A9
        //
        unicodeDescriptor: function unicodeDescriptor() {
          var ud = void 0;

          ud = parserInput$$1.$re(/^U\+[0-9a-fA-F?]+(\-[0-9a-fA-F?]+)?/);
          if (ud) {
            return new index$6.UnicodeDescriptor(ud[0]);
          }
        },


        //
        // JavaScript code to be evaluated
        //
        //     `window.location.href`
        //
        javascript: function javascript() {
          var js = void 0;
          var index = parserInput$$1.i;

          parserInput$$1.save();

          var escape = parserInput$$1.$char('~');
          var jsQuote = parserInput$$1.$char('`');

          if (!jsQuote) {
            parserInput$$1.restore();
            return;
          }

          js = parserInput$$1.$re(/^[^`]*`/);
          if (js) {
            parserInput$$1.forget();
            return new index$6.JavaScript(js.substr(0, js.length - 1), Boolean(escape), index, fileInfo);
          }
          parserInput$$1.restore('invalid javascript definition');
        }
      },

      //
      // The variable part of a variable definition. Used in the `rule` parser
      //
      //     @fink:
      //
      variable: function variable() {
        var name = void 0;

        if (parserInput$$1.currentChar() === '@' && (name = parserInput$$1.$re(/^(@[\w-]+)\s*:/))) {
          return name[1];
        }
      },


      //
      // The variable part of a variable definition. Used in the `rule` parser
      //
      //     @fink();
      //
      rulesetCall: function rulesetCall() {
        var name = void 0;

        if (parserInput$$1.currentChar() === '@' && (name = parserInput$$1.$re(/^(@[\w-]+)\(\s*\)\s*;/))) {
          return new index$6.RulesetCall(name[1]);
        }
      },


      //
      // extend syntax - used to extend selectors
      //
      extend: function extend(isRule) {
        var elements = void 0;
        var e = void 0;
        var index = parserInput$$1.i;
        var option = void 0;
        var extendList = void 0;
        var extend = void 0;

        if (!parserInput$$1.$str(isRule ? '&:extend(' : ':extend(')) {
          return;
        }

        do {
          option = null;
          elements = null;
          while (!(option = parserInput$$1.$re(/^(all)(?=\s*(\)|,))/))) {
            e = this.element();
            if (!e) {
              break;
            }
            if (elements) {
              elements.push(e);
            } else {
              elements = [e];
            }
          }

          option = option && option[1];
          if (!elements) {
            error('Missing target selector for :extend().');
          }
          extend = new index$6.Extend(new index$6.Selector(elements), option, index, fileInfo);
          if (extendList) {
            extendList.push(extend);
          } else {
            extendList = [extend];
          }
        } while (parserInput$$1.$char(','));

        expect(/^\)/);

        if (isRule) {
          expect(/^;/);
        }

        return extendList;
      },


      //
      // extendRule - used in a rule to extend all the parent selectors
      //
      extendRule: function extendRule() {
        return this.extend(true);
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
        call: function call() {
          var s = parserInput$$1.currentChar();
          var important = false;
          var index = parserInput$$1.i;
          var elemIndex = void 0;
          var elements = void 0;
          var elem = void 0;
          var e = void 0;
          var c = void 0;
          var args = void 0;

          if (s !== '.' && s !== '#') {
            return;
          }

          parserInput$$1.save(); // stop us absorbing part of an invalid selector

          while (true) {
            elemIndex = parserInput$$1.i;
            e = parserInput$$1.$re(/^[#.](?:[\w-]|\\(?:[A-Fa-f0-9]{1,6} ?|[^A-Fa-f0-9]))+/);
            if (!e) {
              break;
            }
            elem = new index$6.Element(c, e, elemIndex, fileInfo);
            if (elements) {
              elements.push(elem);
            } else {
              elements = [elem];
            }
            c = parserInput$$1.$char('>');
          }

          if (elements) {
            if (parserInput$$1.$char('(')) {
              args = this.args(true).args;
              expectChar(')');
            }

            if (parsers.important()) {
              important = true;
            }

            if (parsers.end()) {
              parserInput$$1.forget();
              return new index$6.mixin.Call(elements, args, index, fileInfo, important);
            }
          }

          parserInput$$1.restore();
        },
        args: function args(isCall) {
          var entities = parsers.entities;
          var returner = { args: null, variadic: false };
          var expressions = [];
          var argsSemiColon = [];
          var argsComma = [];
          var isSemiColonSeparated = void 0;
          var expressionContainsNamed = void 0;
          var name = void 0;
          var nameLoop = void 0;
          var value = void 0;
          var arg = void 0;
          var expand = void 0;

          parserInput$$1.save();

          while (true) {
            if (isCall) {
              arg = parsers.detachedRuleset() || parsers.expression();
            } else {
              parserInput$$1.commentStore.length = 0;
              if (parserInput$$1.$str('...')) {
                returner.variadic = true;
                if (parserInput$$1.$char(';') && !isSemiColonSeparated) {
                  isSemiColonSeparated = true;
                }
                (isSemiColonSeparated ? argsSemiColon : argsComma).push({
                  variadic: true
                });
                break;
              }
              arg = entities.variable() || entities.literal() || entities.keyword();
            }

            if (!arg) {
              break;
            }

            nameLoop = null;
            if (arg.throwAwayComments) {
              arg.throwAwayComments();
            }
            value = arg;
            var val = null;

            if (isCall) {
              // Variable
              if (arg.value && arg.value.length == 1) {
                val = arg.value[0];
              }
            } else {
              val = arg;
            }

            if (val && val instanceof index$6.Variable) {
              if (parserInput$$1.$char(':')) {
                if (expressions.length > 0) {
                  if (isSemiColonSeparated) {
                    error('Cannot mix ; and , as delimiter types');
                  }
                  expressionContainsNamed = true;
                }

                value = parsers.detachedRuleset() || parsers.expression();

                if (!value) {
                  if (isCall) {
                    error('could not understand value for named argument');
                  } else {
                    parserInput$$1.restore();
                    returner.args = [];
                    return returner;
                  }
                }
                nameLoop = name = val.name;
              } else if (parserInput$$1.$str('...')) {
                if (!isCall) {
                  returner.variadic = true;
                  if (parserInput$$1.$char(';') && !isSemiColonSeparated) {
                    isSemiColonSeparated = true;
                  }
                  (isSemiColonSeparated ? argsSemiColon : argsComma).push({
                    name: arg.name,
                    variadic: true
                  });
                  break;
                } else {
                  expand = true;
                }
              } else if (!isCall) {
                name = nameLoop = val.name;
                value = null;
              }
            }

            if (value) {
              expressions.push(value);
            }

            argsComma.push({ name: nameLoop, value: value, expand: expand });

            if (parserInput$$1.$char(',')) {
              continue;
            }

            if (parserInput$$1.$char(';') || isSemiColonSeparated) {
              if (expressionContainsNamed) {
                error('Cannot mix ; and , as delimiter types');
              }

              isSemiColonSeparated = true;

              if (expressions.length > 1) {
                value = new index$6.Value(expressions);
              }
              argsSemiColon.push({ name: name, value: value, expand: expand });

              name = null;
              expressions = [];
              expressionContainsNamed = false;
            }
          }

          parserInput$$1.forget();
          returner.args = isSemiColonSeparated ? argsSemiColon : argsComma;
          return returner;
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
        definition: function definition() {
          var name = void 0;
          var params = [];
          var match = void 0;
          var ruleset = void 0;
          var cond = void 0;
          var variadic = false;
          if (parserInput$$1.currentChar() !== '.' && parserInput$$1.currentChar() !== '#' || parserInput$$1.peek(/^[^{]*\}/)) {
            return;
          }

          parserInput$$1.save();

          match = parserInput$$1.$re(/^([#.](?:[\w-]|\\(?:[A-Fa-f0-9]{1,6} ?|[^A-Fa-f0-9]))+)\s*\(/);
          if (match) {
            name = match[1];

            var argInfo = this.args(false);
            params = argInfo.args;
            variadic = argInfo.variadic;

            // .mixincall("@{a}");
            // looks a bit like a mixin definition..
            // also
            // .mixincall(@a: {rule: set;});
            // so we have to be nice and restore
            if (!parserInput$$1.$char(')')) {
              parserInput$$1.restore("Missing closing ')'");
              return;
            }

            parserInput$$1.commentStore.length = 0;

            if (parserInput$$1.$str('when')) {
              // Guard
              cond = expect(parsers.conditions, 'expected condition');
            }

            ruleset = parsers.block();

            if (ruleset) {
              parserInput$$1.forget();
              return new index$6.mixin.Definition(name, params, ruleset, cond, variadic);
            } else {
              parserInput$$1.restore();
            }
          } else {
            parserInput$$1.forget();
          }
        }
      },

      //
      // Entities are the smallest recognized token,
      // and can be found inside a rule's value.
      //
      entity: function entity() {
        var entities = this.entities;

        return this.comment() || entities.literal() || entities.variable() || entities.url() || entities.call() || entities.keyword() || entities.javascript();
      },


      //
      // A Rule terminator. Note that we use `peek()` to check for '}',
      // because the `block` rule will be expecting it, but we still need to make sure
      // it's there, if ';' was omitted.
      //
      end: function end() {
        return parserInput$$1.$char(';') || parserInput$$1.peek('}');
      },


      //
      // IE's alpha function
      //
      //     alpha(opacity=88)
      //
      alpha: function alpha() {
        var value = void 0;

        // http://jsperf.com/case-insensitive-regex-vs-strtolower-then-regex/18
        if (!parserInput$$1.$re(/^opacity=/i)) {
          return;
        }
        value = parserInput$$1.$re(/^\d+/);
        if (!value) {
          value = expect(this.entities.variable, 'Could not parse alpha');
        }
        expectChar(')');
        return new index$6.Alpha(value);
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
      element: function element() {
        var e = void 0;
        var c = void 0;
        var v = void 0;
        var index = parserInput$$1.i;

        c = this.combinator();

        e = parserInput$$1.$re(/^(?:\d+\.\d+|\d+)%/) || parserInput$$1.$re(/^(?:[.#]?|:*)(?:[\w-]|[^\x00-\x9f]|\\(?:[A-Fa-f0-9]{1,6} ?|[^A-Fa-f0-9]))+/) || parserInput$$1.$char('*') || parserInput$$1.$char('&') || this.attribute() || parserInput$$1.$re(/^\([^&()@]+\)/) || parserInput$$1.$re(/^[\.#:](?=@)/) || this.entities.variableCurly();

        if (!e) {
          parserInput$$1.save();
          if (parserInput$$1.$char('(')) {
            if ((v = this.selector()) && parserInput$$1.$char(')')) {
              e = new index$6.Paren(v);
              parserInput$$1.forget();
            } else {
              parserInput$$1.restore("Missing closing ')'");
            }
          } else {
            parserInput$$1.forget();
          }
        }

        if (e) {
          return new index$6.Element(c, e, index, fileInfo);
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
      combinator: function combinator() {
        var c = parserInput$$1.currentChar();

        if (c === '/') {
          parserInput$$1.save();
          var slashedCombinator = parserInput$$1.$re(/^\/[a-z]+\//i);
          if (slashedCombinator) {
            parserInput$$1.forget();
            return new index$6.Combinator(slashedCombinator);
          }
          parserInput$$1.restore();
        }

        if (c === '>' || c === '+' || c === '~' || c === '|' || c === '^') {
          parserInput$$1.i++;
          if (c === '^' && parserInput$$1.currentChar() === '^') {
            c = '^^';
            parserInput$$1.i++;
          }
          while (parserInput$$1.isWhitespace()) {
            parserInput$$1.i++;
          }
          return new index$6.Combinator(c);
        } else if (parserInput$$1.isWhitespace(-1)) {
          return new index$6.Combinator(' ');
        } else {
          return new index$6.Combinator(null);
        }
      },

      //
      // A CSS selector (see selector below)
      // with less extensions e.g. the ability to extend and guard
      //
      lessSelector: function lessSelector() {
        return this.selector(true);
      },

      //
      // A CSS Selector
      //
      //     .class > div + h1
      //     li a:hover
      //
      // Selectors are made out of one or more Elements, see above.
      //
      selector: function selector(isLess) {
        var index = parserInput$$1.i;
        var elements = void 0;
        var extendList = void 0;
        var c = void 0;
        var e = void 0;
        var allExtends = void 0;
        var when = void 0;
        var condition = void 0;

        while (isLess && (extendList = this.extend()) || isLess && (when = parserInput$$1.$str('when')) || (e = this.element())) {
          if (when) {
            condition = expect(this.conditions, 'expected condition');
          } else if (condition) {
            error('CSS guard can only be used at the end of selector');
          } else if (extendList) {
            if (allExtends) {
              allExtends = allExtends.concat(extendList);
            } else {
              allExtends = extendList;
            }
          } else {
            if (allExtends) {
              error('Extend can only be used at the end of selector');
            }
            c = parserInput$$1.currentChar();
            if (elements) {
              elements.push(e);
            } else {
              elements = [e];
            }
            e = null;
          }
          if (c === '{' || c === '}' || c === ';' || c === ',' || c === ')') {
            break;
          }
        }

        if (elements) {
          return new index$6.Selector(elements, allExtends, condition, index, fileInfo);
        }
        if (allExtends) {
          error('Extend must be used to extend a selector, it cannot be used on its own');
        }
      },
      attribute: function attribute() {
        if (!parserInput$$1.$char('[')) {
          return;
        }

        var entities = this.entities;
        var key = void 0;
        var val = void 0;
        var op = void 0;

        if (!(key = entities.variableCurly())) {
          key = expect(/^(?:[_A-Za-z0-9-\*]*\|)?(?:[_A-Za-z0-9-]|\\.)+/);
        }

        op = parserInput$$1.$re(/^[|~*$^]?=/);
        if (op) {
          val = entities.quoted() || parserInput$$1.$re(/^[0-9]+%/) || parserInput$$1.$re(/^[\w-]+/) || entities.variableCurly();
        }

        expectChar(']');

        return new index$6.Attribute(key, op, val);
      },


      //
      // The `block` rule is used by `ruleset` and `mixin.definition`.
      // It's a wrapper around the `primary` rule, with added `{}`.
      //
      block: function block() {
        var content = void 0;
        if (parserInput$$1.$char('{') && (content = this.primary()) && parserInput$$1.$char('}')) {
          return content;
        }
      },
      blockRuleset: function blockRuleset() {
        var block = this.block();

        if (block) {
          block = new index$6.Ruleset(null, block);
        }
        return block;
      },
      detachedRuleset: function detachedRuleset() {
        var blockRuleset = this.blockRuleset();
        if (blockRuleset) {
          return new index$6.DetachedRuleset(blockRuleset);
        }
      },


      //
      // div, .class, body > p {...}
      //
      ruleset: function ruleset() {
        var selectors = void 0;
        var s = void 0;
        var rules = void 0;
        var debugInfo = void 0;

        parserInput$$1.save();

        if (context.dumpLineNumbers) {
          debugInfo = getDebugInfo(parserInput$$1.i);
        }

        while (true) {
          s = this.lessSelector();
          if (!s) {
            break;
          }
          if (selectors) {
            selectors.push(s);
          } else {
            selectors = [s];
          }
          parserInput$$1.commentStore.length = 0;
          if (s.condition && selectors.length > 1) {
            error('Guards are only currently allowed on a single selector.');
          }
          if (!parserInput$$1.$char(',')) {
            break;
          }
          if (s.condition) {
            error('Guards are only currently allowed on a single selector.');
          }
          parserInput$$1.commentStore.length = 0;
        }

        if (selectors && (rules = this.block())) {
          parserInput$$1.forget();
          var ruleset = new index$6.Ruleset(selectors, rules, context.strictImports);
          if (context.dumpLineNumbers) {
            ruleset.debugInfo = debugInfo;
          }
          return ruleset;
        } else {
          parserInput$$1.restore();
        }
      },
      rule: function rule(tryAnonymous) {
        var name = void 0;
        var value = void 0;
        var startOfRule = parserInput$$1.i;
        var c = parserInput$$1.currentChar();
        var important = void 0;
        var merge = void 0;
        var isVariable = void 0;

        if (c === '.' || c === '#' || c === '&' || c === ':') {
          return;
        }

        parserInput$$1.save();

        name = this.variable() || this.ruleProperty();
        if (name) {
          isVariable = typeof name === 'string';

          if (isVariable) {
            value = this.detachedRuleset();
          }

          parserInput$$1.commentStore.length = 0;
          if (!value) {
            // a name returned by this.ruleProperty() is always an array of the form:
            // [string-1, ..., string-n, ""] or [string-1, ..., string-n, "+"]
            // where each item is a tree.Keyword or tree.Variable
            merge = !isVariable && name.length > 1 && name.pop().value;

            // prefer to try to parse first if its a variable or we are compressing
            // but always fallback on the other one
            var tryValueFirst = !tryAnonymous && (context.compress || isVariable);

            if (tryValueFirst) {
              value = this.value();
            }
            if (!value) {
              value = this.anonymousValue();
              if (value) {
                parserInput$$1.forget();
                // anonymous values absorb the end ';' which is required for them to work
                return new index$6.Rule(name, value, false, merge, startOfRule, fileInfo);
              }
            }
            if (!tryValueFirst && !value) {
              value = this.value();
            }

            important = this.important();
          }

          if (value && this.end()) {
            parserInput$$1.forget();
            return new index$6.Rule(name, value, important, merge, startOfRule, fileInfo);
          } else {
            parserInput$$1.restore();
            if (value && !tryAnonymous) {
              return this.rule(true);
            }
          }
        } else {
          parserInput$$1.forget();
        }
      },
      anonymousValue: function anonymousValue() {
        var match = parserInput$$1.$re(/^([^@+\/'"*`(;{}-]*);/);
        if (match) {
          return new index$6.Anonymous(match[1]);
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
      import: function _import() {
        var path = void 0;
        var features = void 0;
        var index = parserInput$$1.i;

        var dir = parserInput$$1.$re(/^@import?\s+/);

        if (dir) {
          var options = (dir ? this.importOptions() : null) || {};

          if (path = this.entities.quoted() || this.entities.url()) {
            features = this.mediaFeatures();

            if (!parserInput$$1.$char(';')) {
              parserInput$$1.i = index;
              error('missing semi-colon or unrecognised media features on import');
            }
            features = features && new index$6.Value(features);
            return new index$6.Import(path, features, options, index, fileInfo);
          } else {
            parserInput$$1.i = index;
            error('malformed import statement');
          }
        }
      },

      importOptions: function importOptions() {
        var o = void 0;
        var options = {};
        var optionName = void 0;
        var value = void 0;

        // list of options, surrounded by parens
        if (!parserInput$$1.$char('(')) {
          return null;
        }
        do {
          o = this.importOption();
          if (o) {
            optionName = o;
            value = true;
            switch (optionName) {
              case 'css':
                optionName = 'less';
                value = false;
                break;
              case 'once':
                optionName = 'multiple';
                value = false;
                break;
            }
            options[optionName] = value;
            if (!parserInput$$1.$char(',')) {
              break;
            }
          }
        } while (o);
        expectChar(')');
        return options;
      },
      importOption: function importOption() {
        var opt = parserInput$$1.$re(/^(less|css|multiple|once|inline|reference|optional)/);
        if (opt) {
          return opt[1];
        }
      },
      mediaFeature: function mediaFeature() {
        var entities = this.entities;
        var nodes = [];
        var e = void 0;
        var p = void 0;
        parserInput$$1.save();
        do {
          e = entities.keyword() || entities.variable();
          if (e) {
            nodes.push(e);
          } else if (parserInput$$1.$char('(')) {
            p = this.property();
            e = this.value();
            if (parserInput$$1.$char(')')) {
              if (p && e) {
                nodes.push(new index$6.Paren(new index$6.Rule(p, e, null, null, parserInput$$1.i, fileInfo, true)));
              } else if (e) {
                nodes.push(new index$6.Paren(e));
              } else {
                error('badly formed media feature definition');
              }
            } else {
              error("Missing closing ')'", 'Parse');
            }
          }
        } while (e);

        parserInput$$1.forget();
        if (nodes.length > 0) {
          return new index$6.Expression(nodes);
        }
      },
      mediaFeatures: function mediaFeatures() {
        var entities = this.entities;
        var features = [];
        var e = void 0;
        do {
          e = this.mediaFeature();
          if (e) {
            features.push(e);
            if (!parserInput$$1.$char(',')) {
              break;
            }
          } else {
            e = entities.variable();
            if (e) {
              features.push(e);
              if (!parserInput$$1.$char(',')) {
                break;
              }
            }
          }
        } while (e);

        return features.length > 0 ? features : null;
      },
      media: function media() {
        var features = void 0;
        var rules = void 0;
        var media = void 0;
        var debugInfo = void 0;
        var index = parserInput$$1.i;

        if (context.dumpLineNumbers) {
          debugInfo = getDebugInfo(index);
        }

        parserInput$$1.save();

        if (parserInput$$1.$str('@media')) {
          features = this.mediaFeatures();

          rules = this.block();

          if (!rules) {
            error('media definitions require block statements after any features');
          }

          parserInput$$1.forget();

          media = new index$6.Media(rules, features, index, fileInfo);
          if (context.dumpLineNumbers) {
            media.debugInfo = debugInfo;
          }

          return media;
        }

        parserInput$$1.restore();
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
      plugin: function plugin() {
        var path = void 0;
        var index = parserInput$$1.i;
        var dir = parserInput$$1.$re(/^@plugin?\s+/);

        if (dir) {
          var options = { plugin: true };

          if (path = this.entities.quoted() || this.entities.url()) {
            if (!parserInput$$1.$char(';')) {
              parserInput$$1.i = index;
              error('missing semi-colon on plugin');
            }

            return new index$6.Import(path, null, options, index, fileInfo);
          } else {
            parserInput$$1.i = index;
            error('malformed plugin statement');
          }
        }
      },


      //
      // A CSS Directive
      //
      //     @charset "utf-8";
      //
      directive: function directive() {
        var index = parserInput$$1.i;
        var name = void 0;
        var value = void 0;
        var rules = void 0;
        var nonVendorSpecificName = void 0;
        var hasIdentifier = void 0;
        var hasExpression = void 0;
        var hasUnknown = void 0;
        var hasBlock = true;
        var isRooted = true;

        if (parserInput$$1.currentChar() !== '@') {
          return;
        }

        value = this['import']() || this.plugin() || this.media();
        if (value) {
          return value;
        }

        parserInput$$1.save();

        name = parserInput$$1.$re(/^@[a-z-]+/);

        if (!name) {
          return;
        }

        nonVendorSpecificName = name;
        if (name.charAt(1) == '-' && name.indexOf('-', 2) > 0) {
          nonVendorSpecificName = '@' + name.slice(name.indexOf('-', 2) + 1);
        }

        switch (nonVendorSpecificName) {
          case '@charset':
            hasIdentifier = true;
            hasBlock = false;
            break;
          case '@namespace':
            hasExpression = true;
            hasBlock = false;
            break;
          case '@keyframes':
          case '@counter-style':
            hasIdentifier = true;
            break;
          case '@document':
          case '@supports':
            hasUnknown = true;
            isRooted = false;
            break;
          default:
            hasUnknown = true;
            break;
        }

        parserInput$$1.commentStore.length = 0;

        if (hasIdentifier) {
          value = this.entity();
          if (!value) {
            error('expected ' + name + ' identifier');
          }
        } else if (hasExpression) {
          value = this.expression();
          if (!value) {
            error('expected ' + name + ' expression');
          }
        } else if (hasUnknown) {
          value = (parserInput$$1.$re(/^[^{;]+/) || '').trim();
          hasBlock = parserInput$$1.currentChar() == '{';
          if (value) {
            value = new index$6.Anonymous(value);
          }
        }

        if (hasBlock) {
          rules = this.blockRuleset();
        }

        if (rules || !hasBlock && value && parserInput$$1.$char(';')) {
          parserInput$$1.forget();
          return new index$6.Directive(name, value, rules, index, fileInfo, context.dumpLineNumbers ? getDebugInfo(index) : null, isRooted);
        }

        parserInput$$1.restore('directive options not recognised');
      },


      //
      // A Value is a comma-delimited list of Expressions
      //
      //     font-family: Baskerville, Georgia, serif;
      //
      // In a Rule, a Value represents everything after the `:`,
      // and before the `;`.
      //
      value: function value() {
        var e = void 0;
        var expressions = [];

        do {
          e = this.expression();
          if (e) {
            expressions.push(e);
            if (!parserInput$$1.$char(',')) {
              break;
            }
          }
        } while (e);

        if (expressions.length > 0) {
          return new index$6.Value(expressions);
        }
      },
      important: function important() {
        if (parserInput$$1.currentChar() === '!') {
          return parserInput$$1.$re(/^! *important/);
        }
      },
      sub: function sub() {
        var a = void 0;
        var e = void 0;

        parserInput$$1.save();
        if (parserInput$$1.$char('(')) {
          a = this.addition();
          if (a && parserInput$$1.$char(')')) {
            parserInput$$1.forget();
            e = new index$6.Expression([a]);
            e.parens = true;
            return e;
          }
          parserInput$$1.restore("Expected ')'");
          return;
        }
        parserInput$$1.restore();
      },
      multiplication: function multiplication() {
        var m = void 0;
        var a = void 0;
        var op = void 0;
        var operation = void 0;
        var isSpaced = void 0;
        m = this.operand();
        if (m) {
          isSpaced = parserInput$$1.isWhitespace(-1);
          while (true) {
            if (parserInput$$1.peek(/^\/[*\/]/)) {
              break;
            }

            parserInput$$1.save();

            op = parserInput$$1.$char('/') || parserInput$$1.$char('*');

            if (!op) {
              parserInput$$1.forget();
              break;
            }

            a = this.operand();

            if (!a) {
              parserInput$$1.restore();
              break;
            }
            parserInput$$1.forget();

            m.parensInOp = true;
            a.parensInOp = true;
            operation = new index$6.Operation(op, [operation || m, a], isSpaced);
            isSpaced = parserInput$$1.isWhitespace(-1);
          }
          return operation || m;
        }
      },
      addition: function addition() {
        var m = void 0;
        var a = void 0;
        var op = void 0;
        var operation = void 0;
        var isSpaced = void 0;
        m = this.multiplication();
        if (m) {
          isSpaced = parserInput$$1.isWhitespace(-1);
          while (true) {
            op = parserInput$$1.$re(/^[-+]\s+/) || !isSpaced && (parserInput$$1.$char('+') || parserInput$$1.$char('-'));
            if (!op) {
              break;
            }
            a = this.multiplication();
            if (!a) {
              break;
            }

            m.parensInOp = true;
            a.parensInOp = true;
            operation = new index$6.Operation(op, [operation || m, a], isSpaced);
            isSpaced = parserInput$$1.isWhitespace(-1);
          }
          return operation || m;
        }
      },
      conditions: function conditions() {
        var a = void 0;
        var b = void 0;
        var index = parserInput$$1.i;
        var condition = void 0;

        a = this.condition();
        if (a) {
          while (true) {
            if (!parserInput$$1.peek(/^,\s*(not\s*)?\(/) || !parserInput$$1.$char(',')) {
              break;
            }
            b = this.condition();
            if (!b) {
              break;
            }
            condition = new index$6.Condition('or', condition || a, b, index);
          }
          return condition || a;
        }
      },
      condition: function condition() {
        var result = void 0;
        var logical = void 0;
        var next = void 0;
        function or() {
          return parserInput$$1.$str('or');
        }

        result = this.conditionAnd(this);
        if (!result) {
          return;
        }
        logical = or();
        if (logical) {
          next = this.condition();
          if (next) {
            result = new index$6.Condition(logical, result, next);
          } else {
            return;
          }
        }
        return result;
      },
      conditionAnd: function conditionAnd() {
        var result = void 0;
        var logical = void 0;
        var next = void 0;
        function insideCondition(me) {
          return me.negatedCondition() || me.parenthesisCondition();
        }
        function and() {
          return parserInput$$1.$str('and');
        }

        result = insideCondition(this);
        if (!result) {
          return;
        }
        logical = and();
        if (logical) {
          next = this.conditionAnd();
          if (next) {
            result = new index$6.Condition(logical, result, next);
          } else {
            return;
          }
        }
        return result;
      },
      negatedCondition: function negatedCondition() {
        if (parserInput$$1.$str('not')) {
          var result = this.parenthesisCondition();
          if (result) {
            result.negate = !result.negate;
          }
          return result;
        }
      },
      parenthesisCondition: function parenthesisCondition() {
        function tryConditionFollowedByParenthesis(me) {
          var body = void 0;
          parserInput$$1.save();
          body = me.condition();
          if (!body) {
            parserInput$$1.restore();
            return;
          }
          if (!parserInput$$1.$char(')')) {
            parserInput$$1.restore();
            return;
          }
          parserInput$$1.forget();
          return body;
        }

        var body = void 0;
        parserInput$$1.save();
        if (!parserInput$$1.$str('(')) {
          parserInput$$1.restore();
          return;
        }
        body = tryConditionFollowedByParenthesis(this);
        if (body) {
          parserInput$$1.forget();
          return body;
        }

        body = this.atomicCondition();
        if (!body) {
          parserInput$$1.restore();
          return;
        }
        if (!parserInput$$1.$char(')')) {
          parserInput$$1.restore('expected \')\' got \'' + parserInput$$1.currentChar() + '\'');
          return;
        }
        parserInput$$1.forget();
        return body;
      },
      atomicCondition: function atomicCondition() {
        var entities = this.entities;
        var index = parserInput$$1.i;
        var a = void 0;
        var b = void 0;
        var c = void 0;
        var op = void 0;

        a = this.addition() || entities.keyword() || entities.quoted();
        if (a) {
          if (parserInput$$1.$char('>')) {
            if (parserInput$$1.$char('=')) {
              op = '>=';
            } else {
              op = '>';
            }
          } else if (parserInput$$1.$char('<')) {
            if (parserInput$$1.$char('=')) {
              op = '<=';
            } else {
              op = '<';
            }
          } else if (parserInput$$1.$char('=')) {
            if (parserInput$$1.$char('>')) {
              op = '=>';
            } else if (parserInput$$1.$char('<')) {
              op = '=<';
            } else {
              op = '=';
            }
          }
          if (op) {
            b = this.addition() || entities.keyword() || entities.quoted();
            if (b) {
              c = new index$6.Condition(op, a, b, index, false);
            } else {
              error('expected expression');
            }
          } else {
            c = new index$6.Condition('=', a, new index$6.Keyword('true'), index, false);
          }
          return c;
        }
      },


      //
      // An operand is anything that can be part of an operation,
      // such as a Color, or a Variable
      //
      operand: function operand() {
        var entities = this.entities;
        var negate = void 0;

        if (parserInput$$1.peek(/^-[@\(]/)) {
          negate = parserInput$$1.$char('-');
        }

        var o = this.sub() || entities.dimension() || entities.color() || entities.variable() || entities.call() || entities.colorKeyword();

        if (negate) {
          o.parensInOp = true;
          o = new index$6.Negative(o);
        }

        return o;
      },


      //
      // Expressions either represent mathematical operations,
      // or white-space delimited Entities.
      //
      //     1px solid black
      //     @var * 2
      //
      expression: function expression() {
        var entities = [];
        var e = void 0;
        var delim = void 0;

        do {
          e = this.comment();
          if (e) {
            entities.push(e);
            continue;
          }
          e = this.addition() || this.entity();
          if (e) {
            entities.push(e);
            // operations do not allow keyword "/" dimension (e.g. small/20px) so we support that here
            if (!parserInput$$1.peek(/^\/[\/*]/)) {
              delim = parserInput$$1.$char('/');
              if (delim) {
                entities.push(new index$6.Anonymous(delim));
              }
            }
          }
        } while (e);
        if (entities.length > 0) {
          return new index$6.Expression(entities);
        }
      },
      property: function property() {
        var name = parserInput$$1.$re(/^(\*?-?[_a-zA-Z0-9-]+)\s*:/);
        if (name) {
          return name[1];
        }
      },
      ruleProperty: function ruleProperty() {
        var name = [];
        var index = [];
        var s = void 0;
        var k = void 0;

        parserInput$$1.save();

        var simpleProperty = parserInput$$1.$re(/^([_a-zA-Z0-9-]+)\s*:/);
        if (simpleProperty) {
          name = [new index$6.Keyword(simpleProperty[1])];
          parserInput$$1.forget();
          return name;
        }

        function match(re) {
          var i = parserInput$$1.i;
          var chunk = parserInput$$1.$re(re);
          if (chunk) {
            index.push(i);
            return name.push(chunk[1]);
          }
        }

        match(/^(\*?)/);
        while (true) {
          if (!match(/^((?:[\w-]+)|(?:@\{[\w-]+\}))/)) {
            break;
          }
        }

        if (name.length > 1 && match(/^((?:\+_|\+)?)\s*:/)) {
          parserInput$$1.forget();

          // at last, we have the complete match now. move forward,
          // convert name particles to tree objects and return:
          if (name[0] === '') {
            name.shift();
            index.shift();
          }
          for (k = 0; k < name.length; k++) {
            s = name[k];
            name[k] = s.charAt(0) !== '@' ? new index$6.Keyword(s) : new index$6.Variable('@' + s.slice(2, -1), index[k], fileInfo);
          }
          return name;
        }
        parserInput$$1.restore();
      }
    }
  };
};
Parser.serializeVars = function (vars) {
  var s = '';

  for (var name in vars) {
    if (Object.hasOwnProperty.call(vars, name)) {
      var value = vars[name];
      s += (name[0] === '@' ? '' : '@') + name + ': ' + value + (String(value).slice(-1) === ';' ? '' : ';');
    }
  }

  return s;
};

var parser = Parser;

var functionImporter = createCommonjsModule(function (module) {
  var FunctionImporter = module.exports = function FunctionImporter(context, fileInfo) {
    this.fileInfo = fileInfo;
  };

  FunctionImporter.prototype.eval = function (contents, callback) {
    var loaded = {};
    var loader = void 0;
    var registry = void 0;

    registry = {
      add: function add(name, func) {
        loaded[name] = func;
      },
      addMultiple: function addMultiple(functions) {
        Object.keys(functions).forEach(function (name) {
          loaded[name] = functions[name];
        });
      }
    };

    try {
      loader = new Function('functions', 'tree', 'fileInfo', contents);
      loader(registry, index$6, this.fileInfo);
    } catch (e) {
      callback(new lessError({
        message: 'Plugin evaluation error: \'' + e.name + ': ' + e.message.replace(/["]/g, "'") + '\'',
        filename: this.fileInfo.filename
      }), null);
    }

    callback(null, { functions: loaded });
  };
});

var importManager = function importManager(environment) {
  // FileInfo = {
  //  'relativeUrls' - option - whether to adjust URL's to be relative
  //  'filename' - full resolved filename of current file
  //  'rootpath' - path to append to normal URLs for this node
  //  'currentDirectory' - path to the current file, absolute
  //  'rootFilename' - filename of the base file
  //  'entryPath' - absolute path to the entry file
  //  'reference' - whether the file should not be output and only output parts that are referenced

  var ImportManager = function () {
    function ImportManager(context, rootFileInfo) {
      classCallCheck(this, ImportManager);

      this.rootFilename = rootFileInfo.filename;
      this.paths = context.paths || []; // Search paths, when importing
      this.contents = {}; // map - filename to contents of all the files
      this.contentsIgnoredChars = {}; // map - filename to lines at the beginning of each file to ignore
      this.mime = context.mime;
      this.error = null;
      this.context = context;
      // Deprecated? Unused outside of here, could be useful.
      this.queue = []; // Files which haven't been imported yet
      this.files = {}; // Holds the imported parse trees.
    }

    /**
         * Add an import to be imported
         * @param path - the raw path
         * @param tryAppendLessExtension - whether to try appending the less extension (if the path has no extension)
         * @param currentFileInfo - the current file info (used for instance to work out relative paths)
         * @param importOptions - import options
         * @param callback - callback for when it is imported
         */


    ImportManager.prototype.push = function push(path, tryAppendLessExtension, currentFileInfo, importOptions, callback) {
      var importManager = this;
      this.queue.push(path);

      var fileParsedFunc = function fileParsedFunc(e, root, fullPath) {
        importManager.queue.splice(importManager.queue.indexOf(path), 1); // Remove the path from the queue

        var importedEqualsRoot = fullPath === importManager.rootFilename;
        if (importOptions.optional && e) {
          callback(null, { rules: [] }, false, null);
        } else {
          importManager.files[fullPath] = root;
          if (e && !importManager.error) {
            importManager.error = e;
          }
          callback(e, root, importedEqualsRoot, fullPath);
        }
      };

      var newFileInfo = {
        relativeUrls: this.context.relativeUrls,
        entryPath: currentFileInfo.entryPath,
        rootpath: currentFileInfo.rootpath,
        rootFilename: currentFileInfo.rootFilename
      };

      var fileManager = environment.getFileManager(path, currentFileInfo.currentDirectory, this.context, environment);

      if (!fileManager) {
        fileParsedFunc({ message: 'Could not find a file-manager for ' + path });
        return;
      }

      if (tryAppendLessExtension) {
        path = fileManager.tryAppendExtension(path, importOptions.plugin ? '.js' : '.less');
      }

      var loadFileCallback = function loadFileCallback(loadedFile) {
        var resolvedFilename = loadedFile.filename;
        var contents = loadedFile.contents.replace(/^\uFEFF/, '');

        // Pass on an updated rootpath if path of imported file is relative and file
        // is in a (sub|sup) directory
        //
        // Examples:
        // - If path of imported file is 'module/nav/nav.less' and rootpath is 'less/',
        //   then rootpath should become 'less/module/nav/'
        // - If path of imported file is '../mixins.less' and rootpath is 'less/',
        //   then rootpath should become 'less/../'
        newFileInfo.currentDirectory = fileManager.getPath(resolvedFilename);
        if (newFileInfo.relativeUrls) {
          newFileInfo.rootpath = fileManager.join(importManager.context.rootpath || '', fileManager.pathDiff(newFileInfo.currentDirectory, newFileInfo.entryPath));

          if (!fileManager.isPathAbsolute(newFileInfo.rootpath) && fileManager.alwaysMakePathsAbsolute()) {
            newFileInfo.rootpath = fileManager.join(newFileInfo.entryPath, newFileInfo.rootpath);
          }
        }
        newFileInfo.filename = resolvedFilename;

        var newEnv = new contexts_1.Parse(importManager.context);

        newEnv.processImports = false;
        importManager.contents[resolvedFilename] = contents;

        if (currentFileInfo.reference || importOptions.reference) {
          newFileInfo.reference = true;
        }

        if (importOptions.plugin) {
          new functionImporter(newEnv, newFileInfo).eval(contents, function (e, root) {
            fileParsedFunc(e, root, resolvedFilename);
          });
        } else if (importOptions.inline) {
          fileParsedFunc(null, contents, resolvedFilename);
        } else {
          new parser(newEnv, importManager, newFileInfo).parse(contents, function (e, root) {
            fileParsedFunc(e, root, resolvedFilename);
          });
        }
      };

      var promise = fileManager.loadFile(path, currentFileInfo.currentDirectory, this.context, environment, function (err, loadedFile) {
        if (err) {
          fileParsedFunc(err);
        } else {
          loadFileCallback(loadedFile);
        }
      });
      if (promise) {
        promise.then(loadFileCallback, fileParsedFunc);
      }
    };

    return ImportManager;
  }();

  return ImportManager;
};

var index$8 = {
  colors: colors,
  unitConversions: unitConversions
};

var abstractFileManager = function () {
  function abstractFileManager() {
    classCallCheck(this, abstractFileManager);
  }

  abstractFileManager.prototype.getPath = function getPath(filename) {
    var j = filename.lastIndexOf('?');
    if (j > 0) {
      filename = filename.slice(0, j);
    }
    j = filename.lastIndexOf('/');
    if (j < 0) {
      j = filename.lastIndexOf('\\');
    }
    if (j < 0) {
      return '';
    }
    return filename.slice(0, j + 1);
  };

  abstractFileManager.prototype.tryAppendExtension = function tryAppendExtension(path, ext) {
    return (/(\.[a-z]*$)|([\?;].*)$/.test(path) ? path : path + ext
    );
  };

  abstractFileManager.prototype.tryAppendLessExtension = function tryAppendLessExtension(path) {
    return this.tryAppendExtension(path, '.less');
  };

  abstractFileManager.prototype.supportsSync = function supportsSync() {
    return false;
  };

  abstractFileManager.prototype.alwaysMakePathsAbsolute = function alwaysMakePathsAbsolute() {
    return false;
  };

  abstractFileManager.prototype.isPathAbsolute = function isPathAbsolute(filename) {
    return (/^(?:[a-z-]+:|\/|\\|#)/i.test(filename)
    );
  };

  abstractFileManager.prototype.join = function join(basePath, laterPath) {
    if (!basePath) {
      return laterPath;
    }
    return basePath + laterPath;
  };

  abstractFileManager.prototype.pathDiff = function pathDiff(url, baseUrl) {
    // diff between two paths to create a relative path

    var urlParts = this.extractUrlParts(url);

    var baseUrlParts = this.extractUrlParts(baseUrl);
    var i = void 0;
    var max = void 0;
    var urlDirectories = void 0;
    var baseUrlDirectories = void 0;
    var diff = '';
    if (urlParts.hostPart !== baseUrlParts.hostPart) {
      return '';
    }
    max = Math.max(baseUrlParts.directories.length, urlParts.directories.length);
    for (i = 0; i < max; i++) {
      if (baseUrlParts.directories[i] !== urlParts.directories[i]) {
        break;
      }
    }
    baseUrlDirectories = baseUrlParts.directories.slice(i);
    urlDirectories = urlParts.directories.slice(i);
    for (i = 0; i < baseUrlDirectories.length - 1; i++) {
      diff += '../';
    }
    for (i = 0; i < urlDirectories.length - 1; i++) {
      diff += urlDirectories[i] + '/';
    }
    return diff;
  };

  // helper function, not part of API


  abstractFileManager.prototype.extractUrlParts = function extractUrlParts(url, baseUrl) {
    // urlParts[1] = protocol://hostname/ OR /
    // urlParts[2] = / if path relative to host base
    // urlParts[3] = directories
    // urlParts[4] = filename
    // urlParts[5] = parameters

    var urlPartsRegex = /^((?:[a-z-]+:)?\/{2}(?:[^\/\?#]*\/)|([\/\\]))?((?:[^\/\\\?#]*[\/\\])*)([^\/\\\?#]*)([#\?].*)?$/i;

    var urlParts = url.match(urlPartsRegex);
    var returner = {};
    var directories = [];
    var i = void 0;
    var baseUrlParts = void 0;

    if (!urlParts) {
      throw new Error('Could not parse sheet href - \'' + url + '\'');
    }

    // Stylesheets in IE don't always return the full path
    if (baseUrl && (!urlParts[1] || urlParts[2])) {
      baseUrlParts = baseUrl.match(urlPartsRegex);
      if (!baseUrlParts) {
        throw new Error('Could not parse page url - \'' + baseUrl + '\'');
      }
      urlParts[1] = urlParts[1] || baseUrlParts[1] || '';
      if (!urlParts[2]) {
        urlParts[3] = baseUrlParts[3] + urlParts[3];
      }
    }

    if (urlParts[3]) {
      directories = urlParts[3].replace(/\\/g, '/').split('/');

      // extract out . before .. so .. doesn't absorb a non-directory
      for (i = 0; i < directories.length; i++) {
        if (directories[i] === '.') {
          directories.splice(i, 1);
          i -= 1;
        }
      }

      for (i = 0; i < directories.length; i++) {
        if (directories[i] === '..' && i > 0) {
          directories.splice(i - 1, 2);
          i -= 2;
        }
      }
    }

    returner.hostPart = urlParts[1];
    returner.directories = directories;
    returner.path = (urlParts[1] || '') + directories.join('/');
    returner.fileUrl = returner.path + (urlParts[4] || '');
    returner.url = returner.fileUrl + (urlParts[5] || '');
    return returner;
  };

  return abstractFileManager;
}();

var abstractFileManager_1 = abstractFileManager;

var colorFunctions = void 0;

function clamp$1(val) {
  return Math.min(1, Math.max(0, val));
}
function hsla(color$$1) {
  return colorFunctions.hsla(color$$1.h, color$$1.s, color$$1.l, color$$1.a);
}
function number(n) {
  if (n instanceof dimension) {
    return parseFloat(n.unit.is('%') ? n.value / 100 : n.value);
  } else if (typeof n === 'number') {
    return n;
  } else {
    throw {
      type: 'Argument',
      message: 'color functions take numbers as parameters'
    };
  }
}
function scaled(n, size) {
  if (n instanceof dimension && n.unit.is('%')) {
    return parseFloat(n.value * size / 100);
  } else {
    return number(n);
  }
}
colorFunctions = {
  rgb: function rgb(r, g, b) {
    return colorFunctions.rgba(r, g, b, 1.0);
  },
  rgba: function rgba(r, g, b, a) {
    var rgb = [r, g, b].map(function (c) {
      return scaled(c, 255);
    });
    a = number(a);
    return new color(rgb, a);
  },
  hsl: function hsl(h, s, l) {
    return colorFunctions.hsla(h, s, l, 1.0);
  },
  hsla: function hsla(h, s, l, a) {
    var m1 = void 0;
    var m2 = void 0;

    function hue(h) {
      h = h < 0 ? h + 1 : h > 1 ? h - 1 : h;
      if (h * 6 < 1) {
        return m1 + (m2 - m1) * h * 6;
      } else if (h * 2 < 1) {
        return m2;
      } else if (h * 3 < 2) {
        return m1 + (m2 - m1) * (2 / 3 - h) * 6;
      } else {
        return m1;
      }
    }

    h = number(h) % 360 / 360;
    s = clamp$1(number(s));
    l = clamp$1(number(l));
    a = clamp$1(number(a));

    m2 = l <= 0.5 ? l * (s + 1) : l + s - l * s;
    m1 = l * 2 - m2;

    return colorFunctions.rgba(hue(h + 1 / 3) * 255, hue(h) * 255, hue(h - 1 / 3) * 255, a);
  },
  hsv: function hsv(h, s, v) {
    return colorFunctions.hsva(h, s, v, 1.0);
  },
  hsva: function hsva(h, s, v, a) {
    h = number(h) % 360 / 360 * 360;
    s = number(s);
    v = number(v);
    a = number(a);

    var i = void 0;
    var f = void 0;
    i = Math.floor(h / 60 % 6);
    f = h / 60 - i;

    var vs = [v, v * (1 - s), v * (1 - f * s), v * (1 - (1 - f) * s)];
    var perm = [[0, 3, 1], [2, 0, 1], [1, 0, 3], [1, 2, 0], [3, 1, 0], [0, 1, 2]];

    return colorFunctions.rgba(vs[perm[i][0]] * 255, vs[perm[i][1]] * 255, vs[perm[i][2]] * 255, a);
  },
  hue: function hue(color$$1) {
    return new dimension(color$$1.toHSL().h);
  },
  saturation: function saturation(color$$1) {
    return new dimension(color$$1.toHSL().s * 100, '%');
  },
  lightness: function lightness(color$$1) {
    return new dimension(color$$1.toHSL().l * 100, '%');
  },
  hsvhue: function hsvhue(color$$1) {
    return new dimension(color$$1.toHSV().h);
  },
  hsvsaturation: function hsvsaturation(color$$1) {
    return new dimension(color$$1.toHSV().s * 100, '%');
  },
  hsvvalue: function hsvvalue(color$$1) {
    return new dimension(color$$1.toHSV().v * 100, '%');
  },
  red: function red(color$$1) {
    return new dimension(color$$1.rgb[0]);
  },
  green: function green(color$$1) {
    return new dimension(color$$1.rgb[1]);
  },
  blue: function blue(color$$1) {
    return new dimension(color$$1.rgb[2]);
  },
  alpha: function alpha(color$$1) {
    return new dimension(color$$1.toHSL().a);
  },
  luma: function luma(color$$1) {
    return new dimension(color$$1.luma() * color$$1.alpha * 100, '%');
  },
  luminance: function luminance(color$$1) {
    var luminance = 0.2126 * color$$1.rgb[0] / 255 + 0.7152 * color$$1.rgb[1] / 255 + 0.0722 * color$$1.rgb[2] / 255;

    return new dimension(luminance * color$$1.alpha * 100, '%');
  },
  saturate: function saturate(color$$1, amount, method) {
    // filter: saturate(3.2);
    // should be kept as is, so check for color
    if (!color$$1.rgb) {
      return null;
    }
    var hsl = color$$1.toHSL();

    if (typeof method !== 'undefined' && method.value === 'relative') {
      hsl.s += hsl.s * amount.value / 100;
    } else {
      hsl.s += amount.value / 100;
    }
    hsl.s = clamp$1(hsl.s);
    return hsla(hsl);
  },
  desaturate: function desaturate(color$$1, amount, method) {
    var hsl = color$$1.toHSL();

    if (typeof method !== 'undefined' && method.value === 'relative') {
      hsl.s -= hsl.s * amount.value / 100;
    } else {
      hsl.s -= amount.value / 100;
    }
    hsl.s = clamp$1(hsl.s);
    return hsla(hsl);
  },
  lighten: function lighten(color$$1, amount, method) {
    var hsl = color$$1.toHSL();

    if (typeof method !== 'undefined' && method.value === 'relative') {
      hsl.l += hsl.l * amount.value / 100;
    } else {
      hsl.l += amount.value / 100;
    }
    hsl.l = clamp$1(hsl.l);
    return hsla(hsl);
  },
  darken: function darken(color$$1, amount, method) {
    var hsl = color$$1.toHSL();

    if (typeof method !== 'undefined' && method.value === 'relative') {
      hsl.l -= hsl.l * amount.value / 100;
    } else {
      hsl.l -= amount.value / 100;
    }
    hsl.l = clamp$1(hsl.l);
    return hsla(hsl);
  },
  fadein: function fadein(color$$1, amount, method) {
    var hsl = color$$1.toHSL();

    if (typeof method !== 'undefined' && method.value === 'relative') {
      hsl.a += hsl.a * amount.value / 100;
    } else {
      hsl.a += amount.value / 100;
    }
    hsl.a = clamp$1(hsl.a);
    return hsla(hsl);
  },
  fadeout: function fadeout(color$$1, amount, method) {
    var hsl = color$$1.toHSL();

    if (typeof method !== 'undefined' && method.value === 'relative') {
      hsl.a -= hsl.a * amount.value / 100;
    } else {
      hsl.a -= amount.value / 100;
    }
    hsl.a = clamp$1(hsl.a);
    return hsla(hsl);
  },
  fade: function fade(color$$1, amount) {
    var hsl = color$$1.toHSL();

    hsl.a = amount.value / 100;
    hsl.a = clamp$1(hsl.a);
    return hsla(hsl);
  },
  spin: function spin(color$$1, amount) {
    var hsl = color$$1.toHSL();
    var hue = (hsl.h + amount.value) % 360;

    hsl.h = hue < 0 ? 360 + hue : hue;

    return hsla(hsl);
  },

  //
  // Copyright (c) 2006-2009 Hampton Catlin, Natalie Weizenbaum, and Chris Eppstein
  // http://sass-lang.com
  //
  mix: function mix(color1, color2, weight) {
    if (!color1.toHSL || !color2.toHSL) {
      console.log(color2.type);
      console.dir(color2);
    }
    if (!weight) {
      weight = new dimension(50);
    }
    var p = weight.value / 100.0;
    var w = p * 2 - 1;
    var a = color1.toHSL().a - color2.toHSL().a;

    var w1 = ((w * a == -1 ? w : (w + a) / (1 + w * a)) + 1) / 2.0;
    var w2 = 1 - w1;

    var rgb = [color1.rgb[0] * w1 + color2.rgb[0] * w2, color1.rgb[1] * w1 + color2.rgb[1] * w2, color1.rgb[2] * w1 + color2.rgb[2] * w2];

    var alpha = color1.alpha * p + color2.alpha * (1 - p);

    return new color(rgb, alpha);
  },
  greyscale: function greyscale(color$$1) {
    return colorFunctions.desaturate(color$$1, new dimension(100));
  },
  contrast: function contrast(color$$1, dark, light, threshold) {
    // filter: contrast(3.2);
    // should be kept as is, so check for color
    if (!color$$1.rgb) {
      return null;
    }
    if (typeof light === 'undefined') {
      light = colorFunctions.rgba(255, 255, 255, 1.0);
    }
    if (typeof dark === 'undefined') {
      dark = colorFunctions.rgba(0, 0, 0, 1.0);
    }
    //Figure out which is actually light and dark!
    if (dark.luma() > light.luma()) {
      var t = light;
      light = dark;
      dark = t;
    }
    if (typeof threshold === 'undefined') {
      threshold = 0.43;
    } else {
      threshold = number(threshold);
    }
    if (color$$1.luma() < threshold) {
      return light;
    } else {
      return dark;
    }
  },
  argb: function argb(color$$1) {
    return new anonymous(color$$1.toARGB());
  },
  color: function color$$1(c) {
    if (c instanceof quoted && /^#([a-f0-9]{6}|[a-f0-9]{3})$/i.test(c.value)) {
      return new color(c.value.slice(1));
    }
    if (c instanceof color || (c = color.fromKeyword(c.value))) {
      c.value = undefined;
      return c;
    }
    throw {
      type: 'Argument',
      message: 'argument must be a color keyword or 3/6 digit hex e.g. #FFF'
    };
  },
  tint: function tint(color$$1, amount) {
    return colorFunctions.mix(colorFunctions.rgb(255, 255, 255), color$$1, amount);
  },
  shade: function shade(color$$1, amount) {
    return colorFunctions.mix(colorFunctions.rgb(0, 0, 0), color$$1, amount);
  }
};
functionRegistry.addMultiple(colorFunctions);

// Color Blending
// ref: http://www.w3.org/TR/compositing-1

function colorBlend(mode, color1, color2) {
  var ab = color1.alpha; // result

  var // backdrop
  cb = void 0;

  var as = color2.alpha;

  var // source
  cs = void 0;

  var ar = void 0;
  var cr = void 0;
  var r = [];

  ar = as + ab * (1 - as);
  for (var i = 0; i < 3; i++) {
    cb = color1.rgb[i] / 255;
    cs = color2.rgb[i] / 255;
    cr = mode(cb, cs);
    if (ar) {
      cr = (as * cs + ab * (cb - as * (cb + cs - cr))) / ar;
    }
    r[i] = cr * 255;
  }

  return new color(r, ar);
}

var colorBlendModeFunctions = {
  multiply: function multiply(cb, cs) {
    return cb * cs;
  },
  screen: function screen(cb, cs) {
    return cb + cs - cb * cs;
  },
  overlay: function overlay(cb, cs) {
    cb *= 2;
    return cb <= 1 ? colorBlendModeFunctions.multiply(cb, cs) : colorBlendModeFunctions.screen(cb - 1, cs);
  },
  softlight: function softlight(cb, cs) {
    var d = 1;
    var e = cb;
    if (cs > 0.5) {
      e = 1;
      d = cb > 0.25 ? Math.sqrt(cb) : ((16 * cb - 12) * cb + 4) * cb;
    }
    return cb - (1 - 2 * cs) * e * (d - cb);
  },
  hardlight: function hardlight(cb, cs) {
    return colorBlendModeFunctions.overlay(cs, cb);
  },
  difference: function difference(cb, cs) {
    return Math.abs(cb - cs);
  },
  exclusion: function exclusion(cb, cs) {
    return cb + cs - 2 * cb * cs;
  },


  // non-w3c functions:
  average: function average(cb, cs) {
    return (cb + cs) / 2;
  },
  negation: function negation(cb, cs) {
    return 1 - Math.abs(cb + cs - 1);
  }
};

for (var f in colorBlendModeFunctions) {
  if (colorBlendModeFunctions.hasOwnProperty(f)) {
    colorBlend[f] = colorBlend.bind(null, colorBlendModeFunctions[f]);
  }
}

functionRegistry.addMultiple(colorBlend);

var dataUri = function dataUri(environment) {
  var Quoted = quoted;
  var URL = url;
  var functionRegistry$$1 = functionRegistry;
  var fallback = function fallback(functionThis, node) {
    return new URL(node, functionThis.index, functionThis.currentFileInfo).eval(functionThis.context);
  };
  var logger$$1 = logger;

  functionRegistry$$1.add('data-uri', function (mimetypeNode, filePathNode) {
    if (!filePathNode) {
      filePathNode = mimetypeNode;
      mimetypeNode = null;
    }

    var mimetype = mimetypeNode && mimetypeNode.value;
    var filePath = filePathNode.value;
    var currentFileInfo = this.currentFileInfo;
    var currentDirectory = currentFileInfo.relativeUrls ? currentFileInfo.currentDirectory : currentFileInfo.entryPath;

    var fragmentStart = filePath.indexOf('#');
    var fragment = '';
    if (fragmentStart !== -1) {
      fragment = filePath.slice(fragmentStart);
      filePath = filePath.slice(0, fragmentStart);
    }

    var fileManager = environment.getFileManager(filePath, currentDirectory, this.context, environment, true);

    if (!fileManager) {
      return fallback(this, filePathNode);
    }

    var useBase64 = false;

    // detect the mimetype if not given
    if (!mimetypeNode) {
      mimetype = environment.mimeLookup(filePath);

      if (mimetype === 'image/svg+xml') {
        useBase64 = false;
      } else {
        // use base 64 unless it's an ASCII or UTF-8 format
        var charset = environment.charsetLookup(mimetype);
        useBase64 = ['US-ASCII', 'UTF-8'].indexOf(charset) < 0;
      }
      if (useBase64) {
        mimetype += ';base64';
      }
    } else {
      useBase64 = /;base64$/.test(mimetype);
    }

    var fileSync = fileManager.loadFileSync(filePath, currentDirectory, this.context, environment);
    if (!fileSync.contents) {
      logger$$1.warn('Skipped data-uri embedding of ' + filePath + ' because file not found');
      return fallback(this, filePathNode || mimetypeNode);
    }
    var buf = fileSync.contents;
    if (useBase64 && !environment.encodeBase64) {
      return fallback(this, filePathNode);
    }

    buf = useBase64 ? environment.encodeBase64(buf) : encodeURIComponent(buf);

    var uri = 'data:' + mimetype + ',' + buf + fragment;

    // IE8 cannot handle a data-uri larger than 32,768 characters. If this is exceeded
    // and the --ieCompat flag is enabled, return a normal url() instead.
    var DATA_URI_MAX = 32768;
    if (uri.length >= DATA_URI_MAX) {
      if (this.context.ieCompat !== false) {
        logger$$1.warn('Skipped data-uri embedding of ' + filePath + ' because its size (' + uri.length + ' characters) exceeds IE8-safe ' + DATA_URI_MAX + ' characters!');

        return fallback(this, filePathNode || mimetypeNode);
      }
    }

    return new URL(new Quoted('"' + uri + '"', uri, false, this.index, this.currentFileInfo), this.index, this.currentFileInfo);
  });
};

var MathHelper = function MathHelper() {};
MathHelper._math = function (fn, unit, n) {
  if (!(n instanceof dimension)) {
    throw { type: 'Argument', message: 'argument must be a number' };
  }
  if (unit == null) {
    unit = n.unit;
  } else {
    n = n.unify();
  }
  return new dimension(fn(parseFloat(n.value)), unit);
};
var mathHelper = MathHelper;

var mathFunctions = {
  // name,  unit
  ceil: null,
  floor: null,
  sqrt: null,
  abs: null,
  tan: '',
  sin: '',
  cos: '',
  atan: 'rad',
  asin: 'rad',
  acos: 'rad'
};

for (var f$1 in mathFunctions) {
  if (mathFunctions.hasOwnProperty(f$1)) {
    mathFunctions[f$1] = mathHelper._math.bind(null, Math[f$1], mathFunctions[f$1]);
  }
}

mathFunctions.round = function (n, f) {
  var fraction = typeof f === 'undefined' ? 0 : f.value;
  return mathHelper._math(function (num) {
    return num.toFixed(fraction);
  }, null, n);
};

functionRegistry.addMultiple(mathFunctions);

var minMax = function minMax(isMin, args) {
  args = Array.prototype.slice.call(args);
  switch (args.length) {
    case 0:
      throw { type: 'Argument', message: 'one or more arguments required' };
  }
  var i = void 0; // key is the unit.toString() for unified Dimension values,
  var j = void 0;
  var current = void 0;
  var currentUnified = void 0;
  var referenceUnified = void 0;
  var unit = void 0;
  var unitStatic = void 0;
  var unitClone = void 0;

  var // elems only contains original argument values.
  order = [];

  var values = {};
  // value is the index into the order array.
  for (i = 0; i < args.length; i++) {
    current = args[i];
    if (!(current instanceof dimension)) {
      if (Array.isArray(args[i].value)) {
        Array.prototype.push.apply(args, Array.prototype.slice.call(args[i].value));
      }
      continue;
    }
    currentUnified = current.unit.toString() === '' && unitClone !== undefined ? new dimension(current.value, unitClone).unify() : current.unify();
    unit = currentUnified.unit.toString() === '' && unitStatic !== undefined ? unitStatic : currentUnified.unit.toString();
    unitStatic = unit !== '' && unitStatic === undefined || unit !== '' && order[0].unify().unit.toString() === '' ? unit : unitStatic;
    unitClone = unit !== '' && unitClone === undefined ? current.unit.toString() : unitClone;
    j = values[''] !== undefined && unit !== '' && unit === unitStatic ? values[''] : values[unit];
    if (j === undefined) {
      if (unitStatic !== undefined && unit !== unitStatic) {
        throw { type: 'Argument', message: 'incompatible types' };
      }
      values[unit] = order.length;
      order.push(current);
      continue;
    }
    referenceUnified = order[j].unit.toString() === '' && unitClone !== undefined ? new dimension(order[j].value, unitClone).unify() : order[j].unify();
    if (isMin && currentUnified.value < referenceUnified.value || !isMin && currentUnified.value > referenceUnified.value) {
      order[j] = current;
    }
  }
  if (order.length == 1) {
    return order[0];
  }
  args = order.map(function (a) {
    return a.toCSS(this.context);
  }).join(this.context.compress ? ',' : ', ');
  return new anonymous((isMin ? 'min' : 'max') + '(' + args + ')');
};
functionRegistry.addMultiple({
  min: function min() {
    for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
      args[_key] = arguments[_key];
    }

    return minMax(true, args);
  },
  max: function max() {
    for (var _len2 = arguments.length, args = Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
      args[_key2] = arguments[_key2];
    }

    return minMax(false, args);
  },
  convert: function convert(val, unit) {
    return val.convertTo(unit.value);
  },
  pi: function pi() {
    return new dimension(Math.PI);
  },
  mod: function mod(a, b) {
    return new dimension(a.value % b.value, a.unit);
  },
  pow: function pow(x, y) {
    if (typeof x === 'number' && typeof y === 'number') {
      x = new dimension(x);
      y = new dimension(y);
    } else if (!(x instanceof dimension) || !(y instanceof dimension)) {
      throw { type: 'Argument', message: 'arguments must be numbers' };
    }

    return new dimension(Math.pow(x.value, y.value), x.unit);
  },
  percentage: function percentage(n) {
    var result = mathHelper._math(function (num) {
      return num * 100;
    }, '%', n);

    return result;
  }
});

functionRegistry.addMultiple({
  e: function e(str) {
    return new anonymous(str instanceof javascript ? str.evaluated : str.value);
  },
  escape: function escape(str) {
    return new anonymous(encodeURI(str.value).replace(/=/g, '%3D').replace(/:/g, '%3A').replace(/#/g, '%23').replace(/;/g, '%3B').replace(/\(/g, '%28').replace(/\)/g, '%29'));
  },
  replace: function replace(string, pattern, replacement, flags) {
    var result = string.value;
    replacement = replacement.type === 'Quoted' ? replacement.value : replacement.toCSS();
    result = result.replace(new RegExp(pattern.value, flags ? flags.value : ''), replacement);
    return new quoted(string.quote || '', result, string.escaped);
  },

  '%': function _(string /* arg, arg, ...*/) {
    var args = Array.prototype.slice.call(arguments, 1);
    var result = string.value;

    var _loop = function _loop(i) {
      /*jshint loopfunc:true */
      result = result.replace(/%[sda]/i, function (token) {
        var value = args[i].type === 'Quoted' && token.match(/s/i) ? args[i].value : args[i].toCSS();
        return token.match(/[A-Z]$/) ? encodeURIComponent(value) : value;
      });
    };

    for (var i = 0; i < args.length; i++) {
      _loop(i);
    }
    result = result.replace(/%%/g, '%');
    return new quoted(string.quote || '', result, string.escaped);
  }
});

var svg = function svg(environment) {
  var Dimension = dimension;
  var Color = color;
  var Expression = expression;
  var Quoted = quoted;
  var URL = url;
  var functionRegistry$$1 = functionRegistry;

  functionRegistry$$1.add('svg-gradient', function (direction) {
    var stops = void 0;
    var gradientDirectionSvg = void 0;
    var gradientType = 'linear';
    var rectangleDimension = 'x="0" y="0" width="1" height="1"';
    var renderEnv = { compress: false };
    var returner = void 0;
    var directionValue = direction.toCSS(renderEnv);
    var i = void 0;
    var color$$1 = void 0;
    var position = void 0;
    var positionValue = void 0;
    var alpha = void 0;

    function throwArgumentDescriptor() {
      throw {
        type: 'Argument',
        message: 'svg-gradient expects direction, start_color [start_position], [color position,]...,' + ' end_color [end_position] or direction, color list'
      };
    }

    if (arguments.length == 2) {
      if (arguments[1].value.length < 2) {
        throwArgumentDescriptor();
      }
      stops = arguments[1].value;
    } else if (arguments.length < 3) {
      throwArgumentDescriptor();
    } else {
      stops = Array.prototype.slice.call(arguments, 1);
    }

    switch (directionValue) {
      case 'to bottom':
        gradientDirectionSvg = 'x1="0%" y1="0%" x2="0%" y2="100%"';
        break;
      case 'to right':
        gradientDirectionSvg = 'x1="0%" y1="0%" x2="100%" y2="0%"';
        break;
      case 'to bottom right':
        gradientDirectionSvg = 'x1="0%" y1="0%" x2="100%" y2="100%"';
        break;
      case 'to top right':
        gradientDirectionSvg = 'x1="0%" y1="100%" x2="100%" y2="0%"';
        break;
      case 'ellipse':
      case 'ellipse at center':
        gradientType = 'radial';
        gradientDirectionSvg = 'cx="50%" cy="50%" r="75%"';
        rectangleDimension = 'x="-50" y="-50" width="101" height="101"';
        break;
      default:
        throw {
          type: 'Argument',
          message: "svg-gradient direction must be 'to bottom', 'to right'," + " 'to bottom right', 'to top right' or 'ellipse at center'"
        };
    }
    returner = '<?xml version="1.0" ?><svg xmlns="http://www.w3.org/2000/svg" version="1.1" width="100%" height="100%" viewBox="0 0 1 1" preserveAspectRatio="none"><' + gradientType + 'Gradient id="gradient" gradientUnits="userSpaceOnUse" ' + gradientDirectionSvg + '>';

    for (i = 0; i < stops.length; i += 1) {
      if (stops[i] instanceof Expression) {
        color$$1 = stops[i].value[0];
        position = stops[i].value[1];
      } else {
        color$$1 = stops[i];
        position = undefined;
      }

      if (!(color$$1 instanceof Color) || !((i === 0 || i + 1 === stops.length) && position === undefined) && !(position instanceof Dimension)) {
        throwArgumentDescriptor();
      }
      positionValue = position ? position.toCSS(renderEnv) : i === 0 ? '0%' : '100%';
      alpha = color$$1.alpha;
      returner += '<stop offset="' + positionValue + '" stop-color="' + color$$1.toRGB() + '"' + (alpha < 1 ? ' stop-opacity="' + alpha + '"' : '') + '/>';
    }
    returner += '</' + gradientType + 'Gradient><rect ' + rectangleDimension + ' fill="url(#gradient)" /></svg>';

    returner = encodeURIComponent(returner);

    returner = 'data:image/svg+xml,' + returner;
    return new URL(new Quoted('\'' + returner + '\'', returner, false, this.index, this.currentFileInfo), this.index, this.currentFileInfo);
  });
};

var isa = function isa(n, Type) {
  return n instanceof Type ? keyword.True : keyword.False;
};

var isunit = function isunit(n, unit) {
  if (unit === undefined) {
    throw {
      type: 'Argument',
      message: 'missing the required second argument to isunit.'
    };
  }
  unit = typeof unit.value === 'string' ? unit.value : unit;
  if (typeof unit !== 'string') {
    throw {
      type: 'Argument',
      message: 'Second argument to isunit should be a unit or a string.'
    };
  }
  return n instanceof dimension && n.unit.is(unit) ? keyword.True : keyword.False;
};

var getItemsFromNode = function getItemsFromNode(node) {
  // handle non-array values as an array of length 1
  // return 'undefined' if index is invalid
  var items = Array.isArray(node.value) ? node.value : Array(node);

  return items;
};

functionRegistry.addMultiple({
  isruleset: function isruleset(n) {
    return isa(n, detachedRuleset);
  },
  iscolor: function iscolor(n) {
    return isa(n, color);
  },
  isnumber: function isnumber(n) {
    return isa(n, dimension);
  },
  isstring: function isstring(n) {
    return isa(n, quoted);
  },
  iskeyword: function iskeyword(n) {
    return isa(n, keyword);
  },
  isurl: function isurl(n) {
    return isa(n, url);
  },
  ispixel: function ispixel(n) {
    return isunit(n, 'px');
  },
  ispercentage: function ispercentage(n) {
    return isunit(n, '%');
  },
  isem: function isem(n) {
    return isunit(n, 'em');
  },

  isunit: isunit,
  unit: function unit(val, _unit) {
    if (!(val instanceof dimension)) {
      throw {
        type: 'Argument',
        message: 'the first argument to unit must be a number' + (val instanceof operation ? '. Have you forgotten parenthesis?' : '')
      };
    }
    if (_unit) {
      if (_unit instanceof keyword) {
        _unit = _unit.value;
      } else {
        _unit = _unit.toCSS();
      }
    } else {
      _unit = '';
    }
    return new dimension(val.value, _unit);
  },

  'get-unit': function getUnit(n) {
    return new anonymous(n.unit);
  },
  extract: function extract(values, index) {
    index = index.value - 1; // (1-based index)

    return getItemsFromNode(values)[index];
  },
  length: function length(values) {
    return new dimension(getItemsFromNode(values).length);
  }
});

var index$10 = function index(environment) {
  var functions = {
    functionRegistry: functionRegistry,
    functionCaller: functionCaller_1

    //register functions


  };dataUri(environment);

  svg(environment);

  return functions;
};

var render = function render(environment, ParseTree) {
  var render = function render(input, options, callback) {
    if (typeof options === 'function') {
      callback = options;
      options = {};
    }

    if (!callback) {
      var self = this;
      return new Promise(function (resolve, reject) {
        render.call(self, input, options, function (err, output) {
          if (err) {
            reject(err);
          } else {
            resolve(output);
          }
        });
      });
    } else {
      this.parse(input, options, function (err, root, imports, options) {
        if (err) {
          return callback(err);
        }

        var result = void 0;
        try {
          var parseTree = new ParseTree(root, imports);
          result = parseTree.toCSS(options);
        } catch (err) {
          return callback(err);
        }

        callback(null, result);
      });
    }
  };

  return render;
};

/**
 * Plugin Manager
 */
var PluginManager = function () {
  function PluginManager(less) {
    classCallCheck(this, PluginManager);

    this.less = less;
    this.visitors = [];
    this.preProcessors = [];
    this.postProcessors = [];
    this.installedPlugins = [];
    this.fileManagers = [];
  }

  /**
     * Adds all the plugins in the array
     * @param {Array} plugins
     */


  PluginManager.prototype.addPlugins = function addPlugins(plugins) {
    if (plugins) {
      for (var i = 0; i < plugins.length; i++) {
        this.addPlugin(plugins[i]);
      }
    }
  };

  /**
     *
     * @param plugin
     */


  PluginManager.prototype.addPlugin = function addPlugin(plugin) {
    this.installedPlugins.push(plugin);
    plugin.install(this.less, this);
  };

  /**
     * Adds a visitor. The visitor object has options on itself to determine
     * when it should run.
     * @param visitor
     */


  PluginManager.prototype.addVisitor = function addVisitor(visitor) {
    this.visitors.push(visitor);
  };

  /**
     * Adds a pre processor object
     * @param {object} preProcessor
     * @param {number} priority - guidelines 1 = before import, 1000 = import, 2000 = after import
     */


  PluginManager.prototype.addPreProcessor = function addPreProcessor(preProcessor, priority) {
    var indexToInsertAt = void 0;
    for (indexToInsertAt = 0; indexToInsertAt < this.preProcessors.length; indexToInsertAt++) {
      if (this.preProcessors[indexToInsertAt].priority >= priority) {
        break;
      }
    }
    this.preProcessors.splice(indexToInsertAt, 0, { preProcessor: preProcessor, priority: priority });
  };

  /**
     * Adds a post processor object
     * @param {object} postProcessor
     * @param {number} priority - guidelines 1 = before compression, 1000 = compression, 2000 = after compression
     */


  PluginManager.prototype.addPostProcessor = function addPostProcessor(postProcessor, priority) {
    var indexToInsertAt = void 0;
    for (indexToInsertAt = 0; indexToInsertAt < this.postProcessors.length; indexToInsertAt++) {
      if (this.postProcessors[indexToInsertAt].priority >= priority) {
        break;
      }
    }
    this.postProcessors.splice(indexToInsertAt, 0, { postProcessor: postProcessor, priority: priority });
  };

  /**
     *
     * @param manager
     */


  PluginManager.prototype.addFileManager = function addFileManager(manager) {
    this.fileManagers.push(manager);
  };

  /**
     *
     * @returns {Array}
     * @private
     */


  PluginManager.prototype.getPreProcessors = function getPreProcessors() {
    var preProcessors = [];
    for (var i = 0; i < this.preProcessors.length; i++) {
      preProcessors.push(this.preProcessors[i].preProcessor);
    }
    return preProcessors;
  };

  /**
     *
     * @returns {Array}
     * @private
     */


  PluginManager.prototype.getPostProcessors = function getPostProcessors() {
    var postProcessors = [];
    for (var i = 0; i < this.postProcessors.length; i++) {
      postProcessors.push(this.postProcessors[i].postProcessor);
    }
    return postProcessors;
  };

  /**
     *
     * @returns {Array}
     * @private
     */


  PluginManager.prototype.getVisitors = function getVisitors() {
    return this.visitors;
  };

  /**
     *
     * @returns {Array}
     * @private
     */


  PluginManager.prototype.getFileManagers = function getFileManagers() {
    return this.fileManagers;
  };

  return PluginManager;
}();

var pluginManager = PluginManager;

var parse = function parse(environment, ParseTree, ImportManager) {
  var parse = function parse(input) {
    var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
    var callback = arguments[2];

    if (typeof options === 'function') {
      callback = options;
      options = {};
    }

    if (!callback) {
      var self = this;
      return new Promise(function (resolve, reject) {
        parse.call(self, input, options, function (err, output) {
          if (err) {
            reject(err);
          } else {
            resolve(output);
          }
        });
      });
    } else {
      var context = void 0;
      var rootFileInfo = void 0;
      var pluginManager$$1 = new pluginManager(this);

      pluginManager$$1.addPlugins(options.plugins);
      options.pluginManager = pluginManager$$1;

      context = new contexts_1.Parse(options);

      if (options.rootFileInfo) {
        rootFileInfo = options.rootFileInfo;
      } else {
        var filename = options.filename || 'input';
        var entryPath = filename.replace(/[^\/\\]*$/, '');
        rootFileInfo = {
          filename: filename,
          relativeUrls: context.relativeUrls,
          rootpath: context.rootpath || '',
          currentDirectory: entryPath,
          entryPath: entryPath,
          rootFilename: filename
          // add in a missing trailing slash
        };if (rootFileInfo.rootpath && rootFileInfo.rootpath.slice(-1) !== '/') {
          rootFileInfo.rootpath += '/';
        }
      }

      var imports = new ImportManager(context, rootFileInfo);

      new parser(context, imports, rootFileInfo).parse(input, function (e, root) {
        if (e) {
          return callback(e);
        }
        callback(null, root, imports, options);
      }, options);
    }
  };
  return parse;
};

var index$2 = function index(environment$$1, fileManagers) {
  var Environment = environment;
  environment$$1 = new Environment(environment$$1, fileManagers);

  var SourceMapOutput = sourceMapOutput(environment$$1);
  var SourceMapBuilder = sourceMapBuilder(SourceMapOutput, environment$$1);
  var ParseTree = parseTree(SourceMapBuilder);
  var ImportManager = importManager(environment$$1);

  return {
    version: [2, 7, 2],
    data: index$8,
    tree: index$6,
    Environment: Environment,
    environment: environment$$1,
    AbstractFileManager: abstractFileManager_1,
    visitors: index$4,
    Parser: parser,
    functions: index$10(environment$$1),
    contexts: contexts_1,
    SourceMapOutput: SourceMapOutput,
    SourceMapBuilder: SourceMapBuilder,
    ParseTree: ParseTree,
    ImportManager: ImportManager,
    render: render(environment$$1, ParseTree, ImportManager),
    parse: parse(environment$$1, ParseTree, ImportManager),
    LessError: lessError,
    transformTree: transformTree,
    utils: utils,
    PluginManager: pluginManager,
    logger: logger,
    writeError: function writeError(ctx, options) {
      options = options || {};
      if (options.silent) {
        return;
      }
      console.error(this.formatError(ctx, options));
    },
    formatError: function formatError(ctx) {
      var message = '';
      var extract = ctx.extract;
      var error = [];

      // only output a stack if it isn't a less error
      if (ctx.stack && !ctx.type) {
        return ctx.stack;
      }

      if (!ctx.hasOwnProperty('index') || !extract) {
        return ctx.stack || ctx.message;
      }

      if (typeof extract[0] === 'string') {
        error.push(ctx.line - 1 + ' ' + extract[0]);
      }

      if (typeof extract[1] === 'string') {
        var errorTxt = ctx.line + ' ';
        if (extract[1]) {
          errorTxt += extract[1].slice(0, ctx.column) + extract[1].substr(ctx.column, 1) + extract[1].slice(ctx.column + 1);
        }
        error.push(errorTxt);
      }

      if (typeof extract[2] === 'string') {
        error.push(ctx.line + 1 + ' ' + extract[2]);
      }
      error = error.join('\n') + '\n';

      message += ctx.type + 'Error: ' + ctx.message;
      if (ctx.filename) {
        message += ' in ' + ctx.filename + ' on line ' + ctx.line + ', column ' + (ctx.column + 1) + ':';
      }

      message += '\n' + error;

      if (ctx.callLine) {
        message += 'from ' + (ctx.filename || '') + '/n';
        message += ctx.callLine + ' ' + ctx.callExtract + '/n';
      }
      return message;
    }
  };
};

var NotSupportedFileManager = function (_AbstractFileManager) {
  inherits(NotSupportedFileManager, _AbstractFileManager);

  function NotSupportedFileManager() {
    classCallCheck(this, NotSupportedFileManager);
    return possibleConstructorReturn(this, _AbstractFileManager.apply(this, arguments));
  }

  NotSupportedFileManager.prototype.supports = function supports() {
    return true;
  };

  NotSupportedFileManager.prototype.supportsSync = function supportsSync() {
    return true;
  };

  NotSupportedFileManager.prototype.loadFile = function loadFile() {
    return Promise.reject(new Error('loading is not supported'));
  };

  NotSupportedFileManager.prototype.loadFileSync = function loadFileSync() {
    new Error('loading is not supported');
  };

  return NotSupportedFileManager;
}(abstractFileManager_1);

var less = index$2({
  getSourceMapGenerator: function getSourceMapGenerator() {
    return null;
  }
}, [new NotSupportedFileManager()]);
less.FileManager = NotSupportedFileManager;

var index = less;

return index;

})));
//# sourceMappingURL=less.js.map
