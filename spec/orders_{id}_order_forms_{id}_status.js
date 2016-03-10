'use strict';

const _ = require('lodash');
const expect = require('chai').expect;
const CheckoutBuilder = require('../test/checkout_builder');
const OrderFormBuilder = require('../test/order_form_builder');
const signToken = require('./sign_jwt');
const specRequest = require('./spec_request');

const customerAToken = signToken({scope: ['customer:customer-a']});

describe('/orders/{orderId}/order_forms/{id}/status', () => {
  let checkout;

  beforeEach(() => {
    const checkoutParams = new CheckoutBuilder()
      .withCustomerId('customer-a')
      .withOrderForms([new OrderFormBuilder().build()])
      .build();

    return specRequest({
      url: '/checkouts',
      method: 'POST',
      payload: checkoutParams,
      headers: {authorization: customerAToken}
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
        headers: {authorization: customerAToken}
      })
      .then(response => {
        expect(response.statusCode).to.equal(200);
        expect(_.omit(response.result, '_metadata'))
          .to.eql(_.defaults({status: 'dispatched'}, _.omit(checkout.basket.order_forms[0], '_metadata')));
      });
    });

    it('returns http 404 for a non-existant order', () => {
      return specRequest({
        url: `/orders/12345/order_forms/${checkout.basket.order_forms[0].id}/status`,
        method: 'PATCH',
        payload: {status: 'dispatched'},
        headers: {authorization: customerAToken}
      })
      .then(response => {
        expect(response.statusCode).to.equal(404);
      });
    });

    it('returns http 403 when requesting another customer\'s order', () => {
      return specRequest({
        url: `/orders/${checkout.id}/order_forms/${checkout.basket.order_forms[0].id}/status`,
        method: 'PATCH',
        payload: {status: 'dispatched'},
        headers: {authorization: signToken({scope: ['customer:customer-b']})}
      })
      .then(response => {
        expect(response.statusCode).to.equal(403);
      });
    });

    it('returns 404 for non-existant order form', () => {
      return specRequest({
        url: `/orders/${checkout.id}/order_forms/98765/status`,
        method: 'PATCH',
        payload: {status: 'dispatched'},
        headers: {authorization: customerAToken}
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
          headers: {authorization: customerAToken}
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
          headers: {authorization: customerAToken}
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
          headers: {authorization: customerAToken}
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
          headers: {authorization: customerAToken}
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
          headers: {authorization: customerAToken}
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
          headers: {authorization: customerAToken}
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
          headers: {authorization: customerAToken}
        })
        .then(response => {
          expect(response.statusCode).to.equal(400);
        });
      });
    });
  });
});
