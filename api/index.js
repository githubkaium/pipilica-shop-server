const express = require('express');
const swaggerJSDoc = require('swagger-jsdoc');
const swaggerUI = require('swagger-ui-express');
const cors = require('cors');
const admin = require("firebase-admin");
require('dotenv').config();
const { MongoClient } = require('mongodb');
const ObjectId = require('mongodb').ObjectId;
const app = express();

const port = process.env.PORT || 5000;

//Swagger Configuration  
const swaggerOptions = {
    swaggerDefinition: {
        info: {
            title:'products API',
            version:'3.0.3'
        }
    },
    apis:['index.js'],
}
const swaggerDocs = swaggerJSDoc(swaggerOptions);
app.use('/api-docs',swaggerUI.serve,swaggerUI.setup(swaggerDocs));

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.1lnns.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;

const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

async function verifyToken(req, res, next) {
    if (req.headers?.authorization?.startsWith('Bearer ')) {
        const token = req.headers.authorization.split(' ')[1];

        try {
            const decodedUser = await admin.auth().verifyIdToken(token);
            req.decodedEmail = decodedUser.email;
        }
        catch {
        }
    }
    next();
}

async function run() {
    try {
        await client.connect();
        const database = client.db('pipilicaShop');
        const productsCollection = database.collection('products');
        const bookingsCollection = database.collection('bookings');
        const usersCollection = database.collection('users');
        const reviewsCollection = database.collection('reviews');

        ////////// START PRODUCTS API SECTION //////////
        // GET PRODUCTS API
/**
 * @swagger
 * /products:
 *   get:
 *     description: Get all products
 *     responses:
 *       200:
 *         description: Success
 *
 */
        app.get('/products', async (req, res) => {
            const cursor = productsCollection.find({});
            const products = await cursor.toArray();
            res.status(200).send(products);
        });

        // POST PRODUCT API
/**
 * @swagger
 * /products:
 *   post:
 *     description: Create a new product
 *     parameters:
 *     - name: ProductName
 *       description: Create a new product
 *       in: formData
 *       required: true
 *       type: String
 *     responses:
 *       201:
 *         description: Created
 *
 */
        app.post('/products', async (req, res) => {
            const product = req.body;
            const result = await productsCollection.insertOne(product);
            res.status(201).json(result);
        });

        // GET SINGLE PRODUCT API BY ID

        app.get('/products/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const product = await productsCollection.findOne(query);
            res.json(product);
        })

        // DELETE SINGLE PRODUCT API BY ID
/**
 * @swagger
 * /products:
 *   delete:
 *     description: Delete a product
 *     parameters:
 *     - name: ProductName
 *       description: Delete a product
 *       in: formData
 *       required: true
 *       type: String
 *     responses:
 *       201:
 *         description: Created
 *
 */
        app.delete('/products/deleteProduct/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await productsCollection.deleteOne(query);
            res.status(201).json(result);
        })
        ////////// END PRODUCTS API SECTION //////////

        ////////// START BOOKING API SECTION //////////
        // GET ALL BOOKINGS API
/**
 * @swagger
 * /allBookings:
 *   get:
 *     description: Get all bookings
 *     responses:
 *       200:
 *         description: Success
 *
 */
        app.get('/allBookings', async (req, res) => {
            const cursor = bookingsCollection.find({});
            const bookings = await cursor.toArray();
            res.status(200).send(bookings);
        });

        // GET SINGLE BOOKING BY EMAIL
        app.get('/bookings', verifyToken, async (req, res) => {
            const email = req.query.email;

            const query = { email: email }

            const cursor = bookingsCollection.find(query);
            const bookings = await cursor.toArray();
            res.json(bookings);
        })

        // ADD SINGLE BOOKING
/**
 * @swagger
 * /bookings:
 *   post:
 *     description: Create a new booking
 *     parameters:
 *     - name: ProductName
 *       description: Create a new booking
 *       in: formData
 *       required: true
 *       type: String
 *     responses:
 *       201:
 *         description: Created
 *
 */
        app.post('/bookings', async (req, res) => {
            const booking = req.body;
            const result = await bookingsCollection.insertOne(booking);
            res.status(201).json(result)
        });

        // DELETE SINGLE BOOKING BY ID
        app.delete('/bookings/deleteBooking/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await bookingsCollection.deleteOne(query);
            res.json(result);
        })

        // UPDATE SINGLE BOOKING BY ID
/**
 * @swagger
 * /bookings:
 *   put:
 *     description: Update booking
 *     parameters:
 *     - name: ProductName
 *       description: Update booking
 *       in: formData
 *       required: true
 *       type: String
 *     responses:
 *       201:
 *         description: Created
 *
 */
        app.put('/bookings/updateBooking/:id', (req, res) => {
            const id = req.params.id;
            const updatedStatus = req.body.status;
            const filter = { _id: ObjectId(id) };
            bookingsCollection.updateOne(filter, {
                $set: { status: updatedStatus },
            })
                .then((result) => {
                    res.status(201).json(result);
                });
        });
        ////////// END BOOKING API SECTION //////////

        ////////// START REVIEWS API SECTION //////////
        // GET REVIEWS API
        app.get('/reviews', async (req, res) => {
            const cursor = reviewsCollection.find({});
            const reviews = await cursor.toArray();
            res.send(reviews);
        });

        // POST REVIEW API
        app.post('/reviews', async (req, res) => {
            const review = req.body;
            const result = await reviewsCollection.insertOne(review);
            res.json(result);
        });
        ////////// END REVIEWS API SECTION //////////

        ////////// START USERS API SECTION //////////
        app.get('/users/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email: email };
            const user = await usersCollection.findOne(query);
            let isAdmin = false;
            if (user?.role === 'admin') {
                isAdmin = true;
            }
            res.json({ admin: isAdmin });
        })

        app.post('/users', async (req, res) => {
            const user = req.body;
            const result = await usersCollection.insertOne(user);
            console.log(result);
            res.json(result);
        });

        app.put('/users', async (req, res) => {
            const user = req.body;
            const filter = { email: user.email };
            const options = { upsert: true };
            const updateDoc = { $set: user };
            const result = await usersCollection.updateOne(filter, updateDoc, options);
            res.json(result);
        });

        app.put('/users/admin', verifyToken, async (req, res) => {
            const user = req.body;
            const requester = req.decodedEmail;
            if (requester) {
                const requesterAccount = await usersCollection.findOne({ email: requester });
                if (requesterAccount.role === 'admin') {
                    const filter = { email: user.email };
                    const updateDoc = { $set: { role: 'admin' } };
                    const result = await usersCollection.updateOne(filter, updateDoc);
                    res.json(result);
                }
            }
            else {
                res.status(403).json({ message: 'No Access to Make Admin' })
            }
        })
        ////////// END USERS API SECTION //////////
    }
    finally {
        // await client.close();
    }
}
run().catch(console.dir);

// TEST SERVER
app.get('/', (req, res) => {
    res.send('Running Server PiPiLiCa Shop');
});

// TEST SERVER
app.listen(port, () => {
    console.log('Running Server PiPiLiCa Shop on port', port);
})
