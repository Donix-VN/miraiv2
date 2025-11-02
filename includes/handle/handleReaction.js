module.exports = function ({
  api,
  models,
  Users,
  Threads,
  Currencies
}) {
  return function ({ event }) {
    const { handleReaction, commands } = global.client;
    const { messageID, threadID } = event;
    
    if (handleReaction.length !== 0) {
      const reactionIndex = handleReaction.findIndex(item => item.messageID == messageID);
      
      if (reactionIndex < 0) {
        return;
      }
      
      const reactionData = handleReaction[reactionIndex];
      const command = commands.get(reactionData.name);
      
      if (!command) {
        return api.sendMessage(
          global.getText("handleReaction", "missingValue"),
          threadID,
          messageID
        );
      }
      
      try {
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
        
        const reactionParams = {
          api,
          event,
          models,
          Users,
          Threads,
          Currencies,
          handleReaction: reactionData,
          models,
          getText
        };
        
        command.handleReaction(reactionParams);
        return;
      } catch (error) {
        return api.sendMessage(
          global.getText("handleReaction", "executeError", error),
          threadID,
          messageID
        );
      }
    }
  };
};
