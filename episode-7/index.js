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

const {Parser, updateParserError, updateParserState, sequenceOf, fail, succeed} = require('./lib');
const fs = require('fs');
const path = require('path');


const Bit = new Parser(parserState => {
  if (parserState.isError) {
    return parserState;
  }

  const byteOffset = Math.floor(parserState.index / 8);

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

  const byteOffset = Math.floor(parserState.index / 8);

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

  const byteOffset = Math.floor(parserState.index / 8);

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

const Uint = n => {
  if (n < 1) {
    throw new Error(`Uint: n must be larger than 0, but we got ${n}`);
  }

  if (n > 32) {
    throw new Error(`Uint: n must be less than 32, but we got ${n}`);
  }

  return sequenceOf(Array.from({length: n}, () => Bit))
  .map(bits => {
    return bits.reduce((acc, bit, i) => {
      return acc + Number(BigInt(bit) << BigInt(n - 1 - i))
    }, 0);
  });
}

// Ones complement
// SXXX
// 0001 = 1
// 1001 = -1
// 0000 = 0
// 1000 = ? -0

// Twos Complement
// 0001
// 1110 + 0001 = 1111 -> -1

// 1011
// 0001
//------
// 1100
// 0001
// -----
// 1101 -> -3


const Int = n => {
  if (n < 1) {
    throw new Error(`Int: n must be larger than 0, but we got ${n}`);
  }

  if (n > 32) {
    throw new Error(`Int: n must be less than 32, but we got ${n}`);
  }

  return sequenceOf(Array.from({length: n}, () => Bit))
  .map(bits => {
    if (bits[0] === 0) {
      return bits.reduce((acc, bit, i) => {
        return acc + Number(BigInt(bit) << BigInt(n - 1 - i))
      }, 0);
    } else {
      return -(1 + bits.reduce((acc, bit, i) => {
        return acc + Number(BigInt(bit === 0 ? 1 : 0) << BigInt(n - 1 - i))
      }, 0));
    }
  });
}




const RawString = s => {
  if (s.length < 1) {
    throw new Error(`RawString: s must be at least 1 character`);
  }

  const byteParsers = s.split('').map(c => c.charCodeAt(0)).map(n => {
    return Uint(8).chain(res => {
      if (res === n) {
        return succeed(n);
      } else {
        return fail(`RawString: Expected character ${String.fromCharCode(n)}, but got ${String.fromCharCode(res)}`);
      }
    });
  });

  return sequenceOf(byteParsers);
}

const tag = type => value => ({ type, value });

const parser = sequenceOf([
  Uint(4).map(tag('Version')),
  Uint(4).map(tag('IHL')),
  Uint(6).map(tag('DSCP')),
  Uint(2).map(tag('ECN')),
  Uint(16).map(tag('Total Length')),
  Uint(16).map(tag('Identification')),
  Uint(3).map(tag('Flags')),
  Uint(13).map(tag('Fragment Offset')),
  Uint(8).map(tag('TTL')),
  Uint(8).map(tag('Protocol')),
  Uint(16).map(tag('Header Checksum')),
  Uint(32).map(tag('Source IP')),
  Uint(32).map(tag('Destination IP')),
]).chain(res => {
  if (res[1].value > 5) {
    const remainingBytes = Array.from({length: res[1].value - 20}, () => Uint(8));
    // In the video .chain() was used here (incorrectly)
    // Thanks to https://github.com/IceSentry for pointing that one out
    return sequenceOf(remainingBytes).map(remaining => [
      ...res,
      tag('Options')(remaining)
    ]);
  }
  return succeed(res);
});

const file = fs.readFileSync(path.join(__dirname, './packet.bin')).buffer;
const dataView = new DataView(file);

const res = parser.run(dataView);

console.log(res);


// const data = (new Uint8Array("Hello world!".split('').map(c => c.charCodeAt(0)))).buffer;

// const res = parser.run(dataView);

// console.log(res);
