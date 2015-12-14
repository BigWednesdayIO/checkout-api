'use strict';

const _ = require('lodash');

const expect = require('chai').expect;
const CheckoutBuilder = require('../test/checkout_builder');
const server = require('../lib/server');

const performCheckout = checkoutPayload => {
  return new Promise((resolve, reject) => {
    server((err, server) => {
      if (err) {
        return reject(err);
      }

      server.inject({url: '/checkouts', method: 'POST', payload: checkoutPayload}, response => {
        return resolve(response);
      });
    });
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

    it('returns the checkout location header', () => {
      expect(checkoutResponse.headers.location).to.equal(`/checkouts/${checkoutResponse.result.id}`);
    });

    it('returns a url for the created order', () => {
      const orderLink = _.find(checkoutResponse.result.links, {rel: 'order'});
      expect(orderLink).to.exist;
      expect(orderLink.href).to.match(/^\/orders\/.*/);
    });

    it('returns the checkout resource', () => {
      _.forOwn(checkout, (value, key) => {
        expect(checkoutResponse.result).to.have.property(key);
        expect(checkoutResponse.result[key]).to.deep.equal(value);
      });
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
  });

  describe('get', () => {
    it('returns the checkout resource', () => {
      expect(checkoutResponse.statusCode).to.equal(201);

      return new Promise(resolve => {
        checkoutResponse.request.server.inject({url: checkoutResponse.headers.location, method: 'GET'}, response => {
          return resolve(response);
        });
      })
      .then(response => {
        expect(response.statusCode).to.equal(200);

        _.forOwn(checkout, (value, key) => {
          expect(response.result).to.have.property(key);
          expect(response.result[key]).to.deep.equal(value);
        });
      });
    });

    it('returns a 404 for a non existant checkout', done => {
      server((err, server) => {
        if (err) {
          return done(err);
        }

        server.inject({url: '/checkouts/1234', method: 'GET'}, response => {
          expect(response.statusCode).to.equal(404);
          done();
        });
      });
    });
  });
});
