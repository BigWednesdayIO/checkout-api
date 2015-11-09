'use strict';

const _ = require('lodash');

const expect = require('chai').expect;
const server = require('../lib/server');

const checkout = {
  delivery_address: {
    name: 'Full Name',
    company: 'A Company',
    line_1: '234 High Street',
    line_2: null,
    line_3: null,
    city: 'London',
    region: 'London',
    postcode: 'SW1 1AB',
    country: 'GB'
  },
  billing_address: {
    name: 'Full Name',
    email: 'test_customer@bigwednesday.io',
    company: 'A Company',
    line_1: '234 High Street',
    line_2: null,
    line_3: null,
    city: 'London',
    region: 'London',
    postcode: 'SW1 1AB',
    country: 'GB'
  },
  payment: {
    card_number: '4242424242424242',
    card_type: 'VISA',
    csc: '123',
    expiry_month: 8,
    expiry_year: 2016
  },
  basket: {
    id: 'WEB123456',
    currency: 'GBP',
    subtotal: 130.00,
    total: 130.00,
    line_item_count: 1,
    order_forms: [
      {
        supplier: 'Pub Taverns',
        line_items: [
          {
            product: {
              id: 'ABC123',
              url: 'http://www.example.com/product?=ABC123',
              name: 'ABC Trainers',
              price: 50.00,
              was_price: null
            },
            quantity: 2,
            subtotal: 100.00
          }
        ],
        line_item_count: 1,
        subtotal: 100.00,
        delivery_method: 'Standard'
      },
      {
        supplier: 'Beer & Wine Co',
        line_items: [
          {
            product: {
              id: 'ABC123',
              url: 'http://www.example.com/product?=ABC123',
              name: 'ABC Trainers',
              price: 30.00,
              was_price: 40.00
            },
            quantity: 1,
            subtotal: 30.00
          }
        ],
        line_item_count: 1,
        subtotal: 30.00,
        delivery_method: 'Standard'
      }
    ]
  }
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

describe('/checkouts', function () {
  this.timeout(5000);

  let checkoutResponse;

  before(() => {
    return performCheckout()
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
