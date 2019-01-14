var marbellachainjs = require('bitcoinjs-lib')

Object.assign(marbellachainjs.networks, require('./networks'))

marbellachainjs.utils = require('./utils')

module.exports = marbellachainjs