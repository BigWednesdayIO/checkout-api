'use strict';

const expect = require('chai').expect;
const CheckoutBuilder = require('../test/checkout_builder');
const signToken = require('./sign_jwt');
const specRequest = require('./spec_request');
const stripMetadata = require('./strip_metadata');

const adminToken = signToken({scope: ['admin']});

describe('/orders/{id}', function () {
  this.timeout(5000);

  let checkoutResponse;
  const checkout = new CheckoutBuilder().build();

  before(() => {
    return specRequest({
      url: '/checkouts',
      method: 'POST',
      payload: checkout,
      headers: {authorization: signToken({scope: [`customer:${checkout.customer_id}`]})}
    })
    .then(response => {
      checkoutResponse = response;
    });
  });

  describe('get', () => {
    it('returns the order resource', () => {
      return specRequest({
        url: checkoutResponse.headers.location,
        method: 'GET',
        headers: {authorization: adminToken}
      })
      .then(response => {
        expect(response.statusCode).to.equal(200);
        expect(stripMetadata(response.result)).to.eql(checkout);
      });
    });

    it('returns http 404 for a non-existant order when admin', () => {
      return specRequest({
        url: '/orders/1234',
        method: 'GET',
        headers: {authorization: adminToken}
      })
      .then(response => {
        expect(response.statusCode).to.equal(404);
      });
    });

    it('returns http 403 for a non-existant order', () => {
      return specRequest({
        url: '/orders/1234',
        method: 'GET',
        headers: {authorization: signToken({scope: ['customer:9876']})}
      })
      .then(response => {
        expect(response.statusCode).to.equal(403);
      });
    });

    it('returns http 403 when requesting another customer\'s order', () => {
      return specRequest({
        url: checkoutResponse.headers.location,
        method: 'GET',
        headers: {authorization: signToken({scope: ['customer:9876']})}
      })
      .then(response => {
        expect(response.statusCode).to.equal(403);
      });
    });
  });
});
