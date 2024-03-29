import Koa from 'koa';
import Router from 'koa-router';
import Crud from '../src/koa/restful';

const router = new Router;
const crud = new Crud({
  path: __dirname + '/schemas',
  routerConfig: {
    users: {
      operates: {
        custom: {
          path: '/custom',
          method: 'get',
          handler: () => async (ctx) => {
            ctx.reply('custom test');
          },
        },
      },
    },
  },
}, router);

export default async function start() {
  const app = new Koa();
  const router = await crud.create(app);
  app.use(router.routes()).use(router.allowedMethods());
  return app.callback();
}
