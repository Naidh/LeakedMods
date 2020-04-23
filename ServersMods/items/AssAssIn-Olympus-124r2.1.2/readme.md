WHAT DOES THIS MOD ADD? Things like this:
https://i.imgur.com/amqObO7.jpg

Add this folder to server/user/mods.

You'll find a new items at the bottom of their respective lists in flea market (click the type of item on the LEFT and scroll to the bottom of the list on the RIGHT.)
Armor, Backpack, Helmet, Magazine, Medical.

The mags will fit in the appropriate guns for their caliber and use standard ammo. They also appear in a "linked search" for the gun.

I've tryed to make this "balanced" in the sense that the things are kinda spendy, but if you want to change the price of anything, the prices are located in /db/templates/items

This was built on EMU 0.12.4-r2
Compatible with my RaiderTakeover and killaFarm mod. (tested).
Compatible with Sorata's armorWithRigs mod. (tested).
Compatible with Sorata's AdvancedBotLoadouts mod (tested).

Conflicts with EmuTarkov-AllItemsExamined-1.0.0 (work-around, see below).
Conflicts with Miku-NoHolsterRestriction-1.0.0 (work-around, see below).


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

	AllItemsExamined
		After the server has launched and finished cache-ing, close it and open /server/user/configs/mods.json
		Move the entire section for Olympus after the entire section for AllItemsExamined.
		Save the file and relaunch the server.

	NoHolsterRestriction
		Go to /server/user/mods/AssAssIn-Olympus-versionNumber/db
		Make a copy of the file "55d7217a4bdc2d86028b456d noHolsterRestriction.json" and rename it to "55d7217a4bdc2d86028b456d.json"
		Move this file to the "items" folder in /server/user/mods/AssAssIn-Olympus-versionNumber/db and confirm the replace
		Delete the /server/user/cache folder and relaunch the server.