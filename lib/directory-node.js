export default class DirectoryNode {
  constructor(path, parent = null) {
    this.path = path;
    this._fileSize = undefined;
    this._childSize = undefined;
    this.entries = [];
    this.parent = parent;
    this.nDirs = undefined;
    this.nFiles = undefined;
    this.level = (parent ? parent.level + 1 : 0);
  }

  setEntries(entries) {
    this.entries = entries.filter((e) => !!e);
    this._calculateCounts();
    this.invalidate(true);
  }

  _calculateCounts() {
    let nDirs = 0;
    let nFiles = 0;
    this.entries.forEach((e) => {
      if (e.isDirectory()) {
        nDirs++;
      } else {
        nFiles++;
      }
    });
    this.nDirs = nDirs;
    this.nFiles = nFiles;
  }

  invalidate(recur = false) {
    this._fileSize = undefined;
    this._childSize = undefined;
    if (recur && this.parent) {
      this.parent.invalidate(true);
    }
  }

  getFileSize() {
    if (this._fileSize === undefined) {
      this._fileSize = this.entries.reduce((sum, stat) => sum + stat.size, 0);
    }
    return this._fileSize;
  }

  getChildSize() {
    if (this._childSize === undefined) {
      let childSize = 0;
      this.entries.forEach((s) => {
        if (s.child) {
          childSize += s.child.getFileSize() + s.child.getChildSize();
        }
      });
      this._childSize = childSize;
    }
    return this._childSize;
  }

  getTotalSize() {
    return this.getFileSize() + this.getChildSize();
  }
}
