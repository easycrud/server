import * as Toolkits from '@easycrud/toolkits';
import { Knex } from 'knex';
import * as Router from 'koa-router';
import { ParsedUrlQuery } from 'querystring';

type AuthOperate = 'read' | 'create' | 'update' | 'delete';
type ResourceOperate = 'all' | 'paginate' | 'show' | 'store' | 'edit' | 'destory';

declare namespace Crud {
  interface DBConfig extends Knex.Config {
    database?: string;
  }

  interface Options {

    path?: string;

    tables?: Toolkits.TableDefinition[];

    dbConfig: DBConfig | DBConfig[];

    routerConfig?: {
      [tableName: string]: Partial<{
        /**
         * If the table does not have a primary key, 
         * set it manually for the show, edit, destory operates which need row search conditions.
         */ 
        primaryKey: string | string[];

        /**
         * If true, the default router opreates will be overwritten by the property 'operates'.
         * Otherwise, the property 'operates' will be deeply merged with the default router opreates.
         */
        overwrite: boolean;

        opreates: Record<ResourceOperate | string, Partial<routerConfig>>;
      }>;
    };

    /**
     * This function is used for getting an auth value related to the current user. For example, username, userid, etc.
     * Then it will be compared with the value of the column set in the rowAuth option in the table definition.
     * If the value is matched, the user can operate the row.
     */
    getUserAuth?: (context: Router.RouterContext) => any;

    router?: Router;
  }

  interface routerConfig {
    method: 'get' | 'post' | 'put' | 'delete' | 'patch';
    path: string;
    middleware: Router.IMiddleware | Array<Router.IMiddleware>;
    handler: (dao: Dao) => Router.IMiddleware;
  }

  class Dao {
    constructor(opts: {
      db: Knex.Client;
      table: string;
      alias: Record<string, string>;
    })
  
    all(query: ParsedUrlQuery): Promise<any[] | { err?: string }>;
    paginate(query: ParsedUrlQuery): Promise<any[] | { err?: string }>;
    getByPk(pk: Record<string, string>, auth?: Record<string, string>): Promise<any | { err?: string }>;
    delByPk(pk: Record<string, string>, auth?: Record<string, string>): Promise<any | { err?: string }>;
    create(data: Record<string, string>): Promise<any | { err?: string }>;
    updateByPk(pk: Record<string, string>, data: Record<string, string>, auth?: Record<string, string>): Promise<any | { err?: string }>;
  }
}

interface Crud extends Crud.Options {}
declare class Crud {
  constructor(opts: Crud.Options, router?: Router);

  build(): Promise<Router>;
}

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