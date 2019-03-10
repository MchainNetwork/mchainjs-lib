var bitcoinjs = require('bitcoinjs-lib')
var BigNumber = require('bignumber.js')
var OPS = require('qtum-opcodes')
var Buffer = require('safe-buffer').Buffer
var coinSelect = require('coinselect')

/**
 * This is a function for selecting MAR utxos to build transactions
 * the transaction object takes at least 3 fields, value(unit is 1e-8 MAR) , confirmations and isStake
 *
 * @param [transaction] unspentTransactions
 * @param Number amount(unit: MAR)
 * @param Number fee(unit: MAR)
 * @returns [transaction]
 */
function selectTxs(utxoList) {
    //sort the utxo
    var matureList = []
    var immatureList = []
    for(var i = 0; i < utxoList.length; i++) {
      //utxoList[i].isStake === false
      if(utxoList[i].confirmations >= 1000) {
        matureList[matureList.length] = utxoList[i]
      }
      else {
        immatureList[immatureList.length] = utxoList[i]
      }
    }
    matureList.sort(function(a, b) {return a.value - b.value})
    immatureList.sort(function(a, b) {return b.confirmations - a.confirmations})
    return matureList.concat(immatureList)
}

/**
 * This is a helper function to build a pubkeyhash transaction
 * the transaction object takes at least 5 fields, value(unit is 1e-8 MAR), confirmations, isStake, hash and pos
 *
 * @param bitcoinjs-lib.KeyPair keyPair
 * @param String to
 * @param Number amount(unit: MAR)
 * @param Number fee(unit: MAR)
 * @param [transaction] utxoList
 * @returns String the built tx
 */
function buildPubKeyHashTransaction(keyPair, to, amount, fee, utxoList) {
    var from = keyPair.getAddress()

    utxoList = selectTxs(utxoList)

    var target = [{address: to, value: amount * 1e8}]
    var selected = coinSelect(utxoList, target, fee)

    console.log('fee', selected.fee)

    if (!selected.inputs || !selected.outputs) {
      throw new Error('You do not have enough MAR to send')
    }

    var tx = new bitcoinjs.TransactionBuilder(keyPair.network)

    for (var i = 0; i < selected.inputs.length; i++) {
      tx.addInput(selected.inputs[i].txid, selected.inputs[i].vout)
    }

    for (var i = 0; i < selected.outputs.length; i++) {
      if (!selected.outputs[i].address) {
        selected.outputs[i].address = from
      }
      tx.addOutput(selected.outputs[i].address, selected.outputs[i].value)
    }

    for (var i = 0; i < selected.inputs.length; i++) {
      tx.sign(i, keyPair)
    }
    return tx.build().toHex()
}

/**
 * This is a helper function to build a create-contract transaction
 * the transaction object takes at least 5 fields, value(unit is 1e-8 MAR), confirmations, isStake, hash and pos
 *
 * @param bitcoinjs-lib.KeyPair keyPair
 * @param String code The contract byte code
 * @param Number gasLimit
 * @param Number gasPrice(unit: 1e-8 MAR/gas)
 * @param Number fee(unit: MAR)
 * @param [transaction] utxoList
 * @returns String the built tx
 */
function buildCreateContractTransaction(keyPair, code, gasLimit, gasPrice, fee, utxoList) {
  var from = keyPair.getAddress()

  utxoList = selectTxs(utxoList)

  var gas = new BigNumber(gasLimit).times(gasPrice).toNumber()

  var target = [{address: contractAddress, value: gas}]
  var selected = coinSelect(utxoList, target, fee)

  console.log('fee', selected.fee)

  if (!selected.inputs || !selected.outputs) {
    throw new Error('You do not have enough MAR to send')
  }

  var tx = new bitcoinjs.TransactionBuilder(keyPair.network)

  for (var i = 0; i < selected.inputs.length; i++) {
    tx.addInput(selected.inputs[i].txid, selected.inputs[i].vout)
  }

  var contract =  bitcoinjs.script.compile([
      OPS.OP_4,
      number2Buffer(gasLimit),
      number2Buffer(gasPrice),
      hex2Buffer(code),
      OPS.OP_CREATE
  ])
  tx.addOutput(contract, 0)

  for (var i = 0; i < selected.outputs.length; i++) {
    if (!selected.outputs[i].address) {
      tx.addOutput(from, selected.outputs[i].value)
    }
  }

  for (var i = 0; i < selected.inputs.length; i++) {
    tx.sign(i, keyPair)
  }
  return tx.build().toHex()
}

/**
 * This is a helper function to build a send-to-contract transaction
 * the transaction object takes at least 5 fields, value(unit is 1e-8 MAR), confirmations, isStake, hash and pos
 *
 * @param bitcoinjs-lib.KeyPair keyPair
 * @param String contractAddress The contract address
 * @param String encodedData The encoded abi data
 * @param Number gasLimit
 * @param Number gasPrice(unit: 1e-8 MAR/gas)
 * @param Number fee(unit: MAR)
 * @param [transaction] utxoList
 * @returns String the built tx
 */
function buildSendToContractTransaction(keyPair, contractAddress, encodedData, gasLimit, gasPrice, fee, utxoList) {
  var from = keyPair.getAddress()

  utxoList = selectTxs(utxoList)

  var gas = new BigNumber(gasLimit).times(gasPrice).toNumber()

  var target = [{address: contractAddress, value: gas}]
  var selected = coinSelect(utxoList, target, fee)

  console.log('fee', selected.fee)

  if (!selected.inputs || !selected.outputs) {
    throw new Error('You do not have enough MAR to send')
  }

  var tx = new bitcoinjs.TransactionBuilder(keyPair.network)

  for (var i = 0; i < selected.inputs.length; i++) {
    tx.addInput(selected.inputs[i].txid, selected.inputs[i].vout)
  }

  var contract =  bitcoinjs.script.compile([
      OPS.OP_4,
      number2Buffer(gasLimit),
      number2Buffer(gasPrice),
      hex2Buffer(encodedData),
      hex2Buffer(contractAddress),
      OPS.OP_CALL
  ])
  tx.addOutput(contract, 0)

  for (var i = 0; i < selected.outputs.length; i++) {
    if (!selected.outputs[i].address) {
      tx.addOutput(from, selected.outputs[i].value)
    }
  }

  for (var i = 0; i < selected.inputs.length; i++) {
    tx.sign(i, keyPair)
  }
  return tx.build().toHex()
}

function number2Buffer(num) {
    var buffer = []
    var neg = (num < 0)
    num = Math.abs(num)
    while(num) {
        buffer[buffer.length] = num & 0xff
        num = num >> 8
    }

    var top = buffer[buffer.length - 1]
    if (top & 0x80) {
        buffer[buffer.length] = neg ? 0x80 : 0x00
    }
    else if (neg) {
        buffer[buffer.length - 1] = top | 0x80;
    }
    return Buffer.from(buffer)
}

function hex2Buffer(hexString) {
    var buffer = []
    for (var i = 0; i < hexString.length; i += 2) {
        buffer[buffer.length] = (parseInt(hexString[i], 16) << 4) | parseInt(hexString[i+1], 16)
    }
    return Buffer.from(buffer)
}

module.exports = {
    selectTxs: selectTxs,
    buildPubKeyHashTransaction: buildPubKeyHashTransaction,
    buildCreateContractTransaction: buildCreateContractTransaction,
    buildSendToContractTransaction: buildSendToContractTransaction,
}