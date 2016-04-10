require('babel-register');
var printTree = require('./experiments').printTree;
var paths = process.argv.slice(2);
printTree(paths);
