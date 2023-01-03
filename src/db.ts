import {Knex} from 'knex';
import knex from 'knex';
import {attachPaginate} from 'knex-paginate';
attachPaginate();

export default class DB {
  client: {
    [key: string]: Knex;
  };

  constructor() {
    this.client = {};
  }

  async connect(config: Knex.Config, database?: string) {
    if (database && this.client[database]) {
      return;
    }
    this.client[database || 'default'] = await knex(config);
  }
}
