"use strict";

/* TraderServer class maintains list of traders for each sessionID in memory. */
class TraderServer {
    constructor() {
        this.traders = {};
        this.assorts = {};

        this.initializeTraders();
    }

    /* Load all the traders into memory. */
    initializeTraders() {
        logger.logWarning("Loading traders into RAM...");

        for (let id in db.assort) {
            this.traders[id] = json.parse(json.read(db.assort[id].base));
            this.traders[id].sell_category = Object.keys(json.parse(json.read(db.assort[id].categories)));
        }
    }

    getTrader(id) {
        return {err: 0, errmsg: null, data: this.traders[id]};
    }

    getAllTraders(sessionID) {
        let pmcData = profile_f.profileServer.getPmcProfile(sessionID);
        let traders = [];

        if(pmcData.TraderStandings["TerraGroup_Specialist"] === undefined){
            pmcData.TraderStandings["TerraGroup_Specialist"] =  {
                    "currentLevel": 1,
                    "currentSalesSum": 0,
                    "currentStanding": 0,
                    "NextLoyalty": null,
                    "loyaltyLevels": {
                        "0": {
                            "minLevel": 50,
                            "minSalesSum": 0,
                            "minStanding": 0
                        },
                        "1": {
                            "minLevel": 55,
                            "minSalesSum": 0,
                            "minStanding": 0.3
                        },
                        "2": {
                            "minLevel": 60,
                            "minSalesSum": 550000,
                            "minStanding": 0.6
                        },
                        "3": {
                            "minLevel": 65,
                            "minSalesSum": 1000000,
                            "minStanding": 1.0
                        }
                    }
                };
        };
        for (let traderId in this.traders) {
            if (traderId === "ragfair") {
                continue;
            }

            let trader = this.traders[traderId];
            trader.loyalty.currentLevel = pmcData.TraderStandings[traderId].currentLevel;
            trader.loyalty.currentStanding = pmcData.TraderStandings[traderId].currentStanding;
            trader.loyalty.currentSalesSum = pmcData.TraderStandings[traderId].currentSalesSum;
            traders.push(trader);
        }

        return {err: 0, errmsg: null, data: traders};
    }

    lvlUp(id, sessionID) {
        let pmcData = profile_f.profileServer.getPmcProfile(sessionID);
        let loyaltyLevels = this.traders[id].loyalty.loyaltyLevels;

        // level up player
        let checkedExp = 0;

        for (let level in globals.data.config.exp.level.exp_table) {
            if (pmcData.Info.Experience < checkedExp) {
                break;
            }

            pmcData.Info.Level = parseInt(level);
            checkedExp += globals.data.config.exp.level.exp_table[level].exp;
        }

        // level up traders
        let targetLevel = 0;
        
        for (let level in loyaltyLevels) {
            // level reached
            if ((loyaltyLevels[level].minLevel <= pmcData.Info.Level
            && loyaltyLevels[level].minSalesSum <= pmcData.TraderStandings[id].currentSalesSum
            && loyaltyLevels[level].minStanding <= pmcData.TraderStandings[id].currentStanding)
            && targetLevel < 4) {
                targetLevel++;
            }
        }
        pmcData.TraderStandings[id].currentLevel = targetLevel;
        this.traders[id].loyalty.currentLevel = targetLevel;
        // set assort
        this.generateAssort(id);
    }

    getAssort(traderId) {
        if (!(traderId in this.assorts)) {
            this.generateAssort(traderId);
        }
        
        return this.assorts[traderId];
    }

    generateAssort(traderId) {
        if (traderId === "579dc571d53a0658a154fbec") {
            logger.logWarning("generating fence");
            this.generateFence();
            return;
        }

        let base = json.parse(json.read(db.user.cache["assort_" + traderId]));

        // 1 is min level, 4 is max level
        if (traderId !== "ragfair") {
            let keys = Object.keys(base.data.loyal_level_items);
            let level = this.traders[traderId].loyalty.currentLevel;

            for (let i = 1; i < 4; i++) {
                for (let key of keys) {
                    if (base.data.loyal_level_items[key] > level) {
                        base = this.removeItemFromAssort(base, key);
                    }
                }
            }
        }

        this.assorts[traderId] = base;
    }

    generateFence() {
        let base = json.parse(json.read("db/cache/assort.json"));
        let names = Object.keys(db.assort["579dc571d53a0658a154fbec"].loyal_level_items);
        let added = [];

        for (let i = 0; i < gameplayConfig.trading.fenceAssortSize; i++) {
            let id = names[utility.getRandomInt(0, names.length - 1)];

            if (added.includes(id)) {
                i--;
                continue;
            }

            added.push(id);
            base.data.items.push(json.parse(json.read(db.assort["579dc571d53a0658a154fbec"].items[id])));
            base.data.barter_scheme[id] = json.parse(json.read(db.assort["579dc571d53a0658a154fbec"].barter_scheme[id]));
            base.data.loyal_level_items[id] = json.parse(json.read(db.assort["579dc571d53a0658a154fbec"].loyal_level_items[id]));
        }

        this.assorts['579dc571d53a0658a154fbec'] = base;
    }

    // delete assort keys
    removeItemFromAssort(assort, id) {
        let ids_toremove = itm_hf.findAndReturnChildren(assort, id);

        delete assort.data.barter_scheme[id];
        delete assort.data.loyal_level_items[id];

        for (let i in ids_toremove) {
            for (let a in assort.data.items) {
                if (assort.data.items[a]._id === ids_toremove[i]) {
                    assort.data.items.splice(a, 1);
                }
            }
        }

        return assort;
    }

    getCustomization(traderId, sessionID) {
        let pmcData = profile_f.profileServer.getPmcProfile(sessionID);
        let allSuits = customization_f.getCustomization().data;
        let suitArray = json.parse(json.read(db.user.cache["customization_" + traderId]));
        let suitList = [];

        for (let suit of suitArray) {
            if (suit.suiteId in customization_f.getCustomization().data) {
                for (var i = 0; i < allSuits[suit.suiteId]._props.Side.length; i++) {
                    let side = allSuits[suit.suiteId]._props.Side[i];

                    if (side === pmcData.Info.Side) {
                     suitList.push(suit);
                    }
                }
            }
        }
        
        return suitList;
    }

    getAllCustomization(sessionID) {
        let output = [];
        
		for (let traderId in this.traders) {
			if(db.user.cache["customization_" + traderId] !== undefined) {
				output = output.concat(this.getCustomization(traderId, sessionID));
			}
        }

        return output;
    }
}

/*
    function to calculate the price of each player items in the inventory when selling
*/
function getPurchasesData(tmpTraderInfo, sessionID) {
    let pmcData = profile_f.profileServer.getPmcProfile(sessionID);
    let traderData = trader_f.traderServer.getTrader(tmpTraderInfo, sessionID);
    let traderCategories = json.parse(json.read(db.assort[tmpTraderInfo].categories));
    let currency = itm_hf.getCurrency(traderData.data.currency);
    let output = {};

    // get sellable items
    for (let item of pmcData.Inventory.items) 
    {
        let price = 0;
        if (item._id === pmcData.Inventory.equipment
        || item._id === pmcData.Inventory.stash
        || item._id === pmcData.Inventory.questRaidItems
        || item._id === pmcData.Inventory.questStashItems
        || itm_hf.isNotSellable(item._tpl) 
        || traderFilter(Object.keys(traderCategories), item._tpl) == false) {
            continue;
        }

        // find all child of the item and sum the price 
        for (let childItemId of itm_hf.findAndReturnChildren(pmcData, item._id)) {
            let childitem = itm_hf.findInventoryItemById(pmcData, childItemId);
            
            if (childitem === false) {
                // root item
                let count = ("upd" in item && "StackObjectsCount" in item.upd) ? childitem.upd.StackObjectsCount : 1;
                price = ((items.data[item._tpl]._props.CreditsPrice >= 1) ? items.data[item._tpl]._props.CreditsPrice : 1) * count;
            } else {
                // child item
                let tempPrice = (items.data[childitem._tpl]._props.CreditsPrice >= 1) ? items.data[childitem._tpl]._props.CreditsPrice : 1;
                let count = ("upd" in childitem && "StackObjectsCount" in childitem.upd) ? childitem.upd.StackObjectsCount : 1;
                price = price + (tempPrice * count);
            }
        }

        // dogtag calculation
        if ("upd" in item && "Dogtag" in item.upd && itm_hf.isDogtag(item._tpl)) {
            price *= item.upd.Dogtag.Level;
        }

        // meds calculation
        let hpresource = ("upd" in item && "Medkit" in item.upd) ? item.upd.MedKit.HpResource : 0;  
        if (hpresource > 0) {
            let maxHp = itm_hf.getItem(item._tpl)[1]._props.MaxHpResource;
            price *= (hpresourc / maxHp);
        }

        // weapons and armor calculation
        let repairable = ("upd" in item && "Repairable" in item.upd) ? item.upd.Repairable : 1;
        if (repairable !== 1 ) {
            price *= (repairable.Durability / repairable.MaxDurability)
        }

        // get real price
        //price *= traderCategories[sellFilter[1]];
        price = itm_hf.fromRUB(price, currency);
        price = (price > 0 && price !== "NaN") ? price : 1;
        
        output[item._id] = [[{"_tpl": currency, "count": price.toFixed(0)}]];
    }

    return output;
}

/*
check if an item is allowed to be sold to a trader
input : array of handbook categories, itemTpl of inventory
output : boolean
*/
function traderFilter(traderFilters, tplToCheck) {

    for (let filter of traderFilters) 
    {
        for (let iaaaaa of itm_hf.templatesWithParent(filter)) 
        {
            if (iaaaaa == tplToCheck) 
            {
                return true;
            }
        }
        
        for (let subcateg of itm_hf.childrenCategories(filter)) 
        {
            for (let itemFromSubcateg of itm_hf.templatesWithParent(subcateg)) 
            {
                if (itemFromSubcateg == tplToCheck) 
                {
                    return true;
                }
            }
        }
    }
    return false;
}

module.exports.traderServer = new TraderServer();
module.exports.getPurchasesData = getPurchasesData;
