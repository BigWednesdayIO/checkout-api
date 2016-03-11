'use strict';

[
  'SUPPLIERS_API_SVC_SERVICE_HOST',
  'SUPPLIERS_API_SVC_SERVICE_PORT',
  'CUSTOMERS_API_SVC_SERVICE_HOST',
  'CUSTOMERS_API_SVC_SERVICE_PORT'
].forEach(name => {
  if (!process.env[name]) {
    throw new Error(`Environment variable ${name} is required`);
  }
});

module.exports.suppliers = (process.env.SUPPLIERS_API_URI) ? process.env.SUPPLIERS_API_URI : `http://${process.env.SUPPLIERS_API_SVC_SERVICE_HOST}:${process.env.SUPPLIERS_API_SVC_SERVICE_PORT}`;
module.exports.customers = (process.env.CUSTOMERS_API_URI) ? process.env.CUSTOMERS_API_URI : `http://${process.env.CUSTOMERS_API_SVC_SERVICE_HOST}:${process.env.CUSTOMERS_API_SVC_SERVICE_PORT}`;