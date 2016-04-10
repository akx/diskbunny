/* eslint-disable no-console */
import Scanner from '../lib/scanner';
import {extname} from 'path';


export default function findDuplicates(roots) {
  const scanner = new Scanner({roots});
  const progressTimer = setInterval(printProgress.bind(null, scanner), 100);
  scanner.scan().then(() => {
    clearInterval(progressTimer);
    const groups = {};
    scanner.getAllDirectories().forEach((dir) => {
      dir.entries.forEach((ent) => {
        const groupKey = `${extname(ent.path)} ${ent.size}`;
        (groups[groupKey] = groups[groupKey] || []).push(ent);
      });
    });
    console.log(`${Object.keys(groups).length} groups.`);
  });
}
