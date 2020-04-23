Makes ALL guns have 3 fire modes: single, 3-round burst, full auto.
Makes ALL guns have fire rate of 2000rpm.
Makes ALL ammo stack to 1k. Color codes them too.
This is compatible with my olympus mod, but it does need to be listed after it. by default, this will happen automatically. youre welcome.



CONFLICTS with EmuTarkov-AllItemsExamined-*anyVersion* (work-around, see below).
CONFLICTS with Miku-NoHolsterRestriction-*anyVersion* (work-around, see below).

Color coded ammo based on pen/flesh damage values
	Red    = Best flesh damage for caliber.
	Blue   = Best penetration for caliber.
	Purple = Best hybrid of pen and flesh damage.
	Not colored = don't bother with this crap ammo unless you have no other option.
	Bear in mind, just because something is colored does not mean I think its a good round to use.
	It just means that if you insist on using that caliber, then the best options for that caliber are colored,


WORK-AROUNDS
**DO NOT USE THE STOCK WINDOWS NOTEPAD PROGRAM TO EDIT .JSON'S. USE NOTEPAD++**
**DO NOT USE THE STOCK WINDOWS NOTEPAD PROGRAM TO EDIT .JSON'S. USE NOTEPAD++**
**DO NOT USE THE STOCK WINDOWS NOTEPAD PROGRAM TO EDIT .JSON'S. USE NOTEPAD++**

	AllItemsExamined
		After the server has launched and finished cache-ing, close it and open /server/user/configs/mods.json
		Move the entire section for QuickGuns after the entire section for AllItemsExamined.
		Save the file and relaunch the server.

	NoHolsterRestriction
		Go to /server/user/mods/AssAssIn-QuickGuns-versionNumber/db
		Make a copy of the file "55d7217a4bdc2d86028b456d noHolsterRestriction.json" and rename it to "55d7217a4bdc2d86028b456d.json"
		Move this file to the "items" folder in /server/user/mods/AssAssIn-QuickGuns-versionNumber/db and confirm the replace
		Delete the /server/user/cache folder and relaunch the server.