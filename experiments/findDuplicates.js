/* eslint-disable no-console */
import DuplicateFinder from '../lib/duplicate-finder';
import prettySize from 'prettysize';
import R from 'ramda';
import Scanner from '../lib/scanner';
import {printProgress} from './utils';

function printDuplicateProgress(finder) {
  const ugc = finder.getUnhashedGroupCount();
  if (ugc === undefined) return;
  console.log(`Unhashed groups: ${ugc}`);
  console.log(`Duplicate files: ${finder.getDuplicateFileCount()}`);
  console.log(`Wasted space: ${prettySize(finder.getWastedSpace())}`);
}

export default function findDuplicates(roots) {
  const scanner = new Scanner({roots});
  const finder = new DuplicateFinder();
  const scanProgressTimer = setInterval(printProgress.bind(null, scanner), 100);
  const finderProgressTimer = setInterval(printDuplicateProgress.bind(null, finder), 100);
  scanner.scan().then(() => {
    clearInterval(scanProgressTimer);
    return finder.findDuplicates(scanner);
  }).then((groupsWithDupes) => {
    clearInterval(finderProgressTimer);
    R.sortBy(R.invoker(0, 'getWastedSpace'))(groupsWithDupes).forEach((group) => {
      console.log(`\n# hash = ${group.hash}, key = ${group.key}`);
      group.entries.forEach((stat) => {
        console.log(`+ ${stat.path}`);
      });
    });
  });
}
