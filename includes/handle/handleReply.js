module.exports = function ({
  api,
  models,
  Users,
  Threads,
  Currencies
}) {
  return function ({ event }) {
    if (!event.messageReply) {
      return;
    }
    
    const { handleReply, commands } = global.client;
    const { messageID, threadID, messageReply } = event;
    
    if (handleReply.length !== 0) {
      const replyIndex = handleReply.findIndex(item => item.messageID == messageReply.messageID);
      
      if (replyIndex < 0) {
        return;
      }
      
      const replyData = handleReply[replyIndex];
      const command = commands.get(replyData.name);
      
      if (!command) {
        return api.sendMessage(
          global.getText("handleReply", "missingValue"),
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
        
        const replyParams = {
          api,
          event,
          models,
          Users,
          Threads,
          Currencies,
          handleReply: replyData,
          models,
          getText
        };
        
        command.handleReply(replyParams);
        return;
      } catch (error) {
        return api.sendMessage(
          global.getText("handleReply", "executeError", error),
          threadID,
          messageID
        );
      }
    }
  };
};
