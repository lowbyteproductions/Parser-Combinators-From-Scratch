const A = require('arcsecond');

const tag = type => value => ({ type, value });

const subParser = A.sequenceOf([
  A.letters,
  A.digits,
]).map(tag('letterDigits'))

const stringParser = A.sequenceOf([
  subParser,

  A.str('hello').map(tag('string')),
  A.many(
    A.char(' ').map(tag('space'))
  ).map(tag('whitespace')),
  A.str('world').map(tag('string')),
  A.endOfInput.map(tag('endOfInput'))
]).map(tag('ourTree'));

console.log(
  stringParser.run('dksjvbkdsb123434hello               world').result
);

debugger;