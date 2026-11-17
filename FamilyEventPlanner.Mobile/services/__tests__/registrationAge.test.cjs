const assert = require('node:assert/strict');
const test = require('node:test');
const {
  MINIMUM_REGISTRATION_AGE,
  getDateOfBirthError,
} = require('../registrationAge');

const currentDate = new Date('2026-11-17T12:00:00.000Z');

test('requires a valid date of birth in ISO calendar format', () => {
  for (const value of [
    '',
    'not-a-date',
    '2012-02-30',
    '2012/02/29',
    '2027-01-01',
    '1906-11-16',
    '1900-01-01',
  ]) {
    assert.equal(getDateOfBirthError(value, currentDate), 'Enter a valid date of birth using YYYY-MM-DD.');
  }
});

test('allows registration beginning on the fourteenth birthday', () => {
  assert.equal(MINIMUM_REGISTRATION_AGE, 14);
  assert.equal(
    getDateOfBirthError('2012-11-18', currentDate),
    'You must be at least 14 years old to create an account.',
  );
  assert.equal(getDateOfBirthError('2012-11-17', currentDate), null);
  assert.equal(getDateOfBirthError('2012-11-16', currentDate), null);
});

test('applies leap-day birthdays on February 28 in non-leap years', () => {
  assert.equal(
    getDateOfBirthError('2012-02-29', new Date('2026-02-27T12:00:00.000Z')),
    'You must be at least 14 years old to create an account.',
  );
  assert.equal(getDateOfBirthError('2012-02-29', new Date('2026-02-28T12:00:00.000Z')), null);
});
