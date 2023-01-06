import type {Config} from 'jest';

const config: Config = {
  verbose: true,
  testMatch: ['**/test/**/*.test.ts'],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
};

export default config;
