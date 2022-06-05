require('dotenv').config()
const express = require('express');
const { createBot, runBot, verifyBot } = require('./create');
var cors = require('cors')
const { Client } = require('discord.js');
var https = require('https');
//Stripe setup tings:
const stripe = require('stripe')(process.env.STRIPE_TEST_KEY);
const { exec } = require("child_process");
const fs = require('fs')
var privateKey  = fs.readFileSync('/etc/letsencrypt/live/discmaker.yinftw.com/privkey.pem', 'utf8');
var certificate = fs.readFileSync('/etc/letsencrypt/live/discmaker.yinftw.com/fullchain.pem', 'utf8');
var credentials = {key: privateKey, cert: certificate};

const app = express()
const port = 443
app.use(cors())
app.use(express.json());
var httpsServer = https.createServer(credentials, app);

app.post('/verify', (req, res)=>{
    const botToken = req.body.botToken
    const username = req.body.username
    const projectName = req.body.projectName
    //Ensure fields aren't empty
    if(!(botToken&&username&&projectName))
        res.status(400).send({ error: 'Missing fields' })
    const dest = "../bots/"+username+"/"+projectName
    const client = new Client({ intents: [] });
    client.login(botToken).then(()=>{
        //Immediately logout!
        client.destroy()
        if(fs.existsSync(dest))
            res.status(400).send("dir exists")
        else
            res.status(200).json(req.body)
    }).catch((err)=>{
        //Bot token provided was invalid
        console.log(err.message)
        client.destroy()
        res.status(400).send(err.message)
    });
})

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
//Stripe server code:
app.post("/create-checkout-session", async(req, res) => 
{
    console.log("HELLO!")
    try{
        const product = await stripe.products.create({
            name: 'BotInk Subscription',
            default_price_data: {
              unit_amount: 1000,
              currency: 'usd',
              recurring: {interval: 'month'},
            },
            expand: ['default_price'],
          });
        const prices = await stripe.prices.create({
            product: product.id,
            unit_amount: 499,
            currency: 'usd',
            recurring: {interval: 'month'},
        });
        const session = await stripe.checkout.sessions.create({
            payment_method_types:['card'],
            mode: 'subscription', 
            line_items: [
                {
                  price: prices.id,
                  // For metered billing, do not pass quantity
                  quantity: req.body.subQuantity,
                },
              ],
            success_url: process.env.CLIENT_URL,
            cancel_url: process.env.CLIENT_URL
        })
        res.json({ url: session.url })
    } catch (e)
    {
        res.status(500).json({ error: e.message })
    }
})

httpsServer.listen(port, () => {
  console.log(`Example app listening at port ${port}`)
})
