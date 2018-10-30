const shiftTypes = {
  standard: { name: 'Standard', shortName: 'S' },
  responsibleOfficer: { name: 'ResponsibleOfficer', shortName: 'RO' },
  aal: { name: 'AAL', shortName: 'AAL' },
  backup: { name: 'Backup', shortName: 'B' },
  slc: { name: 'SLC', shortName: 'SLC' },
  bEast: { name: 'BEast', shortName: 'BE' },
  reference: { name: 'Reference', shortName: 'Ref' },
};

const shiftTypesList = Object.keys(shiftTypes).map(key => shiftTypes[key]);
const shiftTypeNames = shiftTypesList.map(shiftType => shiftType.name).join(', ');
const findShiftTypeByName = name => shiftTypesList.find(shiftType => shiftType.name === name);
module.exports = {
  shiftTypes, shiftTypesList, findShiftTypeByName, shiftTypeNames,
};
