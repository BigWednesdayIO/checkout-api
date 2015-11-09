'use strict';

const _ = require('lodash');

const testApiKey = 'sk_test_qE6sgd9RoNPL7Beb97v8FrjR';
const stripe = require('stripe')(testApiKey);

const stripeAccounts = [
  {supplier: 'Pub Taverns', account: 'acct_175DKgICbM92P8lC'},
  {supplier: 'Beer & Wine Co', account: 'acct_175DMQL5SwmmwufX'}
];

module.exports = checkout => {
  console.log('charging to alex@bigwednesday.io account');

  return stripe.charges.create({
    amount: checkout.basket.total * 100,
    currency: checkout.basket.currency,
    source: {
      exp_month: checkout.payment.expiry_month,
      exp_year: checkout.payment.expiry_year,
      number: checkout.payment.card_number,
      object: 'card',
      cvc: checkout.payment.csc,
      name: checkout.billing_address.name,
      address_line_1: checkout.billing_address.line_1,
      address_line_2: checkout.billing_address.line_2,
      address_city: checkout.billing_address.city,
      address_state: checkout.billing_address.region,
      address_zip: checkout.billing_address.postcode,
      address_country: checkout.billing_address.country
    }
  })
  .then(charge => {
    console.log(charge);
    console.log('transfering to supplier accounts');

    const transfers = [];

    const supplierOrderForms = _.groupBy(checkout.basket.order_forms, 'supplier');

    _.forOwn(supplierOrderForms, (orderForms, key) => {
      const valueMinusFee = _.sum(orderForms, 'subtotal') * 100 * 0.975;

      transfers.push({
        amount: valueMinusFee,
        currency: checkout.basket.currency,
        destination: _.find(stripeAccounts, {supplier: key}).account,
        source_transaction: charge.id
      });
    });

    return Promise.all(transfers.map(transfer => stripe.transfers.create(transfer)));
  })
  .then(transfers => {
    console.log(transfers);
    return checkout;
  });
};
