const express = require("express");
const cors = require("cors");
const bcrypt = require("bcrypt");
const { MongoClient, ObjectId } = require("mongodb");
require("dotenv").config();
const jwt = require("jsonwebtoken");
const app = express();
const port = process.env.PORT || 5000;

// Middleware
// app.use(
//   cors({
//     origin: ["http://localhost:5173", "https://we-care-react.netlify.app/"],
//     credentials: true,
//   })
// );
app.use(
  cors({
    origin:
      process.env.NODE_ENV === "production"
        ? ["https://we-care-react.netlify.app"]
        : "http://localhost:5173",
    credentials: true,
  })
);

// app.use(
//   cors({
//     origin: "*",
//     credentials: true,
//   })
// );

app.use(express.json());

// MongoDB Connection URL
const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function run() {
  try {
    // Connect to MongoDB
    await client.connect();
    console.log("Connected to MongoDB");

    const db = client.db("weEat");
    const usersCollection = db.collection("users");
    const foodCollection = db.collection("foods ");
    const newsCollection = db.collection("news");
    const testimonialCollection = db.collection("testimonials");
    const volunteerCollection = db.collection("volunteers");
    const gratitudeCollection = db.collection("gratitudes");

    // User Registration
    app.post("/api/v1/register", async (req, res) => {
      const { name, email, password } = req.body;
      // Check if email already exists
      const existingUser = await usersCollection.findOne({ email });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: "User already exists",
        });
      }

      // Hash the password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Insert user into the database
      await usersCollection.insertOne({
        name,
        email,
        password: hashedPassword,
      });

      res.status(201).json({
        success: true,
        message: "User registered successfully",
      });
    });

    // User Login
    app.post("/api/v1/login", async (req, res) => {
      console.log("login data receive", req.body);
      const { email, password } = req.body;

      // Find user by email
      const user = await usersCollection.findOne({ email });
      if (!user) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      // Compare hashed password
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      // Generate JWT token
      const token = jwt.sign(
        { email: user.email, name: user.name },
        process.env.JWT_SECRET,
        {
          expiresIn: process.env.EXPIRES_IN,
        }
      );

      //Set the token in the browser cookie
      res.cookie("token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
      });

      res.json({
        success: true,
        message: "Login successful",
        token,
      });
    });

    //create food supply
    app.post("/api/v1/create-supply", async (req, res) => {
      const foodData = req.body;
      const result = await foodCollection.insertOne(foodData);
      res.json(result);
    });
    //create testimonials
    app.post("/api/v1/create-testimonial", async (req, res) => {
      const testimonialData = req.body;
      const result = await testimonialCollection.insertOne(testimonialData);
      console.log("result", result);
      res.json(result);
    });
    //add Volunteer
    app.post("/api/v1/add-volunteer", async (req, res) => {
      const volunteerData = req.body;
      const result = await volunteerCollection.insertOne(volunteerData);
      console.log("result", result);
      res.json(result);
    });
    //add Gratitude
    app.post("/api/v1/add-gratitude", async (req, res) => {
      const gratitudeData = req.body;
      const result = await gratitudeCollection.insertOne(gratitudeData);
      console.log("result", result);
      res.json(result);
    });

    //Get all food supplies
    app.get("/api/v1/supplies", async (req, res) => {
      let query = {};
      if (req.query.category) {
        query.category = req.query.category;
      }
      const supplies = foodCollection.find(query);
      const result = await supplies.toArray();
      // const supplies = foodCollection.find({});
      // const result = await supplies.toArray();
      res.json(result);
    });
    //Get all testimonials
    app.get("/api/v1/testimonials", async (req, res) => {
      const supplies = testimonialCollection.find({});
      const result = await supplies.toArray();
      res.json(result);
    });
    app.get("/api/v1/volunteers", async (req, res) => {
      const volunteers = volunteerCollection.find({});
      const result = await volunteers.toArray();
      res.json(result);
    });

    //Get all gratitude posts
    app.get("/api/v1/gratitudes", async (req, res) => {
      const gratitudes = gratitudeCollection.find({});
      const result = await gratitudes.toArray();
      res.json(result);
    });

    //Get all latest news
    app.get("/api/v1/latest-news", async (req, res) => {
      const supplies = newsCollection.find({});
      const result = await supplies.toArray();
      res.json(result);
    });

    //Get Single food Supply
    app.get("/api/v1/supply/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await foodCollection.findOne(query);
      res.json(result);
    });

    //Delete Single Supply
    app.delete("/api/v1/delete-supply/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await foodCollection.deleteOne(query);
      console.log(result);
      res.json(result);
    });

    //update single supply
    app.put("/api/v1/supply/:id", async (req, res) => {
      const id = req.params.id;
      console.log(id);
      const updatedData = req.body;
      console.log("updated Data", updatedData);
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          title: updatedData.title,
          category: updatedData.category,
          quantity: {
            quantity: updatedData.quantity.quantity,
            quantityUnit: updatedData.quantity.quantityUnit,
          },
          description: updatedData.description,
          image: updatedData.image,
          donorName: updatedData.donorName,
          donorEmail: updatedData.donorEmail,
          donorImage: updatedData.donorImage,
        },
      };
      const options = { upsert: true };
      const result = await foodCollection.updateOne(filter, updateDoc, options);
      res.json(result);
    });

    // Start the server
    app.listen(port, () => {
      console.log(`Server is running on http://localhost:${port}`);
    });
  } finally {
  }
}

run().catch(console.dir);

// Test route
app.get("/", (req, res) => {
  const serverStatus = {
    message: "Welcome to the weCare server app",
    timestamp: new Date(),
  };
  res.json(serverStatus);
});
