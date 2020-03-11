const {
  Parser,
  choice,
  str,
  digits,
  letters,
  sequenceOf,
  succeed
} = require('./lib');

const after = (ms, value) => new Promise(resolve => {
  setTimeout(() => resolve(value), ms);
});

// after(1000, 42).then(value => {
//   console.log(value);
// });

// after(1000, 37).then(firstValue => {
//   return after(2000, 3).then(secondValue => {
//     if (firstValue % secondValue === 1) {
//       return after(3000, 2).then(thirdValue => {
//         console.log(firstValue + secondValue + thirdValue);
//       });
//     }

//     return after(3000, 5).then(thirdValue => {
//       console.log(firstValue * secondValue * thirdValue);
//     });
//   });
// });


const flatterVersion = async () => {
  const firstValue = await after(1000, 37);
  const secondValue = await after(2000, 3);

  let thirdValue;
  if (firstValue % secondValue === 1) {
    thirdValue = await after(3000, 2);
    console.log(firstValue + secondValue + thirdValue);
  } else {
    thirdValue = await after(3000, 5);
    console.log(firstValue * secondValue * thirdValue);
  }
}




const example1 = `VAR theAnswer INT 42`;
const example2 = `GLOBAL_VAR greeting STRING "Hello"`;
const example3 = `VAR skyIsBlue BOOL true`;


const contextual = generatorFn => {
  return succeed(null).chain(() => {
    const iterator = generatorFn();

    const runStep = nextValue => {
      const iteratorResult = iterator.next(nextValue);

      if (iteratorResult.done) {
        return succeed(iteratorResult.value);
      }

      const nextParser = iteratorResult.value;

      if (!(nextParser instanceof Parser)) {
        throw new Error('contextual: yielded values must always be parsers!');
      }

      return nextParser.chain(runStep);
    };

    return runStep();
  })
}



const varDeclarationParser = contextual(function* () {
  const declarationType = yield choice([
    str('VAR '),
    str('GLOBAL_VAR '),
  ]);

  const varName = yield letters;
  const type = yield choice([
    str(' INT '),
    str(' STRING '),
    str(' BOOL '),
  ]);

  let data;
  if (type === ' INT ') {
    data = yield digits;
  } else if (type === ' STRING ') {
    data = yield sequenceOf([
      str('"'),
      letters,
      str('"'),
    ]).map(([quote1, data, quote2]) => data);
  } else if (type === ' BOOL ') {
    data = yield choice([
      str('true'),
      str('false'),
    ]);
  }

  return {
    varName,
    data,
    type,
    declarationType
  };
});




console.log(varDeclarationParser.run(example1));
console.log(varDeclarationParser.run(example2));
console.log(varDeclarationParser.run(example3));