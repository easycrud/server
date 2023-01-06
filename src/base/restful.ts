import Server from './server';
import {TableOperate, TableSchema as TypeTableSchema} from '../types';
import {ResourceOperate, RESTfulOperateConfig} from './types';

export default class RESTful extends Server {
  response(data: any) {
    if (data.err) {
      const err = data.err;
      return {
        code: err.code || 500,
        msg: err.message || 'unknown error',
        data: null,
      };
    } else {
      return {
        code: 0,
        msg: 'success',
        data,
      };
    }
  }

  buildRowPermission(table: TypeTableSchema) {
    const rowOpts = table?.options?.rowPermission;
    if (rowOpts && !(this.getUserPermission && typeof this.getUserPermission === 'function')) {
      throw new Error(
        `table ${table.tableName} requires row auth check, but getUserPermission function is not defined.`);
    }
    const rowOptsColumn = rowOpts?.column ? (Array.isArray(rowOpts.column) ? rowOpts.column : [rowOpts.column]) : [];
    const permitCols = rowOptsColumn.map((col) => this.getColumnAlias(table, col));
    // permitCols && rowOpts?.operates?.includes(op) ? {[authCol]: permitValue} : {};
    const permitQuery = (op: TableOperate, permitValue: string | Record<string, any>) => {
      if (!(permitCols && rowOpts?.operates?.includes(op))) {
        return {};
      }
      if (typeof permitValue === 'string') {
        if (permitCols.length > 1) {
          throw new Error(
            `table ${table.tableName} requires multi-column values to check permissions, \
            but getUserPermission function returns a string. Please return an object instead.`);
        }
        return {[permitCols[0]]: permitValue};
      }
      const query: Record<string, any> = {};
      permitCols.forEach((col) => {
        query[col] = permitValue[col];
      });
      return query;
    };
    const addPermit = permitCols ?
      (res: any | { err: unknown }, permitValue: string | Record<string, any>) => {
        if (!(Array.isArray(res) || Array.isArray(res.data))) {
          return res;
        }
        const data = Array.isArray(res) ? res : res.data;
        for (const row of data) {
          if (typeof permitValue === 'string' && row[permitCols[0]] === permitValue) {
            row.permit = true;
          } else if (typeof permitValue === 'object') {
            row.permit = permitCols.every((col) => row[col] === permitValue[col]);
          } else {
            row.permit = false;
          }
        }
        return res;
      } :
      (res: any) => res;

    return {permitQuery, addPermit};
  }

  buildPkQuery(table: TypeTableSchema) {
    const pk = table.pk.map((col) => this.getColumnAlias(table, col));
    const pkQuery = (params: Record<string, any>) => {
      const query: Record<string, any> = {};
      pk.forEach((col) => {
        query[col] = params[col];
      });
      return query;
    };
    return pkQuery;
  }

  buildOperates(table: TypeTableSchema): Record<ResourceOperate, Partial<RESTfulOperateConfig>> {
    const {permitQuery, addPermit} = this.buildRowPermission(table);
    const pkQuery = this.buildPkQuery(table);
    return {
      all: {
        path: `all_${table.alias || table.tableName}`,
        method: 'get',
        handler: async ({dao, query}) => {
          const permitValue = await this.getUserPermission();
          let res = await dao.all(Object.assign(permitQuery('read', permitValue), query));
          res = addPermit(res, permitValue);
          return this.response(res);
        },
      },
      paginate: {
        method: 'get',
        handler: async ({dao, query}) => {
          const permitValue = await this.getUserPermission();
          let res = await dao.paginate(Object.assign(permitQuery('read', permitValue), query));
          res = addPermit(res, permitValue);
          return this.response(res);
        },
      },
      show: {
        method: 'get',
        handler: async ({dao, params}) => {
          const permitValue = await this.getUserPermission();
          const res = await dao.getByPk(pkQuery(params), permitQuery('read', permitValue));
          return this.response(res);
        },
      },
      store: {
        method: 'post',
        handler: async ({dao, body}) => {
          const res = await dao.create(body);
          return this.response(res);
        },
      },
      edit: {
        method: 'put',
        handler: async ({dao, params, body}) => {
          const permitValue = await this.getUserPermission();
          const res = await dao.updateByPk(pkQuery(params), permitQuery('read', permitValue), body);
          return this.response(res);
        },
      },
      destory: {
        method: 'delete',
        handler: async ({dao, params}) => {
          const permitValue = await this.getUserPermission();
          const res = await dao.delByPk(pkQuery(params), permitQuery('read', permitValue));
          return this.response(res);
        },
      },
    };
  }
}
