'use strict';

const sinon = require('sinon');
const CheckoutBuilder = require('./checkout_builder');
const dataset = require('../lib/dataset');
const datastoreModel = require('gcloud-datastore-model')(dataset);

const checkouts = require('../lib/checkouts');

describe('Checkouts', () => {
  let insertSpy;
  let keySpy;
  let sandbox;

  beforeEach(function () {
    this.timeout(5000);
    sandbox = sinon.sandbox.create();
    insertSpy = sandbox.spy(datastoreModel.constructor.prototype, 'insert');
    keySpy = sandbox.spy(dataset, 'key');
    return checkouts.process(new CheckoutBuilder().build());
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('process', () => {
    it('persists order', () => {
      sinon.assert.calledOnce(insertSpy);
      const expectedKey = keySpy.returnValues[0];
      sinon.assert.calledWith(insertSpy, sinon.match(expectedKey));
    });
  });
});
