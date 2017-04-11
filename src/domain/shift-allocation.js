class ShiftAllocation {
  constructor(shift, employee, warningsList) {
    this.shift = shift;
    this.employee = employee;
    this.warningsList = warningsList || [];
    this.score = 0;
    this.name = employee ? employee.name : 'None Found';
  }
}

module.exports = ShiftAllocation;
