require('dotenv').config();
const express = require('express');
const { MongoClient, ServerApiVersion } = require('mongodb');

const SERVER_PORT = process.env.SERVER_PORT
const app = express();
app.use(express.json());

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
  //Check if token exists in request. Needed for user ID.
  const accessToken = req.body.accessToken;
  if (!accessToken)
    res.status(400).send("Access token missing in body.");

  //Extract the user ID. It's the unique identifier for the DB.
  const userId = accessToken.id;

  //Query DB for User Data using ID
  const query = {_id: userId}
  const userData = await client.db('email-filter-db').collection('user-data').findOne(query)
  if (!userData) { 
    //No data found, set up initial data
    const initData = {
      _id: userId,
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
app.post('/create-subscription', (req, res) => {
  //Check if token exists in request

  //Pass token to 
})

// Webhook



// Start Server
app.listen(SERVER_PORT, () => {
  console.log(`Server listening on port ${SERVER_PORT}`)
})

