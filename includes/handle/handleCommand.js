module.exports = function ({
  api,
  models,
  Users,
  Threads,
  Currencies
}) {
  const log = require("../../utils/log.js");
  const stringSimilarity = require("string-similarity");
  const moment = require("moment-timezone");
  return async function ({ event }) {
    const startTime = Date.now();
    const currentTime = moment.tz("Asia/Ho_Chi_Minh").format("HH:MM:ss L");
    const {
      allowInbox,
      PREFIX,
      ADMINBOT,
      DeveloperMode
    } = global.config;
    const {
      userBanned,
      threadBanned,
      threadInfo,
      threadData,
      commandBanned
    } = global.data;
    const {
      commands,
      cooldowns
    } = global.client;
    var {
      body,
      senderID,
      threadID,
      messageID
    } = event;
    senderID = String(senderID);
    threadID = String(threadID);
    const threadPrefix = threadData.get(threadID) || {};
    const prefixRegex = new RegExp("^(<@!?" + senderID + ">|" + 
      (threadPrefix.hasOwnProperty("PREFIX") ? threadPrefix.PREFIX : PREFIX)
        .replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + ")\\s*");
    if (!prefixRegex.test(body)) {
      return;
    }
    if (userBanned.has(senderID) || threadBanned.has(threadID) || 
        allowInbox == false && senderID == threadID) {
      if (!ADMINBOT.includes(senderID)) {
        if (userBanned.has(senderID)) {
          const { reason, dateAdded } = userBanned.get(senderID) || {};
          return api.sendMessage(
            global.getText("handleCommand", "userBanned", 
              reason ? "- Lý do: " + reason : '', 
              dateAdded ? "- Bị cấm vào: " + dateAdded : ''
            ),
            threadID,
            async (error, info) => {
              await new Promise(resolve => setTimeout(resolve, 5000));
              return api.unsendMessage(info.messageID);
            },
            messageID
          );
        } else if (threadBanned.has(threadID)) {
          const { reason, dateAdded } = threadBanned.get(threadID) || {};
          return api.sendMessage(
            global.getText("handleCommand", "threadBanned",
              reason ? "- Lý do: " + reason : '',
              dateAdded ? "- Bị cấm vào: " + dateAdded : ''
            ),
            threadID,
            async (error, info) => {
              await new Promise(resolve => setTimeout(resolve, 5000));
              return api.unsendMessage(info.messageID);
            },
            messageID
          );
        }
      }
    }
    const [matchedPrefix] = body.match(prefixRegex);
    const args = body.slice(matchedPrefix.length).trim().split(/\s+/);
    const commandName = args.shift().toLowerCase();
    var command = commands.get(commandName);
    if (!command) {
      var allCommands = [];
      const commandKeys = commands.keys();
      for (const key of commandKeys) allCommands.push(key);
      const bestMatch = stringSimilarity.findBestMatch(commandName, allCommands);
      if (bestMatch.bestMatch.rating >= 0.5) {
        command = commands.get(bestMatch.bestMatch.target);
      } else {
        return api.sendMessage(
          global.getText("handleCommand", "commandNotExist", bestMatch.bestMatch.target),
          threadID
        );
      }
    }
    if (commandBanned.has(threadID) || commandBanned.has(senderID)) {
      if (!ADMINBOT.includes(senderID)) {
        const threadBannedCmds = commandBanned.get(threadID) || [];
        const userBannedCmds = commandBanned.get(senderID) || [];
        if (threadBannedCmds.includes(command.config.name)) {
          return api.sendMessage(
            global.getText("handleCommand", "commandThreadBanned", command.config.name),
            threadID,
            async (error, info) => {
              await new Promise(resolve => setTimeout(resolve, 5000));
              return api.unsendMessage(info.messageID);
            },
            messageID
          );
        }
        if (userBannedCmds.includes(command.config.name)) {
          return api.sendMessage(
            global.getText("handleCommand", "commandUserBanned", command.config.name),
            threadID,
            async (error, info) => {
              await new Promise(resolve => setTimeout(resolve, 5000));
              return api.unsendMessage(info.messageID);
            },
            messageID
          );
        }
      }
    }
    if (command.config.commandCategory.toLowerCase() == "nsfw" && 
        !global.data.threadAllowNSFW.includes(threadID) && 
        !ADMINBOT.includes(senderID)) {
      return api.sendMessage(
        global.getText("handleCommand", "threadNotAllowNSFW"),
        threadID,
        async (error, info) => {
          await new Promise(resolve => setTimeout(resolve, 5000));
          return api.unsendMessage(info.messageID);
        },
        messageID
      );
    }
    var threadInfo;
    if (event.isGroup == true) {
      try {
        threadInfo = threadInfo.get(threadID);
        if (Object.keys(threadInfo).length == 0) {
          throw new Error();
        }
      } catch (error) {
        log(global.getText("handleCommand", "cantGetInfoThread", error), "error");
      }
    }
    var permissionLevel = 0;
    const defaultParticipants = { userInfo: [] };
    const userInfo = (threadInfo || defaultParticipants).userInfo.find(
      user => user.id.toString() == senderID.toString()
    );
    
    if (ADMINBOT.includes(senderID)) {
      permissionLevel = 2;
    } else if (!ADMINBOT.includes(senderID.toString()) && userInfo) {
      permissionLevel = 1;
    }
    
    if (command.config.hasPermssion > permissionLevel) {
      return api.sendMessage(
        global.getText("handleCommand", "permssionNotEnough", command.config.name),
        threadID,
        messageID
      );
    }
    if (!cooldowns.has(command.config.name)) {
      cooldowns.set(command.config.name, new Map());
    }
    const timestamps = cooldowns.get(command.config.name);
    const cooldownAmount = (command.config.cooldown || 1) * 1000;
    if (timestamps.has(senderID) && startTime < timestamps.get(senderID) + cooldownAmount) {
      return api.setMessageReaction("⏱", event.messageID, 
        err => err ? log(global.getText("handleCommand", "permssionNotEnough", error), "error") : '', 
        true
      );
    }
    var getText;
    if (command.languages && typeof command.languages == "object" && 
        command.languages.hasOwnProperty(global.config.language)) {
      getText = (...args) => {
        var text = command.languages[global.config.language][args[0]] || '';
        for (var i = args.length; i > 0; i--) {
          const regex = RegExp("%" + i, "g");
          text = text.replace(regex, args[i]);
        }
        return text;
      };
    } else {
      getText = () => {};
    }
    try {
      const commandData = {
        api,
        event,
        args,
        models,
        Users,
        Threads,
        Currencies,
        permssion: permissionLevel,
        getText
      };
      command.run(commandData);
      timestamps.set(senderID, startTime);
      if (DeveloperMode == true) {
        log(
          global.getText("handleCommand", "executeCommand", 
            currentTime, commandName, senderID, threadID, 
            args.join(" "), Date.now() - startTime
          ),
          "[ DEV MODE ]"
        );
      }
      return;
    } catch (error) {
      log(
        global.getText("handleCommand", "commandError", command.config.name, error),
        "error"
      );
      return api.sendMessage(
        global.getText("handleCommand", "commandError", command.config.name, error),
        threadID
      );
    }
  };
};
