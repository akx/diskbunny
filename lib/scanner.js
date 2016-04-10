import DirectoryNode from './directory-node';
import EventEmitter from 'events';
import fs from 'fs';
import Promise from 'bluebird';
import {normalize, join} from 'path';

const debug = require('debug')('diskbunny:scanner');
const readdirAsync = Promise.promisify(fs.readdir);
const statAsync = Promise.promisify(fs.stat);

export default class Scanner extends EventEmitter {
  constructor({roots, concurrency = 10}) {
    super();
    this.roots = (roots || []).map(normalize);
    this.concurrency = 0 | concurrency;
    this._reset();
  }

  _reset() {
    this._dirs = {};
    this._busyDirs = {};
    this._nBusy = 0;
    this._startTime = +new Date();
  }

  scan() {
    this._reset();
    this.roots.forEach((root) => {
      this._step(root);
    });
    if (!this.roots.length) {
      setImmediate(() => this.emit('done'));
    }
    return new Promise((resolve) => {
      this.once('done', () => {
        resolve(this);
      });
    });
  }

  getRootNodes() {
    return this.roots.map((d) => this._dirs[d]);
  }

  getBusyPaths() {
    return Object.keys(this._busyDirs);
  }

  getBusyCount() {
    return this._nBusy;
  }


  getScanDuration() {
    return ((+new Date()) - this._startTime) / 1000;
  }

  _markBusiness(dir, flag) {
    if (flag) {
      if (!this._busyDirs[dir]) {
        this._busyDirs[dir] = true;
        this._nBusy++;
      }
    } else {
      if (this._busyDirs[dir]) {
        delete this._busyDirs[dir];
        this._nBusy--;
      }
    }
    if (this._nBusy === 0) {
      this.emit('done');
    }
  }

  getDirectoryCount() {
    return Object.keys(this._dirs).length;
  }

  getFileCount() {
    let count = 0;
    let key;
    for (key in this._dirs) { // eslint-disable-line guard-for-in
      count += this._dirs[key].nFiles || 0;
    }
    return count;
  }

  getFileSize() {
    let size = 0;
    let key;
    for (key in this._dirs) { // eslint-disable-line guard-for-in
      size += this._dirs[key].getFileSize();
    }
    return size;
  }

  _statAndEnqueue(parent, path) {
    return statAsync(path).then((entry) => {
      entry.path = path;
      if (entry.isDirectory()) {
        entry.child = this._step(entry.path, parent);
      }
      return entry;
    }).catch((err) => {
      debug(`Unable to stat ${path}: ${err}`);
      return null;
    });
  }

  _step(dir, parent = null) {
    dir = normalize(dir);
    if (this._dirs[dir] !== undefined) {
      debug(`Attempted double enumeration of ${dir}`);
      return this._dirs[dir];
    }
    const node = this._dirs[dir] = new DirectoryNode(dir, parent);
    this._markBusiness(dir, true);
    debug('Enumerating', dir);
    const statAndEnqueue = this._statAndEnqueue.bind(this, node);
    readdirAsync(dir).then((files) => {
      files = files.map((file) => join(dir, file));
      Promise.map(files, statAndEnqueue, {concurrency: this.concurrency}).then((ents) => {
        this._markBusiness(dir, false);
        node.setEntries(ents);
      });
    }).catch((err) => {
      debug(`Unable to readdir ${dir}: ${err}`);
      this._markBusiness(dir, false);
    });
    return node;
  }
}
