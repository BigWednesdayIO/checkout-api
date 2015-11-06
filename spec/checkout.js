'use strict';

const _ = require('lodash');

const expect = require('chai').expect;
const server = require('../lib/server');

describe('Checkout', () => {
  it('returns a 200 response on success', done => {
    server((err, server) => {
      if (err) {
        return done(err);
      }

      server.inject({url: '/checkouts', method: 'POST'}, response => {
        expect(response.statusCode).to.equal(200);
        done();
      });
    });
  });

  it('returns a url for the created order', done => {
    server((err, server) => {
      if (err) {
        return done(err);
      }

      server.inject({url: '/checkouts', method: 'POST'}, response => {
        const orderLink = _.find(response.result.links, {rel: 'order'});

        expect(orderLink).to.exist;
        expect(orderLink.href).to.match(/^\/orders\/.*/);
        done();
      });
    });
  });
});
