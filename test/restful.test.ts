import {jest, describe, it, beforeAll, afterAll, expect} from '@jest/globals';
import koaStart from './koa-server';
import request from 'supertest';

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
  return jest.fn().mockImplementation(() => {
    return {
      all: jest.fn().mockReturnValue([]),
      paginate: jest.fn().mockReturnValue({
        data: [],
        paginate: {},
      }),
      getByFields: jest.fn().mockReturnValue({}),
      delByFields: jest.fn().mockReturnValue({}),
      create: jest.fn().mockReturnValue({}),
      updateByFields: jest.fn().mockReturnValue({}),
    };
  });
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
    expect(res.body.data).toEqual([]);
  });
  it('paginate', async () => {
    const res = await request(server).get('/users');
    expect(res.status).toEqual(200);
    expect(res.body.data).toEqual({data: [], paginate: {}});
  });
  it('show', async () => {
    const res = await request(server).get('/users/1');
    expect(res.status).toEqual(200);
    expect(res.body.data).toEqual({});
  });
  it('store', async () => {
    const res = await request(server).post('/users').send({name: 'test'});
    expect(res.status).toEqual(200);
  });
  it('edit', async () => {
    const res = await request(server).put('/users/1').send({name: 'test'});
    expect(res.status).toEqual(200);
  });
  it('destory', async () => {
    const res = await request(server).delete('/users/1');
    expect(res.status).toEqual(200);
  });
  it('custom', async () => {
    const res = await request(server).get('/custom');
    expect(res.status).toEqual(200);
    console.log(res.body);
    expect(res.body.data).toEqual('custom test');
  });
});
