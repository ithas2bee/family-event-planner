const assert = require('node:assert/strict');
const test = require('node:test');
const { getDateOfBirthError } = require('../registrationAge');

const currentDate = new Date('2026-11-17T12:00:00.000Z');
const minimumAge = 14;
const maximumAge = 120;

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
    assert.equal(
      getDateOfBirthError(value, minimumAge, maximumAge, currentDate),
      'Enter a valid date of birth using YYYY-MM-DD.',
    );
  }
});

test('allows registration beginning on the fourteenth birthday', () => {
  assert.equal(
    getDateOfBirthError('2012-11-18', minimumAge, maximumAge, currentDate),
    'You must be at least 14 years old to create an account.',
  );
  assert.equal(getDateOfBirthError('2012-11-17', minimumAge, maximumAge, currentDate), null);
  assert.equal(getDateOfBirthError('2012-11-16', minimumAge, maximumAge, currentDate), null);
});

test('uses the minimum age provided by the backend policy', () => {
  assert.equal(
    getDateOfBirthError('2010-11-18', 16, maximumAge, currentDate),
    'You must be at least 16 years old to create an account.',
  );
  assert.equal(getDateOfBirthError('2010-11-17', 16, maximumAge, currentDate), null);
});

test('applies leap-day birthdays on February 28 in non-leap years', () => {
  assert.equal(
    getDateOfBirthError('2012-02-29', minimumAge, maximumAge, new Date('2026-02-27T12:00:00.000Z')),
    'You must be at least 14 years old to create an account.',
  );
  assert.equal(
    getDateOfBirthError('2012-02-29', minimumAge, maximumAge, new Date('2026-02-28T12:00:00.000Z')),
    null,
  );
});
