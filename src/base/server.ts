import {
  DBConfig,
  GetUserPermission,
  Options,
  ResourceOperate,
  RESTfulOperateConfig,
} from './types';
import {TableSchema as TypeTableSchema} from '../types';
import DB from '../db';
import {Knex} from 'knex';
import * as varname from 'varname';
import {TableSchema} from '@easycrud/toolkits';
import Dao from '../dao';
const db = new DB();

export default class Server {
  path: string;
  schemas: TypeTableSchema[];
  dbConfig: DBConfig | DBConfig[];
  getUserPermission: GetUserPermission;

  constructor({
    path, dbConfig, getUserPermission,
  }: Options) {
    this.path = path || '';
    this.schemas = [];
    this.dbConfig = dbConfig || {};
    this.getUserPermission = getUserPermission || (() => '');
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
    return Object.fromEntries(table.columns.filter((col) => !col.hide).map((col) => {
      const alias = col.alias || this.getColumnAlias(table, col.name);
      return [alias, col.name];
    }));
  }

  buildOperates(_table: TypeTableSchema) {
    return {} as Record<ResourceOperate, Partial<RESTfulOperateConfig>>;
  }

  async createServer() {
    if (!this.dbConfig) {
      throw new Error('Set at least one database connection config please.');
    }
    const tableSchema = new TableSchema();
    if (this.path) {
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

    const schemaConfigs: {
      [key: string]: {
        dao: Dao;
        operates: Record<ResourceOperate, RESTfulOperateConfig>
        schema: TypeTableSchema;
      }
    } = {};
    this.schemas.forEach((schema) => {
      const model = schema.alias || schema.tableName;
      const pk = schema.pk;
      if (pk.length === 0) {
        throw new Error(`primary key of table model ${model} is required.`);
      }

      const dbClient = this.getDbClient(schema);
      const dao = new Dao({
        db: dbClient,
        table: schema.tableName,
        alias: this.getTableAlias(schema),
      });

      const operates = this.buildOperates(schema);
      Object.entries(operates).forEach(([key, operate]) => {
        let path = operate.path;
        if (!path) {
          path = model;
          if (/(show|edit|destory)/.test(key)) {
            path += schema.pk.map((col) => `/:${this.getColumnAlias(schema, col)}`).join('');
          }
        }
        operate.path = path[0] === '/' ? path : `/${path}`;
      });

      schemaConfigs[model] = {
        dao,
        operates: operates as Record<ResourceOperate, RESTfulOperateConfig>,
        schema,
      };
    });
    return schemaConfigs;
  }
}

