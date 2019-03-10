var mchainjs = require('bitcoinjs-lib')

Object.assign(mchainjs.networks, require('./networks'))

mchainjs.utils = require('./utils')

module.exports = mchainjs