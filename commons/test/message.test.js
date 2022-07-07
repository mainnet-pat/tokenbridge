const { BN } = require('web3-utils')
const { expect } = require('chai').use(require('bn-chai')(BN))
const { parseAMBMessage, strip0x, parseOmniBridgeMessage, OmniBridgeSelectors } = require('../message')
const BigNumber = require('bignumber.js')

describe('strip0x', () => {
  it('should remove 0x from input', () => {
    // Given
    const input = '0x12345'

    // When
    const result = strip0x(input)

    // Then
    expect(result).to.be.equal('12345')
  })
  it('should not modify input if 0x is not present', () => {
    // Given
    const input = '12345'

    // When
    const result = strip0x(input)

    // Then
    expect(result).to.be.equal(input)
  })
})
describe('parseAMBMessage', () => {
  it('should parse data type 00', () => {
    const msgSender = '0x003667154bb32e42bb9e1e6532f19d187fa0082e'
    const msgExecutor = '0xf4bef13f9f4f2b203faf0c3cbbaabe1afe056955'
    const msgId = '0xbdceda9d8c94838aca10c687da1411a07b1390e88239c0638cb9cc264219cc10'
    const msgGasLimit = '000000000000000000000000000000000000000000000000000000005b877705'
    const msgDataType = '00'
    const msgData = '0xb1591967aed668a4b27645ff40c444892d91bf5951b382995d4d4f6ee3a2ce03'
    const message = `0x${strip0x(msgId)}${strip0x(msgSender)}${strip0x(
      msgExecutor
    )}${msgGasLimit}${msgDataType}${strip0x(msgData)}`

    // when
    const { sender, executor, messageId } = parseAMBMessage(message)

    // then
    expect(sender).to.be.equal(msgSender)
    expect(executor).to.be.equal(msgExecutor)
    expect(messageId).to.be.equal(msgId)
  })
})

describe('parseOmniBridgeMessage', () => {
  it('should parse handleBridgedTokens request', () => {
    const message = "00050000f016c3a5662c30692c032f8a6ceb01b20b7dd0700000000000000024892cbeb36d31351b37a567e984d0208eeef78a68f12fd0d3a039ab4a5000855d5cb532a76fb6949800086470010200042711125e4cfb0000000000000000000000007b5d221f09d6505bd88a667eb728285c9227c25b000000000000000000000000821adfaf9718b293d821278cf8ba77ee8a9557e10000000000000000000000000000000000000000000000000de0b6b3a764000000000000000000000000";
    const { selector } = parseOmniBridgeMessage(message)

    expect(selector).to.be.equal(OmniBridgeSelectors.handleBridgedTokens)
  })

  it('should parse handleBridgedTokens request', () => {
    const message = "0x00050000f016c3a5662c30692c032f8a6ceb01b20b7dd0700000000000000021892cbeb36d31351b37a567e984d0208eeef78a68f12fd0d3a039ab4a5000855d5cb532a76fb69498000864700102000427112ae87cdd0000000000000000000000007b5d221f09d6505bd88a667eb728285c9227c25b00000000000000000000000000000000000000000000000000000000000000c000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000000012000000000000000000000000821adfaf9718b293d821278cf8ba77ee8a9557e10000000000000000000000000000000000000000000000000de0b6b3a764000000000000000000000000000000000000000000000000000000000000000000164f6d6e69427269646765205465737420546f6b656e330000000000000000000000000000000000000000000000000000000000000000000000000000000000054f4d4e4933000000000000000000000000000000000000000000000000000000";
    const { selector, token, amount, receiver } = parseOmniBridgeMessage(message)

    expect(selector).to.be.equal(OmniBridgeSelectors.deployAndHandleBridgedTokens)
    expect(token).to.be.equal("0x7b5d221f09d6505bd88a667eb728285c9227c25b");
    expect(amount.toString()).to.be.equal(new BigNumber(1e18).toString());
    expect(receiver).to.be.equal("0x821adfaf9718b293d821278cf8ba77ee8a9557e1");
  })
})
