'use strict';

const {Parser} = require('@easycrud/toolkits');

module.exports = function(opts) {
  opts = opts || {};
  const {path} = opts;
  let {tables} =opts;
  if (path) {
    const parser = new Parser();
    parser.parse(path);
    tables = parser.tables;
  }
};
