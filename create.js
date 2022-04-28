const { exec } = require("child_process");
const fs = require('fs')

module.exports={
    createBot(clientId, botToken, username, projectName){
        const dest = "../bots/"+username+"/"+projectName
        return exec("mkdir "+dest+" && cp ../base/index.js "+dest+"&& cp ../base/deploy-commands.js "+dest+" && touch "+dest+"/afkusers.json "+dest+"/remindusers.json "+dest+"/database.json "+dest+"/listeners.json ", (error, stdout, stderr) => {
            if (error) {
                return;
            }
            if (stderr) {
                return;
            }
            fs.appendFileSync(dest+'/config.json', JSON.stringify({
                clientId: clientId,
                token: botToken,
                rootDir: "../../"+dest,
                ticketsEnabled: true, 
                modsEnabled: true, 
                musicEnabled: true
            }))
            console.log(`stdout: ${stdout}`);
        })
    },
    runBot(username, projectName){
        const dest = "../bots/"+username+"/"+projectName
        return exec("node "+dest+"/deploy-commands.js && pm2 start "+dest+"/index.js", (error, stdout, stderr) => {
            if (error) {
                console.log("err", stderr)
                return;
            }
            if (stderr) {
                console.log(stderr)
                return;
            }
        })
    }
}