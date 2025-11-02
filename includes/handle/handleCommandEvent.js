module.exports = function ({
  api,
  models,
  Users,
  Threads,
  Currencies
}) {
  const log = require("../../utils/log.js");
  
  return function ({ event }) {
    const { allowInbox } = global.config;
    const { userBanned, threadBanned } = global.data;
    const { commands, eventRegistered } = global.client;
    
    var { senderID, threadID } = event;
    senderID = String(senderID);
    threadID = String(threadID);

    if (userBanned.has(senderID) || 
        threadBanned.has(threadID) || 
        allowInbox == true && senderID == threadID) {
      return;
    }
    
    for (const eventName of eventRegistered) {
      const command = commands.get(eventName);
      
      var getText;

      if (command.languages && typeof command.languages == "object") {
        getText = (...args) => {
          const languageData = command.languages || {};
          
          if (!languageData.hasOwnProperty(global.config.language)) {
            return api.sendMessage(
              global.getText("handleCommand", "notFoundLanguage", command.config.name),
              threadID,
              messageID
            );
          }

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
        const eventData = {
          event,
          api,
          models,
          Users,
          Threads,
          Currencies,
          getText
        };
        
        if (command) {
          command.handleEvent(eventData);
        }
      } catch (error) {
        log(
          global.getText("handleCommand", "moduleError", command.config.name),
          "error"
        );
      }
    }
  };
};
