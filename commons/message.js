const { soliditySha3 } = require('web3-utils')
const BigNumber = require('bignumber.js')

function strip0x(input) {
  return input.replace(/^0x/, '')
}

/**
 * Decodes the datatype byte from the AMB message.
 * First (the most significant bit) denotes if the message should be forwarded to the manual lane.
 * @param dataType: number datatype of the received AMB message.
 * @return {{manualLane: boolean}}
 */
const decodeAMBDataType = dataType => ({
  manualLane: (dataType & 128) === 128
})

function parseAMBMessage(message) {
  message = strip0x(message)

  const messageId = `0x${message.slice(0, 64)}`
  const sender = `0x${message.slice(64, 104)}`
  const executor = `0x${message.slice(104, 144)}`
  const gasLimit = parseInt(message.slice(144, 152), 16)
  const sourceChainIdLen = 2 * parseInt(message.slice(152, 154), 16)
  const destChainIdLen = 2 * parseInt(message.slice(154, 156), 16)
  const dataType = parseInt(message.slice(156, 158), 16)
  const sourceChainId = parseInt(message.slice(158, 158 + sourceChainIdLen), 16)
  const dataPayloadStart = 158 + sourceChainIdLen + destChainIdLen
  const destChainId = parseInt(message.slice(158 + sourceChainIdLen, dataPayloadStart), 16)
  const data = `0x${message.slice(dataPayloadStart)}`

  return {
    messageId,
    sender,
    executor,
    gasLimit,
    sourceChainId,
    destChainId,
    dataType,
    decodedDataType: decodeAMBDataType(dataType),
    data,
    sourceChainIdLen,
    destChainIdLen,
  }
}

const OmniBridgeSelectors = {
  deployAndHandleBridgedTokens: '0x2ae87cdd',
  deployAndHandleBridgedTokensAndCall: '0xd522cfd7',
  handleBridgedTokens: '0x125e4cfb',
  handleBridgedTokensAndCall: '0xc5345761',
  handleNativeTokens: '0x272255bb',
  handleNativeTokensAndCall: '0x867f7a4d',
  fixFailedMessage: '0x0950d515',
}

// does a partial omni bridge message parsing
function parseOmniBridgeMessage(message) {
  const parsed = parseAMBMessage(message)
  const data = strip0x(parsed.data)

  const selector = `0x${data.slice(0, 8)}`

  switch (selector) {
    case OmniBridgeSelectors.deployAndHandleBridgedTokens:
    case OmniBridgeSelectors.deployAndHandleBridgedTokensAndCall:
      return {
        selector,
        token: `0x${data.slice(32, 72)}`,
        receiver: `0x${data.slice(288, 328)}`,
        amount: new BigNumber(`0x${data.slice(328, 392)}`),
      }
    default:
      return {
        selector
      }
  }
}

const normalizeAMBMessageEvent = e => {
  let msgData = e.returnValues.encodedData
  if (!e.returnValues.messageId) {
    // append tx hash to an old message, where message id was not used
    // for old messages, e.messageId is a corresponding transactionHash
    msgData = e.transactionHash + msgData.slice(2)
  }
  return parseAMBMessage(msgData)
}

const ambInformationSignatures = [
  'eth_call(address,bytes)',
  'eth_call(address,bytes,uint256)',
  'eth_call(address,address,uint256,bytes)',
  'eth_blockNumber()',
  'eth_getBlockByNumber()',
  'eth_getBlockByNumber(uint256)',
  'eth_getBlockByHash(bytes32)',
  'eth_getBalance(address)',
  'eth_getBalance(address,uint256)',
  'eth_getTransactionCount(address)',
  'eth_getTransactionCount(address,uint256)',
  'eth_getTransactionByHash(bytes32)',
  'eth_getTransactionReceipt(bytes32)',
  'eth_getStorageAt(address,bytes32)',
  'eth_getStorageAt(address,bytes32,uint256)'
]
const ambInformationSelectors = Object.fromEntries(ambInformationSignatures.map(sig => [soliditySha3(sig), sig]))
const normalizeAMBInfoRequest = e => ({
  messageId: e.returnValues.messageId,
  sender: e.returnValues.sender,
  requestSelector: ambInformationSelectors[e.returnValues.requestSelector] || 'unknown',
  data: e.returnValues.data
})

module.exports = {
  strip0x,
  parseAMBMessage,
  parseOmniBridgeMessage,
  normalizeAMBMessageEvent,
  ambInformationSignatures,
  normalizeAMBInfoRequest,
  OmniBridgeSelectors
}
