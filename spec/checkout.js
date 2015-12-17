'use strict';

const _ = require('lodash');
const traverse = require('traverse');

const expect = require('chai').expect;
const CheckoutBuilder = require('../test/checkout_builder');
const server = require('../lib/server');
const signToken = require('./sign_jwt');
const specRequest = require('./spec_request');

const performCheckout = (checkoutPayload, token) => {
  return specRequest({
    url: '/checkouts',
    method: 'POST',
    payload: checkoutPayload,
    headers: {authorization: token || signToken({scope: [`customer:${checkoutPayload.customer_id}`]})}
  });
};

const stripMetadata = obj => {
  const clone = _.cloneDeep(obj);
  delete clone.links;
  return traverse(clone).map(function (x) {
    if (this.key !== 'product') {
      delete x.id;
      delete x._metadata;
    }
  });
};

const adminToken = signToken({scope: ['admin']});

describe('/checkouts', function () {
  this.timeout(5000);

  let checkoutResponse;
  const checkout = new CheckoutBuilder().build();

  before(() => {
    return performCheckout(checkout)
      .then(response => {
        checkoutResponse = response;
      });
  });

  describe('post', () => {
    it('returns a 201 response on success', () => {
      expect(checkoutResponse.statusCode).to.equal(201);
    });

    it('returns the checkout location header', () => {
      expect(checkoutResponse.headers.location).to.equal(`/checkouts/${checkoutResponse.result.id}`);
    });

    it('returns a url for the created order', () => {
      const orderLink = _.find(checkoutResponse.result.links, {rel: 'order'});
      expect(orderLink).to.exist;
      expect(orderLink.href).to.match(/^\/orders\/.*/);
    });

    it('returns the checkout resource', () => {
      expect(stripMetadata(checkoutResponse.result)).to.eql(checkout);
    });

    it('returns payment errors', () => {
      const payload = new CheckoutBuilder().build();
      payload.payment.card_number = '1234567';

      return performCheckout(payload)
        .then(response => {
          expect(response.statusCode).to.equal(400);
          expect(response.result.message).to.equal('Your card number is incorrect.');
        });
    });

    it('returns HTTP 403 when creating a checkout for another customer', () => {
      return performCheckout(new CheckoutBuilder().withCustomerId('customer-1').build(), signToken({scope: ['customer-2']}))
        .then(response => {
          expect(response.statusCode).to.equal(403);
        });
    });

    describe('validation', () => {
      it('requires customer id', () => {
        return performCheckout(new CheckoutBuilder().withCustomerId(undefined).build())
          .then(response => {
            expect(response.statusCode).to.equal(400);
            expect(response.result.message).to.equal('child "customer_id" fails because ["customer_id" is required]');
          });
      });
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
          url: '/checkouts/1234',
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
