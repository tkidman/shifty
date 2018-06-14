const shiftTypes = {
  standard: { name: 'Standard', shortName: '' },
  responsibleOfficer: { name: 'ResponsibleOfficer', shortName: 'RO' },
  aal: { name: 'AAL', shortName: 'AAL' },
  backup: { name: 'Backup', shortName: 'B' },
  slc: { name: 'SLC', shortName: 'SLC' },
  bEast: { name: 'BEast', shortName: 'BE' },
  reference: { name: 'Reference', shortName: 'Ref' },
};

const shiftTypesList = Object.keys(shiftTypes).map(key => shiftTypes[key]);
const findShiftTypeByName = name => shiftTypesList.find(shiftType => shiftType.name === name);
module.exports = { shiftTypes, shiftTypesList, findShiftTypeByName };
