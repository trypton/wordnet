# WordNet.js

Simple Node.js module for accessing [Princeton University's WordNet](http://wordnet.princeton.edu/) dictionary.

# Installation

    $ npm install wordnet

Optionally you can install `wordnet-db` package.
In this case you don't need to provide path to wordnet database.

    $ npm install wordnet-db
    
# How to use

An example how to use the module is located in examples/lookup.js.

    var WordNet = require('../lib/wordnet.js');

    var wordnet = new WordNet(__dirname + '/../db');

    // or if wordnet-db installed
    // var wordnet = new WordNet();

    wordnet.lookup('define', function(err, definitions) {
    
      definitions.forEach(function(definition) {
        console.log('  words: %s', words.trim());
        console.log('  %s', definition.glossary);
      });
    
    });

# License

MIT License

# 3rd-party License

[Princeton University's WordNet License](http://wordnet.princeton.edu/wordnet/license/)
