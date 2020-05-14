/**
 * File reader interface
 *
 * @author Dariusz Dziuk <me@dariuszdziuk.com>
 */

const fs = require('fs');
const readline = require('readline');
const Stream = require('stream');

/**
 * Public interface
 *
 * @type {Object}
 */
module.exports = {
  /**
   * Reads a text file line by line
   *
   * @param {String} file Name of the file.
   * @param {Function} onLine Callback per line.
   * @param {Function} onClose On file closed.
   */
  read: function(file, onLine, onClose) {
    const inputStream = fs.createReadStream(file);
    const outputStream = new Stream();
    outputStream.readable = true;
    outputStream.writeable = true;

    const rl = readline.createInterface({
      input: inputStream,
      output: outputStream,
      terminal: false
    });

    rl.on('line', onLine);
    rl.on('close', onClose);
  }
};
