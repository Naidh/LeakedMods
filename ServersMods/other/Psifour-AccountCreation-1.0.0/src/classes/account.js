"use strict";

/**
* AccountServer class maintains list of accounts in memory. All account information should be 
* loaded during server init.
*/
class AccountServer {
    constructor() {
        this.accounts = {};
    }

    initialize() {
        this.accounts = json.parse(json.read(db.user.configs.accounts));
    }

    saveToDisk() {
        json.write(db.user.configs.accounts, this.accounts);
    }

    find(sessionID) {
        for (let accountId of Object.keys(this.accounts)) {
            let account = this.accounts[accountId];

            if (account.id === sessionID) {
                return account;
            }
        }

        return undefined;
    }

    isWiped(sessionID) {
        return this.accounts[sessionID].wipe;
    }

    setWipe(sessionID, state) {
        this.accounts[sessionID].wipe = state;
    }

    exists(info) {
        for (let accountId of Object.keys(this.accounts)) {
            let account = this.accounts[accountId];

            if (info.email === account.email) {
				if(info.password === account.password) {
					return account.id;
				} else {
					return 0;
				}
            }
        }

        return -1;
    }
	
	createAccount(info) {
		let sessionID = (Object.keys(this.accounts).length + 1).toString();
		this.accounts[sessionID] = {
			id: Number(sessionID),
			nickname: "",
			email: info.email,
			password: info.password,
			wipe: true,
			edition: "eod"
		}
		
		this.saveToDisk();
		return sessionID;
	}

    getReservedNickname(sessionID) {
        return this.accounts[sessionID].nickname;
    }

    findID(data) {
        let buff = Buffer.from(data.token, 'base64');
        let text = buff.toString('ascii');
        let info = json.parse(text);
        let sessionID = this.exists(info);

		if (sessionID == -1) {
			return this.createAccount(info);
		} else {	
			return sessionID.toString();
		}
    }
}

function getPath(sessionID) {
    return "user/profiles/" + sessionID + "/";
}

module.exports.accountServer = new AccountServer();
module.exports.getPath = getPath;