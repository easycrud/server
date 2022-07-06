import * as Toolkits from '@easycrud/toolkits';
import { Knex } from 'knex';
import * as Router from 'koa-router';

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

export = crud;