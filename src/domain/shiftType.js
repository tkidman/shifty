class ShiftType {
  constructor(params) {
    this.numEmployees = params.numEmployees;
  }
}

const shiftTypes = {
  standard: new ShiftType({ numEmployees: 1, backup: 1, length: 1 }),
  peak: new ShiftType({ numEmployees: 2, length: 1 }),
  night: new ShiftType({ numEmployees: 2, length: 4 }),
  weekend: new ShiftType({ numEmployees: 2, length: 5.25 }),
};

module.exports = shiftTypes;
