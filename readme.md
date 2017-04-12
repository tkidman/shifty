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
* If exporting from google sheets, make sure you don't have lots of empty cells. Delete any unnecessary columns and rows from the google sheet! 
This can reduce the size of your exported excel file from 3MB to 25KiBs. 
It will be much faster to upload, and will be much faster for shifty to process too. 
Feel free to add as many shifts and employees as you want, though.
* Shifts have a shift type, currently the shift types are: Standard, ResponsibleOfficer, AAL, SLC, Reference, and Backup.
Use the 'Shifts' sheet to specify the shift type.
* Staff members can be assigned shift types they can work through the columns on the 'Staff' sheet.
Use Y to indicate that a staff member can work the shift type.
If the column is empty, then the staff member should not work the shift type,
except for Standard shifts - in that case you need to use N to show that they should not work that type of shift.
* Staff members with a Hew level of 5 or above can work ResponsibleOfficer shifts.


## How does it work?

Shifty first works out which people can work which shifts, taking into account negs and leave.  
It then tries to sort the shifts from hardest to fill to easiest to fill (Backup shifts are filled last).
For each shift in that order, shifty calculates a score for the staff members that are available to work that shift. The person with 
the lowest score is allocated to the shift. Shifty calculates the score on this basis:
* If the person has worked less than four hours of desk shifts, the person's score is reduced
* If working an adjacent shift, the person's score is increased. A night shift followed by a morning shift is considered adjacent.
* If the staff member doesn't have the right skills based on shift type, the person's score is increased.
* Shifty increases or decreases the staff member's score based on how close the staff member's hours 
are to the ideal desk hour percentages defined by the hew level of the staff member.
* Shifty tries to distribute AAL shifts evenly by increasing the score for each AAL shift worked.
 
## TODO:
 * shifty legacy - parse input by column names instead of indexes.
 * shifty generified - allow configuration of shift types & percentages
 * shifty UI - create a UI for managing staff/shifts/negs/leave
 * Test pug files
 * Show debug log?
 * Export to excel?