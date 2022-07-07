import * as Toolkits from '@easycrud/toolkits';
import { Knex } from 'knex';
import * as Router from 'koa-router';

type AuthOperate = 'read' | 'create' | 'update' | 'delete';
type ResourceOperate = 'all' | 'paginate' | 'show' | 'store' | 'edit' | 'destory';

interface routerConfig {
  middleware: Router.IMiddleware<StateT, CustomT> | Array<Router.IMiddleware<StateT, CustomT>>;
}

declare namespace Crud {
  interface DBConfig extends Knex.Config {
    database?: string;
  }


  interface Options {

    path: string;

    tables: Toolkits.TableDefinition;

    dbConfig: DBConfig | DBConfig[];

    routerConfig?: {
      [tableName: string]: {
        [method: ResourceOperate]: routerConfig;
      };
    };
  }
}

declare class Crud {
  constructor(opts: crud.Options, router?: Router);

  build(): Router.IMiddleware;
};

declare module "@easycrud/toolkits" {
  interface TableOptions {
    /**
     * The options for the authorization of the operation for a table.
     */
    auth?: {
      /**
       * The name of the column which value will be used to check high risk permissions of a row.
       */
      column?: string;
      /**
       * Operations that require authorization.
       */
      operates?: AuthOperate[];
    }
  }
}

export = Crud;