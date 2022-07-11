import * as Toolkits from '@easycrud/toolkits';
import { Knex } from 'knex';
import * as Router from 'koa-router';
import { ParsedUrlQuery } from 'querystring';

type AuthOperate = 'read' | 'create' | 'update' | 'delete';
type ResourceOperate = 'all' | 'paginate' | 'show' | 'store' | 'edit' | 'destory';

class Dao {
  constructor(opts: {
    db: Knex.Client;
    table: string;
    alias: Record<string, string>;
  })

  all(query: ParsedUrlQuery): Promise<any[] | { err?: string }>;
  paginate(query: ParsedUrlQuery): Promise<any[] | { err?: string }>;
  getByPk(pk, auth: Record<string, string>): Promise<any | { err?: string }>;
  delByPk(pk, auth: Record<string, string>): Promise<any | { err?: string }>;
  create(data: Record<string, string>): Promise<any | { err?: string }>;
  updateByPk(pk, data, auth: Record<string, string>): Promise<any | { err?: string }>;
}

interface routerConfig {
  method: 'get' | 'post' | 'put' | 'delete' | 'patch';
  path: string;
  middleware: Router.IMiddleware<StateT, CustomT> | Array<Router.IMiddleware<StateT, CustomT>>;
  handler: (dao: Dao) => Router.IMiddleware<StateT, CustomT>;
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
      [tableName: string]: Partial<{
        /**
         * If the table does not have a primary key, 
         * set it manually for the show, edit, destory operates which need row search conditions.
         */ 
        primaryKey: string | string[];

        opreates: Record<ResourceOperate | string, Partial<routerConfig>>;
      }>;
    };

    /**
     * This function is used for getting an auth value related to the current user. For example, username, userid, etc.
     * Then it will be compared with the value of the column set in the rowAuth option in the table definition.
     * If the value is matched, the user can operate the row.
     */
    getUserAuth: (context: Router.RouterContext) => any;
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
    rowAuth?: {
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