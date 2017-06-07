const shiftTypes = {
  standard: 'Standard',
  responsibleOfficer: 'ResponsibleOfficer',
  aal: 'AAL',
  backup: 'Backup',
  slc: 'SLC',
  bEast: 'BEast',
  reference: 'Reference',
};

const shiftTypesList = Object.keys(shiftTypes).map(key => shiftTypes[key]);
module.exports = { shiftTypes, shiftTypesList };
