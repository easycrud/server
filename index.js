'use strict';

const {Parser} = require('@easycrud/toolkits');
const Router = require('koa-router');
const db = require('./db');

module.exports = async function(opts, router) {
  opts = opts || {};
  const {path, dbConfigs} = opts;
  if (!dbConfigs) {
    throw new Error('Set at least one database connection config please.');
  }

  let {tables} = opts;
  if (path) {
    const parser = new Parser();
    parser.parse(path);
    tables = parser.tables;
  }

  const dbConns = dbConfigs.map((conf) => db.connect(conf, conf.database));
  await Promise.all(dbConns);

  if (!router) {
    router = new Router();
  }

  return router.routes();
};
