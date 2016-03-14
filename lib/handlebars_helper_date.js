'use strict';

module.exports = Handlebars => {
  Handlebars.registerHelper('date', datestring => {
    const zeroPrefix = number => (number < 10 ? '0' : '') + number;

    const date = new Date(datestring);
    const year = date.getFullYear();
    const month = zeroPrefix(date.getMonth() + 1);
    const day = zeroPrefix(date.getDate());

    return `${day}/${month}/${year}`;
  });
};
