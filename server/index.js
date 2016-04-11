import express from 'express';
import bodyParser from 'body-parser';
import webpackMiddleware from 'webpack-dev-middleware';
import webpack from 'webpack';
import webpackConfig from './webpack.config';
import * as api from './api';

const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));
app.use(webpackMiddleware(webpack(webpackConfig), {
  quiet: false,
  publicPath: '/assets/',
  stats: {colors: true},
}));
app.use(express.static('assets'));

app.post('/api', (req, res) => {
  const {method} = req.body;
  const meth = api[method];
  if (!meth) {
    return res.status(400).send(`invalid method ${meth}`);
  }
  meth(req.body).then((rv) => {
    res.status(rv.status || 200).json(rv);
  }).catch((error) => {
    res.status(500).json({error});
  });
});

app.get('/', (req, res) => {
  res.send(`<!doctype html>
<html>
<head>
<meta charset="UTF-8">
<script src="/assets/bundle.js"></script>
</head><body></body></html>`);
});

export default function (port = 8411) {
  app.listen(port, function () {
    console.log(`Listening on port ${port}`);
  });
}
