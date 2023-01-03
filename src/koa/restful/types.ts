import {TableSchema} from '@easycrud/toolkits/lib/table-schema/types';
import {Knex} from 'knex';
import koaBody from 'koa-body';
import Router from 'koa-router';
import Dao from '../../dao';

export interface Options {
  path?: string;
  tables?: TableSchema[];
  dbConfig?: Knex.Config;
  routerConfig?: routerConfig;
  getUserAuth?: (context: Router.RouterContext) => Record<string, any>;
  koaBodyOptions?: koaBody.IKoaBodyOptions;
}

export interface routerConfig {
  method: 'get' | 'post' | 'put' | 'delete' | 'patch';
  path: string;
  middleware: Router.IMiddleware | Array<Router.IMiddleware>;
  handler: (dao: Dao) => Router.IMiddleware;
}
