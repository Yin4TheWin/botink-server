const express = require('express');
const { createBot, runBot } = require('./create');
var cors = require('cors')
const app = express()
const port = 3000

app.use(cors())
app.use(express.json());

app.post('/birth/', (req, res) => {
    const clientId = req.body.clientId
    const botToken = req.body.botToken
    const username = req.body.username
    const projectName = req.body.projectName
    if(!(clientId&&botToken&&username&&projectName))
        res.status(500).send({ error: 'Missing fields' })
    else{
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
    }
})

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`)
})