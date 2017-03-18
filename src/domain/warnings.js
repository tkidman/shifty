const warnings = {
  nonAAL: (name) => `${name} should not perform AAL shifts`,
  nonResponsibleOfficer: (name) => `${name} should not perform Responsible Officer shifts`,
  workingAdjacentShift: (name) => `${name} is working an adjacent shift to this one`,
};

module.exports = warnings;
