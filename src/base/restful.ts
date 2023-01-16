import Server from './server';
import {TableOperate, TableSchema as TypeTableSchema} from '../types';
import {ResourceOperate, RESTfulOperateConfig} from './types';
import Dao from '../dao';

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

    const checkPermission = (row: Record<string, any>, permissionValue: string | Record<string, any>) => {
      const method = (a: string, b: string) => rowOpts?.method === 'include' ? a.includes(b) : a === b;
      if (typeof permissionValue === 'string') {
        return method(row[permissionCols[0]], permissionValue);
      }
      if (typeof permissionValue === 'object') {
        return permissionCols.every((col) => method(row[col], permissionValue[col]));
      }
      return true;
    };

    /*
     * getByPkWithPermission
     * Check if data exists and the user has permission to access the data.
     * It is used in show, edit and destroy.
     */
    const getByPkWithPermission = async (dao: Dao, pk: Record<string, any>,
      op: TableOperate, permissionValue: string | Record<string, any>) => {
      const res = await dao.getByFields(pk);
      if (!(permissionCols && rowOpts?.operates?.includes(op)) || res.err) {
        return res;
      }
      if (!checkPermission(res, permissionValue)) {
        return {err: {code: 403, message: 'permission denied'}};
      }
      return res;
    };

    /*
     * processDataByPermission
     * Filter the data by permission. Append permission information to the response data.
     * The information is helpful for frontend to decide whether to show the update and delete buttons.
     */
    const processDataByPermission = permissionCols && rowOpts?.operates?.length ?
      (res: any | { err: unknown }, permissionValue: string | Record<string, any>) => {
        if (!(Array.isArray(res) || Array.isArray(res.data))) {
          return res;
        }
        const data: Record<string, any>[] = Array.isArray(res) ? res : res.data;
        const operates = rowOpts.operates;
        let result = data;
        if (operates.includes('read')) {
          result = result.filter((row) => checkPermission(row, permissionValue));
        }
        result.forEach((row, index) => {
          row.forbid = {
            update: false,
            delete: false,
          };
          if (!checkPermission(row, permissionValue)) {
            if (operates.includes('update')) {
              result[index].forbid.update = true;
            }
            if (operates.includes('delete')) {
              result[index].forbid.delete = true;
            }
          }
        });
        return res;
      } :
      (res: any) => res;

    return {getByPkWithPermission, processDataByPermission};
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
    const {getByPkWithPermission, processDataByPermission} = this.buildRowPermission(table);
    const pkQuery = this.buildPkQuery(table);
    return {
      all: {
        path: `all_${table.alias || table.tableName}`,
        method: 'get',
        handler: async ({dao, query, meta}) => {
          const permissionValue = await this.getUserPermission(meta);
          let res = await dao.all(query);
          res = processDataByPermission(res, permissionValue);
          return this.response(res);
        },
      },
      paginate: {
        method: 'get',
        handler: async ({dao, query, meta}) => {
          const permissionValue = await this.getUserPermission(meta);
          let res = await dao.paginate(query);
          res = processDataByPermission(res, permissionValue);
          return this.response(res);
        },
      },
      show: {
        method: 'get',
        handler: async ({dao, params, meta}) => {
          const permissionValue = await this.getUserPermission(meta);
          const res = await getByPkWithPermission(dao, pkQuery(params), 'read', permissionValue);
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
          const pk = pkQuery(params);
          let res = await getByPkWithPermission(dao, pk, 'update', permissionValue);
          if (res.err) {
            return this.response(res);
          }
          res = await dao.updateByFields(pk, body);
          return this.response(res);
        },
      },
      destory: {
        method: 'delete',
        handler: async ({dao, params, meta}) => {
          const permissionValue = await this.getUserPermission(meta);
          const pk = pkQuery(params);
          let res = await getByPkWithPermission(dao, pk, 'update', permissionValue);
          if (res.err) {
            return this.response(res);
          }
          res = await dao.delByFields(pk);
          return this.response(res);
        },
      },
    };
  }
}
