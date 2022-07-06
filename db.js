const knex = require('knex');
const {attachPaginate} = require('knex-paginate');
attachPaginate();

class DB {
  constructor() {
    this.client = {};
  }

  async connect(config, database) {
    const db = database || config.connection?.database || config.connection?.db;
    if (!db) {
      throw new Error('database name is required');
    }
    if (!this.client[db]) {
      this.client[db] = await knex(config);
    }
  }
}

module.exports = new DB();
