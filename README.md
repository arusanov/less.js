# Modified [Less.js](http://lesscss.org)

> The **dynamic** stylesheet language. [http://lesscss.org](http://lesscss.org).

This is the fork of JavaScript, official, 2.7.2 version of Less with few additions:

### Simplify option

New option `simplify:boolean` will transform all stylesheet except for root variables.

From:
```less
@mainVar: #fff;
.main-@{mainVar} {
  @hiddenVar: red;
  left: 1px;
  border-color: mix(@mainVar,@hiddenVar);
  color: @mainVar;
    @{mainVar}-left: middle;
}
@media all and (max-width: @mainVar) {
  .hohoh {
    color: red;
  }
}

```
It will produce following less
```less
@mainVar: #fff;
.main-@{mainVar} {
  left: 1px;
  border-color: mix(@mainVar, red);
  color: @mainVar;
  @{mainVar}-left: middle;
}
@media all and (max-width: @mainVar) {
  .hohoh {
    color: red;
  }
}
```

Also there's 2 additional options:
1. `simplifyLevel: number` which level is root. default:1
1. `simplifyFilter: Regex` filter variables to keep, default: null

### Rollup browser build without heavy stuff

Size ~38kb gzip

## [License](LICENSE)

Copyright (c) 2009-2016 [Alexis Sellier](http://cloudhead.io) & The Core Less Team
Licensed under the [Apache License](LICENSE).

