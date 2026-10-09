try {
  process.loadEnvFile();
} catch (err) {
  // .env file loaded
}

const path = require("path");
const express = require("express");
const session = require("express-session")
const MongoStore = require("connect-mongodb-session")(session);
const DB_PATH = "mongodb://admin:admin1234@ac-sfm3dhq-shard-00-00.os3nnxu.mongodb.net:27017,ac-sfm3dhq-shard-00-01.os3nnxu.mongodb.net:27017,ac-sfm3dhq-shard-00-02.os3nnxu.mongodb.net:27017/airbnb?ssl=true&replicaSet=atlas-p8x9dt-shard-0&authSource=admin&appName=Learning";
//Local Module
const storeRouter = require("./routes/storeRouter");
const hostRouter = require("./routes/hostRouter");
const authRouter = require("./routes/authRouter");
const rootDir = require("./utils/pathUtil");
const errorController = require("./controllers/errors");
// const {MongoConnect} = require("./utils/databaseUtil");
const { default: mongoose } = require("mongoose");

const app = express();

app.use(express.json());
app.use(express.static("public"));

app.use((req, res, next) => {
  console.log(req.url, req.method);
  next();
});

app.set("view engine", "ejs");
app.set("views", "views");

const store = new MongoStore({
  uri: DB_PATH,
  collection: "sessions"
})

app.use(express.urlencoded());

app.use(session({
  secret: "Learning Express",
  resave: false,
  saveUninitialized: true,
  store
}))

app.use((req,res,next) =>{
req.isLoggedIn = req.session.isLoggedIn;
next();
})

app.use(storeRouter);
app.use("/host", (req, res, next) => {
  if (req.isLoggedIn) {
    if (req.session.user && req.session.user.userType === "guest") {
      return res.redirect("/");
    }
    next();
  } else {
    if (req.path === "/upload-photos" || (req.headers.accept && req.headers.accept.includes("application/json"))) {
      return res.status(401).json({ success: false, error: "Please log in as a host to upload photos." });
    }
    res.redirect("/login");
  }
});
app.use("/host", hostRouter);
app.use(authRouter);


app.use(errorController.notFound);

// MongoConnect(() => {
  //   app.listen(PORT, () => {
    //     console.log(`Server running on address http://localhost:${PORT}`);
    //   });
    // });
    
    const PORT = 3001;


mongoose.connect(DB_PATH).then(async () => {
  console.log('Connect to Mongo');

  // Purge all demo/sample stays from MongoDB
  try {
    const Home = require("./models/home");
    const User = require("./models/user");
    const fs = require("fs");

    // Remove any test/demo homes (HostSam, Alex (Superhost), or default preset demo names)
    const demoFilter = {
      $or: [
        { hostName: { $regex: "HostSam", $options: "i" } },
        { houseName: { $in: [
          "Penthouse Suite with Marina View",
          "Skyline Glass Penthouse & Rooftop Terrace",
          "Villa Azure — Luxury Oceanfront Cliff Flat",
          "Nordic Minimalist Loft in Historic Center",
          "Alpine Pine Horizon Chalet & Hot Tub",
          "The Bohemian Artist Atelier & Courtyard",
          "Casa Palmera — Tropical Poolside Sanctuary",
          "Kyoto Zen Garden Flat & Hinoki Bath",
          "Villa Bellagio — Sunset Lakefront Flat",
          "Canal View Penthouse & Private Gondola Pier",
          "Glass Treehouse in Redwood Forest Sanctuary",
          "Penthouse Loft with Skyline Terrace",
          "Bamboo Eco Sanctuary & Jungle Infinity Pool",
          "Historic Jordaan Canal House & Rose Garden",
          "Villa Bellissima — Cliffside Sea Flat"
        ]}},
        { description: { $regex: "Cycladic|Manhattan skyline|Matterhorn|machiya|Gamla Stan|Tulum|Lake Como|Venetian|Jordaan|Positano|redwoods", $options: "i" } }
      ]
    };

    const demoHomes = await Home.find(demoFilter);
    if (demoHomes.length > 0) {
      const demoIds = demoHomes.map(h => h._id);
      await Home.deleteMany({ _id: { $in: demoIds } });
      await User.updateMany({}, {
        $pull: {
          favourites: { $in: demoIds },
          "bookings.home": { $in: demoIds }
        }
      });
      console.log(`[Auto-Clean] Successfully removed ${demoIds.length} demo listings from database!`);
    } else {
      console.log('[Auto-Clean] No demo listings found in database.');
    }

    if (fs.existsSync("d:/Signup/scratch_remaining.json")) {
      fs.unlinkSync("d:/Signup/scratch_remaining.json");
    }
  } catch (cleanErr) {
    console.error("Error auto-cleaning demo homes:", cleanErr);
  }

  app.listen(PORT, () => {
    console.log(`Server running on address http://localhost:${PORT}`);
  });
}).catch(err => {
  console.log("Error while connecting to Mongo", err);
});