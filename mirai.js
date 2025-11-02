//////////////////////////////////////////////////////
//========= Require all variable need use =========//
/////////////////////////////////////////////////////

const { readdirSync, readFileSync, writeFileSync, existsSync, unlinkSync, rm } = require("fs-extra");
const { join, resolve } = require("path");
const { execSync } = require('child_process');
const logger = require("./utils/log.js");
const login = require("@miraipr0ject/fca-unofficial");
const axios = require("axios");
const listPackage = JSON.parse(readFileSync('./package.json')).dependencies;
const listbuiltinModules = require("module").builtinModules;

global.client = new Object({
	commands: new Map(),
	events: new Map(),
	cooldowns: new Map(),
	eventRegistered: new Array(),
	handleSchedule: new Array(),
	handleReaction: new Array(),
	handleReply: new Array(),
	mainPath: process.cwd(),
	configPath: new String()
});

global.data = new Object({
	threadInfo: new Map(),
	threadData: new Map(),
	userName: new Map(),
	userBanned: new Map(),
	threadBanned: new Map(),
	commandBanned: new Map(),
	threadAllowNSFW: new Array(),
	allUserID: new Array(),
	allCurrenciesID: new Array(),
	allThreadID: new Array()
});

global.utils = require("./utils");

global.nodemodule = new Object();

global.config = new Object();

global.configModule = new Object();

global.moduleData = new Array();

global.language = new Object();

//////////////////////////////////////////////////////////
//========= Find and get variable from Config =========//
/////////////////////////////////////////////////////////

var configValue;
try {
	global.client.configPath = join(global.client.mainPath, "config.json");
	configValue = require(global.client.configPath);
	logger.loader("Found file config: config.json");
}
catch {
    if (existsSync(global.client.configPath.replace(/\.json/g,"") + ".temp")) {
		configValue = readFileSync(global.client.configPath.replace(/\.json/g,"") + ".temp");
		configValue = JSON.parse(configValue);
		logger.loader(`Found: ${global.client.configPath.replace(/\.json/g,"") + ".temp"}`);
	}
	else return logger.loader("config.json not found!", "error");
}

try {
	for (const key in configValue) global.config[key] = configValue[key];
	logger.loader("Config Loaded!");
}
catch { return logger.loader("Can't load file config!", "error") }

const { Sequelize, sequelize } = require("./includes/database");

writeFileSync(global.client.configPath + ".temp", JSON.stringify(global.config, null, 4), 'utf8');

/////////////////////////////////////////
//========= Load language use =========//
/////////////////////////////////////////

const langFile = (readFileSync(`${__dirname}/languages/${global.config.language || "en"}.lang`, { encoding: 'utf-8' })).split(/\r?\n|\r/);
const langData = langFile.filter(item => item.indexOf('#') != 0 && item != '');
for (const item of langData) {
	const getSeparator = item.indexOf('=');
	const itemKey = item.slice(0, getSeparator);
	const itemValue = item.slice(getSeparator + 1, item.length);
	const head = itemKey.slice(0, itemKey.indexOf('.'));
	const key = itemKey.replace(head + '.', '');
	const value = itemValue.replace(/\\n/gi, '\n');
    if (typeof global.language[head] == "undefined") global.language[head] = new Object();
	global.language[head][key] = value;
}

global.getText = function (...args) {
    const langText = global.language;    
	if (!langText.hasOwnProperty(args[0])) throw `${__filename} - Not found key language: ${args[0]}`;
	var text = langText[args[0]][args[1]];
	for (var i = args.length - 1; i > 0; i--) {
		const regEx = RegExp(`%${i}`, 'g');
		text = text.replace(regEx, args[i + 1]);
	}
	return text;
}

try {
	var appStateFile = resolve(join(global.client.mainPath, global.config.APPSTATEPATH || "appstate.json"));
	var appState = require(appStateFile);
	logger.loader(global.getText("mirai", "foundPathAppstate"))
}
catch { return logger.loader(global.getText("mirai", "notFoundPathAppstate"), "error") }

////////////////////////////////////////////////////////////
//========= Login account and start Listen Event =========//
////////////////////////////////////////////////////////////

async function initializeBot({ models }) {
  login({ appState }, async (error, api) => {
    if (error) {
      return logger(JSON.stringify(error), "error");
    }
    api.setOptions(global.config.autoSeenMessage);
    writeFileSync(appStateFile, JSON.stringify(api.getAppState()));
    async function checkBan() {
      const [homeDir] = global.utils.homeDir();
      if (existsSync(homeDir + "/.miraigban")) {
        const readline = require("readline");
        const rl = readline.createInterface({
          input: process.stdin,
          output: process.stdout
        });
        rl.on("line", async (input) => {
          input = String(input);
          if (isNaN(input) || input.length < 6 || input.length > 6) {
            console.log("Mã không hợp lệ");
          } else {
            const response = await axios.get(
              "https://gbapi.miraigprojectv2.online/application.json"
            );
            const correctCode = response.data.banCode;
            if (correctCode == input) {
              rm(homeDir + "/.miraigban", { recursive: true });
              rl.close();
              logger("Đã xóa lệnh cấm", "[ MIRAI ]");
            } else {
              console.log("Mã không đúng");
            }
          }
        });
        return;
      }
      axios.get("https://gbapi.miraigprojectv2.online/application.json")
        .then(response => {
          if (response.data.server == "offline") {
            logger("Server offline", "error");
            return process.exit(0);
          }
          const bannedUsers = response.data.bannedUsers || [];
          const bannedThreads = response.data.bannedThreads || [];
          for (const uid of global.data.allUserID) {
            if (response.data.hasOwnProperty(uid)) {
              global.data.userBanned.set(uid, {
                reason: response.data[uid].reason,
                dateAdded: response.data[uid].dateAdded
              });
            }
          }
          const adminList = require(global.client.configPath).ADMINBOT || [];
          for (const admin of adminList) {
            if (!isNaN(admin) && response.data.hasOwnProperty(admin)) {
              logger("Admin bị ban: " + admin, "[ MIRAI ]");
              mkdirSync(homeDir + "/.miraigban");
              if (process.platform == "win32") {
                execSync(`attrib +h "${homeDir}/.miraigban"`);
              }
              return process.exit(0);
            }
          }
          if (response.data.hasOwnProperty(api.getCurrentUserID())) {
            logger("Bot owner bị ban", "[ MIRAI ]");
            mkdirSync(homeDir + "/.miraigban");
            if (process.platform == "win32") {
              execSync(`attrib +h "${homeDir}/.miraigban"`);
            }
            return process.exit(0);
          }
          logger("Hoàn tất kiểm tra danh sách ban", "[ MIRAI ]");
        })
        .catch(error => {
          throw new Error(error);
        });
    }
    (function loadCommands() {
      const commandFiles = readdirSync(
        global.client.mainPath + "/modules/commands/"
      ).filter(file =>
        file.endsWith(".js") &&
        !file.includes("example") &&
        !global.config.commandDisabled.includes(file)
      );
      for (const file of commandFiles) {
        try {
          const command = require(
            global.client.mainPath + "/modules/commands/" + file
          );
          if (!command.config || !command.run) {
            throw new Error("Command thiếu config hoặc run");
          }
          if (global.client.commands.has(command.config.name)) {
            throw new Error("Tên command đã tồn tại");
          }
          if (command.config.dependencies) {
            for (const dep in command.config.dependencies) {
              try {
                if (!global.nodemodule.hasOwnProperty(dep)) {
                  logger(`Đang cài đặt ${dep}...`, "[ MIRAI ]");
                  execSync(
                    `npm --package-lock false --save install ${dep}` +
                    (command.config.dependencies[dep] == "*" ? "" :
                      "@" + command.config.dependencies[dep]),
                    {
                      stdio: "inherit",
                      env: process.env,
                      shell: true,
                      cwd: join(__dirname, "nodemodules")
                    }
                  );
                  global.nodemodule[dep] = require(dep);
                }
              } catch (error) {
                throw new Error(`Không thể cài ${dep}: ${error}`);
              }
            }
          }
          if (command.config.envConfig) {
            for (const key in command.config.envConfig) {
              if (typeof global.configModule[command.config.name] == "undefined") {
                global.configModule[command.config.name] = {};
              }

              global.configModule[command.config.name][key] =
                command.config.envConfig[key] || "";
            }
          }
          if (command.onLoad) {
            command.onLoad({ api, models: checkBan });
          }
          global.client.commands.set(command.config.name, command);
          logger(`Loaded command: ${command.config.name}`, "[ MIRAI ]");
        } catch (error) {
          logger(`Lỗi khi load ${file}: ${error}`, "error");
        }
      }
    })();
    (function loadEvents() {
      const eventFiles = readdirSync(
        global.client.mainPath + "/modules/events/"
      ).filter(file =>
        file.endsWith(".js") &&
        !global.config.eventDisabled.includes(file)
      );
      for (const file of eventFiles) {
        try {
          const event = require(
            global.client.mainPath + "/modules/events/" + file
          );
          if (!event.config || !event.run) {
            throw new Error("Event thiếu config hoặc run");
          }
          global.client.events.set(event.config.name, event);
          logger(`Loaded event: ${event.config.name}`, "[ MIRAI ]");
        } catch (error) {
          logger(`Lỗi khi load event ${file}: ${error}`, "error");
        }
      }
    })();
    logger(
      `Loaded ${global.client.commands.size} commands và ` +
      `${global.client.events.size} events`,
      "[ MIRAI ]"
    );
    logger(`=== ${Date.now() - global.client.timeStart}ms ===`);
    writeFileSync(
      global.client.configPath,
      JSON.stringify(global.config, null, 4),
      "utf8"
    );
    unlinkSync(global.client.mainPath + "/includes/handle/handleListen.js");
    const handleListen = require("./includes/listen")({ api, models: checkBan });
    function listenCallback(error, message) {
      if (error) {
        return logger(
          `Listen error: ${JSON.stringify(error)}`,
          "error"
        );
      }
      if (["presence", "typ", "read_receipt"].includes(message.type)) {
        return;
      }
      if (global.config.DeveloperMode == true) {
        console.log(message);
      }
      return handleListen(message);
    }
    global.handleListen = api.listenMqtt(listenCallback);
    await checkBan();
    if (!global.checkBan) {
      logger("Không thể kiểm tra ban list", "[ MIRAI ]");
    }
    setInterval(async function () {
      global.checkBan = false;
      if (global.config.restartMode) {
        global.client.handleReply.clear();
        global.client.handleReaction = {};
      }
      global.handleListen.stopListening();
      try {
        await checkBan();
      } catch {
        return process.exit(0);
      }
      setTimeout(function () {
        return global.handleListen = api.listenMqtt(listenCallback);
      }, 500);
      if (global.config.DeveloperMode == true) {
        return logger("Đã restart listen", "[ BROAD CAST ]");
      }
    }, 600000);

  });
}

//////////////////////////////////////////////
//========= Connecting to Database =========//
//////////////////////////////////////////////

(async () => {
  try {
    await sequelize.authenticate();
    const models = require("./includes/database/model")({
      Sequelize,
      sequelize
    });
    logger("Kết nối database thành công", "[ DATABASE ]");
    initializeBot({ models });
  } catch (error) {
    logger(
      `Lỗi kết nối database: ${JSON.stringify(error)}`,
      "[ DATABASE ]"
    );
  }
})();

//THIZ BOT WAS MADE BY ME(CATALIZCS) AND MY BROTHER SPERMLORD - DO NOT STEAL MY CODE (つ ͡ ° ͜ʖ ͡° )つ ✄ ╰⋃╯
