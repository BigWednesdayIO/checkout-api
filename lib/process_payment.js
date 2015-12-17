'use strict';

const _ = require('lodash');
const Decimal = require('decimal');

const testApiKey = 'sk_test_qE6sgd9RoNPL7Beb97v8FrjR';
const stripe = require('stripe')(testApiKey);

const stripeAccounts = [
  {supplier: 'Pub Taverns', account: 'acct_175DKgICbM92P8lC'},
  {supplier: 'Beer & Wine Co', account: 'acct_175DMQL5SwmmwufX'},
  {supplier: 'Walmart', account: 'acct_175DQiAnK2kjgMxg'},
  {supplier: 'Best Buy', account: 'acct_175DRgD99AoKNn4k'}
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
      const valueMinusFee = new Decimal(_.sum(orderForms, orderForm => orderForm.subtotal * 100)).mul(new Decimal(0.975)).toNumber();

      transfers.push({
        amount: Math.floor(valueMinusFee),
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
  }, err => {
    console.error('Payment transfer error ', err);
    throw err;
  });
};
