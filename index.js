'use strict';

const {Parser} = require('@easycrud/toolkits');
const Router = require('koa-router');
const db = require('./db');
const Dao = require('./dao');
const varname = require('varname');
const merge = require('deepmerge');

class Crud {
  constructor({
    path, tables, dbConfig, routerConfig, getUserAuth,
  }, router) {
    this.path = path || '';
    this.tables = tables || [];
    this.dbConfig = dbConfig || {};
    this.routerConfig = routerConfig || {};
    this.getUserAuth = getUserAuth || ((ctx) => {});
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

  getColumnAlias(table, col) {
    if (!col) {
      return col;
    }
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

    return formatter(col);
  }

  getTableAlias(table) {
    return Object.fromEntries(table.columns.map((col) => {
      const alias = col.alias || this.getColumnAlias(table, col.name);
      return [alias, col.name];
    }));
  }

  getPrimaryKey(table) {
    let primaryKey = Object.values(table.indexes || {}).filter((index) => {
      return index.primary;
    });
    if (primaryKey.length > 0) {
      return primaryKey[0].columns;
    }
    const routerConfig = this.routerConfig[table.alias] || this.routerConfig[table.tableName];
    primaryKey = [].concat(routerConfig?.[key]?.primaryKey || []);
    return primaryKey;
  }

  response(ctx, data) {
    if (data.err) {
      const err = data.err;
      ctx.response.status = !err.code || err.code > 500 ? 500 : err.code;
      ctx.body = {
        code: err.code || 500,
        msg: err.message || 'unknown error',
        data: null,
      };
    } else {
      ctx.body = {
        code: 0,
        msg: 'success',
        data,
      };
    }
  }

  buildOperates(table) {
    const rowAuthOpts = table?.options?.rowAuth;
    if (rowAuthOpts && !(this.getUserAuth && typeof this.getUserAuth === 'function')) {
      throw new Error(`table ${table.tableName} requires row auth check, but getUserAuth function is not defined.`);
    }
    const authCol = this.getColumnAlias(table, rowAuthOpts?.column);
    const authQuery = (op, authValue) => authCol && rowAuthOpts?.operates.includes(op) ?
      {[authCol]: authValue} : {};
    const addPermit = authCol ? (res, authValue) => ({...res, permit: res[authCol].includes(authValue)}) : (res) => res;

    const pk = this.getPrimaryKey(table).map((col) => this.getColumnAlias(table, col));
    const pkQuery = (ctx) => pk.length === 1 ? {[pk[0]]: ctx.params[pk[0]]} : ctx.query;

    return {
      all: {
        path: `all_${table.alias || table.tableName}`,
        method: 'get',
        handler: (dao) => async (ctx) => {
          const authValue = await this.getUserAuth(ctx);
          let res = await dao.all(Object.assign(authQuery('read', authValue), ctx.query));
          res = addPermit(res, authValue);
          ctx.reply(res);
        },
      },
      paginate: {
        method: 'get',
        handler: (dao) => async (ctx) => {
          const authValue = await this.getUserAuth(ctx);
          let res = await dao.paginate(Object.assign(authQuery('read', authValue), ctx.query));
          res = addPermit(res, authValue);
          ctx.reply(res);
        },
      },
      show: {
        method: 'get',
        handler: (dao) => async (ctx) => {
          const authValue = await this.getUserAuth(ctx);
          const res = await dao.getByPk(pkQuery(ctx), authQuery('read', authValue));
          ctx.reply(res);
        },
      },
      store: {
        method: 'post',
        handler: (dao) => async (ctx) => {
          const res = await dao.create(ctx.request.body.data);
          ctx.reply(res);
        },
      },
      edit: {
        method: 'put',
        handler: (dao) => async (ctx) => {
          const authValue = await this.getUserAuth(ctx);
          const res = await dao.updateByPk(pkQuery(ctx), authQuery('read', authValue), ctx.request.body.data);
          ctx.reply(res);
        },
      },
      destory: {
        method: 'delete',
        handler: (dao) => async (ctx) => {
          const authValue = await this.getUserAuth(ctx);
          const res = await dao.delByPk(pkQuery(ctx), authQuery('read', authValue));
          ctx.reply(res);
        },
      },
    };
  }

  async build() {
    if (!this.dbConfig) {
      throw new Error('Set at least one database connection config please.');
    }
    if (this.path) {
      const parser = new Parser();
      await parser.parse(this.path);
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

    this.router.use(async (ctx, next) => {
      ctx.reply = (data) => this.response(ctx, data);
      await next();
    });

    this.tables.forEach((t) => {
      const model = t.alias || t.tableName;
      const pk = this.getPrimaryKey(t);
      if (pk.length === 0) {
        throw new Error(`primary key of table model ${model} is required.`);
      }
      const dao = new Dao({
        db: this.getDbClient(t),
        table: t.tableName,
        alias: this.getTableAlias(t),
      });

      const defaultOperates = this.buildOperates(t);
      const routerConfig = this.routerConfig[model] || this.routerConfig[t.tableName];
      const overwriteOperates = routerConfig?.overwrite;
      const customOperates = routerConfig?.operates || {};
      const operates = overwriteOperates ? customOperates : merge(defaultOperates, customOperates);
      Object.entries(operates).forEach(([key, operate]) => {
        const middleware = [].concat(operate.middleware || []);
        const handler = operate.handler || ((ctx) => ctx.body = `The router handler is not defined.`);
        let path = operate.path;
        if (!path) {
          path = model;
          if (/(show|edit|destory)/.test(key)) {
            path += pk.length === 1 ? `/:${this.getColumnAlias(t, pk[0])}` : `/row`;
          }
        }
        this.router.register(path, [operate.method || 'get'], [...middleware, handler(dao)]);
      });
    });

    return this.router;
  }
}

module.exports = Crud;
