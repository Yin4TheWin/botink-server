//script to restart all bots with an active subscription
require('dotenv').config()
const util = require('util');
const exec = util.promisify(require('child_process').exec);
var admin = require("firebase-admin");

var serviceAccount = require("../admin.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://botmaker-801b9-default-rtdb.firebaseio.com'
});

var db = admin.database();
var ref = db.ref("users");
ref.once("value", async function(snapshot) {
  for (const [uid, bots] of Object.entries(snapshot.val())) {
    for (const [botName, botInfo] of Object.entries(bots)){
      if(botInfo.status==='Active'){
        console.log("deleting bots/"+uid+"/"+botName+"/index.js")
        try{
          const { stdout, stderr } = await exec("pm2 delete ../../bots/"+uid+"/"+botName+"/index.js");
          console.log('stdout:', stdout);
          console.log('stderr:', stderr)
        } catch(e){

        }
        console.log("starting bots/"+uid+"/"+botName+"/index.js")
        try{
          const { stdout1, stderr1 } = await exec("node ../../bots/"+uid+"/"+botName+"/deploy-commands.js");
          console.log('stdout:', stdout1);
          console.log('stderr:', stderr1)
        } catch(e){

        }
        try{
          const { stdout2, stderr2 } = await exec("pm2 start ../../bots/"+uid+"/"+botName+"/index.js");
          console.log('stdout:', stdout2);
          console.log('stderr:', stderr2)
        } catch(e){

        }
      }
    }
  }
  console.log("Done!")
  process.exit(1);
})