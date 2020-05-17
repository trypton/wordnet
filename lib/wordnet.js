/**
 * WordNet Node Wrapper
 *
 * @author Dariusz Dziuk
 */

const path = require('path');
const fs = require('fs');
const reader = require('./reader');

/**
 * List of WordNet db extensions
 *
 * @type {Array}
 */
const extensions = [
  'adj',
  'adv',
  'noun',
  'verb'
];

/**
 * Synset types map
 *
 * @type {Object}
 */
const synsetTypeMap = {
  'n': 'noun',
  'v': 'verb',
  'a': 'adjective',
  's': 'adjective satellite',
  'r': 'adverb'
};

/**
 * Index lookup
 *
 * @type {Object}
 */
const index = {};

/**
 * Open file handlers
 *
 * @type {Object}
 */
const dataFiles = {};

/**
 * Awaiting callbacks
 *
 * @type {Array}
 */
let callbacks = [];

/**
 * Is module ready?
 *
 * @type {Boolean}
 */
let isReady = false;

/**
 * Parses an index line
 *
 * @param {String} line Input line.
 */
function parseIndexLine(line) {
  if (line.charAt(0) === ' ') {
    return null;
  }

  const tokens = line.split(' ');
  const result = {};

  /* Parse the data */
  result.lemma = tokens.shift();
  result.pos = tokens.shift();
  result.synsetCount = parseInt(tokens.shift(), 10);

  /* Pointers */
  result.pointerCount = parseInt(tokens.shift(), 10);
  result.pointers = [];
  for (let i = 0; i < result.pointerCount; i++) {
    result.pointers.push(tokens.shift());
  }

  result.senseCount = parseInt(tokens.shift(), 10);
  result.tagSenseCount = parseInt(tokens.shift(), 10);

  result.synsetOffsets = [];
  for (let i = 0; i < result.synsetCount; i++) {
    result.synsetOffsets.push(parseInt(tokens.shift(), 10));
  }

  return result;
};

/**
 * Parses a data file line
 *
 * @param {String} line Data line to parse.
 */
function parseDataLine(line) {
  const data = {};

  /* Split the glossary */
  const parts = line.split('|');
  const metadata = parts[0].split(' ');
  data.glossary = parts[1] ? parts[1].trim() : '';

  /* Parse the metadata */
  data.synsetOffset = parseInt(metadata.shift(), 10);
  data.lexFileNum = parseInt(metadata.shift(), 10);

  const pos = metadata.shift();
  data.synsetType = synsetTypeMap[pos];
  data.pos = pos === 's' ? 'a' : pos;

  data.wordCount = parseInt(metadata.shift(), 16);
  data.words = [];

  /* Parse the words */
  for (let wordIdx = 0; wordIdx < data.wordCount; wordIdx++) {
    data.words.push({
      word: metadata.shift().replace(/_/g, ' '),
      lexId: parseInt(metadata.shift(), 16)
    });
  }

  /* Parse the pointers */
  data.pointerCount = parseInt(metadata.shift(), 10);
  data.pointers = [];
  for (let pointerIdx = 0; pointerIdx < data.pointerCount; pointerIdx++) {
    data.pointers.push({
      pointerSymbol: metadata.shift(),
      synsetOffsets: [parseInt(metadata.shift(), 10)],
      pos: metadata.shift(),
      sourceTargetHex: metadata.shift(),
      async getData() {
        const data = await getData(this);
        return data.shift();
      }
    });
  }

  return data;
};

/**
 * Reads the data for specified syntactic category
 *
 * @param {Number} fd File descriptor.
 * @param {Number} offset Synset offset.
 */
function readData(fd, offset) {
  return new Promise((resolve, reject) => {
    /* Read from file */
    const buffer = Buffer.alloc(1024);
    fs.read(fd, buffer, 0, 1024, offset, function(err, bytesRead, buffer) {
      if (err) {
        reject(err);
      }
  
      const line = buffer.toString().split('\n')[0];
      const data = parseDataLine(line);
      resolve(data);
    });
  });
};

function getData(definition) {
  return new Promise((resolve, reject) => {
    const pos = definition.pos;
  
    if (!pos) {
      resolve([]);
      return;
    }

    const results = definition.synsetOffsets.map((offset) => {
      const fd = dataFiles[pos];
      return readData(fd, offset);
    });

    Promise.all(results).then((values) => {
      resolve(values);
    }).catch((e) => {
      reject(e);
    });
  });
}

/**
 * Gets a key for specified word
 *
 * @param {String} word Word to build key for.
 * @return {String} Key for the word.
 */
function getKey(word) {
  return '@__' + word;
};

/**
 * Looks up a word
 *
 * @param {String} word Word to look up.
 */
function lookup(word) {
  return new Promise((resolve, reject) => {
    onReady(() => {
      const key = getKey(String(word).toLowerCase().replace(/ /g, '_'));
      const definitions = index[key];

      if (!definitions) {
        resolve([]);
        return;
      }

      const data = definitions.map((definition) => getData(definition));
      Promise.all(data).then((values) => {
        resolve(values.flat());
      }).catch((e) => {
        reject(e);
      })
    });
  });
};

/**
 * Reads a WordNet database
 *
 * @param {String} dataDir WordNet DB path.
 * @param {String} extension WordNet DB extension.
 */
function readDatabase(dataDir, extension) {
  return new Promise((resolve) => {
    reader.read(path.join(dataDir, 'index.' + extension), (line) => {
      const data = parseIndexLine(line);
      if (data) {
        /* Prefix not to break any built-in properties */
        const key = getKey(data.lemma);
        if (!index[key]) {
          index[key] = [];
        }
        index[key].push(data);
      }
    }, resolve);
  });
};

/**
 * Lists all the words
 *
 * @param {Function} callback Std callback with error and list of words.
 */
function list() {
  return new Promise((resolve) => {
    onReady(() => {
      const list = Object.keys(index).map((key) => key.substring(3).replace(/_/g, ' '));
      resolve(list);
    });
  });
}

/**
 * Check if word exists
 *
 * @param {Function} callback Std callback with error and list of words.
 */
function exists(word) {
  return new Promise((resolve) => {
    onReady(() => {
      const key = getKey(word.replace(/ /g, '_'));
      resolve(key in index);
    });
  });
}

/**
 * Waits till the dictionary is loaded
 *
 * @param {Function} callback Callback to be called when ready.
 */
function onReady(callback) {
  if (!isReady) {
    callbacks.push(callback);
  } else {
    callback();
  }
};

/**
 * Initializes the module after preparing the dictionary
 */
function init() {
  isReady = true;
  callbacks.forEach((callback) => {
    callback();
  });
  callbacks = [];
}

/**
 * @constructor
 * @param {string} [dataDir] - wordnet database directory path. wordnet-db package is used when not specified
 */
function WordNet(dataDir) {
  /* Use natural.WordNet approach */
  if (!dataDir) {
    try {
      const { path } = require('wordnet-db');
      dataDir = path;
    } catch(e) {
      console.error("Please 'npm install wordnet-db' before using WordNet or specify a wordnet database directory.");
      throw e;
    }
  }

  /* Read all files */
  const database = extensions.map((extension) => readDatabase(dataDir, extension));

  Promise.all(database).then(() => {
    /* Extension to pos value mapper */
    const extensionToPos = {
      'adj': 'a',
      'adv': 'r',
      'noun': 'n',
      'verb': 'v'
    };

    /* Open file handlers */
    extensions.forEach((extension) => {
      dataFiles[extensionToPos[extension]] = fs.openSync(path.join(dataDir, 'data.' + extension), 'r');
    });

    /* Init */
    init();
  });
}

WordNet.prototype = {
  /**
   * Looks up a word
   *
   * @param {String} word Word to look up.
   */
  lookup,

  /**
   * Lists all the words
   *
   */
  list,

  /**
   * Check if word exists in database
   *
   * @param {String} word Word to check.
   */
  exists
};

/**
 * Public interface
 *
 * @type {Object}
 */
module.exports = WordNet;
