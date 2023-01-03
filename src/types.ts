import {
  TableOptions as BaseTableOptions,
  TableSchema as BaseTableSchema,
} from '@easycrud/toolkits/lib/table-schema/types';

export type AuthOperate = 'read' | 'create' | 'update' | 'delete';
export interface TableOptions extends BaseTableOptions {
  /**
   * The options for the authorization of the operation for a table.
   */
  rowAuth?: {
    /**
     * The name of the column which value will be used to check high risk permissions of a row.
     */
    column?: string;
    /**
     * Operations that require authorization.
     */
    operates?: AuthOperate[];
  }
}

export interface TableSchema extends BaseTableSchema {
  options?: TableOptions;
}

