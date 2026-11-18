const unit = require('./jest.config.cjs');

module.exports = {
  ...unit,
  roots: ['<rootDir>/test/postgres'],
  collectCoverage: false,
};
