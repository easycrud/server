import {jest, describe, it, beforeAll, afterAll, expect} from '@jest/globals';
import koaStart from './koa-server';
import request from 'supertest';
import MockDao from './mock-dao';
const mockData = new MockDao();

jest.mock('knex');
const querybuilder = {
  where: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  toSQL: jest.fn().mockReturnThis(),
  toNative: jest.fn(),
};
jest.fn().mockReturnValue(querybuilder);

jest.mock('../src/dao', () => {
  return jest.fn().mockImplementation(() => mockData);
});

describe('Koa', () => {
  let server: any;
  beforeAll(async () => {
    server = await koaStart();
  });
  afterAll(() => {
    jest.resetAllMocks();
  });
  it('all', async () => {
    const res = await request(server).get('/all_users');
    expect(res.status).toEqual(200);
    expect(res.body.data).toEqual([
      {id: 1, username: 'Alice', email: 'alice@easycurd.org', updated_at: '2023-01-20 17:48'},
      {id: 2, username: 'Bob', email: 'bob@easycrud.org', updated_at: '2023-01-19 15:48'},
      {id: 3, username: 'Cindy', email: 'cindy@easycrud.org', updated_at: '2023-01-18 13:26'},
    ]);
  });
  it('paginate', async () => {
    const res = await request(server).get('/users');
    expect(res.status).toEqual(200);
    expect(res.body.data).toEqual({
      data: [
        {id: 1, username: 'Alice', email: 'alice@easycurd.org', updated_at: '2023-01-20 17:48'},
        {id: 2, username: 'Bob', email: 'bob@easycrud.org', updated_at: '2023-01-19 15:48'},
      ],
      pagination: {
        currentPage: 1,
        perPage: 2,
        total: 3,
      },
    });
  });
  it('show', async () => {
    const res = await request(server).get('/users/1');
    expect(res.status).toEqual(200);
    expect(res.body.data).toEqual([
      {id: 1, username: 'Alice', email: 'alice@easycurd.org', updated_at: '2023-01-20 17:48'},
    ]);
  });
  it('store', async () => {
    const res = await request(server).post('/users').send({
      data: {
        name: 'Diana', email: 'diana@easycurd.org',
      },
    });
    expect(res.status).toEqual(200);
    expect(mockData.mockData.length).toEqual(4);
  });
  it('edit', async () => {
    const res = await request(server).put('/users/1').send({
      data: {
        username: 'Alice Edited',
      },
    });
    expect(res.status).toEqual(200);
    expect(mockData.mockData[0].username).toEqual('Alice Edited');
  });
  it('destory', async () => {
    const res = await request(server).delete('/users/1');
    expect(res.status).toEqual(200);
    expect(mockData.mockData.length).toEqual(3);
    expect(mockData.mockData[0].username).toEqual('Bob');
  });
  it('custom', async () => {
    const res = await request(server).get('/custom');
    expect(res.status).toEqual(200);
    console.log(res.body);
    expect(res.body.data).toEqual('custom test');
  });
});
