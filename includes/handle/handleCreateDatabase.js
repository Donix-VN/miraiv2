module.exports = function ({
  Users,
  Threads,
  Currencies
}) {
  const log = require("../../utils/log.js");
  
  return async function ({ event }) {
    const {
      allUserID,
      allCurrenciesID,
      allThreadID,
      userName,
      threadInfo
    } = global.data;
    
    const { autoCreateDB } = global.config;
    
    if (autoCreateDB == false) {
      return;
    }
    
    var { senderID, threadID } = event;
    senderID = String(senderID);
    threadID = String(threadID);
    
    try {
      if (!allThreadID.has(threadID) && event.isGroup == true) {
        const threadData = await Threads.getInfo(threadID);
        const threadInfoData = {
          threadName: threadData.name,
          adminIDs: threadData.adminIDs,
          userInfo: threadData.userInfo
        };
        
        allThreadID.push(threadID);
        threadInfo.set(threadID, threadInfoData);
        
        const newThreadData = {
          threadName: threadInfoData,
          data: {}
        };
        await Threads.setData(threadID, newThreadData);
        
        for (singleData of threadData.userInfo) {
          userName.set(String(singleData.id), singleData.nicknames);
          
          try {
            if (global.data.allUserID.includes(String(singleData.id))) {
              await Users.setData(String(singleData.id), {
                "name": singleData.nicknames
              });
              global.data.allUserID.push(singleData.id);
            } else {
              await Users.createData(singleData.id, {
                "name": singleData.nicknames,
                "data": {}
              });
              global.data.data.allUserID.push(String(singleData.id));
              log(global.getText("handleCreateDatabase", "newUser", singleData.id), "[ DATABASE ]");
            }
          } catch {}
        }
        
        log(global.getText("handleCreateDatabase", "newThread", threadID), "[ DATABASE ]");
      }
      
      if (!allUserID.includes(senderID) || !userName.has(senderID)) {
        const userInfo = await Users.getInfo(senderID);
        const userData = {
          name: userInfo.name
        };
        
        await Users.createData(senderID, userData);
        allUserID.push(senderID);
        userName.set(senderID, userInfo.name);
        log(global.getText("handleCreateDatabase", "newUser", senderID), "[ DATABASE ]");
      }
      
      if (!allCurrenciesID.has(senderID)) {
        const currencyData = {
          data: {}
        };
        await Currencies.createData(senderID, currencyData);
        allCurrenciesID.push(senderID);
      }
      
      return;
    } catch (error) {
      return console.log(error);
    }
  };
};
