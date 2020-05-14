#!/usr/bin/env node

/**
 * WordNet lookup example
 *
 * @author Dariusz Dziuk <me@dariuszdziuk.com>
 */

const program = require('commander');
const WordNet = require('../lib/wordnet.js');
const wordnet = new WordNet(__dirname + '/../db');

program
  .version('0.0.1')
  .usage('<word>')
  .parse(process.argv);

/* Word to look up */
const word = program.args[0];
if (!word) {
  program.help();
}

wordnet.lookup(word).then(async (definitions) => {
  console.log('\n  %s\n', word);

  for (let definition of definitions) {
    await printWord(definition, true);
  }
}).catch((e) => {
  console.log('An error has occurred: %s', e);
});

async function printWord(definition, usePointers) {
  console.log('  type : %s', definition.meta.synsetType);

  const words = definition.meta.words.map(wordData => wordData.word).join(' / ');
  console.log('  words: %s', words);
  console.log('  %s', definition.glossary);
  console.log();

  /* Print pointers */
  if (usePointers) {
    for (let pointer of definition.meta.pointers) {
      const data = await pointer.getData();

      /* Print the word only if contains (or prefixes) the look up expression */
      var found = false;
      data.meta.words.forEach((aWord) => {
        if (aWord.word.indexOf(word) === 0) {
          found = true;
        }
      });

      if (found || ['*', '='].indexOf(pointer.pointerSymbol) > -1) {
        console.log('  pointer: %s', pointer.pointerSymbol);
        printWord(data, false);
      }
    }
  }
}
