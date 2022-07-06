'use strict';

const {Parser} = require('@easycrud/toolkits');
const Router = require('koa-router');
const db = require('./db');

module.exports = async function(
  {
    path, tables, dbConfigs,
  }, router) {
  if (!dbConfigs) {
    throw new Error('Set at least one database connection config please.');
  }
  if (path) {
    const parser = new Parser();
    parser.parse(path);
    tables = parser.tables;
  }
  if (!tables || tables.length === 0) {
    throw new Error('table config is required.');
  }

  const dbConns = dbConfigs.map((conf) => db.connect(conf, conf.database));
  await Promise.all(dbConns);

  if (!router) {
    router = new Router();
  }

  return router.routes();
};
