class Dao {
  constructor({db, table, alias, pk}) {
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

  async paginate(params) {
    try {
      const {page, pageSize, orderBy} = params;
      const currentPage = page ? parseInt(page, 10) : 1;
      const perPage = pageSize ? parseInt(pageSize, 10) : 20;
      let query = this.db.select(this.alias);
      query = this.buildCond(query, this.transform(params));
      if (orderBy) {
        const [key, order] = orderBy.split(',');
        query = query.orderBy(key, order || 'DESC');
      }
      return await query.from(this.table).paginate({perPage, currentPage, isLengthAware: true});
    } catch (err) {
      console.error(err);
      return {err};
    }
  }

  async getByPk(pk, auth) {
    try {
      const result = await this.db
        .where(this.transform({...pk, ...auth}))
        .select(this.alias)
        .from(this.table);

      return result.length > 0 ? result[0] : null;
    } catch (err) {
      console.log(err);
      return {err};
    }
  }

  async delByPk(pk, auth) {
    try {
      const result = await this.db
        .where(this.transform({...pk, ...auth}))
        .from(this.table)
        .del();

      return result;
    } catch (err) {
      console.log(err);
      return {err};
    }
  }

  async create(data) {
    try {
      const result = await this.db.insert(this.transform(data)).into(this.table);

      return result;
    } catch (err) {
      console.log(err);
      return {err};
    }
  }

  async updateByPk(pk, auth, data) {
    try {
      const result = await this.db
        .where(this.transform({...pk, ...auth}))
        .from(this.table)
        .update(this.transform(data));

      return result;
    } catch (err) {
      console.log(err);
      return {err};
    }
  }
}

module.exports = Dao;
