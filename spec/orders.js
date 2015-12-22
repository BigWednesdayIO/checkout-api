'use strict';

const _ = require('lodash');
const expect = require('chai').expect;
const CheckoutBuilder = require('../test/checkout_builder');
const OrderFormBuilder = require('../test/order_form_builder');
const signToken = require('./sign_jwt');
const specRequest = require('./spec_request');

const adminToken = signToken({scope: ['admin']});

describe('/orders', function () {
  this.timeout(10000);

  const checkouts = [];
  const checkoutCustomerASupplierA = new CheckoutBuilder()
                                      .withCustomerId('customer-a')
                                      .withOrderForms([new OrderFormBuilder().withSupplierId('supplier-a').build()])
                                      .build();
  const checkoutCustomerASupplierB = new CheckoutBuilder()
                                      .withCustomerId('customer-a')
                                      .withOrderForms([new OrderFormBuilder().withSupplierId('supplier-b').build()])
                                      .build();
  const checkoutCustomerBSupplierA = new CheckoutBuilder()
                                      .withCustomerId('customer-b')
                                      .withOrderForms([new OrderFormBuilder().withSupplierId('supplier-a').build()])
                                      .build();

  before(() => {
    return specRequest({
      url: '/checkouts',
      method: 'POST',
      payload: checkoutCustomerASupplierA,
      headers: {authorization: signToken({scope: [`customer:${checkoutCustomerASupplierA.customer_id}`]})}
    })
    .then(response => {
      expect(response.statusCode).to.eql(201);
      checkouts.push(response.result);
      return specRequest({
        url: '/checkouts',
        method: 'POST',
        payload: checkoutCustomerASupplierB,
        headers: {authorization: signToken({scope: [`customer:${checkoutCustomerASupplierB.customer_id}`]})}
      });
    })
    .then(response => {
      expect(response.statusCode).to.eql(201);
      checkouts.push(response.result);
      return specRequest({
        url: '/checkouts',
        method: 'POST',
        payload: checkoutCustomerBSupplierA,
        headers: {authorization: signToken({scope: [`customer:${checkoutCustomerBSupplierA.customer_id}`]})}
      });
    })
    .then(response => {
      expect(response.statusCode).to.eql(201);
      checkouts.push(response.result);
    });
  });

  describe('get', () => {
    describe('admin scope', () => {
      it('returns all order resources', () => {
        return specRequest({
          url: '/orders',
          method: 'GET',
          headers: {authorization: adminToken}
        })
        .then(response => {
          expect(response.statusCode).to.equal(200);
          expect(response.result).to.eql(checkouts.map(_.partialRight(_.omit, 'links')));
        });
      });
    });
  });
});
