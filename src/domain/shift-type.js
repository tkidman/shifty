const shiftTypes = {
  standard: { numEmployees: 1, backup: 1, length: 1 },
  peak: { numEmployees: 2, length: 1 },
  night: { numEmployees: 2, length: 4 },
  weekend: { numEmployees: 2, length: 5.25 },
};

module.exports = shiftTypes;
