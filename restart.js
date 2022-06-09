//script to restart all bots with an active subscription
require('dotenv').config()
const { exec } = require("child_process");
var admin = require("firebase-admin");

var serviceAccount = require("./admin.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: process.env.DATABASE_URL
});

var db = admin.database();
var ref = db.ref("users");
ref.once("value", function(snapshot) {
  for (const [uid, bots] of Object.entries(snapshot.val())) {
    for (const [botName, botInfo] of Object.entries(bots)){
      if(botInfo.status==='Active'){
        console.log("starting bots/"+uid+"/"+botName+"/index.js")
        exec("pm2 start ../bots/"+uid+"/"+botName+"/index.js")
      }
    }
  }
});