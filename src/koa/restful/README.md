# @easycrud/server/koa/restful

> A [koa-router](https://github.com/koajs/router) extension for constructing CRUD RESTful API simply.
    
![](https://img.shields.io/node/v/@easycrud/koa-router-crud)  

## Table of Contents
- [Installation](#installation)
- [Feature](#feature)
- [Quick Start](#quick-start)
- [Main Dependencies](#main-dependencies)
- [API Reference](#api-reference)
    - [Customize Routers](#customize-routers)
    - [Row-Level Authorization](#row-level-authorization)

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

The first two routers can be appended query parameters to filter the result.
- fuzzy search: `column=value`
- range search: `column=value1,value2` (column>=value1 and column<=value2)

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

crud.build(app).then((router) => {
  app.use(router.routes());
  app.use(router.allowedMethods());

  app.listen(3000);
});
```

## Main Dependencies

- [koa](https://koajs.com/) - The application building framework.
- [koa-router](https://github.com/koajs/router) - The router construction base.
- [koa-body](https://github.com/koajs/koa-body) - A request body parser middleware.
- [knex.js](http://knexjs.org/) - An SQL query builder to help operate databases. 
- [@easycrud/toolkits](https://github.com/easycrud/toolkits) - Provide a Parser to output standard table model objects.

## API Reference

- [Crud](#crud)
    - [new Crud(\[opts\], `Router`)](#new-crudopts-router)
    - instance
        - [.build(app) => `Promise<Router>`](#crudbuild-promiserouter)
- [Dao](#dao)
    - instance
        - [.all(params) => `Array|{err}`](#allparams-array-err)
        - [.paginate(params) => `Array|{err}`](#paginateparams-array-err)
        - [.getByPk(pk, auth) => `Object|{err}`](#getbypkpk-object-err)
        - [.delByPk(pk, auth) => `Object|{err}`](#delbypkpk-object-err)
        - [.create(data) => `Object|{err}`](#create-object-err)
        - [.updateByPk(pk, data, auth) => `Object|{err}`](#updatebypkpk-object-err)
- [ctx.reply(data)](#ctxreplydata)

## Crud

**Kind**: Exported class

### new Crud(\[opts\], `Router`)

Create a new Crud instance. If `Router` is not provided, a new `Router` instance will be created.

#### Options

- `path (String)` - directory or file path that pass to the [Parser](https://github.com/easycrud/toolkits/blob/master/lib/parser.js). The parsed table models will be stored in `crud.tables`.
- `tables (Array)` - table models defined using standard table definition. If `path` is provided, `tables` will be ignored.
- `dbConfig (Object|Array)` - [knex configuration options](http://knexjs.org/guide/#configuration-options) that will be used for establishing database connections before the application start.    
*If more than one `dbConfig` is provided, the value of `dbConfig.database` and `[table].options.database` must be guaranteed equal.
- `routerConfig (Object)` - A configuration object with table name as key to [customize the generated routers](#customize-routers).
- `getUserAuth (Function)` - `(context: Router.RouterContext) => string` A function to get the authorization value related to current user and the value is used for verifying [row-level authorization](#row-level-authorization). 
- `koaBodyOptions (Object)` - [koa-body options](https://github.com/koajs/koa-body#options) that will be passed to `koa-body` middleware.

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

<h3 id="crudbuild-promiserouter">crud.build(app) => <code>Promise&lt;Router&gt;</code></h3>

Construct database connections and build the api routers, returning a `Router` instance.

```js
crud.build(app).then((router) => {
  // Register the router and start the application
  // after the databases are connected and the routers are built.
  app.use(router.routes());
  app.use(router.allowedMethods());

  app.listen(3000);
});
```


#### Row-Level Authorization

```js
const getUserAuth = (ctx) => {
  // Get the authorization value related to current user
  return ctx.state.user.id;
}
```

Set `rowAuth` options of the table definition schema.

```json
{
    //...
    "options": {
        "rowAuth": {
            "column": "user_id",
            // Operations that require authorization.
            "operates": ["read", "create", "update", "delete"]
        }
    }
}
```

## Dao

<h3 id="allparams-array-err">dao.all(params) => <code>Array|{err}</code></h3>

Get all records from the table.

- params: the query object get from `ctx.query` used for filtering data.

<h3 id="paginateparams-array-err">dao.paginate(params) => <code>Array|{err}</code></h3>

Get paginated records from the table.

<h3 id="getbypkpk-object-err">dao.getByPk(pk, auth) => <code>Object|{err}</code></h3>

Get a record by primary key.

- pk: the primary key-value pair. `{pkCol: pkVal}`
- auth: the value of row authorization column. `{authCol: authVal}`

<h3 id="delbypkpk-object-err">dao.delByPk(pk, auth) => <code>Object|{err}</code></h3>

Delete a record by primary key.

<h3 id="create-object-err">dao.create(data) => <code>Object|{err}</code></h3>

Create a new record.

- data: the data to be created get from `ctx.request.body.data`.

<h3 id="updatebypkpk-object-err">dao.updateByPk(pk, data, auth) => <code>Object|{err}</code></h3>

Update a record by primary key.

- pk: the primary key-value pair. `{pkCol: pkVal}`
- data: the data to be updated get from `ctx.request.body.data`.
- auth: the value of row authorization column. `{authCol: authVal}`

## ctx.reply(data)

```js
ctx.reply({ id: 1 });
ctx.reply({ err: { code: 404, message: 'not found' } });
```

Return the standard data.

```json
{
    "code": 0,
    "msg": "success",
    "data": {}
}
```

