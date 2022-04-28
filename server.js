const express = require('express');
const { createBot, runBot } = require('./create');
var cors = require('cors')
const app = express()
const port = 3000
const { Client } = require('discord.js');

app.use(cors())
app.use(express.json());

app.post('/birth/', (req, res) => {
    //Reading body of POST request: get bot token, username, and desired project name
    const botToken = req.body.botToken
    const username = req.body.username
    const projectName = req.body.projectName

    //Ensure fields aren't empty
    if(!(botToken&&username&&projectName))
        res.status(500).send({ error: 'Missing fields' })
    else{
        //If fields nonempty, attempt to login with provided bot token to check if valid (then immediately logout!)
        const client = new Client({ intents: [] });
        client.login(botToken).then(()=>{
            //Get client ID
            const clientId=client.user.id
            //Immediately logout!
            client.destroy()
            //Attempt to create new directory for your bot
            const create = createBot(clientId, botToken, username, projectName)
            create.on('close', (code)=>{
                if(code==0){
                    //If successful, try to run the newly created bot!
                    const run = runBot(username, projectName)
                    run.on('close', (code, signal)=>{
                        console.log(code, signal)
                    })
                    res.json(req.body)
                }
                else 
                //If unsuccessful, project probably already exists on our file system
                    res.status(500).send({ error: 'dir already exists' })
            })
        }).catch((err)=>{
            //Bot token provided was invalid
            console.log(err)
            client.destroy()
            res.status(500).send({ error: 'invalid token' })
        });
    }
})

app.listen(port, () => {
  console.log(`Example app listening at port ${port}`)
})