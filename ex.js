require('babel-register');
var experiment = process.argv[2];
var func = require('./experiments/' + experiment).default;
var paths = process.argv.slice(3);
func(paths);
