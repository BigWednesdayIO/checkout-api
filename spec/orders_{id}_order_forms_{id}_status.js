'use strict';

const _ = require('lodash');
const expect = require('chai').expect;
const CheckoutBuilder = require('../test/checkout_builder');
const OrderFormBuilder = require('../test/order_form_builder');
const signToken = require('./sign_jwt');
const specRequest = require('./spec_request');

const adminToken = signToken({scope: ['admin']});

describe('/orders/{orderId}/order_forms/{id}/status', function () {
  this.timeout(5000);

  let checkout;

  beforeEach(() => {
    const checkoutParams = new CheckoutBuilder()
      .withOrderForms([new OrderFormBuilder().build()])
      .build();
    return specRequest({
      url: '/checkouts',
      method: 'POST',
      payload: checkoutParams,
      headers: {authorization: signToken({scope: [`customer:${checkoutParams.customer_id}`]})}
    })
    .then(response => {
      checkout = response.result;
    });
  });

  describe('patch', () => {
    it('updates order form status', () => {
      return specRequest({
        url: `/orders/${checkout.id}/order_forms/${checkout.basket.order_forms[0].id}/status`,
        method: 'PATCH',
        payload: {status: 'dispatched'},
        headers: {authorization: adminToken}
      })
      .then(response => {
        expect(response.statusCode).to.equal(200);
        expect(_.omit(response.result, '_metadata'))
          .to.eql(Object.assign({status: 'dispatched'}, _.omit(checkout.basket.order_forms[0], '_metadata')));
      });
    });

    it('returns 404 for missing order', () => {
      return specRequest({
        url: `/orders/12345/order_forms/${checkout.basket.order_forms[0].id}/status`,
        method: 'PATCH',
        payload: {status: 'dispatched'},
        headers: {authorization: adminToken}
      })
      .then(response => {
        expect(response.statusCode).to.equal(404);
      });
    });

    it('returns 404 for missing order form', () => {
      return specRequest({
        url: `/orders/${checkout.id}/order_forms/98765/status`,
        method: 'PATCH',
        payload: {status: 'dispatched'},
        headers: {authorization: adminToken}
      })
      .then(response => {
        expect(response.statusCode).to.equal(404);
      });
    });

    describe('validation', () => {
      it('accepts "accepted"', () => {
        return specRequest({
          url: `/orders/${checkout.id}/order_forms/${checkout.basket.order_forms[0].id}/status`,
          method: 'PATCH',
          payload: {status: 'accepted'},
          headers: {authorization: adminToken}
        })
        .then(response => {
          expect(response.statusCode).to.equal(200);
        });
      });

      it('accepts "dispatched"', () => {
        return specRequest({
          url: `/orders/${checkout.id}/order_forms/${checkout.basket.order_forms[0].id}/status`,
          method: 'PATCH',
          payload: {status: 'dispatched'},
          headers: {authorization: adminToken}
        })
        .then(response => {
          expect(response.statusCode).to.equal(200);
        });
      });

      it('accepts "rejected"', () => {
        return specRequest({
          url: `/orders/${checkout.id}/order_forms/${checkout.basket.order_forms[0].id}/status`,
          method: 'PATCH',
          payload: {status: 'rejected'},
          headers: {authorization: adminToken}
        })
        .then(response => {
          expect(response.statusCode).to.equal(200);
        });
      });

      it('accepts "cancelled"', () => {
        return specRequest({
          url: `/orders/${checkout.id}/order_forms/${checkout.basket.order_forms[0].id}/status`,
          method: 'PATCH',
          payload: {status: 'cancelled'},
          headers: {authorization: adminToken}
        })
        .then(response => {
          expect(response.statusCode).to.equal(200);
        });
      });

      it('accepts "delivered"', () => {
        return specRequest({
          url: `/orders/${checkout.id}/order_forms/${checkout.basket.order_forms[0].id}/status`,
          method: 'PATCH',
          payload: {status: 'delivered'},
          headers: {authorization: adminToken}
        })
        .then(response => {
          expect(response.statusCode).to.equal(200);
        });
      });

      it('accepts "paid"', () => {
        return specRequest({
          url: `/orders/${checkout.id}/order_forms/${checkout.basket.order_forms[0].id}/status`,
          method: 'PATCH',
          payload: {status: 'paid'},
          headers: {authorization: adminToken}
        })
        .then(response => {
          expect(response.statusCode).to.equal(200);
        });
      });

      it('rejects unknown statuses', () => {
        return specRequest({
          url: `/orders/${checkout.id}/order_forms/${checkout.basket.order_forms[0].id}/status`,
          method: 'PATCH',
          payload: {status: 'foo'},
          headers: {authorization: adminToken}
        })
        .then(response => {
          expect(response.statusCode).to.equal(400);
        });
      });
    });
  });
});
