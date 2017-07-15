const warnings = {
  shouldNotPerformShiftType: (employee, shift) => `${employee.name} should not perform ${shift.types.join(' or ')} shifts`,
  workingAdjacentShift: (employee) => `${employee.name} is working an adjacent shift to this one`,
  nobodyFound: () => 'Nobody was found to work this shift',
};

module.exports = warnings;
