import path from 'path';

export default {
  context: path.join(__dirname, "frontend"),
  entry: "./index.js",
  output: {
    path: "/"
  },
  module: {
    loaders: [
      {
        test: /\.js$/,
        exclude: /(node_modules|bower_components)/,
        loader: 'babel-loader?cacheDirectory&presets[]=es2015',
      }
    ]
  }
};
