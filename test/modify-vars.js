const less = require('../lib/less')
const fs = require('fs')

const input = fs.readFileSync('./test/less/modifyVars/extended.less', 'utf8')
const expectedCss = fs.readFileSync(
  './test/css/modifyVars/extended.css',
  'utf8'
)
const options = {
  modifyVars: JSON.parse(
    fs.readFileSync('./test/less/modifyVars/extended.json', 'utf8')
  ),
}

less.render(input, options, (err, result) => {
  if (err) {
    console.log(err)
  }
  if (result.css === expectedCss) {
    console.log('PASS')
  } else {
    console.log('FAIL')
  }
})
