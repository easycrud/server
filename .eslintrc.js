module.exports = {
  'extends': ['google'],
  'parserOptions': {
    'ecmaVersion': 12,
  },

  'env': {
    'browser': true,
    'es2021': true,
  },

  'rules': {
    'require-jsdoc': 'off',
    'semi': 'error',
    'indent': ['error', 2],
    'max-len': ['error', 120],
  },

  'ignorePatterns': ['index.d.ts'],
};
