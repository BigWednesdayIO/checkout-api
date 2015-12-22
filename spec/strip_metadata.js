'use strict';

const _ = require('lodash');
const traverse = require('traverse');

module.exports = obj => {
  const clone = _.cloneDeep(obj);
  delete clone.links;
  return traverse(clone).map(function (x) {
    if (this.key !== 'product') {
      delete x.id;
      delete x._metadata;
      delete x.links;
    }
  });
};
