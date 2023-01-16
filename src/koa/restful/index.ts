import koaBody from 'koa-body';
import Router, {RouterContext} from 'koa-router';
import {KoaOptions, routerConfig, OperateConfig} from './types';
import Dao from '../../dao';
import Application from 'koa';
import merge from 'deepmerge';
import RESTful from '../../base/restful';
import {RESTfulHandler} from '../../base/types';

export default class KoaRESTful extends RESTful {
  routerConfig: routerConfig;
  router: Router;

  constructor({
    path, dbConfig, routerConfig, getUserPermission, koaBodyOptions,
  }: KoaOptions, router: Router) {
    const koaGetUserPermission = getUserPermission ?
      async (ctx: RouterContext) => await getUserPermission(ctx) : undefined;
    super({path, dbConfig, getUserPermission: koaGetUserPermission});
    this.routerConfig = routerConfig || {};
    this.router = router || new Router();

    this.router.use(koaBody(koaBodyOptions || {}));
    this.router.use(async (ctx, next) => {
      ctx.reply = (data) => this.wrapResponse(ctx, data);
      await next();
    });
  }

  wrapResponse(ctx: RouterContext, data: any) {
    const res = this.response(data);
    ctx.response.status = res.code > 0 ? (res.code > 500 ? 500 : res.code) : 200;
    ctx.body = res;
  }

  wrapHandler(handler: RESTfulHandler) {
    return (dao: Dao) => async (ctx: RouterContext) => {
      const res = await handler({
        dao,
        params: ctx.params,
        query: ctx.query,
        body: ctx.request.body.data,
        meta: ctx,
      });
      ctx.response.status = res.code > 0 ? (res.code > 500 ? 500 : res.code) : 200;
      ctx.body = res;
    };
  }

  async create(app: Application) {
    const schemaConfigs = await this.createServer();
    Object.entries(schemaConfigs).forEach(([model, config]) => {
      app.context[`${model}Dao`] = config.dao;

      const defaultOperates: {[op:string]: OperateConfig} = {};
      Object.entries(config.operates).forEach(([op, config]) => {
        defaultOperates[op] = {
          path: config.path,
          method: config.method,
          handler: this.wrapHandler(config.handler),
        };
      });

      const schema = config.schema;
      const routerConfig = this.routerConfig[model] || this.routerConfig[schema.tableName];
      const overwriteOperates = routerConfig?.overwrite;
      const customOperates = routerConfig?.operates || {};
      const operates: Record<string, OperateConfig> = overwriteOperates ?
        customOperates as Record<string, OperateConfig> : merge(defaultOperates, customOperates);
      Object.values(operates).forEach((operate) => {
        const middleware = operate.middleware ?
          (Array.isArray(operate.middleware) ? operate.middleware : [operate.middleware]) : [];
        const handler = operate.handler ||
          ((_dao: Dao) => (ctx: RouterContext) => ctx.body = `The router handler is not defined.`);
        this.router.register(operate.path, [operate.method || 'get'], [...middleware, handler(config.dao)]);
      });
    });

    return this.router;
  }
}
