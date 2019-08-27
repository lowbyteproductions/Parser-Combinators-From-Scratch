// Version: 4
// Header length: 5 * 32-bit = 20 bytes
// TOS: 0x00
// Total Length: 0x0044 (68 bytes)
// Identification: 0xad0b
// Flags and Fragments: 0x0000
// TTL: 0x40 (64 hops)
// Protocol: 0x11 (UDP)
// Header Checksom: 0x7272
// Source: 0xac1402fd (172.20.2.253)
// Destination: 0xac140006 (172.20.0.6)







// A 16 bit number: (24161)
// 0101111001100001

// And some of the different ways we might interpret this number

// 0101111001100001                 :: As one 16 bit number (24161)
// 01011110 01100001                :: As two 8 bit numbers (94, 97)
// 0101 1110 0110 0001              :: As four 4 bit numbers (5, 14, 6, 1)
// 0 1 0 1 1 1 1 0 0 1 1 0 0 0 0 1  :: As sixteen individual bits

const {Parser, updateParserError, updateParserState, sequenceOf} = require('./lib');

const Bit = new Parser(parserState => {
  if (parserState.isError) {
    return parserState;
  }

  const byteOffset = Math.floor(parser.index / 8);

  if (byteOffset >= parserState.target.byteLength) {
    return updateParserError(parserState, `Bit: Unexpected end of input`);
  }

  const byte = parserState.target.getUint8(byteOffset);
  const bitOffset = 7 - (parserState.index % 8);

  const result = (byte & 1<<bitOffset) >> bitOffset;
  return updateParserState(parserState, parserState.index + 1, result);
});

const Zero = new Parser(parserState => {
  if (parserState.isError) {
    return parserState;
  }

  const byteOffset = Math.floor(parser.index / 8);

  if (byteOffset >= parserState.target.byteLength) {
    return updateParserError(parserState, `Zero: Unexpected end of input`);
  }

  const byte = parserState.target.getUint8(byteOffset);
  const bitOffset = 7 - (parserState.index % 8);

  const result = (byte & 1<<bitOffset) >> bitOffset;

  if (result !== 0) {
    return updateParserError(parserState, `Zero: Expected a zero, but got a one at index ${parserState.index}`);
  }

  return updateParserState(parserState, parserState.index + 1, result);
});

const One = new Parser(parserState => {
  if (parserState.isError) {
    return parserState;
  }

  const byteOffset = Math.floor(parser.index / 8);

  if (byteOffset >= parserState.target.byteLength) {
    return updateParserError(parserState, `One: Unexpected end of input`);
  }

  const byte = parserState.target.getUint8(byteOffset);
  const bitOffset = 7 - (parserState.index % 8);

  const result = (byte & 1<<bitOffset) >> bitOffset;

  if (result !== 1) {
    return updateParserError(parserState, `One: Expected a zero, but got a one at index ${parserState.index}`);
  }

  return updateParserState(parserState, parserState.index + 1, result);
});

const parser = sequenceOf([
  One, One, One, One, One, Zero, One, Zero
]);

const data = (new Uint8Array([234, 235])).buffer;
const dataView = new DataView(data);

const res = parser.run(dataView);

console.log(res);