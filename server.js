require('dotenv').config();
const express = require('express');
const { MongoClient, ServerApiVersion } = require('mongodb');
const { createSubscription, deleteSubscription, emailListener, SUBSCRIPTION_TRACKER } = require('./subscriptions.js')
const cors = require("cors");

const SERVER_PORT = process.env.SERVER_PORT
const app = express();
app.use(express.json());

//CORS setup - Allow ONLY our frontend in development
app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
  })
);

//MONGODB SETUP
const MONGO_USER = process.env.MONGO_USER;
const MONGO_PASS = process.env.MONGO_PASS;
const uri = `mongodb+srv://${MONGO_USER}:${MONGO_PASS}@rnwozbc.mongodb.net/?appName=CEN5035`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function connectToDatabase() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } catch (error) {
    console.log(`Error connecting to database: ${error}`)
  }
}
connectToDatabase()

//Get stats from database
app.post('/get-stats', async (req, res) => {
  //Check if uniqueId from token exists in request.
  const uniqueId = req.body.uniqueId;

  if (!uniqueId)
    res.status(400).send("Body parameter token is missing. Please try again.");

  //Query DB for User Data using ID
  const query = { _id: uniqueId }
  const userData = await client.db('email-filter-db').collection('user-data').findOne(query)
  if (!userData) {
    //No data found, set up initial data
    const initData = {
      _id: uniqueId,
      stats: {
        totalEmails: 0,
        numSpamEmails: 0,
        numHamEmails: 0
      }
    }

    //Insert it into db
    client.db('email-filter-db').collection('user-data').insertOne(initData)
    //Send it back to client - client can also set values to 0 initially too.
    res.status(202).send(JSON.stringify(initData))
  }

  else {
    //Data found, just return it.
    res.status(200).send(JSON.stringify(userData))
  }
})

//Create subscription
app.post('/create-subscription', async (req, res) => {
  //Check if ID Token exists in request. Needed to set up subscription.
  const accessToken = req.body.accessToken;
  const uniqueId = req.body.uniqueId;

  if (!accessToken || !uniqueId)
    res.status(400).send("Body parameter token is missing. Please try again.");

  else {
    try {
      createSubscription(accessToken, uniqueId)
      res.status(202).send("Subscription successfully created for incoming mail!")
    }
    catch (error) {
      res.status(400).send(`Error creating subscription: ${error}`)
    }
  }

})

//Delete subscription
app.post('/delete-subscription', async (req, res) => {
  //Check if ID Token exists in request. Needed to set up subscription.
  const accessToken = req.body.accessToken;
  const uniqueId = req.body.uniqueId;
  const subscriptionId = SUBSCRIPTION_TRACKER.get(uniqueId)

  if (!accessToken || !uniqueId)
    res.status(400).send("Body parameter token is missing. Please try again.");

  else {
    try {
      deleteSubscription(accessToken, subscriptionId)
      res.status(202).send(`Subscription with id ${subscriptionId} successfully deleted!`)
      SUBSCRIPTION_TRACKER.delete(uniqueId)
    }
    catch (error) {
      res.status(400).send(`Error deleting subscription: ${error}`)
    }
  }

})

//Storing refresh token
app.post('/save-access-token', async (req, res) => {
  //Extract the refresh token and uniqueId from the body for storage
  const accessToken = req.body.accessToken;
  const uniqueId = req.body.uniqueId

  //Insert it into db
  const response = await client.db('email-filter-db').collection('access-tokens').updateOne(
    { "_id": uniqueId },
    { $set: { "accessToken": accessToken } },
    { upsert: true }
  );
  if (response.acknowledged)
    res.status(202).send("Refresh token saved.")
  else
    res.status(400).send("Something went wrong when saving access token. Check Mongo.")
})

//Classifier + Stat Updater
app.post('/predict-and-act', async (req, res) => {
  //Requires subject + body + messageId + uniqueId in req.body
  let accessToken = ""
  let prediction = ""
  let subject = req.body.subject
  let body = req.body.body
  let uniqueId = req.body.uniqueId
  let messageId = req.body.messageId

  // Getting the accessToken from Mongo
  try {
    const response = await client.db('email-filter-db').collection('access-tokens').findOne({ _id: uniqueId });

    if (response) {
      console.log(`Token for user ${uniqueId} found: ${response.accessToken}`);
      accessToken = response.accessToken;
    } else {
      console.log("No token found for the given uniqueId.");
      return res.status(400).send("No token found for the given uniqueId."); 
    }

  } catch (error) {
    console.log(`Error getting access token from Mongo: ${error}`);
    return res.status(400).send("Error getting access token from Mongo."); 
  }


  //Make call to classifier and get results
  const headers = new Headers();
  headers.append("Content-Type", "application/json");

  //Get subject + body from req.body
  const payload = {
    subject: subject,
    body: body
  }

  const options = {
    method: "POST",
    headers: headers,
    body: JSON.stringify(payload)
  };

  try {
    const response = await fetch('http://44.192.67.235:5000/predict', options);

    if (!response.ok) {
      throw new Error(`Server responded with status ${response.status}: ${response.statusText}`);
    }

    const classifier = await response.json();

    // Validate the expected property
    if (!classifier.label) {
      throw new Error('Response does not contain a "label" property');
    }

    console.log(`Email predicted as ${classifier.label}`);
    prediction = classifier.prediction

  } catch (error) {
    console.error('Error classifying email:', error);
    return res.status(400).send("Error classifying email."); 
  }

  //Take actions in DB and Outlook based on classification results
  if (prediction === 0) { //Email declared ham
    try {
      //Updating the DB
      const result = await client.db('email-filter-db').collection('user-data').updateOne(
        { _id: uniqueId },
        {
          $inc: {
            "stats.totalEmails": 1,
            "stats.numHamEmails": 1
          }
        }
      )

      if (result.modifiedCount === 1)
        console.log("Email was declared ham. Stats updated successfully.")
      else
        console.log("Email was declared ham but could not update stats.")
    }
    catch (error) {
      console.log(`Error updating DB stats: ${error}`);
      return res.status(400).send("Error updating DB stats for ham email."); 
    }
  }

  if (prediction === 1) { //Email declared spam
    //Updating the DB
    try {
      const response = await client.db('email-filter-db').collection('user-data').updateOne(
        { _id: uniqueId }, 
        {
          $inc: {
            "stats.totalEmails": 1,
            "stats.numSpamEmails": 1
          }
        }
      )

      if (response.modifiedCount === 1)
        console.log("Email was declared spam. Stats updated successfully.")
      else
        console.log("Email was declared spam but could not update stats.")
    }
    catch (error) {
      console.log(`Error updating DB stats: ${error}`);
      return res.status(400).send("Error updating DB stats for spam email."); 
    }

    //Moving email to junk folder in Outlook
    try {
      const response = await fetch(
        `https://graph.microsoft.com/v1.0/me/messages/${messageId}/move`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ destinationId: 'junkemail' }),
        }
      );

      // Handle response status and body
      if (response.ok) {
        const responseBody = await response.json(); 
        console.log('Email declared spam moved to junk folder.', responseBody);
      } else {
        const errorText = await response.text();  
        console.log(`Error moving mail: ${response.status} ${response.statusText}`, errorText);
        return res.status(400).send("Error moving mail to junk folder in Outlook."); 
      }
    } catch (error) {
      console.error('Fetch failed:', error);
      return res.status(400).send("Failed to move email to junk folder in Outlook."); 
    }
  }

  res.status(200).send("Action completed successfully.");
})







// Listener webhook
app.post('/listen', emailListener)



// Start Server
app.listen(SERVER_PORT, () => {
  console.log(`Server listening on port ${SERVER_PORT}`)
})

