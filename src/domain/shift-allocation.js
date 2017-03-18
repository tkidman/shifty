class ShiftAllocation {
  constructor(shift, employee, warningsList) {
    this.shift = shift;
    this.employee = employee;
    this.warningsList = warningsList || [];
  }
}

module.exports = ShiftAllocation;
