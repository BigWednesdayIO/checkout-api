'use strict';

const _ = require('lodash');
const expect = require('chai').expect;
const sinon = require('sinon');
const CheckoutBuilder = require('./checkout_builder');
const dataset = require('../lib/dataset');

const checkouts = require('../lib/checkouts');

describe('Checkouts', () => {
  let insertSpy;
  let keySpy;
  let sandbox;
  let checkout;

  beforeEach(function () {
    this.timeout(5000);
    sandbox = sinon.sandbox.create();
    insertSpy = sandbox.stub(dataset.constructor.super_.prototype, 'insert', _.noop);
    keySpy = sandbox.spy(dataset, 'key');
    checkout = new CheckoutBuilder().build();
    return checkouts.process(checkout);
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('process', () => {
    it('persists order', () => {
      sinon.assert.calledOnce(insertSpy);

      const orderKey = keySpy.returnValues[0];
      expect(orderKey.kind).to.equal('Order');

      const expectedOrder = _.omit(checkout, 'basket');
      _.forOwn(_.omit(checkout.basket, 'order_forms'), (value, key) => {
        expectedOrder[`basket_${key}`] = value;
      });

      const orderFormKeys = keySpy.returnValues.slice(1);
      orderFormKeys.forEach(k => {
        expect(k.kind).to.equal('OrderForm');
        expect(k.path[1]).to.equal(_.last(orderKey.path));
      });

      sinon.assert.calledWith(insertSpy, sinon.match([
        sinon.match({key: orderKey, data: expectedOrder}),
        sinon.match({key: orderFormKeys[0], data: checkout.basket.order_forms[0]}),
        sinon.match({key: orderFormKeys[1], data: checkout.basket.order_forms[1]})
      ]));
    });
  });
});
