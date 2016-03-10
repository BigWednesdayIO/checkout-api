'use strict';

module.exports.suppliers = `http://${process.env.SUPPLIERS_API_SVC_SERVICE_HOST}:${process.env.SUPPLIERS_API_SVC_SERVICE_PORT}`;
module.exports.customers = `http://${process.env.CUSTOMERS_API_SVC_SERVICE_HOST}:${process.env.CUSTOMERS_API_SVC_SERVICE_PORT}`;
