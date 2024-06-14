const express = require('express');
const app = express();
const cors = require('cors');
const jwt = require('jsonwebtoken');
//dotenv
require('dotenv').config()
const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());



// --------------------------------------DATABASE CONNECTION-------------------------------------

const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.xprum35.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
   try {
     


      const menuCollection = client.db("bistroDB").collection("menu");
     const reviewCollection = client.db("bistroDB").collection("reviews");
     const cartCollection = client.db("bistroDB").collection("carts");
     const userCollection = client.db("bistroDB").collection("users");
     const deliverCollection = client.db("bistroDB").collection("delivers");
     const storeCollection = client.db("bistroDB").collection("stores");
    
    

     // ---------------------------------JWT related api--------------------
     app.post('/jwt', async (req, res) => {
       const user = req.body;
       const token = jwt.sign(user, process.env.ACCESS_TOKEN_JWT, {
         expiresIn: '1h'
       });
       res.send({token})
     })
     ///midleware 
     const verifyToken = ( req, res, next ) => {
       console.log('inside verify token: ' , req.headers )
    
        if (!req.headers.authorization) {
        return res.status(401).send({ message: 'unauthorized access' });
      }
      const token = req.headers.authorization.split(' ')[1];
      jwt.verify(token, process.env.ACCESS_TOKEN_JWT, (err, decoded) => {
        if (err) {
          return res.status(401).send({ message: 'unauthorized access' })
        }
        req.decoded = decoded;
        next();
      })
     }
   
    //  // use verify admin after verifyToken
    // const verifyAdmin = async (req, res, next) => {
    //   const email = req.decoded.email;
    //   const query = { email: email };
    //   const user = await userCollection.findOne(query);
    //   const isAdmin = user?.role === 'admin';
    //   if (!isAdmin) {
    //     return res.status(403).send({ message: 'forbidden access' });
    //   }
    //   next();
    // }
     //admin dashboard admi get number of user

    app.get('/admin-stats',  async (req, res) => {
    const users = await userCollection.estimatedDocumentCount();
    const menuItem = await menuCollection.estimatedDocumentCount();
    const order = await cartCollection.estimatedDocumentCount();

    const categoryCounts = await menuCollection.aggregate([
        {
            $group: {
                _id: "$category",
                count: { $sum: 1 }
            }
        }
    ]).toArray();

    const categoryProductCounts = categoryCounts.reduce((acc, category) => {
        acc[category._id] = category.count;
        return acc;
    }, {});

    const result = await cartCollection.aggregate([
        {
            $group: {
                _id: null,
                totalPrice: { $sum: '$price' }
            }
        }
    ]).toArray();

    const price = result.length > 0 ? result[0].totalPrice : 0;

    res.send({
        users,
        menuItem,
        order,
        price,
        categoryProductCounts
    });
});

    
     // get data from menu in database----------------------------------------
     app.get('/menu/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await menuCollection.findOne(query);
      res.send(result);
     })
      app.get('/menu/book/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await menuCollection.findOne(query);
      res.send(result);
      })
      app.get('/menu', async (req, res) => {
         const result = await menuCollection.find().toArray();
         res.send(result);
      })
   
     // insert menu 
      app.post('/menu',  async (req, res) => {
      const item = req.body;
      const result = await menuCollection.insertOne(item);
      res.send(result);
    });
     //--------update from menu item
     app.patch('/menu/:id', async (req, res) => {
      const item = req.body;
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) }
      const updatedDoc = {
        $set: {
          name: item.name,
          category: item.category,
          price: item.price,
          recipe: item.recipe,
          image: item.image
        }
       }
         const result = await menuCollection.updateOne(filter, updatedDoc)
      res.send(result);
    })
     //-----------------delete from menu database menu items users and admin only----------------------------
      app.delete('/menu/:id',  async (req, res) => {
      const id = req.params.id;
      const query ={ _id: new ObjectId(id) }
      const result = await menuCollection.deleteOne(query);
      res.send(result);
     })
    

     //get users from database             ---------------------------Admin related database--------------------
     app.get('/users',  async (req, res) => {
       //console.log(req.headers);
       const result = await userCollection.find().toArray();
       res.send(result)
    
     })
       app.get('/users/admin/:email', async (req, res) => {
      const email = req.params.email;

      if (email !== req.params.email) {
        return res.status(403).send({ message: 'forbidden access' })
      }

      const query = { email: email };
      const user = await userCollection.findOne(query);
      let admin = false;
      if (user) {
        admin = user?.role === 'admin';
      }
      res.send({ admin });
       })
     //deliveryman---------------------------------------
//        const verifyDeli = async (req, res, next) => {
//  const email = req.decoded.email;
//       const query = { email: email };
//       const user = await userCollection.findOne(query);
//       const isDeliveryman = user?.role === 'deliveryman';
//       if (!isDeliveryman) {
//         return res.status(403).send({ message: 'forbidden access' });
//       }
//       next();
//     }


     
     app.get('/users/deliveryman/:email',  async (req, res) => {
      const email = req.params.email;

      if (email !== req.params.email) {
        return res.status(403).send({ message: 'forbidden access' })
      }

      const query = { email: email };
      const user = await userCollection.findOne(query);
      let deliveryman = false;
      if (user) {
        deliveryman = user?.role === 'deliveryman';
      }
      res.send({ deliveryman });
    })
     // patch use for updated data ------------------ here use patch for admin apdate
//      app.patch('/users/admin/:id', async (req, res) => {
//        const id = req.params.id;
//        const filter = { _id: new ObjectId(id) };
//        const updatedoc = {
//          $set: {
//            role: 'admin'
           
//          }
//        }
//        const result = await userCollection.updateOne(filter, updatedoc )
// res.send(result)
     //      })
     const { ObjectId } = require('mongodb');

app.patch('/users/admin/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const filter = { _id: new ObjectId(id) };

    // Fetch the current user data
    const user = await userCollection.findOne(filter);

    // Determine the new role based on the current role
    const newRole = user?.role === 'admin' ? 'customer' : 'admin';

    const updateDoc = {
      $set: {
        role: newRole
      }
    };

    // Update the user role
    const result = await userCollection.updateOne(filter, updateDoc);
    res.send(result);
  } catch (error) {
    res.status(500).send({ message: 'An error occurred while updating the user role.', error });
  }
});

     ////delete user  f;rom, database 
     app.delete('/users/:id', async (req, res) => {
       const id = req.params.id;
       const query = { _id: new ObjectId(id) }
       const result = await userCollection.deleteOne(query);
       res.send(result)
     })
     
     //add user information--------------------------------------------------
      app.post('/users', async (req, res) => {
      const user = req.body;
      // insert email if user doesnt exists: 
      // you can do this many ways (1. email unique, 2. upsert 3. simple checking)
      const query = { email: user.email }
      const existingUser = await userCollection.findOne(query);
      if (existingUser) {
        return res.send({ message: 'user already exists', insertedId: null })
      }
      const result = await userCollection.insertOne(user);
      res.send(result);
    });
     //get carts from database------------------------------------------------
      app.get('/carts', async (req, res) => {
       const email = req.query.email;
       const query = { email: email };
      
       const result = await cartCollection.find(query).toArray();
       res.send(result)

     })
      //get carts frm database
     app.get('/carts/info/:id', async (req, res) => {
             const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await cartCollection.findOne(query);
      res.send(result);

     })
     app.get('/carts/s', async (req, res) => {
      
       const result = await cartCollection.find().toArray();
       res.send(result)

     })
     //updated deliveryman accepted
    app.patch('/carts/:id', async (req, res) => {
    const id = req.params.id;
    const filter = { _id: new ObjectId(id) };

    try {
        // Find the document and get the current value of Response
        const cartItem = await cartCollection.findOne(filter);
        
        if (cartItem) {
            const newResponse = cartItem.Response === 'accepted' ? 'process' : 'accepted';
            const updateDoc = {
                $set: {
                    Response: newResponse
                }
            };
            
            const result = await cartCollection.updateOne(filter, updateDoc);
            res.send(result);
        } else {
            res.status(404).send({ message: 'Cart item not found' });
        }
    } catch (error) {
        res.status(500).send({ message: 'An error occurred', error });
    }
});

     //DELETE CART FROM DATABASE ----------------------------------------
     app.delete('/carts/:id', async (req, res) => {
       const id = req.params.id;
       const query = {_id: new ObjectId(id)}
       const result = await cartCollection.deleteOne(query);
       res.send(result)
     })
     //add cart to database ------------------------------------
     app.post('/carts', async (req, res) => {
       const cartItem = req.body
       const result = await cartCollection.insertOne(cartItem)
       res.send(result)

     })
     // get data from reviews ----------------------------------------
       app.get('/reviews', async (req, res) => {
         const result = await reviewCollection.find().toArray();
         res.send(result);
       })
     
     //delivers----------------------------------------------------
      app.get('/delivers', async (req, res) => {
      
       const result = await deliverCollection.find().toArray();
       res.send(result)

      })
     //delivery count
     

app.patch('/delivers/:email', async (req, res) => {
  const email = req.params.email;
  const filter = { email: email }; // Assuming email is a unique identifier in your collection

  const updateDoc = {
    $inc: { order: 1 } // Increment the order field by 1
  };
  console.log("not ok")

  try {
    const result = await deliverCollection.updateOne(filter, updateDoc);
    if (result.modifiedCount === 1) {
      res.send({ success: true, message: 'Order count incremented successfully' });
    } else {
      res.status(404).send({ success: false, message: 'Delivery person not found' });
    }
  } catch (error) {
    res.status(500).send({ success: false, message: 'An error occurred', error });
  }
  console.log('not ok')
});
     // post to store
      app.post('/stores', async (req, res) => {
       const cartItem = req.body
       const result = await storeCollection.insertOne(cartItem)
       res.send(result)

      })
       app.get('/stores', async (req, res) => {
       const email = req.query.email;
       const query = { email: email };
      
       const result = await storeCollection.find(query).toArray();
       res.send(result)

       })
       app.get('/delivery-stats', async (req, res) => {
      
  
       const orderremainig = await cartCollection.estimatedDocumentCount()
       const orderdelivered = await storeCollection.estimatedDocumentCount()
       // this is not best way
       //  const cart = await cartCollection.find().toArray()
         //  const totalPrice = cart.reduce((total, item) => total + item.price, 0);
         const result1 = await cartCollection.aggregate([
         {$group: {
           _id: null,
           totalPrice: {
             $sum: '$price'
           }
         }}
       ]).toArray();
         const paidc = result1.length > 0 ? result1[0].totalPrice : 0;
         
       const result = await storeCollection.aggregate([
         {$group: {
           _id: null,
           totalPrice: {
             $sum: '$price'
           }
         }}
       ]).toArray();
         const paid = result.length > 0 ? result[0].totalPrice : 0;


           const dateAggregation = await storeCollection.aggregate([
      {
        $group: {
          _id: '$date', // Group by date
          totalPrice: {
            $sum: '$price' // Sum the prices for each date
          },
          count: {
            $sum: 1 // Count the number of documents for each date
          }
        }
      },
      {
        $sort: {
          _id: 1 // Sort by date (optional)
        }
      }
           ]).toArray();
           const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const last7DaysData = await storeCollection.aggregate([
      {
        $match: {
          date: { $gte: sevenDaysAgo.toISOString().split('T')[0] }
        }
      },
      {
        $group: {
          _id: '$date', // Group by date
          totalPrice: { $sum: '$price' },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } } // Sort by date
    ]).toArray();

         
       res.send({
      
      
         orderremainig,
         orderdelivered,
        paidc,
         paid,
         dateAggregation,
         last7DaysData
       })
     })
     //review
      app.post('/reviews',  async (req, res) => {
      const item = req.body;
      const result = await reviewCollection.insertOne(item);
      res.send(result);
    });
    // Connect the client to the server	(optional starting in v4.7)
    //await client.connect();
    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    // console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
   // await client.close();
  }
}
run().catch(console.dir);
//-----------------------------------------end database connection----------------------------------
// NAMING CONVENTION
// --> app.get('/users')
// --> app.get('user/:id')
// --> app.post(úser)
// --> app.put('/user/:id')
// --> app.patch('/user/:id')
// --> app.delete('/user/:id')







app.get('/', (req, res) => {
   res.send('boss is running')
})
app.listen(port, () => {
   console.log(`boss's port ${port}`)
})
