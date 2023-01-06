import {Knex} from 'knex';
import Dao from '../dao';
import {TableSchema} from '../types';

export interface DBConfig extends Knex.Config {
    database?: string;
  };

export type GetUserPermission = () => string | Record<string, any> | (() => Promise<string | Record<string, any>>);
export interface Options {
  path?: string;
  schemas?: TableSchema[];
  dbConfig?: DBConfig;
  getUserPermission?: GetUserPermission;
}

export type ResourceOperate = 'all' | 'paginate' | 'show' | 'store' | 'edit' | 'destory';
export type Response = {
  code: number;
  msg: string;
  data: any;
}
export type RESTfulHandler = (params: {
  dao: Dao,
  params: Record<string, any>,
  query: Record<string, any>,
  body: Record<string, any>
}) => Promise<Response>;
export interface RESTfulOperateConfig {
  method: 'get' | 'post' | 'put' | 'delete' | 'patch';
  path: string;
  handler: RESTfulHandler;
}
