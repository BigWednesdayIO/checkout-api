'use strict';

const _ = require('lodash');
const dataset = require('../lib/dataset');

module.exports.deleteTestData = kind => {
  const query = dataset.createQuery(kind).select('__key__');

  return new Promise((resolve, reject) => {
    dataset.runQuery(query, (err, res) => {
      if (err) {
        console.error(err);
        console.log(`Error getting keys to delete ${kind} data`);

        reject(err);
      }

      const keys = _.map(res, 'key');
      dataset.delete(keys, err => {
        if (err) {
          console.error(err);
          console.log(`Error deleting ${kind} data`);

          reject(err);
        }

        resolve();
      });
    });
  });
};

after(() => {
  return Promise.all([
    module.exports.deleteTestData('Order'),
    module.exports.deleteTestData('OrderForm')
  ]);
});
