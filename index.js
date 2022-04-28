const express = require('express');
const { createBot, runBot } = require('./create');
var cors = require('cors')
const app = express()
const port = 3000
const { Client } = require('discord.js');

app.use(cors())
app.use(express.json());

app.post('/birth/', (req, res) => {
    const botToken = req.body.botToken
    const username = req.body.username
    const projectName = req.body.projectName
    if(!(botToken&&username&&projectName))
        res.status(500).send({ error: 'Missing fields' })
    else{
        const client = new Client({ intents: [] });
        client.login(botToken).then(()=>{
            const clientId=client.user.id
            client.destroy()
            const create = createBot(clientId, botToken, username, projectName)
            create.on('close', (code)=>{
                if(code==0){
                    const run = runBot(username, projectName)
                    run.on('close', (code, signal)=>{
                        console.log(code, signal)
                    })
                    res.json(req.body)
                }
                else 
                    res.status(500).send({ error: 'dir already exists' })
            })
        }).catch((err)=>{
            console.log(err)
            client.destroy()
            res.status(500).send({ error: 'invalid token' })
        });
    }
})

app.listen(port, () => {
  console.log(`Example app listening at port ${port}`)
})