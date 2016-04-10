/* eslint-disable no-console */
import Scanner from '../lib/scanner';
import {basename} from 'path';

function printNode(info, level = 0) {
  const totalMb = info.getTotalSize() / 1048576.0;
  console.log(new Array((level || 0) + 1).join('  '), basename(info.path), ':', totalMb.toFixed(1));
  info.entries.forEach((f) => {
    if (f.child) {
      printNode(f.child, level + 1);
    }
  });
}

function printProgress(scanner) {
  console.log(`Scan duration: ${scanner.getScanDuration()} sec.`);
  console.log(`Directories: ${scanner.getDirectoryCount()}`);
  console.log(`Files: ${scanner.getFileCount()}`);
  const busyCount = scanner.getBusyCount();
  if (busyCount > 0) {
    console.log(`Busy: ${busyCount}`);
    if (busyCount < 5) {
      console.log(`     ${scanner.getBusyPaths().sort().join('; ')}`);
    }
  }
  console.log(`Total size: ${scanner.getFileSize()} bytes`);
}

export function printTree(roots) {
  const scanner = new Scanner({roots});
  const progressTimer = setInterval(printProgress.bind(null, scanner), 100);
  scanner.scan().then(() => {
    clearInterval(progressTimer);
    scanner.getRootNodes().forEach(printNode);
    printProgress(scanner);
  });
}
