const warnings = {
  shouldNotPerformShiftType: (employee, shift) => `${employee.name} should not perform ${shift.type} shifts`,
  workingAdjacentShift: (employee) => `${employee.name} is working an adjacent shift to this one`,
};

module.exports = warnings;
