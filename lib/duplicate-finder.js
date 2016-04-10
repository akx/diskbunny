import EventEmitter from 'events';
import fs from 'fs';
import Promise from 'bluebird';
import R from 'ramda';
import {createHash} from 'crypto';
import {extname} from 'path';

const openAsync = Promise.promisify(fs.open);
const readAsync = Promise.promisify(fs.read, {multiArgs: true});

/**
 * Return a promise that returns the SHA-1 hash of the first `hashBytes`
 * bytes of the file named by `file`.
 * @param hashBytes How many bytes to read + hash
 * @param file Filename
 * @returns {Promise.<string>}
 */
function hashFile(hashBytes, file) {
  let fileFd = null;
  return openAsync(file, 'r').then((fd) => {
    const buf = new Buffer(hashBytes);
    fileFd = fd; // For closing.
    return readAsync(fd, buf, 0, hashBytes, null);
  }).then(([bytesRead, buf]) => {
    fs.close(fileFd);
    const hash = createHash('sha1');
    hash.update(buf.slice(0, bytesRead));
    return hash.digest('hex');
  });
}

const defaults = {
  hashBytes: 524288,
  hashConcurrency: 5,
};

class DuplicateGroup {
  constructor(key, entries) {
    this.key = key;
    this.entries = entries;
    this.hash = undefined;
    this.hasDuplicates = undefined;
  }

  withHash(hash) {
    this.hash = hash;
    this.hasDuplicates = (hash !== null);
    return this;
  }

  getWastedSpace() {
    if (this.hasDuplicates === true) {
      return (this.entries.length - 1) * this.entries[0].size;
    }
    return 0;
  }
}

export default class DuplicateFinder extends EventEmitter {
  constructor(options = {}) {
    super();
    options = R.mergeAll([{}, defaults, options]);
    this.hashBytes = (0 | options.hashBytes);
    this.hashConcurrency = (0 | options.hashConcurrency);
    this._groups = undefined;
  }

  _hashGroup(group) {
    const hasher = R.partial(hashFile, [this.hashBytes]);
    const filenames = R.pluck('path', group.entries);
    return Promise.map(filenames, hasher, {concurrency: this.hashConcurrency}).then(
      (hashes) => group.withHash(R.all(R.equals(hashes[0]), hashes) ? hashes[0] : null)
    );
  }

  getUnhashedGroupCount() {
    if (this._groups === undefined) {
      return undefined;
    }
    return R.filter((g) => g.hash === undefined, this._groups).length;
  }

  getDuplicateFileCount() {
    return R.pipe(
      R.filter(R.prop('hasDuplicates')),
      R.map((g) => g.entries.length - 1),
      R.sum
    )(this._groups || []);
  }

  getWastedSpace() {
    return R.pipe(
      R.filter(R.prop('hasDuplicates')),
      R.map(R.invoker(0, 'getWastedSpace')),
      R.sum
    )(this._groups || []);
  }

  findDuplicates(scanner) {
    const viableGroups = this._groupFiles(scanner);
    this._groups = viableGroups;
    this.emit('grouped');
    const hashGroup = this._hashGroup.bind(this);
    return Promise.map(
      viableGroups,
      hashGroup,
      {concurrency: this.hashConcurrency}
    ).then(
      R.filter(R.propEq('hasDuplicates'))  // Remove nulls
    ).then((duplicateGroups) => {
      this.emit('done');
      return duplicateGroups;
    });
  }

  _groupFiles(scanner) {
    const keyer = (ent) => `${ent.size}${extname(ent.path).toLowerCase()}`;
    return R.pipe(
      R.pluck('entries'), // Get lists of dirents
      R.flatten,  // Flatten into single list
      R.filter(R.invoker(0, 'isFile')),  // Look at files only
      R.groupBy(keyer),  // Group by extension and size
      R.toPairs,  // Convert to pairs . . .
      R.map(([key, entries]) => new DuplicateGroup(key, entries)),  // to convert to an object
      R.filter((g) => g.entries.length > 1)  // And then ignore groups with only one file
    )(scanner.getAllDirectories());
  }

}
