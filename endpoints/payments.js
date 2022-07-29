require('dotenv').config()
var express = require('express'),
router = express.Router();

const { exec } = require("child_process");
const stripe = require('stripe')(process.env.STRIPE_TEST_KEY);

var admin = require("firebase-admin");
var serviceAccount = require("../admin.json");
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: process.env.DATABASE_URL
});
var db = admin.database();

const redirectRoot='https://botink.dev/#/'

//Stripe server code:
router.post("/create-checkout-session", async(req, res) => {
    try{
        //Start by creating customer:
        //try retrieving customer by email:
        var customer = await stripe.customers.list({
            email: req.body.email,
        });
        customer = customer.data[0];
        //if fail create new customer:
        if(!customer) {
            console.log("customer created")
            customer = await stripe.customers.create({
                email: req.body.email,
                name: req.body.email,
                metadata: req.body.metadata
            });
        }
        //GET product:
        const product = await stripe.products.create({
            name: 'Subscription for ' + req.body.projName.replaceAll("-", " "),
        });
        //GET Price:
        const newPrice = await stripe.prices.create({
            unit_amount: 499,
            currency: 'usd',
            product: product.id,
            recurring: {interval: 'month'},
            metadata: {'projectName': req.body.projName}
        });
        //LOGGING FOR TESTING
        //console.log(newPrice);
        console.log(redirectRoot+'edit/'+req.body.metadata.uid+"/"+req.body.projName);
        
        const session = await stripe.checkout.sessions.create({
            payment_method_types:['card'],
            mode: 'subscription', 
            customer: customer.id,
            line_items: [
                {
                  price: newPrice.id,
                  // For metered billing, do not pass quantity
                  quantity: req.body.subQuantity,
                },
            ],
            subscription_data: {metadata: {'projectName': req.body.projName, 'uid': req.body.metadata.uid}},
            metadata: {'projectName': req.body.projName, 'uid': req.body.metadata.uid},
            success_url: redirectRoot+'edit/'+req.body.metadata.uid+"/"+req.body.projName,
            cancel_url: redirectRoot+'dashboard'
        })
        res.json({ url: session.url })
    } catch (e)
    {
        console.log("ERROR",e.message)
        res.status(500).json({ error: e.message })
    }
})

router.post("/subscription-status", async(req, res)=>{
    const username = req.body.username
    const projectName = req.body.projectName
    const subscription = await stripe.subscriptions.search({
        query: 'status:\'active\' AND metadata[\'uid\']:\''+username+'\' AND metadata[\'projectName\']:\''+projectName+'\'',
    });
    let status=''
    if(subscription.data.length>0){
        if(subscription.data[0].cancel_at_period_end)
            status='paused'
        else
            status='active'
    }
    else
        status='dead'
    res.status(200).json({status: status})
})

router.post("/manage-subscription", async(req, res) =>{
    //adjust subscription such as canceling and shenanigans
    //Check if customer exists and has valid subscription:
    //Cancel subscription:
    // Authenticate your user.
    var customer = await stripe.customers.list({
        email: req.body.email,
    });
    customer = customer.data[0];
    const session = await stripe.billingPortal.sessions.create({        
        customer: customer.id,
        //Add correct return URL
        return_url: redirectRoot+'edit/'+req.body.metadata.uid+"/"+req.body.projName,
    });
    res.json({ url: session.url })
})

router.post("/pause-subscription", async (req, res) => {
    console.log("searching for "+req.body.uid+" "+req.body.projName)
    //get subscription with email-project name
    var subscriptions = await stripe.subscriptions.search({
        query: 'status:\'active\' AND metadata[\'uid\']:\''+req.body.uid+'\' AND metadata[\'projectName\']:\''+req.body.projName+'\'',
    });
    let subscription = subscriptions.data[0]
    if(subscription){
        console.log("paused")
        stripe.subscriptions.update(subscription.id, {cancel_at_period_end: true});
        //Update customer status in database
        const updateRef=db.ref().child('users/' + subscription.metadata.uid + '/' + subscription.metadata.projectName)
        updateRef.update({
            'status': 'Paused'
        }).then(()=>{
            res.status(200).send("Canceled")
        })
    }
    else{
        console.log("couldnt find")
        res.status(500).send("could not find subscription")
    }
})

router.post("/resume-subscription", async (req, res) => {
    //get subscription with email-project name
    var subscriptions = await stripe.subscriptions.search({
        query: 'status:\'active\' AND metadata[\'uid\']:\''+req.body.uid+'\' AND metadata[\'projectName\']:\''+req.body.projName+'\'',
    });
    let subscription = subscriptions.data[0]
    if(subscription){
        console.log("resumed")
        stripe.subscriptions.update(subscription.id, {cancel_at_period_end: false});
        //Update customer status in database
        db.ref('users/' + subscription.metadata.uid + '/' + subscription.metadata.projectName).get().then(snapshot=>{
            db.ref().child('users/' + subscription.metadata.uid + '/' + subscription.metadata.projectName).update({
                status: snapshot.val().token?'Active':'Ready'
            }).then(()=>{
                res.status(200).send("Resumed")
            })
        })
    }
    else{
        console.log("couldnt find")
        res.status(500).send("could not find subscription")
    }
})

router.post("/webhook", async (req, res) => {
    //These values will be the same across all events: project name, user id, relevant path in database
    const event = req.body
    const session = event.data.object
    const projName = session.metadata.projectName
    const uid = session.metadata.uid
    const path = 'users/' + uid + '/' + projName

    switch (event.type) {
        case 'checkout.session.completed':
          console.log("Completed",uid+" "+projName)
          //On successful payment, check if bot already exists in database
          db.ref(path).get().then(snapshot=>{
              if(!snapshot.exists()){
                //If not, write its name and owner to db
                db.ref(path).set({
                    status: 'Ready'
                });
              } else {
                  //If already existed, customer is probably resubscribing. Just set status to appropriate value based on if customer already entered a token
                  const updateRef=db.ref().child(path)
                  updateRef.update({
                      status: snapshot.val().token?'Active':'Ready'
                  })
              }
          })
          break;
        case 'customer.subscription.deleted':
            console.log("Deleted", uid+" "+projName)
            //Update customer status in database
            const updateRef=db.ref().child(path)
            updateRef.update({
                'status': 'Paused'
            }).then(()=>{
                //Stop bot process from running on our server, if running
                exec("pm2 delete ~/bots/"+uid+"/"+projName+"server.js", (error, stdout, stderr) => {
                    if (error) {
                        console.log("err", stderr)
                        return;
                    }
                    if (stderr) {
                        console.log(stderr)
                        return;
                    }
                })
            })
            break;
        case 'customer.subscription.updated':
            console.log("update")
            break;
        case 'invoice.paid':
          const invoice1 = event.data.object;
          // Then define and call a function to handle the event invoice.paid
          break;
        case 'invoice.payment_succeeded':
          const invoice2 = event.data.object;
          // Then define and call a function to handle the event invoice.payment_succeeded
          break;
        // ... handle other event types
        default:
          console.log(`Unhandled event type ${event.type}`);
      }
  
    res.sendStatus(200);
  });

  module.exports = router