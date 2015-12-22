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

  let checkouts;
  const checkoutCustomerASupplierA = new CheckoutBuilder()
                                      .withCustomerId('customer-a')
                                      .withOrderForms([new OrderFormBuilder().withSupplierId('supplier-a').build()])
                                      .build();
  const checkoutCustomerASuppliersAB = new CheckoutBuilder()
                                      .withCustomerId('customer-a')
                                      .withOrderForms([
                                        new OrderFormBuilder().withSupplierId('supplier-a').build(),
                                        new OrderFormBuilder().withSupplierId('supplier-b').build()
                                      ])
                                      .build();
  const checkoutCustomerBSupplierA = new CheckoutBuilder()
                                      .withCustomerId('customer-b')
                                      .withOrderForms([new OrderFormBuilder().withSupplierId('supplier-b').build()])
                                      .build();

  beforeEach(() => {
    checkouts = [];
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
        payload: checkoutCustomerASuppliersAB,
        headers: {authorization: signToken({scope: [`customer:${checkoutCustomerASuppliersAB.customer_id}`]})}
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

      it('returns http 403 without admin scope', () => {
        return specRequest({
          url: '/orders',
          method: 'GET',
          headers: {authorization: signToken({scope: ['customer:customer-a']})}
        })
        .then(response => {
          expect(response.statusCode).to.equal(403);
        });
      });
    });

    describe('orders for customer', () => {
      it('returns order resources for customer', () => {
        return specRequest({
          url: '/orders?customer_id=customer-a',
          method: 'GET',
          headers: {authorization: signToken({scope: ['customer:customer-a']})}
        })
        .then(response => {
          expect(response.statusCode).to.equal(200);
          expect(response.result).to.eql(_.filter(checkouts, {customer_id: 'customer-a'}).map(_.partialRight(_.omit, 'links')));
        });
      });

      it('returns 403 requesting customer orders without correct scope', () => {
        return specRequest({
          url: '/orders?customer_id=customer-b',
          method: 'GET',
          headers: {authorization: signToken({scope: ['customer:customer-a']})}
        })
        .then(response => {
          expect(response.statusCode).to.equal(403);
        });
      });
    });

    describe('orders for supplier', () => {
      const filterOrderFormsBySupplier = (checkout, supplierId) => {
        const supplierOrder = _.cloneDeep(checkout);
        supplierOrder.basket.order_forms = _.filter(supplierOrder.basket.order_forms, {supplier: supplierId});
        return supplierOrder;
      };

      it('returns order resources for supplier', () => {
        return specRequest({
          url: '/orders?supplier_id=supplier-a',
          method: 'GET',
          headers: {authorization: signToken({scope: ['supplier:supplier-a']})}
        })
        .then(response => {
          expect(response.statusCode).to.equal(200);
          const expected = [
            filterOrderFormsBySupplier(checkouts[0], 'supplier-a'),
            filterOrderFormsBySupplier(checkouts[1], 'supplier-a')
          ].map(_.partialRight(_.omit, 'links'));
          expect(response.result).to.eql(expected);
        });
      });

      it('returns 403 requesting supplier orders without correct scope', () => {
        return specRequest({
          url: '/orders?supplier_id=supplier-b',
          method: 'GET',
          headers: {authorization: signToken({scope: ['supplier:supplier-a']})}
        })
        .then(response => {
          expect(response.statusCode).to.equal(403);
        });
      });
    });
  });
});
