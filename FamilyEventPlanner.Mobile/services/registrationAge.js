function parseDateOfBirth(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();

  if (month < 1 || month > 12 || day < 1 || day > daysInMonth) {
    return null;
  }

  return { year, month, day };
}

function getDateOfBirthError(value, minimumAge, maximumAge, now = new Date()) {
  const birthDate = parseDateOfBirth(value);
  if (!birthDate) {
    return 'Enter a valid date of birth using YYYY-MM-DD.';
  }

  const currentDate = {
    year: now.getUTCFullYear(),
    month: now.getUTCMonth() + 1,
    day: now.getUTCDate(),
  };
  const minimumBirthYear = currentDate.year - maximumAge;
  const isTooOld =
    birthDate.year < minimumBirthYear ||
    (birthDate.year === minimumBirthYear &&
      (birthDate.month < currentDate.month ||
        (birthDate.month === currentDate.month && birthDate.day < currentDate.day)));
  const isFutureDate =
    birthDate.year > currentDate.year ||
    (birthDate.year === currentDate.year &&
      (birthDate.month > currentDate.month ||
        (birthDate.month === currentDate.month && birthDate.day > currentDate.day)));
  if (isFutureDate || isTooOld) {
    return 'Enter a valid date of birth using YYYY-MM-DD.';
  }

  const eligibilityYear = birthDate.year + minimumAge;
  const eligibilityDay =
    birthDate.month === 2 &&
    birthDate.day === 29 &&
    !isLeapYear(eligibilityYear)
      ? 28
      : birthDate.day;
  const hasReachedEligibilityDate =
    currentDate.year > eligibilityYear ||
    (currentDate.year === eligibilityYear &&
      (currentDate.month > birthDate.month ||
        (currentDate.month === birthDate.month && currentDate.day >= eligibilityDay)));

  return hasReachedEligibilityDate
    ? null
    : `You must be at least ${minimumAge} years old to create an account.`;
}

function isLeapYear(year) {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

module.exports = { getDateOfBirthError };
