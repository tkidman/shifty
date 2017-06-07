# Shifty! 
The desk shift allocator by Tom for Mel

Shifty is open source software (MIT License)

It's running on Heroku at [shifty-desks.herokuapp.com](http://shifty-desks.herokuapp.com)
 
## Instructions for use
 
Shifty takes an Excel file as input and uses this to allocate staff to desk shifts.
You can download an example Excel file here: 
[https://github.com/tkidman/shifty/raw/master/data/shifty.xlsx](https://github.com/tkidman/shifty/raw/master/data/shifty.xlsx).
Use this as a guide for defining shifts, staff, negs and leave.

* Shifts are 1 person shifts at the moment, so you need to define 2 shifts at the same time if two people are working
at the same time.
* You need to specify a fortnight of regular working hours for each staff member on the 'Staff' sheet (Payweek and Non-payweek). 
Shifty considers 13/3/2017 to be a Monday of a payweek. 
The column headers in the example spreadsheet use 'P' and 'N' to
denote a Pay week and Non pay week.
* If exporting from google sheets, make sure you don't have lots of empty cells. Delete any unnecessary columns and rows from the google sheet! 
This can reduce the size of your exported excel file from 3MB to 25KiBs. 
It will be much faster to upload, and will be much faster for shifty to process too. 
Feel free to add as many shifts and employees as you want, though.
* See the tables below for a description of the input spreadsheet's columns.
* Shifty uses column headers to get to the data it needs, so you can't change the names of the columns. 
Feel free to order the columns in any order you want, and delete any non-mandatory columns you don't need.
* An earlier version of Shifty used column numbers to get to the data instead of headers. 
If you have an old spreadsheet that doesn't work with the new version, you can access legacy mode [here](http://shifty-desks.herokuapp.com/?legacyMode=true) (or just fix up the header names).
Please note, legacy mode will be removed at some point in the future.


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
 
## Sheet column breakdown

### Shifts

| Column | Mandatory? | Format | Description |
| --- | --- | --- | ---|
| Date | Yes | Excel Formatted Date | The date of the Shift | 
| Start Time | Yes | Excel Formatted Time | The start time of the Shift |
| End Time | Yes | Excel Formatted Time | The end time of the Shift |
| Shift Type | Yes | One of: Standard, ResponsibleOfficer, AAL, SLC, Reference, Backup, BEast | The type of the Shift |
| Manual Name | No | A name that matches the name of a Staff member on the staff sheet | If a name is provided, Shifty will always assign this staff member to the Shift |
| Label | No | Text | Shifty will append this label to the Shift in the output.  It doesn't affect rostering logic |

### Staff

| Column | Mandatory? | Format | Description |
| --- | --- | --- | ---|
| Name | Yes | Text | The name of the staff member | 
| Hew | Yes | A number from 3 to 9 | The hew level determines if a staff member is a responsible officer, and what percentage of time they should spend on desk | 
| AAL | No | One of: Y or N (empty means N) | Should this staff member perform Ask A Librarian shifts? |
| SLC | No | One of: Y or N (empty means N) | Should this staff member perform SLC shifts? |
| Reference | No | One of: Y or N (empty means N) | Can this staff member perform Reference shifts? |
| Standard | No | One of: Y or N (**empty means Y**) | Can this staff member perform Standard shifts? |
| BEast | No | One of: Y or N (empty means N) | Can this staff member perform Bundoora East shifts? |
| Mon Start P | No | Excel Formatted Time | The time the employee starts work on the Monday of a Payweek |
| Mon End P | No | Excel Formatted Time | The time the employee ends work on the Monday of a Payweek |
| ... | ... | ... | ... |
| Sun Start N | No | Excel Formatted Time | The time the employee starts work on the Sunday of a Non payweek |
| Sun End N | No | Excel Formatted Time | The time the employee ends work on the Sunday of a Non payweek |

Columns for other days follow the same pattern (Tue, Wed, Thu, Fri, Sat, Sun)

### Negs

| Column | Mandatory? | Format | Description |
| --- | --- | --- | ---|
| Name | Yes | A name that matches the name of a Staff member on the staff sheet | Staff member name |
| Date | Yes | Excel Formatted Date | The date of the Neg |
| Start Time | Yes | Excel Formatted Time | The start time of the Neg |
| End Time | Yes | Excel Formatted Time | The end time of the Neg |

### Leave

| Column | Mandatory? | Format | Description |
| --- | --- | --- | ---|
| Name | Yes | A name that matches the name of a Staff member on the staff sheet | Staff member name |
| First Day | Yes | Excel Formatted Date | The first day of leave |
| Last Day | No | Excel Formatted Date | The last day of leave.  If blank, then the leave is just for the first day |


## TODO:
 * shifty generified - allow configuration of shift types & percentages
 * shifty UI - create a UI for managing staff/shifts/negs/leave
 * Test pug files
 * Show debug log?
 * Export to excel?