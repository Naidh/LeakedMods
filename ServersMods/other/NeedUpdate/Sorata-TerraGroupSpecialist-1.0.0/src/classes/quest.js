"use strict";

/*
* Quest status values
* 0 - Locked
* 1 - AvailableForStart
* 2 - Started
* 3 - AvailableForFinish
* 4 - Success
* 5 - Fail
* 6 - FailRestartable
* 7 - MarkedAsFailed
*/

let questsCache = undefined;

function initialize() {
    questsCache = json.read(db.user.cache.quests);
}

function getQuestsCache() {
    return questsCache;
}

function processReward(reward) {
    let rewardItems = [];
    let targets;
    let mods = [];

    // separate base item and mods, fix stacks
    for (let item of reward.items) {
        if (item._id === reward.target) {
            targets = itm_hf.splitStack(item);
        }
        else {
            mods.push(item);
        }
    }

    // add mods to the base items, fix ids
    for (let target of targets) {
        let items = [ target ];

        for (let mod of mods) {
            items.push(itm_hf.clone(mod));
        }

        rewardItems = rewardItems.concat(itm_hf.replaceIDs(null, items));
    }

    return rewardItems;
}

/* Gets a flat list of reward items for the given quest and state
* input: quest, a quest object
* input: state, the quest status that holds the items (Started, Success, Fail)
* output: an array of items with the correct maxStack
*/
function getQuestRewardItems(quest, state) {
    let questRewards = [];

    for (let reward of quest.rewards[state]) {
        if ("Item" === reward.type) {
            questRewards = questRewards.concat(processReward(reward));
        }
    }

    return questRewards;
}

function acceptQuest(pmcData, body, sessionID) {
    let state = "Started";
    let found = false;

    // If the quest already exists, update its status
    for (const quest of pmcData.Quests) {
        if (quest.qid === body.qid) {
            quest.startTime = utility.getTimestamp();
            quest.status = state;
            found = true;
            break;
        }
    }

    // Otherwise, add it
    if (!found) {
        pmcData.Quests.push({
            "qid": body.qid,
            "startTime": utility.getTimestamp(),
            "status": state
        });
    }

    // Create a dialog message for starting the quest.
    // Note that for starting quests, the correct locale field is "description", not "startedMessageText".
    let quest = json.parse(json.read(db.quests[body.qid]));
    let questLocale = json.parse(json.read(db.locales["en"].quest[body.qid]));
    let messageContent = {templateId: questLocale.startedMessageText, type: dialogue_f.getMessageTypeValue('questStart')};
    let questRewards = getQuestRewardItems(quest, state);

    if(messageContent != ""){
        dialogue_f.dialogueServer.addDialogueMessage(quest.traderId, messageContent, sessionID, questRewards);
    }else{
        messageContent = {templateId: questLocale.description, type: dialogue_f.getMessageTypeValue('questStart')};
        dialogue_f.dialogueServer.addDialogueMessage(quest.traderId, messageContent, sessionID, questRewards);
    };
    
    return item_f.itemServer.getOutput();
}

function completeQuest(pmcData, body, sessionID) {
    let state = "Success";
    let intelCenterBonus = 0;//percentage of money reward

    //find if player has money reward boost 
    for(let area in pmcData.Hideout.Areas)
    {
        if(pmcData.Hideout.Areas[area].type == 11)
        {
            if(pmcData.Hideout.Areas[area].level == 1){intelCenterBonus = 5;}
            if(pmcData.Hideout.Areas[area].level > 1){intelCenterBonus = 15;}
        }
    }

    for (let quest in pmcData.Quests) {
        if (pmcData.Quests[quest].qid === body.qid) {
            pmcData.Quests[quest].status = state;
            break;
        }
    }

    // give reward
    let quest = json.parse(json.read(db.quests[body.qid]));
    if(intelCenterBonus > 0)
    { 
        quest = applyMoneyBoost(quest,intelCenterBonus);    //money = money + (money*intelCenterBonus/100)
    }
    let questRewards = getQuestRewardItems(quest, state);

    for (let reward of quest.rewards.Success) {
        switch (reward.type) {
            case "Skill":
                pmcData = profile_f.profileServer.getPmcProfile(sessionID);

                for (let skill of pmcData.Skills.Common) {
                    if (skill.Id === reward.target) {
                        skill.Progress += parseInt(reward.value);
                        break;
                    }
                }
                break;

            case "Experience":
                pmcData = profile_f.profileServer.getPmcProfile(sessionID);
                pmcData.Info.Experience += parseInt(reward.value);
                break;

            case "TraderStanding":
                pmcData = profile_f.profileServer.getPmcProfile(sessionID);
                pmcData.TraderStandings[quest.traderId].currentStanding += parseFloat(reward.value);
                trader_f.traderServer.lvlUp(quest.traderId, sessionID);
                break;
        }
    }

    // Create a dialog message for completing the quest.
    let questDb = json.parse(json.read(db.quests[body.qid]));
    let questLocale = json.parse(json.read(db.locales["en"].quest[body.qid]));
    let messageContent = {
        templateId: questLocale.successMessageText,
        type: dialogue_f.getMessageTypeValue('questSuccess')
    }

    dialogue_f.dialogueServer.addDialogueMessage(questDb.traderId, messageContent, sessionID, questRewards);

    return item_f.itemServer.getOutput();
}

function handoverQuest(pmcData, body, sessionID) {
    const quest = json.parse(json.read(db.quests[body.qid]));
    let output = item_f.itemServer.getOutput();
    let types = ["HandoverItem", "WeaponAssembly"];
    let handoverMode = true;
    let value = 0;
    let counter = 0;
    let amount;

    for (let condition of quest.conditions.AvailableForFinish) {
        if (condition._props.id === body.conditionId && types.includes(condition._parent)) {
            value = parseInt(condition._props.value);
            handoverMode = condition._parent === types[0];

            break;
        }
    }

    if (handoverMode && value === 0) {
        logger.logError("Quest handover error: condition not found or incorrect value. qid=" + body.qid + ", condition=" + body.conditionId);
        return output;
    }

    for (let itemHandover of body.items) {
        if (handoverMode) {
            // remove the right quantity of given items
            amount = Math.min(itemHandover.count, value - counter);
            counter += amount;
            changeItemStack(pmcData, itemHandover.id, itemHandover.count - amount, output);

            if (counter === value) {
                break;
            }
        }
        else {
            // for weapon assembly quests, remove the item and its children
            let toRemove = itm_hf.findAndReturnChildren(pmcData, itemHandover.id);
            let index = pmcData.Inventory.items.length;

            // important: don't tell the client to remove the attachments, it will handle it
            output.data.items.del.push({ "_id": itemHandover.id });
            counter = 1;

            // important: loop backward when removing items from the array we're looping on
            while (index --> 0) {
                if (toRemove.includes(pmcData.Inventory.items[index]._id)) {
                    pmcData.Inventory.items.splice(index, 1);
                }
            }
        }
    }

    if (pmcData.BackendCounters.hasOwnProperty(body.conditionId)) {
        pmcData.BackendCounters[body.conditionId].value += counter;
    } else {
        pmcData.BackendCounters[body.conditionId] = {"id": body.conditionId, "qid": body.qid, "value": counter};
    }

    return output;
}

function applyMoneyBoost(quest,moneyBoost)
{
    for (let reward in quest.rewards.Success)
    {
        if(quest.rewards.Success[reward].type == "Item")
        {
            if( itm_hf.isMoneyTpl(quest.rewards.Success[reward].items[0]._tpl) )
            {
                quest.rewards.Success[reward].items[0].upd.StackObjectsCount += quest.rewards.Success[reward].items[0].upd.StackObjectsCount*moneyBoost/100;
            }
        }
    }
    return quest;
}
/* Sets the item stack to value, or delete the item if value <= 0 */
// TODO maybe merge this function and the one from customization
function changeItemStack(pmcData, id, value, output) {
    for (let item in pmcData.Inventory.items) {
        if (pmcData.Inventory.items[item]._id === id) {
            if (value > 0) {
                pmcData.Inventory.items[item].upd.StackObjectsCount = value;

                output.data.items.change.push({
                    "_id": pmcData.Inventory.items[item]._id,
                    "_tpl": pmcData.Inventory.items[item]._tpl,
                    "parentId": pmcData.Inventory.items[item].parentId,
                    "slotId": pmcData.Inventory.items[item].slotId,
                    "location": pmcData.Inventory.items[item].location,
                    "upd": { "StackObjectsCount": pmcData.Inventory.items[item].upd.StackObjectsCount }
                });
            } else {
                output.data.items.del.push({ "_id": id });
                pmcData.Inventory.items.splice(item, 1);
            }

            break;
        }
    }
}

module.exports.initialize = initialize;
module.exports.getQuestsCache = getQuestsCache;
module.exports.acceptQuest = acceptQuest;
module.exports.completeQuest = completeQuest;
module.exports.handoverQuest = handoverQuest;
