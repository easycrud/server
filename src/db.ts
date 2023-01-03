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

  async connect(config: Knex.Config, database: string) {
    if (!this.client[database]) {
      this.client[database] = await knex(config);
    }
  }
}
