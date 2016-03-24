'use strict';

const fs = require('fs');
const Handlebars = require('handlebars');
const html5pdf = require('html5-to-pdf');

// Handlebars helpers

require('./handlebars_helper_currency.js')(Handlebars);
require('./handlebars_helper_date.js')(Handlebars);

const cachedTemplate = {};
const getTemplate = name => {
  return new Promise((resolve, reject) => {
    if (cachedTemplate[name]) {
      return resolve(cachedTemplate[name]);
    }

    fs.readFile(`./lib/templates/${name}.html`, 'utf-8', (err, templateHtml) => {
      if (err) {
        return reject(err);
      }
      cachedTemplate[name] = Handlebars.compile(templateHtml);
      return resolve(cachedTemplate[name]);
    });
  });
};

const buildHtml = data => {
  return getTemplate('purchase_order')
    .then(template => {
      return template(data);
    });
};

const buildPdf = html => {
  return new Promise((resolve, reject) => {
    html5pdf({
      cssPath: './lib/templates/pdf.css'
    }).from.string(html).to.buffer((err, pdf) => {
      if (err) {
        return reject(err);
      }
      // console.log('PDF Created');
      resolve(pdf);
    });
  });
};

const buildDeliveryNote = order => {
  return getTemplate('delivery_note')
    .then(template => {
      const html = template(order);
      return buildPdf(html);
    });
};

module.exports = {
  buildHtml,
  buildPdf,
  buildDeliveryNote
};
