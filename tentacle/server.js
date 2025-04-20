require('dotenv').config()

const express = require('express');
const cors = require('cors')
const https = require('https');
const fs = require('fs')

const botRoutes = require('./endpoints/bots')
const paymentRoutes = require('./endpoints/payments')

const privateKey  = fs.readFileSync('/etc/letsencrypt/live/discmaker.yinftw.com/privkey.pem', 'utf8');
const certificate = fs.readFileSync('/etc/letsencrypt/live/discmaker.yinftw.com/fullchain.pem', 'utf8');
const credentials = {key: privateKey, cert: certificate};

const app = express()
const port = 443

app.use(cors())
app.use(express.json());

const httpsServer = https.createServer(credentials, app);

app.use('/bots', botRoutes)
app.use('/pay', paymentRoutes)

httpsServer.listen(port, () => {
  console.log('We\'re online!')
})
