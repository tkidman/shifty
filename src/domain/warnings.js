const warnings = {
  workingAdjacentShift: (employee) => `${employee.name} is working an adjacent shift to this one`,
  nobodyFound: () => 'Nobody was found to work this shift',
};

module.exports = warnings;
