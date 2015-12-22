'use strict';

const joi = require('joi');

const schema = joi.object({
  customer_id: joi.string().required().description('Customer id'),
  delivery_address: joi.object().unknown(true).required().description('Delivery address'),
  billing_address: joi.object().unknown(true).required().description('Billing address'),
  basket: joi.object().unknown(true).required().description('Basket')
})
.unknown(true)
.meta({className: 'Checkout'});

module.exports = schema;
