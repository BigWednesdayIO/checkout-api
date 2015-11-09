'use strict';

module.exports = checkout => {
  checkout.created_dt = new Date();
  return Promise.resolve(checkout);
};
