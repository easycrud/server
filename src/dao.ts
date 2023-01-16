import {Knex} from 'knex';

interface Options {
  db: Knex;
  table: string;
  alias: Record<string, string>;
}

export default class Dao {
  db: Knex;
  table: string;
  alias: Record<string, string>;

  constructor({db, table, alias}: Options) {
    this.db = db;
    this.table = table;
    this.alias = alias;
  }

  transform(data: Record<string, any>) {
    return Object.entries(data).reduce((result, [key, val]) => {
      if (key in this.alias) {
        result[this.alias[key]] = val;
      }
      return result;
    }, {} as Record<string, any>);
  }

  buildWhereClause(query: Knex.QueryBuilder, conditions: Record<string, any>) {
    const opMap: { [op: string]: string } = {
      'eq': '=',
      'ne': '!=',
      'gt': '>',
      'gte': '>=',
      'lt': '<',
      'lte': '<=',
    };
    Object.entries(conditions).forEach(([key, val]) => {
      if (!val) {
        return;
      }
      let [field, op] = key.split(':');
      if (!op) {
        query = query.where(field, val);
        return;
      }
      op = op.toLowerCase();
      if (op in opMap) {
        query = query.where(field, opMap[op], val);
        return;
      }
      switch (op) {
      case 'in':
        query = query.whereIn(field, val.split(','));
        break;
      case 'like':
        query = query.where(field, 'LIKE', `%${val}%`);
        break;
      case 'btw':
        query = query.whereBetween(field, val.split(','));
        break;
      }
    });

    return query;
  }

  async all(params: Record<string, any>) {
    try {
      let query = this.db.select(this.alias);
      query = this.buildWhereClause(query, this.transform(params));
      return await query.from(this.table);
    } catch (err) {
      console.error(err);
      return {err};
    }
  }

  async paginate(params: Record<string, any>) {
    try {
      const {page, pageSize, orderBy} = params;
      const currentPage = page ? parseInt(page, 10) : 1;
      const perPage = pageSize ? parseInt(pageSize, 10) : 20;
      let query = this.db.select(this.alias);
      query = this.buildWhereClause(query, this.transform(params));
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

  async getByFields(fields: Record<string, any>) {
    try {
      const result = await this.db
        .where(this.transform(fields))
        .select(this.alias)
        .from(this.table);

      return result.length > 0 ? result[0] : {err: {code: 404, msg: 'Not Found'}};
    } catch (err) {
      console.log(err);
      return {err};
    }
  }

  async delByFields(fields: Record<string, any>) {
    try {
      const result = await this.db
        .where(this.transform(fields))
        .from(this.table)
        .del();

      return result;
    } catch (err) {
      console.log(err);
      return {err};
    }
  }

  async create(data: Record<string, any>) {
    try {
      const result = await this.db.insert(this.transform(data)).into(this.table);

      return result;
    } catch (err) {
      console.log(err);
      return {err};
    }
  }

  async updateByFields(
    fields: Record<string, any>,
    data: Record<string, any>) {
    try {
      const result = await this.db
        .where(this.transform(fields))
        .from(this.table)
        .update(this.transform(data));

      return result;
    } catch (err) {
      console.log(err);
      return {err};
    }
  }
}
