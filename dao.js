class Dao {
  constructor({db, table, alias}) {
    this.db = db;
    this.table = table;
    this.alias = alias;
  }

  transform(data) {
    return Object.entries(data).reduce((result, [key, val]) => {
      if (key in this.alias) {
        result[this.alias[key]] = val;
      }
    }, {});
  }

  buildCond(query, cond) {
    Object.entries(cond).forEach(([key, val]) => {
      if (!val) {
        return;
      }
      const values = val.split(',');
      if (values[1]) {
        query = query.where(key, '>=', values[0]).where('key', '<=', values[1]);
        return;
      }
      query = query.where(key, 'LIKE', `%${val}%`);
    });

    return query;
  }

  async all(params) {
    try {
      let query = this.db.select(this.alias);
      query = this.buildCond(query, this.transform(params));
      return await query.from(this.table);
    } catch (err) {
      console.error(err);
      return {err};
    }
  }

  async paginate(perPage, currentPage, params) {
    try {
      let query = this.db.select(this.alias);
      query = this.buildCond(query, this.transform(params));
      return await query.from(this.table).paginate({perPage, currentPage, isLengthAware: true});
    } catch (err) {
      console.error(err);
      return {err};
    }
  }

  async getById(id) {
  }
}

module.exports = Dao;
