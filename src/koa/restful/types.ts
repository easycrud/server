import {TableSchema} from '@easycrud/toolkits/lib/table-schema/types';
import {Knex} from 'knex';
import * as Koa from 'koa';
import koaBody from 'koa-body';
import Router from 'koa-router';
import Dao from '../../dao';

export type ResourceOperate = 'all' | 'paginate' | 'show' | 'store' | 'edit' | 'destory';
export interface routerConfig {
  [tableName: string]: Partial<{
    /**
     * If the table does not have a primary key,
     * set it manually for the show, edit, destory operates which need row search conditions.
     */
    primaryKey: string | string[];

    /**
     * If true, the default router opreates will be overwritten by the property 'operates'.
     * Otherwise, the property 'operates' will be deeply merged with the default router opreates.
     */
    overwrite: boolean;

    operates: Record<ResourceOperate | string, Partial<operateConfig>>;
  }>;
}

export interface operateConfig {
  method: 'get' | 'post' | 'put' | 'delete' | 'patch';
  path: string;
  middleware: Router.IMiddleware | Array<Router.IMiddleware>;
  handler: (dao: Dao) => Router.IMiddleware;
}

export interface DBConfig extends Knex.Config {
  database?: string;
};

export interface Options {
  path?: string;
  schemas?: TableSchema[];
  dbConfig?: DBConfig;
  routerConfig?: routerConfig;
  getUserAuth?: (context: Koa.BaseContext) => string;
  koaBodyOptions?: koaBody.IKoaBodyOptions;
}

declare module 'koa' {
  export interface BaseContext {
    reply: (data?: Object | Array<any> | string) => void;
  }
}
