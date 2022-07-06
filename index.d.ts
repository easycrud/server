import * as Toolkits from '@easycrud/toolkits';
import { Knex } from 'knex';
import * as Router from 'koa-router';

type columnFormatter = (col: string) => string;
type Operate = 'read' | 'create' | 'update' | 'delete';

declare namespace crud {
  interface DBConfig extends Knex.Config {
    database?: string;
  }


  interface Options {

    path: string;

    tables: Toolkits.TableDefinition;

    dbConfigs: DBConfig[];
  }
}

declare function crud(opts: crud.Options, router?: Router): Router.IMiddleware;

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
      operates?: Operate[];
    }
  }
}

export = crud;