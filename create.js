const { exec } = require("child_process");
const fs = require('fs')

module.exports={
    //Creating proper directory for bot
    createBot(clientId, botToken, username, projectName){
        //Generate URL for your project
        const dest = "../bots/"+username+"/"+projectName
        //Run the necessary commands to create bot: namely, create new directory, then clone setup files from a base folder into new folder
        return exec("mkdir "+dest+" && cp ../base/index.js "+dest+"&& cp ../base/deploy-commands.js "+dest+" && touch "+dest+"/afkusers.json "+dest+"/remindusers.json "+dest+"/database.json "+dest+"/listeners.json ", (error, stdout, stderr) => {
            if (error) {
                return;
            }
            if (stderr) {
                return;
            }
            //If successful, add bot's config info to config.json
            fs.appendFileSync(dest+'/config.json', JSON.stringify({
                clientId: clientId,
                token: botToken,
                rootDir: "../../"+dest,
                ticketsEnabled: true, 
                modsEnabled: true, 
                musicEnabled: true
            }))
        })
    },
    //Spawning a new process for your bot
    runBot(username, projectName){
        //Again, generting URL where your bot lives
        const dest = "../bots/"+username+"/"+projectName
        //Deploying commands and starting your bot
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