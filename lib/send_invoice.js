'use strict';

const _ = require('lodash');
const request = require('request-promise');

const apiKey = process.env.RECEIPTFUL_API_KEY;

if (!apiKey) {
  throw new Error('RECEIPTFUL_API_KEY env var is required');
}

module.exports = checkout => {
  const receiptRequest = {
    reference: checkout.id,
    currency: checkout.basket.currency,
    amount: checkout.basket.total,
    to: checkout.billing_address.email,
    from: 'orders@bigwednesday.io',
    date: checkout._metadata.created.toISOString(),
    items: _(checkout.basket.order_forms)
              .map(form => form.line_items)
              .flatten()
              .map(item => ({
                reference: item.product.id,
                description: item.product.name,
                quantity: item.quantity,
                amount: item.subtotal
              }))
              .value(),
    subtotals: checkout.basket.order_forms.map(form => ({description: form.supplier_id, amount: form.subtotal})),
    billing: {
      address: {
        firstName: checkout.billing_address.name,
        lastName: null,
        company: checkout.billing_address.company,
        addressLine1: checkout.billing_address.line_1,
        addressLine2: checkout.billing_address.line_2,
        city: checkout.billing_address.city,
        state: checkout.billing_address.region,
        postcode: checkout.billing_address.postcode,
        country: checkout.billing_address.country
      }
    },
    shipping: {
      firstName: checkout.delivery_address.name,
      lastName: null,
      company: checkout.delivery_address.company,
      addressLine1: checkout.delivery_address.line_1,
      addressLine2: checkout.delivery_address.line_2,
      city: checkout.delivery_address.city,
      state: checkout.delivery_address.region,
      postcode: checkout.delivery_address.postcode,
      country: checkout.delivery_address.country
    }
  };

  const options = {
    method: 'POST',
    uri: 'https://app.receiptful.com/api/v1/receipts',
    body: receiptRequest,
    headers: {
      'X-ApiKey': apiKey
    },
    json: true
  };

  return request(options)
    .then(() => {
      return checkout;
    }, err => {
      console.log(`Error sending invoice: ${JSON.stringify(err)}`);
    });
};
