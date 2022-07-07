'use strict';

const {Parser} = require('@easycrud/toolkits');
const Router = require('koa-router');
const db = require('./db');
const Dao = require('./dao');
const varname = require('varname');

class Crud {
  constructor({
    path, tables, dbConfig, routerConfig,
  }, router) {
    this.path = path;
    this.tables = tables;
    this.dbConfig = dbConfig;
    this.routerConfig = routerConfig;
    this.router = router || new Router();
  }

  getDbClient(table) {
    // Get db client, if not exists, use default db client.
    const dbName = table.options?.database;
    let dbClient = Object.values(db.client)[0];
    if (dbName && db.client[dbName]) {
      dbClient = db.client[dbName];
    }
    return dbClient;
  }

  getTableAlias(table) {
    const formatterMp = {
      'snake': varname.underscore,
      'camel': varname.camelback,
      'kebab': varname.dash,
      'none': (col) => col,
    };
    const defaultFormatter = 'camel';
    let formatter = table.options?.columnFormatter || defaultFormatter;
    formatter = typeof formatter === 'function' ? formatter :
      (formatterMp[formatter] || formatterMp[defaultFormatter]);

    return Object.fromEntries(table.columns.map((col) => {
      const alias = col.alias || formatter(col.name);
      return [alias, col.name];
    }));
  }

  async buildOperates(dao) {
    return {
      all: {
        method: 'get',
        handler: () => {},
      },
      paginate: {
        method: 'get',
        handler: () => {},
      },
      show: {
        method: 'get',
        handler: () => {},
      },
      store: {
        method: 'post',
        handler: () => {},
      },
      edit: {
        method: 'put',
        handler: () => {},
      },
      destory: {
        method: 'delete',
        handler: () => {},
      },
    };
  }

  async build() {
    if (!this.dbConfig) {
      throw new Error('Set at least one database connection config please.');
    }
    if (this.path) {
      const parser = new Parser();
      await parser.parse(path);
      this.tables = parser.tables;
    }
    if (!this.tables || this.tables.length === 0) {
      throw new Error('table config is required.');
    }
    if (Array.isArray(this.dbConfig)) {
      const dbConns = this.dbConfig.map((conf) => db.connect(conf, conf.database));
      await Promise.all(dbConns);
    } else {
      await db.connect(this.dbConfig, this.dbConfig.database);
    }


    tables.forEach((t) => {
      const model = t.alias || t.tableName;
      const dao = new Dao({
        db: this.getDbClient(t),
        table: t.tableName,
        alias: this.getTableAlias(t),
      });

      const operates = this.buildOperates(dao);
      Object.entries(operates).forEach(([key, operate]) => {
        const routerConfig = this.routerConfig[model] || this.routerConfig[t.tableName];
        const middleware = [].concat(routerConfig?.[key]?.middleware || []);
        const path = /(show|edit|destory)/.test(key) ? `${model}/:id` : model;
        this.router.register(path, [operate.method], [...middleware, operate.handler]);
      });
    });

    return this.router.routes();
  }
}

module.exports = Crud;
