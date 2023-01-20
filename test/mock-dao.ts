export default class MockDao {
  mockData: any[];

  constructor() {
    this.mockData = [
      {id: 1, username: 'Alice', email: 'alice@easycurd.org', updated_at: '2023-01-20 17:48'},
      {id: 2, username: 'Bob', email: 'bob@easycrud.org', updated_at: '2023-01-19 15:48'},
      {id: 3, username: 'Cindy', email: 'cindy@easycrud.org', updated_at: '2023-01-18 13:26'},
    ];
  }

  all() {
    return this.mockData;
  }

  paginate({page = 1, pageSize = 2}) {
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    return {
      data: this.mockData.slice(start, end),
      pagination: {
        total: this.mockData.length,
        perPage: pageSize,
        currentPage: page,
      },
    };
  }

  getByFields(fields: Record<string, any>) {
    const result = this.mockData.filter((item) => {
      return Object.keys(fields).every((key) => item[key] === fields[key]);
    });
    return result.length > 0 ? result : {err: {code: 404, msg: 'Not Found'}};
  }

  delByFields(fields: Record<string, any>) {
    const result = this.mockData.filter((item) => {
      return Object.keys(fields).every((key) => item[key] === fields[key]);
    });
    if (result.length > 0) {
      this.mockData = this.mockData.filter((item) => {
        return Object.keys(fields).every((key) => item[key] !== fields[key]);
      });
      return result;
    }
    return {err: {code: 404, msg: 'Not Found'}};
  }

  create(data: Record<string, any>) {
    console.log(data);
    data.id = this.mockData.length + 1;
    data.updated_at = '2023-01-20 17:48';
    this.mockData.push(data);
    return data;
  }

  updateByFields(fields: Record<string, any>, data: Record<string, any>) {
    const result = this.mockData.filter((item) => {
      return Object.keys(fields).every((key) => item[key] === fields[key]);
    });
    if (result.length > 0) {
      Object.assign(result[0], data);
      return result;
    }
    return {err: {code: 404, msg: 'Not Found'}};
  }
}

