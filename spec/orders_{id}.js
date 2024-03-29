'use strict';

const _ = require('lodash');
const expect = require('chai').expect;
const CheckoutBuilder = require('../test/checkout_builder');
const signToken = require('./sign_jwt');
const specRequest = require('./spec_request');
const stripMetadata = require('./strip_metadata');
const mockSuppliers = require('../test/mock_suppliers');

const adminToken = signToken({scope: ['admin']});

describe('/orders/{id}', () => {
  let checkoutResponse;
  const checkout = new CheckoutBuilder().build();

  beforeEach(() => {
    mockSuppliers.begin();
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

  afterEach(() => {
    mockSuppliers.end();
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
        const expected = _.cloneDeep(checkout);
        expected.basket.order_forms.forEach(of => {
          of.status = 'accepted';
        });
        expect(stripMetadata(response.result)).to.eql(expected);
      });
    });

    it('returns http 404 for a non-existant', () => {
      return specRequest({
        url: '/orders/1234',
        method: 'GET',
        headers: {authorization: adminToken}
      })
      .then(response => {
        expect(response.statusCode).to.equal(404);
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
