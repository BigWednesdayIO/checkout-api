'use strict';

const _ = require('lodash');
const expect = require('chai').expect;
const sinon = require('sinon');
const CheckoutBuilder = require('./checkout_builder');
const dataset = require('../lib/dataset');
const datastoreModel = require('gcloud-datastore-model')(dataset);

const checkouts = require('../lib/checkouts');

describe('Checkouts', () => {
  let insertSpy;
  let keySpy;
  let sandbox;
  let checkout;

  beforeEach(function () {
    this.timeout(5000);
    sandbox = sinon.sandbox.create();
    insertSpy = sandbox.spy(datastoreModel.constructor.prototype, 'insert');
    keySpy = sandbox.spy(dataset, 'key');
    checkout = new CheckoutBuilder().build();
    return checkouts.process(checkout);
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('process', () => {
    it('persists order', () => {
      sinon.assert.calledThrice(insertSpy);

      const orderKey = keySpy.returnValues[0];
      expect(orderKey.kind).to.equal('Order');
      const expectedHeader = _.omit(checkout, 'basket');
      _.forOwn(_.omit(checkout.basket, 'order_forms'), (value, key) => {
        expectedHeader[`basket_${key}`] = value;
      });
      sinon.assert.calledWith(insertSpy, sinon.match(orderKey), sinon.match(expectedHeader));

      const orderFormKeys = keySpy.returnValues.slice(1);
      orderFormKeys.forEach((k, i) => {
        expect(k.kind).to.equal('OrderForm');
        sinon.assert.calledWith(insertSpy, sinon.match(k), sinon.match(checkout.basket.order_forms[i]));
      });
    });
  });
});
