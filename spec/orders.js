'use strict';

// const _ = require('lodash');
const expect = require('chai').expect;
const CheckoutBuilder = require('../test/checkout_builder');
const server = require('../lib/server');
const signToken = require('./sign_jwt');
const specRequest = require('./spec_request');
const stripMetadata = require('./strip_metadata');

const adminToken = signToken({scope: ['admin']});

describe('/orders', function () {
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
    it('returns the checkout resource', () => {
      expect(checkoutResponse.statusCode).to.equal(201);

      return new Promise(resolve => {
        checkoutResponse.request.server.inject({
          url: checkoutResponse.headers.location,
          method: 'GET',
          headers: {authorization: adminToken}
        }, response => {
          return resolve(response);
        });
      })
      .then(response => {
        expect(response.statusCode).to.equal(200);
        expect(stripMetadata(response.result)).to.eql(checkout);
      });
    });

    it('returns a 404 for a non-existant checkout', done => {
      server((err, server) => {
        if (err) {
          return done(err);
        }

        server.inject({
          url: '/orders/1234',
          method: 'GET',
          headers: {authorization: adminToken}
        }, response => {
          expect(response.statusCode).to.equal(404);
          done();
        });
      });
    });
  });
});
