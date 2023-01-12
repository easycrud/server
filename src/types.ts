import {
  TableOptions as BaseTableOptions,
  TableSchema as BaseTableSchema,
} from '@easycrud/toolkits/lib/table-schema/types';

export type TableOperate = 'read' | 'create' | 'update' | 'delete';
export interface TableOptions extends BaseTableOptions {
  /**
   * The options for configuring row-level permissions.
   */
   rowPermission?: {
    /**
     * The name of the columns where values are used for permission check.
     */
    column: string | string[];
    /**
     * Operations that require permission check.
     */
    operates: TableOperate[];
    /**
     * The method of the permission check.
     */
    method?: 'equal' | 'include';
  }
}

export interface TableSchema extends BaseTableSchema {
  options?: TableOptions;
}
