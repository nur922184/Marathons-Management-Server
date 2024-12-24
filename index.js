const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: [
    'http://localhost:5173',
    'https://assignment-eleven-8d2c2.web.app',
    'https://assignment-eleven-8d2c2.firebaseapp.com'
  ]
}))
app.use(express.json());

// MongoDB connection
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.hq6na.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // await client.connect();

    const db = client.db('MarathonDB');
    const marathonCollection = db.collection('marathons');
    const applicationCollection = db.collection('applications');
    const upcomingCollection = db.collection('upcoming');

    // ====== Marathon Routes ======

    //upcoming all 


    app.get('/upcoming', async (req, res) => {
      const result = await upcomingCollection.find().toArray();
      res.send(result);
    })

    // Get all marathons
    app.get('/marathons', async (req, res) => {
      const email = req.query.email;
      const filter = email ? { email } : {};
      try {
        const marathons = await marathonCollection.find(filter).toArray();
        res.send(marathons);
      } catch (error) {
        res.status(500).send({ error: 'Failed to fetch marathons' });
      }
    });

    // Get single marathon by ID
    app.get('/marathons/:id', async (req, res) => {
      const { id } = req.params;
      try {
        const marathon = await marathonCollection.findOne({ _id: new ObjectId(id) });
        if (!marathon) {
          return res.status(404).send({ error: 'Marathon not found' });
        }
        res.send(marathon);
      } catch (error) {
        res.status(500).send({ error: 'Failed to fetch marathon' });
      }
    });

    // Add a new marathon
    app.post('/marathons', async (req, res) => {
      const marathon = req.body;
      try {
        const result = await marathonCollection.insertOne(marathon);
        res.status(201).send(result);
      } catch (error) {
        res.status(500).send({ error: 'Failed to add marathon' });
      }
    });

    // Update marathon by ID
    app.put('/marathons/:id', async (req, res) => {
      const id = req.params.id;
      const { title, location, startDate } = req.body;

      if (!title || !location || !startDate) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      try {
        const result = await MarathonModel.findByIdAndUpdate(id, {
          title,
          location,
          startDate
        });

        if (!result) {
          return res.status(404).json({ error: "Marathon not found" });
        }

        res.status(200).json({ message: "Marathon updated successfully" });
      } catch (error) {
        console.error("Error updating marathon:", error);
        res.status(500).json({ error: "Failed to update marathon" });
      }
    });


    // Delete marathon by ID
    app.delete('/marathons/:id', async (req, res) => {
      const { id } = req.params;
      try {
        const result = await marathonCollection.deleteOne({ _id: new ObjectId(id) });
        if (result.deletedCount === 0) {
          return res.status(404).send({ error: 'Marathon not found' });
        }
        res.send({ message: 'Marathon deleted successfully' });
      } catch (error) {
        res.status(500).send({ error: 'Failed to delete marathon' });
      }
    });

    // Get paginated marathons
    // Get paginated marathons

    // app.get('/marathons', async (req, res) => {
    //   const page = parseInt(req.query.page) || 0;
    //   const size = parseInt(req.query.size) || 10;
    //   console.log('pagination query', { page, size }); // Debug log
    //   const result = await marathonCollection.find({}).skip(page * size).limit(size).toArray();
    //   res.send(result);
    // });

    app.get('/marathons', async (req, res) => {
      const page = Math.max(0, parseInt(req.query.page) || 0); // পেজ 0 বা তার বেশি হবে
      const size = Math.max(1, parseInt(req.query.size) || 10); // সাইজ 1 বা তার বেশি হবে

      console.log('Page:', page, 'Size:', size);

      try {
        const cursor = marathonCollection.find();
        const result = await cursor
          .skip(page * size) // Pagination logic
          .limit(size)
          .toArray();

        const totalCount = await marathonCollection.countDocuments();

        res.send({
          totalCount, // Total items in the database
          result, // Paginated items
        });
      } catch (error) {
        console.error('Error fetching marathons:', error);
        res.status(500).send({ error: 'Failed to fetch marathons' });
      }
    });




    // Get total count of marathons
    app.get('/productsCount', async (req, res) => {
      try {
        const count = await marathonCollection.estimatedDocumentCount();
        res.send({ count });
      } catch (error) {
        console.error("Error fetching count:", error);
        res.status(500).send({ error: "Internal Server Error" });
      }
    });




    // ====== Application Routes ======
    // Get all applications or filter by user email
    app.get('/applications', async (req, res) => {
      const email = req.query.email;
      const filter = email ? { email } : {};
      try {
        const applications = await applicationCollection.find(filter).toArray();
        res.send(applications);
      } catch (error) {
        res.status(500).send({ error: 'Failed to fetch applications' });
      }
    });

    // Add a new application
    app.post('/applications', async (req, res) => {
      const application = req.body;
      try {
        const result = await applicationCollection.insertOne(application);

        // Update the related marathon's registration count
        await marathonCollection.updateOne(
          { _id: new ObjectId(application.marathonId) },
          { $inc: { registrationCount: 1 } }
        );

        res.status(201).send(result);
      } catch (error) {
        res.status(500).send({ error: 'Failed to save application' });
      }
    });

    // Update application by ID
    app.put('/applications/:id', async (req, res) => {
      const { id } = req.params;
      const updatedData = req.body;
      try {
        const result = await applicationCollection.updateOne(
          { _id: new ObjectId(id) },
          { $set: updatedData }
        );
        if (result.modifiedCount === 0) {
          return res.status(404).send({ error: 'Application not found' });
        }
        res.send({ message: 'Application updated successfully' });
      } catch (error) {
        res.status(500).send({ error: 'Failed to update application' });
      }
    });

    // Delete application by ID
    app.delete('/applications/:id', async (req, res) => {
      const { id } = req.params;
      try {
        const application = await applicationCollection.findOne({ _id: new ObjectId(id) });

        if (!application) {
          return res.status(404).send({ error: 'Application not found' });
        }

        // Decrement registration count in the related marathon
        await marathonCollection.updateOne(
          { _id: new ObjectId(application.marathonId) },
          { $inc: { registrationCount: -1 } }
        );

        const result = await applicationCollection.deleteOne({ _id: new ObjectId(id) });
        res.send(result);
      } catch (error) {
        res.status(500).send({ error: 'Failed to delete application' });
      }
    });

    // console.log('Successfully connected to MongoDB!');
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
  }
}

run().catch(console.dir);

// Default route
app.get('/', (req, res) => {
  res.send('Server is running...');
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
