'use strict';

const url = require('url');
const nock = require('nock');
const uris = require('../lib/uris');

const suppliersData = [{
  id: '123456',
  email: 'supplier-123456@bigwednesday.io',
  orders_email: process.env.TESTING_EMAIL
}, {
  id: '654321',
  email: 'supplier-654321@bigwednesday.io',
  orders_email: process.env.TESTING_EMAIL,
  orders_textsms: process.env.TESTING_MOBILE
}, {
  id: 'supplier-a',
  email: 'supplier-a@bigwednesday.io',
  orders_email: process.env.TESTING_EMAIL
}, {
  id: 'supplier-b',
  email: 'supplier-b@bigwednesday.io',
  orders_email: process.env.TESTING_EMAIL
}];

const suppliersUrl = url.parse(uris.suppliers);

module.exports = {
  begin: () => {
    nock(`${suppliersUrl.protocol}//${suppliersUrl.host}`)
      .get(suppliersUrl.path || '/')
      .reply(200, suppliersData)
      .get(suppliersUrl.path || '/')
      .reply(200, suppliersData)
      .get(suppliersUrl.path || '/')
      .reply(200, suppliersData);
  },
  end: () => {
    nock.cleanAll();
  }
};
