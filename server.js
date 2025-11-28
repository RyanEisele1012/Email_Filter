require('dotenv').config();
const express = require('express');
const { MongoClient, ServerApiVersion } = require('mongodb');
const { createSubscription, deleteSubscription } = require('./subscriptions.js')
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
    await client.db('email-filter-db').collection('user-data').updateOne(
      { _id: initData.uniqueId },
      {
        $setOnInsert: {
          stats: initData.stats,
        }
      },
      { upsert: true }
    );

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
  //Check if accessToken and uniqueId exists in request. Needed to set up subscription.
  const accessToken = req.body.accessToken;
  const uniqueId = req.body.uniqueId;

  if (!accessToken || !uniqueId)
    res.status(400).send("Body parameter token is missing. Please try again.");

  //Create subscription and push its to DB
  const subId = await createSubscription(accessToken, uniqueId)

  //Pushing the new sub ID to the DB
  try {
    const pushResponse = await client.db('email-filter-db').collection('subscription-ids').updateOne(
      { "_id": uniqueId },
      { $set: { "subId": subId } },
      { upsert: true }
    );

    // Check if the update was successful (matched or inserted a document)
    if (pushResponse.modifiedCount > 0 || pushResponse.upsertedCount > 0) {
      console.log('Document updated successfully');
    }
    else {
      return res.status(400).json("Error pushing new subId to the database.");
    }
  } catch (error) {
    console.error('Error updating subscription:', error);
    return res.status(400).json({ error: 'Failed to update subscription', details: error.message });
  }
})

//Delete subscription
app.post('/delete-subscription', async (req, res) => {
  //Check if accessToken and uniqueId exists in request. Needed to delete subscription.
  const accessToken = req.body.accessToken;
  const uniqueId = req.body.uniqueId
  let subId = ""

  if (!accessToken)
    res.status(400).send("Body parameter token is missing. Please try again.");

  //Get the subId from the DB
  try {
    const response = await client.db('email-filter-db').collection('subscription-ids').findOne({ _id: uniqueId });

    if (response) {
      console.log(`SubId for user ${uniqueId} found: ${response.subId}`);
      subId = response.subId;

    } else {
      console.log("No subscription found for the given uniqueId.");
      return res.status(400).send("No subscription found for the given uniqueId.");
    }
  } catch (error) {
    console.log(`Error getting access token from Mongo: ${error}`);
    return res.status(400).send("Error getting access token from Mongo.");
  }

  //Use the subId to delete the subscription
  const deleteSubRequest = await deleteSubscription(accessToken, subId)
  if (!deleteSubRequest)
    res.status(400).send("Subscription deletion request using Graph API failed!")

  //Remove current subId from the DB
  try {
    const response = await client.db('email-filter-db').collection('subscription-ids').deleteOne({ _id: uniqueId });

    if (response.deletedCount > 0) {
      // Successfully deleted the document
      console.log('Subscription successfully removed');
      return res.status(200).json({ message: 'Subscription removed successfully' });
    } else {
      // No document matched the _id (i.e., nothing to delete)
      console.log('No matching subscription found');
      return res.status(404).json({ message: 'No subscription found with the provided ID' });
    }
  } catch (error) {
    // Error occurred during the delete operation
    console.error('Error removing subscription:', error);
    return res.status(500).json({ error: 'Failed to remove subscription', details: error.message });
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

//Get email
app.post('/get-email', async (req, res) => {
  // Get messageId and uniqueId from req.body
  let messageId = req.body.messageId;
  let uniqueId = req.body.uniqueId;
  let accessToken = "";
  let subject = "";
  let body = "";

  // Ensure required fields are present in the request body
  if (!messageId || !uniqueId) {
    console.log("Missing required fields: messageId or uniqueId");
    return res.status(400).send("Missing required fields: messageId or uniqueId");
  }

  // Get access token from DB
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

  // Make query to Graph API for the email to get its subject + body
  try {
    const response = await fetch(`https://graph.microsoft.com/v1.0/me/messages/${messageId}?$select=subject,body`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Prefer': 'outlook.body-content-type=text',
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.log(`Error fetching message: ${response.status} ${response.statusText} - ${errorText}`);
      return res.status(400).send(`Error fetching message: ${response.status} ${response.statusText}`);
    }

    const message = await response.json();

    if (!message || !message.subject || !message.body) {
      console.log('No subject or body found in message response:', message);
      return res.status(400).send('No subject or body found in message response.');
    }

    console.log('Message retrieved:', message);
    subject = message.subject;
    body = message.body.content;

  } catch (error) {
    console.error('Error:', error);
    return res.status(400).send('Error processing the message.');
  }

  // Pass the subject, body, uniqueId, and messageId to /predict-and-act
  const requestBody = {
    subject: subject,
    body: body,
    messageId: messageId,
    uniqueId: uniqueId
  };

  // No need to await the response from this as it's not needed
  fetch('http://localhost:8080/predict-and-act', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  }).catch(error => {
    console.error('Error sending data to /predict-and-act:', error);
    return res.status(400).send("Error sending data to /predict-and-act.");
  });

  res.status(200).send("Email retrieved. Moving on to prediction phase...");
});


//Classifier + Stat Updater
app.post('/predict-and-act', async (req, res) => {
  //Requires subject + body + messageId + uniqueId in req.body
  let accessToken = ""
  let prediction = ""
  let subject = req.body.subject
  let body = req.body.body
  let uniqueId = req.body.uniqueId
  let messageId = req.body.messageId

  // Getting the accessToken from DB
  try {
    const response = await client.db('email-filter-db').collection('access-tokens').findOne({ _id: uniqueId });
    // console.log(`Token for user ${uniqueId} found: ${response.accessToken}`);
    accessToken = response.accessToken;
  } catch (error) {
    console.log(`Error getting access token from DB: ${error}`);
    return res.status(400).send("Error getting access token from DB.");
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
    const classifier = await response.json();
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
      await client.db('email-filter-db').collection('user-data').updateOne(
        { _id: uniqueId },
        {
          $inc: {
            "stats.totalEmails": 1,
            "stats.numHamEmails": 1
          }
        }
      )
    }
    catch (error) {
      console.log(`Error updating DB stats for ham email: ${error}`);
      return res.status(400).send("Error updating DB stats for ham email.");
    }
  }

  if (prediction === 1) { //Email declared spam
    //Updating the DB
    try {
      await client.db('email-filter-db').collection('user-data').updateOne(
        { _id: uniqueId },
        {
          $inc: {
            "stats.totalEmails": 1,
            "stats.numSpamEmails": 1
          }
        }
      )
    }
    catch (error) {
      console.log(`Error updating DB stats for spam email: ${error}`);
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
      const responseBody = await response.json();
      console.log('Email declared spam moved to junk folder.', responseBody);

    } catch (error) {
      console.error('Fetch failed:', error);
      return res.status(400).send("Failed to move email to junk folder in Outlook.");
    }
  }

  return res.status(200).send("Action completed successfully.");
})

app.post('/listen', async (req, res) => {
  // Respond with the validation token to complete Subscription validation process
  if (req.query?.validationToken) {
    console.log('[Webhook] Validation');
    return res.type('text/plain').send(req.query.validationToken);
  }

  // Send a 202 Accepted response to acknowledge that the webhook was received
  res.status(202).send('');

  // Then handle the actual notifications (POST request from Microsoft Graph)
  (async () => {
    try {
      const notification = req.body;

      // Log the incoming notification
      if (!notification?.value?.[0]?.resourceData) {
        console.warn('[Webhook] Invalid or empty notification payload');
        return;
      }

      console.log('[Webhook] Notification received:', notification.value[0].resourceData);

      const subId = notification.value[0].subscriptionId;
      const messageId = notification.value[0].resourceData.id;
      let uniqueId = "";

      // Get uniqueId from subscription-ids collection in Mongo DB
      const dbResult = await client
        .db('email-filter-db')
        .collection('subscription-ids')
        .findOne({ subId });

      if (!dbResult) {
        console.warn(`Subscription not found for subId: ${subId}`);
        return;
      }

      uniqueId = dbResult._id;

      // Pass on messageId and uniqueId to /get-email
      const body = { messageId, uniqueId };

      fetch('http://localhost:8080/get-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      }).catch(error => {
        console.error('Error sending data to /get-email:', error);
      });

    } catch (error) {
      console.error('[Webhook] Background processing failed:', error);
    }
  })();
});


// Start Server
app.listen(SERVER_PORT, () => {
  console.log(`Server listening on port ${SERVER_PORT}`)
})

