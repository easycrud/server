import koaBody from 'koa-body';
import Router from 'koa-router';
import {Options, ResourceOperate, RESTfulOperateConfig} from '../../base/types';
import Dao from '../../dao';

export interface routerConfig {
  [tableName: string]: Partial<{
    /**
     * If true, the default router opreates will be overwritten by the property 'operates'.
     * Otherwise, the property 'operates' will be deeply merged with the default router opreates.
     */
    overwrite: boolean;

    operates: Record<ResourceOperate, Partial<OperateConfig>> | Record<string, OperateConfig>;
  }>;
}

export interface OperateConfig extends Omit<RESTfulOperateConfig, 'handler'> {
  middleware?: Router.IMiddleware | Array<Router.IMiddleware>;
  handler: (dao: Dao) => Router.IMiddleware;
}

export interface KoaOptions extends Options {
  routerConfig?: routerConfig;
  koaBodyOptions?: koaBody.IKoaBodyOptions;
}

declare module 'koa' {
  export interface BaseContext {
    reply: (data?: Object | Array<any> | string) => void;
    [dao: string]: Dao;
  }
}
