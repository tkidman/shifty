# Shifty! 
The desk shift allocator by Tom for Mel

Shifty is open source software (MIT License)

It's running on Heroku at [shifty-desks.herokuapp.com](http://shifty-desks.herokuapp.com)
 
## Instructions for use
 
Shifty takes an Excel file as input and uses this to allocate staff to desk shifts.
You can download an example Excel file here: 
[https://github.com/tkidman/shifty/raw/master/data/shifty.xlsx](https://github.com/tkidman/shifty/raw/master/data/shifty.xlsx).
Use this as a guide for defining shifts, staff, negs and RDOs.

* Names and Shift Types need to exactly match across the sheets.  They are case sensitive.
* You can manually assign a person to a shift using the 'Manual Name' column in the 'Shifts' sheet.
* Shifts are 1 person shifts at the moment, so you need to define 2 shifts at the same time if two people are working
at the same time.

## How does it work?

Shifty first works out which people can work which shifts, taking into account negs and RDOs.  
It then goes though the shifts in this order: 
AAL, ResponsibleOfficer, Standard, Backup. 
For each shift, shifty calculates a score for the staff that are available to work that shift. The person with 
the lowest score is allocated to the shift. Shifty calculates the score on this basis:
* If the person has worked less than four hours of desk shifts, the person's score is reduced
* If working an adjacent shift, the person's score is increased
* If the shift is an AAL or ResponsibleOfficer type and the staff member doesn't have the right skills, the person's score is increased.
* Shifty increases or decreases the staff member's score based on how close the staff member's hours 
are to the ideal desk hour percentages defined by the hew level of the staff member. 
Shifty also uses the 'Average Weekly Hours' value defined on the 'Staff' sheet for this calculation. 

## TODO:
 * night/morning rule
 * Specify employee hours over two weeks
 * Use employee hours to calculate average hours
 * Show % time worked on desk shifts in staff summary
 * Support multi week shifts
 * Test pug files
 * Show debug log?
 * Export to excel?