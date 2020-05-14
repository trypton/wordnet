/**
 * WordNet lookup example
 *
 * @author Dariusz Dziuk <me@dariuszdziuk.com>
 */

const WordNet = require('../lib/wordnet.js');

const wordnet = new WordNet(__dirname + '/../db');

wordnet.list().then((list) => {
  console.log(list);
});
