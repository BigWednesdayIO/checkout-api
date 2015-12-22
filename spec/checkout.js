'use strict';

const _ = require('lodash');
const expect = require('chai').expect;
const CheckoutBuilder = require('../test/checkout_builder');
const signToken = require('./sign_jwt');
const specRequest = require('./spec_request');
const stripMetadata = require('./strip_metadata');

const performCheckout = (checkoutPayload, token) => {
  return specRequest({
    url: '/checkouts',
    method: 'POST',
    payload: checkoutPayload,
    headers: {authorization: token || signToken({scope: [`customer:${checkoutPayload.customer_id}`]})}
  });
};

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

    it('returns the order location header', () => {
      expect(checkoutResponse.headers.location).to.equal(`/orders/${checkoutResponse.result.id}`);
    });

    it('returns a url for the created order', () => {
      const orderLink = _.find(checkoutResponse.result.links, {rel: 'order'});
      expect(orderLink).to.exist;
      expect(orderLink.href).to.match(/^\/orders\/.*/);
    });

    it('returns the checkout resource', () => {
      const expected = _.cloneDeep(checkout);
      expected.basket.order_forms.forEach(of => {
        of.status = 'accepted';
      });
      expect(stripMetadata(checkoutResponse.result)).to.eql(expected);
    });

    it('returns http 403 when creating a checkout for another customer', () => {
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

      it('requires delivery address', () => {
        return performCheckout(new CheckoutBuilder().withDeliveryAddress(undefined).build())
          .then(response => {
            expect(response.statusCode).to.equal(400);
            expect(response.result.message).to.equal('child "delivery_address" fails because ["delivery_address" is required]');
          });
      });

      it('requires billing address', () => {
        return performCheckout(new CheckoutBuilder().withBillingAddress(undefined).build())
          .then(response => {
            expect(response.statusCode).to.equal(400);
            expect(response.result.message).to.equal('child "billing_address" fails because ["billing_address" is required]');
          });
      });

      it('requires basket', () => {
        return performCheckout(new CheckoutBuilder().withBasket(undefined).build())
          .then(response => {
            expect(response.statusCode).to.equal(400);
            expect(response.result.message).to.equal('child "basket" fails because ["basket" is required]');
          });
      });
    });
  });
});
