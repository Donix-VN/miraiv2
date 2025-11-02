module.exports = function({ api, models }) {

	const Users = require("./controllers/users")({ models, api }),
				Threads = require("./controllers/threads")({ models, api }),
				Currencies = require("./controllers/currencies")({ models });
	const logger = require("../utils/log.js");

	//////////////////////////////////////////////////////////////////////
	//========= Push all variable from database to environment =========//
	//////////////////////////////////////////////////////////////////////
	
	(async function () {
  try {
    logger(
      global.getText("loader", "startLoadEnvironment"),
      "[ DATABASE ]"
    );
    
    let allThreads = await Threads.getAll();
    let allUsers = await Users.getAll(["userID", "name", "data"]);
    let allCurrencies = await Currencies.getAll(["userID"]);
    
    for (const thread of allThreads) {
      const threadID = String(thread.threadID);
      
      global.data.allThreadID.push(threadID);
      global.data.threadData.set(threadID, thread.data || {});
      global.data.threadInfo.set(threadID, thread.threadInfo || {});
      
      if (thread.data && thread.data.banned == true) {
        global.data.threadBanned.set(threadID, {
          "reason": thread.data.reason || '',
          "dateAdded": thread.data.dateAdded || ''
        });
      }
      
      if (thread.data && thread.data.commandBanned && thread.data.commandBanned.length != 0) {
        global.data.commandBanned.set(threadID, thread.data.commandBanned);
      }
      
      if (thread.data && thread.data.NSFW) {
        global.data.threadAllowNSFW.push(threadID);
      }
    }
    
    logger.loader(
      global.getText("loader", "successLoadEnvironmentThread")
    );
    
    for (const user of allUsers) {
      const userID = String(user.userID);
      
      global.data.allUserID.push(userID);
      
      if (user.name && user.name.length != 0) {
        global.data.userName.set(userID, user.name);
      }
      
      if (user.data && user.data.banned == 1) {
        global.data.userBanned.set(userID, {
          "reason": user.data.reason || '',
          "dateAdded": user.data.dateAdded || ''
        });
      }
      
      if (user.data && user.data.commandBanned && user.data.commandBanned.length != 0) {
        global.data.commandBanned.set(userID, user.data.commandBanned);
      }
    }
    
    for (const currency of allCurrencies) {
      global.data.allCurrenciesID.push(String(currency.userID));
    }
    
    logger.loader(
      global.getText("loader", "successLoadEnvironmentUser")
    );
    
    logger(
      global.getText("listen", "loadedEnvironment"),
      "[ DATABASE ]"
    );
  } catch (error) {
    return logger.loader(
      global.getText("loader", "failLoadEnvironment", error),
      "error"
    );
  }
})();
	logger(`${api.getCurrentUserID()} - [ ${global.config.PREFIX} ] • ${(!global.config.BOTNAME) ? "This bot was made by CatalizCS and SpermLord" : global.config.BOTNAME}`, "[ BOT INFO ]");
	
	///////////////////////////////////////////////
	//========= Require all handle need =========//
	//////////////////////////////////////////////

	const handleCommand = require("./handle/handleCommand")({ api, models, Users, Threads, Currencies });
	const handleCommandEvent = require("./handle/handleCommandEvent")({ api, models, Users, Threads, Currencies });
	const handleReply = require("./handle/handleReply")({ api, models, Users, Threads, Currencies });
	const handleReaction = require("./handle/handleReaction")({ api, models, Users, Threads, Currencies });
	const handleEvent = require("./handle/handleEvent")({ api, models, Users, Threads, Currencies });
	const handleCreateDatabase = require("./handle/handleCreateDatabase")({  api, Threads, Users, Currencies, models });

	logger.loader(`====== ${Date.now() - global.client.timeStart}ms ======`);

	//////////////////////////////////////////////////
	//========= Send event to handle need =========//
	/////////////////////////////////////////////////

	return (event) => {
		switch (event.type) {
			case "message":
			case "message_reply":
			case "message_unsend":
				handleCreateDatabase({ event });
				handleCommand({ event });
				handleReply({ event });
				handleCommandEvent({ event });
				break;
			case "event":
				handleEvent({ event });
				break;
			case "message_reaction":
				handleReaction({ event });
				break;
			default:
				break;
		}
	};
};

//THIZ BOT WAS MADE BY ME(CATALIZCS) AND MY BROTHER SPERMLORD - DO NOT STEAL MY CODE (つ ͡ ° ͜ʖ ͡° )つ ✄ ╰⋃╯
