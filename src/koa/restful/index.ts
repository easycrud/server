'use strict';

import {AuthOperate, TableSchema as TypeTableSchema} from '../../types';
import koaBody from 'koa-body';
import Router, {RouterContext} from 'koa-router';
import {DBConfig, operateConfig, Options, ResourceOperate, routerConfig} from './types';
import * as varname from 'varname';
import Koa from 'koa';
import Dao from '../../dao';
import Application from 'koa';
import {TableSchema} from '@easycrud/toolkits';
import {Knex} from 'knex';
import merge from 'deepmerge';
import DB from '../../db';
const db = new DB();

export default class KoaRESTful {
  path: string;
  schemas: TypeTableSchema[];
  dbConfig: DBConfig;
  routerConfig: routerConfig;
  getUserAuth: (context: RouterContext) => string;
  router: Router;

  constructor({
    path, schemas, dbConfig, routerConfig, getUserAuth, koaBodyOptions,
  }: Options, router: Router) {
    this.path = path || '';
    this.schemas = schemas || [];
    this.dbConfig = dbConfig || {};
    this.routerConfig = routerConfig || {};
    this.getUserAuth = getUserAuth || ((_ctx: RouterContext) => '');
    this.router = router || new Router();

    this.router.use(koaBody(koaBodyOptions || {}));
    this.router.use(async (ctx, next) => {
      ctx.reply = (data) => this.response(ctx, data);
      await next();
    });
  }

  getDbClient(table: TypeTableSchema): Knex {
    // Get db client, if not exists, use default db client.
    const dbName = table.options?.database;
    let dbClient = Object.values(db.client)[0];
    if (dbName && db.client[dbName]) {
      dbClient = db.client[dbName];
    }
    return dbClient;
  }

  getColumnAlias(table: TypeTableSchema, col: string) {
    if (!col) {
      return col;
    }
    const formatterMp = {
      'snake': varname.underscore,
      'camel': varname.camelback,
      'kebab': varname.dash,
      'none': (col: string) => col,
    };
    const defaultFormatter = 'camel';
    let formatter = table.options?.columnFormatter || defaultFormatter;
    formatter = typeof formatter === 'function' ? formatter :
      (formatterMp[formatter] || formatterMp[defaultFormatter]);

    return formatter(col);
  }

  getTableAlias(table: TypeTableSchema) {
    return Object.fromEntries(table.columns.map((col) => {
      const alias = col.alias || this.getColumnAlias(table, col.name);
      return [alias, col.name];
    }));
  }

  response(ctx: RouterContext, data: any) {
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

  buildOperates(table: TypeTableSchema): Record<ResourceOperate, Partial<operateConfig>> {
    const rowAuthOpts = table?.options?.rowAuth;
    if (rowAuthOpts && !(this.getUserAuth && typeof this.getUserAuth === 'function')) {
      throw new Error(`table ${table.tableName} requires row auth check, but getUserAuth function is not defined.`);
    }
    const authCol = this.getColumnAlias(table, rowAuthOpts?.column || '');
    const authQuery = (op: AuthOperate, authValue: string) => authCol && rowAuthOpts?.operates?.includes(op) ?
      {[authCol]: authValue} : {};
    const addPermit = authCol ?
      (res: any, authValue: string) => ({...res, permit: res[authCol].includes(authValue)}) :
      (res: any) => res;

    const pk = table.pk.map((col) => this.getColumnAlias(table, col));
    const pkQuery = (ctx: Koa.Context) => {
      const query: Record<string, any> = {};
      pk.forEach((col) => {
        query[col] = ctx.params[col];
      });
      return query;
    };

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

  async build(app: Application) {
    if (!this.dbConfig) {
      throw new Error('Set at least one database connection config please.');
    }
    if (this.path) {
      const tableSchema = new TableSchema();
      const schemas = tableSchema.fromPath(this.path);
      if (!Array.isArray(schemas)) {
        this.schemas.push(schemas);
      } else {
        this.schemas = schemas;
      }
    }
    if (!this.schemas || this.schemas.length === 0) {
      throw new Error('table config is required.');
    }
    if (Array.isArray(this.dbConfig)) {
      const dbConns = this.dbConfig.map((conf) => db.connect(conf, conf.database));
      await Promise.all(dbConns);
    } else {
      await db.connect(this.dbConfig, this.dbConfig.database);
    }

    this.schemas.forEach((t) => {
      const model = t.alias || t.tableName;
      const pk = t.pk;
      if (pk.length === 0) {
        throw new Error(`primary key of table model ${model} is required.`);
      }

      const dbClient = this.getDbClient(t);
      const dao = new Dao({
        db: dbClient,
        table: t.tableName,
        alias: this.getTableAlias(t),
      });

      app.context[`${model}DB`] = dbClient;
      app.context[`${model}Dao`] = dao;

      const defaultOperates = this.buildOperates(t);
      const routerConfig = this.routerConfig[model] || this.routerConfig[t.tableName];
      const overwriteOperates = routerConfig?.overwrite;
      const customOperates = routerConfig?.operates || {};
      const operates: Record<string, Partial<operateConfig>> = overwriteOperates ?
        customOperates : merge(defaultOperates, customOperates);
      Object.entries(operates).forEach(([key, operate]) => {
        const middleware = operate.middleware ?
          (Array.isArray(operate.middleware) ? operate.middleware : [operate.middleware]) : [];
        const handler = operate.handler || ((_dao) => (ctx) => ctx.body = `The router handler is not defined.`);
        let path = operate.path;
        if (!path) {
          path = model;
          if (/(show|edit|destory)/.test(key)) {
            path += pk.map((col) => `/:${this.getColumnAlias(t, col)}`).join('');
          }
        }
        this.router.register(path, [operate.method || 'get'], [...middleware, handler(dao)]);
      });
    });

    return this.router;
  }
}
