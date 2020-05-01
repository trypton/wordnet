/**
 * WordNet lookup example
 *
 * @author Dariusz Dziuk <me@dariuszdziuk.com>
 */

var WordNet = require('../lib/wordnet.js');

var wordnet = new WordNet(__dirname + '/../db');

wordnet.list(function(err, list) {

  console.log(list);

});
