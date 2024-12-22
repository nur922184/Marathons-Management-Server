const express = require('express');
const cors = require('cors');
require('dotenv').config();
const app = express();
const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());

const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.hq6na.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server (only once)
    await client.connect();

    const marathonCollection = client.db('MarathonDB').collection('marathons');
    const applicationCollection = client.db('MarathonDB').collection('applications');

    // GET route to fetch data from MongoDB
    app.get('/marathons', async (req, res) => {
      try {
        const result = await marathonCollection.find().toArray();
        res.send(result);
      } catch (error) {
        res.status(500).send({ error: 'Failed to fetch marathons' });
      }
    });

    app.post('/marathons', async (req, res) => {
      try {
        const marathon = req.body; // Get the marathon data from the client
        const result = await marathonCollection.insertOne(marathon); // Insert into MongoDB
        res.status(201).send(result); // Send the response
      } catch (error) {
        console.error('Error adding marathon:', error);
        res.status(500).send({ message: 'Failed to add marathon' });
      }
    });

    // app.get('/applications', async (req, res) => {
    //   try {
    //     const userEmail = req.query.email;
    //     const query = { email: userEmail };
    //     const applications = await applicationCollection.find(query).toArray();
    //     res.send(applications);
    //   } catch (err) {
    //     res.status(500).send({ error: 'Failed to fetch applications.' });
    //   }
    // });
    app.get("/applications", async (req, res) => {
      try {
        const email = req.query.email; // ইমেলটি কুয়েরি প্যারামিটার থেকে সংগ্রহ করুন
        if (!email) {
          return res.status(400).json({ message: "Email is required" });
        }

        const applications = await applicationCollection.find({ email }).toArray();
        res.json(applications);
      } catch (error) {
        console.error("Error fetching applications:", error);
        res.status(500).json({ message: "Failed to fetch applications" });
      }
    });


    app.get("/applications", async (req, res) => {
      try {
        const applications = await applicationCollection.find({}).toArray();
        res.json(applications);
      } catch (error) {
        console.error("Error fetching applications:", error);
        res.status(500).json({ message: "Failed to fetch applications" });
      }
    });

    app.post('/applications', async (req, res) => {
      try {
        const newApplication = req.body;
        const result = await applicationCollection.insertOne(newApplication);

        // Increment registration count in marathon
        await marathonCollection.updateOne(
          { _id: new ObjectId(newApplication.marathonId) },
          { $inc: { registrationCount: 1 } }
        );

        res.send(result);
      } catch (err) {
        res.status(500).send({ error: 'Failed to submit application.' });
      }
    });

    app.put('/applications/:id', async (req, res) => {
      try {
        const id = req.params.id;
        const updatedApplication = req.body;
        const result = await applicationCollection.updateOne(
          { _id: new ObjectId(id) },
          { $set: updatedApplication }
        );
        res.send(result);
      } catch (err) {
        res.status(500).send({ error: 'Failed to update application.' });
      }
    });

    app.delete('/applications/:id', async (req, res) => {
      try {
        const id = req.params.id;

        // Retrieve application before deleting
        const application = await applicationCollection.findOne({ _id: new ObjectId(id) });

        // Decrement registration count in marathon
        await marathonCollection.updateOne(
          { _id: new ObjectId(application.marathonId) },
          { $inc: { registrationCount: -1 } }
        );

        const result = await applicationCollection.deleteOne({ _id: new ObjectId(id) });
        res.send(result);
      } catch (err) {
        res.status(500).send({ error: 'Failed to delete application.' });
      }
    });

    // Ping to confirm a successful connection
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } catch (error) {
    console.error(error);
  }
}

run().catch(console.dir);

app.get('/', (req, res) => {
  res.send('assessment-eleven-server port');
});

app.listen(port, () => {
  console.log(`assessment eleven server is running on port: ${port}`);
});
