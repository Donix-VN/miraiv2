module.exports = function ({
  api,
  models,
  Users,
  Threads,
  Currencies
}) {
  const log = require("../../utils/log.js");
  const moment = require("moment");
  
  return function ({ event }) {
    const startTime = Date.now();
    const currentTime = moment.tz("Asia/Ho_Chi_minh").format("HH:MM:ss L");
    
    const { userBanned, threadBanned } = global.data;
    const { events } = global.client;
    const { allowInbox, DeveloperMode } = global.config;
    
    var { senderID, threadID } = event;
    senderID = String(senderID);
    threadID = String(threadID);
    
    if (userBanned.has(senderID) || threadBanned.has(threadID) || 
        allowInbox == false && senderID == threadID) {
      return;
    }
    
    for (const [eventName, eventConfig] of events.entries()) {
      if (eventConfig.config.eventType.indexOf(event.eventType) !== -1) {
        const eventModule = events.get(eventName);
        
        try {
          const eventData = {
            api,
            event,
            models,
            Users,
            Threads,
            Currencies
          };
          
          eventModule.run(eventData);
          
          if (DeveloperMode == true) {
            log(
              global.getText("handleEvent", "executeEvent", 
                currentTime, 
                eventModule.config.name, 
                threadID, 
                Date.now() - startTime
              ),
              "[ DEV MODE ]"
            );
          }
        } catch (error) {
          log(
            global.getText("handleEvent", "eventError", 
              eventModule.config.name, 
              JSON.stringify(error)
            ),
            "error"
          );
        }
      }
    }
    
    return;
  };
};
