'use strict';

const _ = require('lodash');

const expect = require('chai').expect;
const server = require('../lib/server');

const checkout = {
  line_items: [
    {product_id: 'a', quantity: 1},
    {product_id: 'b', quantity: 4},
    {product_id: 'c', quantity: 1}
  ]
};

const performCheckout = () => {
  return new Promise((resolve, reject) => {
    server((err, server) => {
      if (err) {
        return reject(err);
      }

      server.inject({url: '/checkouts', method: 'POST', payload: checkout}, response => {
        return resolve(response);
      });
    });
  });
};

describe('Checkout', () => {
  it('returns a 201 response on success', () => {
    return performCheckout()
      .then(response => {
        expect(response.statusCode).to.equal(201);
      });
  });

  it('returns the checkout location header', () => {
    return performCheckout()
      .then(response => {
        expect(response.headers.location).to.equal(`/checkouts/${response.result.id}`);
      });
  });

  it('returns a url for the created order', () => {
    return performCheckout()
      .then(response => {
        const orderLink = _.find(response.result.links, {rel: 'order'});

        expect(orderLink).to.exist;
        expect(orderLink.href).to.match(/^\/orders\/.*/);
      });
  });

  it('returns the checkout resource', () => {
    return performCheckout()
      .then(response => {
        _.forOwn(checkout, (value, key) => {
          expect(response.result).to.have.property(key);
          expect(response.result[key]).to.deep.equal(value);
        });
      });
  });
});
