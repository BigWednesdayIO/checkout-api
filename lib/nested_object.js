'use strict';

const _ = require('lodash');

exports.flatten = (entity, key) => {
  const flattened = {};

  _.forOwn(entity[key], (value, childKey) => {
    flattened[`${key}_${childKey}`] = value;
  });

  return _.assign(flattened, _.omit(entity, key));
};

exports.expand = (entity, prefix) => {
  const nestedKey = prefix.slice(0, prefix.length - 1);
  return _.transform(entity, (accum, value, key) => {
    if (key.startsWith(prefix)) {
      accum[nestedKey][key.replace(prefix, '')] = value;
    } else {
      accum[key] = value;
    }
    return accum;
  }, {[nestedKey]: {}});
};
