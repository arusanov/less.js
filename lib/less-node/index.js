const environment = require('./environment')
const FileManager = require('./file-manager')
const createFromEnvironment = require('../less')
const less = createFromEnvironment(environment, [new FileManager()])

less.FileManager = FileManager

module.exports = less
