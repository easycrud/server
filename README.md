# @easycrud/koa-router-crud

> A [koa-router](https://github.com/koajs/router) extension for constructing CRUD router simply.
    
![](https://img.shields.io/node/v/@easycrud/koa-router-crud)  

## Table of Contents
- [Installation](#installation)
- [Feature](#feature)
- [Quick Start](#quick-start)
- [Main Dependencies](#main-dependencies)
- [API Reference](#api-reference)
- [Row Authorization](#row-authorization)

## Installation
```bash
npm install koa-router-crud
```

## Feature
Transform the table definition schema into RESTful style CRUD routers of koa.  
Basic example: the [`user.json`](https://github.com/easycrud/example/blob/main/schemas/user.json) will be transformed into the following routers:

- `GET /all_users[?username=xxx]` get all users without pagination.
- `GET /users?page=1&pageSize=10[&username=xxx]` get users with pagination.
- `GET /users/:id` get a user by id.
- `POST /users` create a user.
- `PUT /users/:id` update a user by id.
- `DELETE /users/:id` delete a user by id.

## Quick Start
```typescript
import * as Koa from 'koa';
import * as Router from 'koa-router';
import * as Crud from '@easycrud/koa-router-crud';

const app = new Koa();
const router = new Router();
const crud = new Crud({
  path: __dirname + '/../schemas',
  dbConfig: {
    client: 'mysql',
    connection: {
      host: '127.0.0.1',
      port: 3306,
      user: 'root',
      password: '123456',
      database: 'localdb',
      timezone: '+08:00',
      dateStrings: true,
    },
  },
}, router);

crud.build().then((router) => {
  app.use(router.routes());
  app.use(router.allowedMethods());

  app.listen(3000);
});
```

## Main Dependencies

- [koa](https://koajs.com/) - The application building framework.
- [koa-router](https://github.com/koajs/router) - The router construction base.
- [@easycrud/toolkits](https://github.com/easycrud/toolkits) - Provide a Parser to output standard table model objects.
- [knex.js](http://knexjs.org/) - An SQL query builder to help operate databases. 

## API Reference

- [Crud](#crud)
    - [new Crud(\[opts\], `Router`)](#new-crudopts)
    - [crud.build](#crudbuild) => `Promise<Router>`

## Crud

**Kind**: Exported class

### new Crud(\[opts\], `Router`)

Create a new Crud instance. If `Router` is not provided, a new `Router` instance will be created.

#### Options

- `path (String)` - directory or file path that pass to the [Parser](https://github.com/easycrud/toolkits/blob/master/lib/parser.js). The parsed table models will be stored in `crud.tables`.
- `tables (Array)` - table models defined using standard table definition. If `path` is provided, `tables` will be ignored.
- `dbConfig (Object|Array)` - [knex configiguration options](http://knexjs.org/guide/#configuration-options) that will be used for establishing database connections before the application start.    
*If more than one `dbConfig` is provided, the value of `dbConfig.database` and `[table].options.database` must be guaranteed equal.
- `routerConfig (Object)` - A configuration object with table name as key to [customize the generated routers](#customize-routers).

#### Customize routers

**Set primary key**

If the table does not have a primary key, it can be set manually.

```js
const routerConfig = {
  // customize the router for the table `user`
  'user': {
    'primaryKey': 'id',
  }
}
```

Additionally, a composite primary key can be set as

```js
const routerConfig = {
  // customize the router for the table `user`
  'user': {
    'primaryKey': ['username', 'email'],
  }
}
```

And the `GET /users/:pk` router will be changed to `GET /users/row?username=:username&email=:email`.

**Custom router**

The default corresponding handler methods to the routers are:  

- `GET /all_[tablename]` - `all`
- `GET /[tablename]` - `paginate`
- `GET /tablename/:id` - `show`
- `POST /tablename` - `store`
- `PUT /tablename/:id` - `edit`
- `DELETE /tablename/:id` - `destory`

Change the default router like this:

```js
const routerConfig = {
  // customize the router for the table `user`
  'user': {
    'operates': {
      // Change the default router, 'all|paginate|show|store|edit|destory'
      'all': {
        // set the http method, 'get|post|put|delete|patch'
        'method': 'get',
        // change the default path
        'path': '',
        // add some middlewares before the handler
        'middlewares': [],
        // change the default handler
        'handler': (dao) => {
            // The parameter `dao` is a `Dao` instance. It provide some help functions to operate the database.
            return async (ctx, next) => {
                // do something
            }
        }
      },
      // Add a new router
      'auth': {
        'method': 'get',
        'path': 'auth',
        'middlewares': [],
        'handler': (dao) => {
            return async (ctx, next) => {
                // do something
            }
        }
      }
    }
  }
}
```

**Overwrite router**

If the `overwrite` property is set to `true`, only the router defined in `operates` remain and the default router will be removed.

```js
const routerConfig = {
  // customize the router for the table `user`
  'user': {
    'overwrite': true,
    'operates': {
      // ...
    }
  }
}
```

### crud.build => `Promise<Router>`

## Row Authorization