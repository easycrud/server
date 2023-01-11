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
    const permissionCols = rowOptsColumn.map((col) => this.getColumnAlias(table, col));

    /*
     * permissionQuery
     * Build the query object to check the permission.
     * It is used for where clause in sql query while executing read, update and delete operations.
     */
    const permissionQuery = (op: TableOperate, permissionValue: string | Record<string, any>) => {
      if (!(permissionCols && rowOpts?.operates?.includes(op))) {
        return {};
      }
      if (typeof permissionValue === 'string') {
        if (permissionCols.length > 1) {
          throw new Error(
            `table ${table.tableName} requires multi-column values to check permissions, \
            but getUserPermission function returns a string. Please return an object instead.`);
        }
        return {[permissionCols[0]]: permissionValue};
      }
      const query: Record<string, any> = {};
      permissionCols.forEach((col) => {
        query[col] = permissionValue[col];
      });
      return query;
    };

    /*
     * appendPermission
     * Append permission information to the response data.
     * The information is helpful for frontend to decide whether to show the update and delete buttons.
     */
    const appendPermission = permissionCols ?
      (res: any | { err: unknown }, permissionValue: string | Record<string, any>) => {
        if (!(Array.isArray(res) || Array.isArray(res.data))) {
          return res;
        }
        const data = Array.isArray(res) ? res : res.data;
        for (const row of data) {
          row.forbid = {
            update: false,
            delete: false,
          };
          if ((typeof permissionValue === 'string' && row[permissionCols[0]] !== permissionValue) ||
            typeof permissionValue === 'object' && permissionCols.some((col) => row[col] !== permissionValue[col])) {
            if (rowOpts?.operates?.includes('update')) {
              row.forbid.update = true;
            }
            if (rowOpts?.operates?.includes('delete')) {
              row.forbid.delete = true;
            }
          }
        }
        return res;
      } :
      (res: any) => res;

    return {permissionQuery, appendPermission};
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
    const {permissionQuery, appendPermission} = this.buildRowPermission(table);
    const pkQuery = this.buildPkQuery(table);
    return {
      all: {
        path: `all_${table.alias || table.tableName}`,
        method: 'get',
        handler: async ({dao, query, meta}) => {
          const permissionValue = await this.getUserPermission(meta);
          let res = await dao.all(Object.assign(permissionQuery('read', permissionValue), query));
          res = appendPermission(res, permissionValue);
          return this.response(res);
        },
      },
      paginate: {
        method: 'get',
        handler: async ({dao, query, meta}) => {
          const permissionValue = await this.getUserPermission(meta);
          let res = await dao.paginate(Object.assign(permissionQuery('read', permissionValue), query));
          res = appendPermission(res, permissionValue);
          return this.response(res);
        },
      },
      show: {
        method: 'get',
        handler: async ({dao, params, meta}) => {
          const permissionValue = await this.getUserPermission(meta);
          const res = await dao.getByPk(pkQuery(params), permissionQuery('read', permissionValue));
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
        handler: async ({dao, params, body, meta}) => {
          const permissionValue = await this.getUserPermission(meta);
          const res = await dao.updateByPk(pkQuery(params), permissionQuery('update', permissionValue), body);
          return this.response(res);
        },
      },
      destory: {
        method: 'delete',
        handler: async ({dao, params, meta}) => {
          const permissionValue = await this.getUserPermission(meta);
          const res = await dao.delByPk(pkQuery(params), permissionQuery('delete', permissionValue));
          return this.response(res);
        },
      },
    };
  }
}
