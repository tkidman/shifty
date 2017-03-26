# Shifty! 
The desk shift allocator by Tom for Mel

Shifty is open source software (MIT License)

It's running on Heroku at [shifty-desks.herokuapp.com](http://shifty-desks.herokuapp.com)
 
## Instructions for use
 
Shifty takes an Excel file as input and uses this to allocate staff to desk shifts.
You can download an example Excel file here: 
[https://github.com/tkidman/shifty/raw/master/data/shifty.xlsx](https://github.com/tkidman/shifty/raw/master/data/shifty.xlsx).
Use this as a guide for defining shifts, staff, negs and leave.

* Names and Shift Types need to exactly match across the sheets.  They are case sensitive.
* You can manually assign a person to a shift using the 'Manual Name' column in the 'Shifts' sheet.
* Shifts are 1 person shifts at the moment, so you need to define 2 shifts at the same time if two people are working
at the same time.
* You need to specify a fortnight of regular working hours for each staff member on the 'Staff' sheet. 
The first week must be the staff member's hours for a pay week, 
the second for a non pay week. Shifty considers 13/3/2017 to be a Monday of a payweek. 
The column headers in the example spreadsheet use 'P' and 'N' to
denote a Pay week and Non pay week.

## How does it work?

Shifty first works out which people can work which shifts, taking into account negs and leave.  
It then tries to sort the shifts from hardest to fill to easiest to fill.
For each shift in that order, shifty calculates a score for the staff members that are available to work that shift. The person with 
the lowest score is allocated to the shift. Shifty calculates the score on this basis:
* If the person has worked less than four hours of desk shifts, the person's score is reduced
* If working an adjacent shift, the person's score is increased. A night shift followed by a morning shift is considered adjacent.
* If the staff member doesn't have the right skills based on shift type, the person's score is increased.
* Shifty increases or decreases the staff member's score based on how close the staff member's hours 
are to the ideal desk hour percentages defined by the hew level of the staff member.
* Shifty tries to distribute AAL shifts evenly by increasing the score for each AAL shift worked.
 
## TODO:
 * no warnings for backup shifts
 * show more info when no-one found (no one working, people on leave/neg)
 * shifty legacy - parse input by column names instead of indexes.
 * Test pug files
 * Show debug log?
 * Export to excel?