# @easycrud/koa-router-crud

> A [koa-router](https://github.com/koajs/router) extension for constructing CRUD router simply.
    
![](https://img.shields.io/node/v/@easycrud/koa-router-crud)  

## Installation
```bash
npm install koa-router-crud
```

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

## API Reference

### Table of Contents

- [Crud](#crud)
    - [new Crud(\[opts\])](#new-crudopts)
    - [crud.build](#crudbuild) => `Promise<Router>`

## Crud

**Kind**: Exported class

### new Crud(\[opts\])

Create a new Crud instance.

### crud.build => `Promise<Router>`