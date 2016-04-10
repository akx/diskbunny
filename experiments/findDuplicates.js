/* eslint-disable no-console */
import Scanner from '../lib/scanner';
import {extname} from 'path';
import {printProgress} from './utils';
import R from 'ramda';
import Promise from 'bluebird';
import fs from 'fs';
import {createHash} from 'crypto';
const openAsync = Promise.promisify(fs.open);
const readAsync = Promise.promisify(fs.read, {multiArgs: true});

const hashBytes = 524288;

function hashFile(file) {
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

function hashGroup(group) {
  const filenames = R.pluck('path', group);
  return Promise.map(filenames, hashFile, {concurrency: 5}).then((hashes) => {
    return (R.all(R.equals(hashes[0]), hashes) ? {hash: hashes[0], group} : null);
  });
}

export default function findDuplicates(roots) {
  const scanner = new Scanner({roots});
  const progressTimer = setInterval(printProgress.bind(null, scanner), 100);
  scanner.scan().then(() => {
    clearInterval(progressTimer);
    const groups = {};
    scanner.getAllDirectories().forEach((dir) => {
      dir.entries.filter((ent) => ent.isFile()).forEach((ent) => {
        const groupKey = `${extname(ent.path).toLowerCase()}\n${ent.size}`;
        (groups[groupKey] = groups[groupKey] || []).push(ent);
      });
    });
    const viableGroups = R.pipe(
      R.values,
      R.filter((g) => g.length > 1)
    )(groups);
    console.log(`${viableGroups.length} groups with possible duplicates.`);
    return Promise.map(viableGroups, hashGroup, {concurrency: 5}).then((hashedGroups) => {
      return hashedGroups.filter(R.identity);
    });
  }).then((hashedGroups) => {
    hashedGroups.forEach(({hash, group}) => {
      console.log(`\n### ${hash}`);
      group.forEach((stat) => {
        console.log(`+ ${stat.path}`);
      });
    });
  });
}
