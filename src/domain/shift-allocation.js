class ShiftAllocation {
  constructor(shift, employee, warnings) {
    this.shift = shift;
    this.employee = employee;
    this.warnings = warnings || [];
  }
}

module.exports = ShiftAllocation;
