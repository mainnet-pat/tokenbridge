const assert = require('assert')
const Web3Utils = require('web3-utils')
const { ORACLE_GAS_PRICE_SPEEDS, GAS_PRICE_OPTIONS } = require('./constants')

const gasPriceSpeedMapper = {
  '01': ORACLE_GAS_PRICE_SPEEDS.INSTANT,
  '02': ORACLE_GAS_PRICE_SPEEDS.FAST,
  '03': ORACLE_GAS_PRICE_SPEEDS.STANDARD,
  '04': ORACLE_GAS_PRICE_SPEEDS.SLOW
}
// strips leading "0x" if present
function strip0x(input) {
  return input.replace(/^0x/, '')
}

function createMessage({
  recipient,
  value,
  transactionHash,
  bridgeAddress,
  expectedMessageLength
}) {
  recipient = strip0x(recipient)
  assert.strictEqual(recipient.length, 20 * 2)

  value = Web3Utils.numberToHex(value)
  value = Web3Utils.padLeft(value, 32 * 2)

  value = strip0x(value)
  assert.strictEqual(value.length, 64)

  transactionHash = strip0x(transactionHash)
  assert.strictEqual(transactionHash.length, 32 * 2)

  bridgeAddress = strip0x(bridgeAddress)
  assert.strictEqual(bridgeAddress.length, 20 * 2)

  const message = `0x${recipient}${value}${transactionHash}${bridgeAddress}`
  assert.strictEqual(message.length, 2 + 2 * expectedMessageLength)
  return message
}

function parseMessage(message) {
  message = strip0x(message)

  const recipientStart = 0
  const recipientLength = 40
  const recipient = `0x${message.slice(recipientStart, recipientStart + recipientLength)}`

  const amountStart = recipientStart + recipientLength
  const amountLength = 32 * 2
  const amount = `0x${message.slice(amountStart, amountStart + amountLength)}`

  const txHashStart = amountStart + amountLength
  const txHashLength = 32 * 2
  const txHash = `0x${message.slice(txHashStart, txHashStart + txHashLength)}`

  const contractAddressStart = txHashStart + txHashLength
  const contractAddressLength = 32 * 2
  const contractAddress = `0x${message.slice(
    contractAddressStart,
    contractAddressStart + contractAddressLength
  )}`

  return {
    recipient,
    amount,
    txHash,
    contractAddress
  }
}

function signatureToVRS(signature) {
  assert.strictEqual(signature.length, 2 + 32 * 2 + 32 * 2 + 2)
  signature = strip0x(signature)
  const v = parseInt(signature.substr(64 * 2), 16)
  const r = `0x${signature.substr(0, 32 * 2)}`
  const s = `0x${signature.substr(32 * 2, 32 * 2)}`
  return { v, r, s }
}

function addTxHashToData({ encodedData, transactionHash }) {
  return encodedData.slice(0, 82) + strip0x(transactionHash) + encodedData.slice(82)
}

function parseAMBMessage(message) {
  message = strip0x(message)

  const sender = `0x${message.slice(0, 40)}`
  const executor = `0x${message.slice(40, 80)}`
  const txHash = `0x${message.slice(80, 144)}`
  const gasLimit = Web3Utils.toBN(message.slice(144, 208))
  const dataType = message.slice(208, 210)
  let gasPrice = null
  let gasPriceSpeed = null
  let dataStart = 210

  switch (dataType) {
    case GAS_PRICE_OPTIONS.GAS_PRICE:
      gasPrice = Web3Utils.toBN(message.slice(210, 274))
      dataStart += 64
      break
    case GAS_PRICE_OPTIONS.SPEED:
      gasPriceSpeed = gasPriceSpeedMapper[message.slice(210, 212)]
      dataStart += 2
      break
    case GAS_PRICE_OPTIONS.UNDEFINED:
    default:
      break
  }

  const data = `0x${message.slice(dataStart, message.length)}`

  return {
    sender,
    executor,
    txHash,
    gasLimit,
    dataType,
    gasPrice,
    gasPriceSpeed,
    data
  }
}

module.exports = {
  createMessage,
  parseMessage,
  signatureToVRS,
  addTxHashToData,
  parseAMBMessage,
  strip0x
}
