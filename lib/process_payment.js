'use strict';

const stripe = require('stripe')('sk_test_qE6sgd9RoNPL7Beb97v8FrjR');

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
    console.log('transfering to chris@bigwednesday.io connected (supplier) account');

    return stripe.transfers.create({
      // subtract 2.5% fee
      amount: (checkout.basket.total * 100) * 0.975,
      currency: checkout.basket.currency,
      destination: 'acct_174DXODQpc34pcaT',
      source_transaction: charge.id
    });
  })
  .then(transfer => {
    console.log(transfer);
    return checkout;
  });
};
