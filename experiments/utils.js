/* eslint-disable no-console */
import prettySize from 'prettysize';

export function printProgress(scanner) {
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
  console.log(`Total size: ${prettySize(scanner.getFileSize())}`);
}
