const Home = require("../models/home");
const Booking = require("../models/booking");
const { UTApi } = require("uploadthing/server");

async function uploadToUploadThing(files) {
  if (!files || files.length === 0) return [];
  const token = process.env.UPLOADTHING_TOKEN;
  if (!token) {
    console.error("UPLOADTHING_TOKEN is missing in environment variables");
    throw new Error("UPLOADTHING_TOKEN is missing in .env");
  }
  const utapi = new UTApi({ token });
  const fileObjects = files.map(f => new File([f.buffer], f.originalname, { type: f.mimetype }));
  const results = await utapi.uploadFiles(fileObjects);
  const urls = [];
  for (const r of results) {
    if (r.data && (r.data.ufsUrl || r.data.url)) {
      urls.push(r.data.ufsUrl || r.data.url);
    } else if (r.error) {
      console.error("UploadThing item error:", r.error);
    }
  }
  return urls;
}

exports.postUploadPhotos = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, error: "No files uploaded" });
    }
    const urls = await uploadToUploadThing(req.files);
    if (urls.length === 0) {
      return res.status(500).json({ success: false, error: "UploadThing failed to process files" });
    }
    return res.json({ success: true, urls });
  } catch (err) {
    console.error("Error in postUploadPhotos:", err);
    return res.status(500).json({ success: false, error: err.message || "Upload failed" });
  }
};

exports.getAddHome = (req, res, next) => {
  res.render("host/edit-home", {
    pageTitle: "Airbnb your home | Add Listing",
    currentPage: "addHome",
    editing: false,
    isLoggedIn: req.isLoggedIn,
    user: req.session.user,
    home: {
      houseName: "",
      location: "",
      price: "",
      rating: 4.95,
      photoUrl: "",
      photos: [],
      category: "City Flats",
      description: "",
      bedrooms: 2,
      bathrooms: 1,
      maxGuests: 4,
      amenities: ["Fast Wi-Fi (300 Mbps)", "Chef's Kitchen", "Dedicated Workspace", "Air Conditioning"],
      hostName: req.session.user ? `${req.session.user.firstName} (Superhost)` : "Superhost"
    }
  });
};

exports.getEditHome = (req, res, next) => {
  const homeId = req.params.homeId;
  const editing = req.query.editing === "true";

  Home.findById(homeId).then((home) => {
    if (!home) {
      console.log("Home not found for editing");
      return res.redirect("/host/host-home-list");
    }
    if (!home.photos || home.photos.length === 0) {
      home.photos = home.photoUrl ? [home.photoUrl] : [];
    }
    res.render("host/edit-home", {
      pageTitle: `Edit ${home.houseName} | airbnb Host`,
      currentPage: "host-homes",
      editing: editing,
      isLoggedIn: req.isLoggedIn,
      user: req.session.user,
      home: home,
    });
  }).catch(err => {
    console.error("Error in getEditHome:", err);
    res.redirect("/host/host-home-list");
  });
};

exports.postAddHome = async (req, res, next) => {
  try {
    const {
      houseName,
      price,
      location,
      rating,
      photoUrl,
      photo1,
      photo2,
      photo3,
      category,
      description,
      bedrooms,
      bathrooms,
      maxGuests,
      amenities
    } = req.body;

    const defaultPhotos = [
      "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=800&q=80"
    ];

    // Check if files were uploaded directly through form
    let uploadedUrls = [];
    if (req.files && req.files.length > 0) {
      uploadedUrls = await uploadToUploadThing(req.files);
    }

    // Collect all submitted photo URLs
    let photoList = [...uploadedUrls];
    if (photo1 && photo1.trim()) photoList.push(photo1.trim());
    if (photo2 && photo2.trim()) photoList.push(photo2.trim());
    if (photo3 && photo3.trim()) photoList.push(photo3.trim());

    if (Array.isArray(req.body.photos)) {
      req.body.photos.forEach(p => {
        if (p && typeof p === "string" && p.trim()) photoList.push(p.trim());
      });
    }

    if (photoList.length === 0 && photoUrl && photoUrl.trim()) {
      photoList.push(photoUrl.trim());
    }

    // Deduplicate while preserving order
    photoList = [...new Set(photoList)];

    const primaryPhoto = photoList.length > 0 ? photoList[0] : "";
    const finalPhotos = photoList;

    // Parse submitted amenities
    let submittedAmenities = [];
    if (Array.isArray(amenities)) {
      submittedAmenities = amenities.map(a => typeof a === 'string' ? a.trim() : '').filter(Boolean);
    } else if (typeof amenities === 'string' && amenities.trim()) {
      submittedAmenities = amenities.split(',').map(a => a.trim()).filter(Boolean);
    }

    const home = new Home({
      houseName: houseName || "Chic City Flat with Balcony",
      price: Number(price) || 150,
      location: location || "Downtown City Center",
      rating: Number(rating) || 4.92,
      photoUrl: primaryPhoto,
      photos: finalPhotos,
      category: category || "City Flats",
      description: description || "Modern, stylish flat equipped with all essential amenities for a comfortable vacation or business stay.",
      bedrooms: Number(bedrooms) || 2,
      bathrooms: Number(bathrooms) || 1,
      maxGuests: Number(maxGuests) || 4,
      amenities: submittedAmenities.length > 0 ? submittedAmenities : undefined,
      hostName: req.session.user ? `${req.session.user.firstName} (Host)` : "Superhost"
    });

    await home.save();
    console.log("Home Saved Successfully with amenities:", home._id, home.amenities);

    res.render("host/homeAdded", {
      pageTitle: "Listing Published | airbnb Host",
      currentPage: "addHome",
      home: home,
      isLoggedIn: req.isLoggedIn,
      user: req.session.user,
    });
  } catch (err) {
    console.error("Error in postAddHome:", err);
    res.redirect("/host/addHome");
  }
};

exports.getHostHomes = async (req, res, next) => {
  try {
    const registerHomes = await Home.find().sort({ createdAt: -1 });
    const homeIds = registerHomes.map(h => h._id);

    // Fetch all reservations for these host homes
    const hostBookings = await Booking.find({ home: { $in: homeIds } })
      .populate("home")
      .populate("user")
      .sort({ createdAt: -1 });

    // Host analytics
    const totalListings = registerHomes.length;
    let avgRating = 0;
    let estMonthlyRevenue = 0;
    const confirmedBookings = hostBookings.filter(b => b.status === "Confirmed");
    const activeReservationsCount = confirmedBookings.length;

    if (totalListings > 0) {
      const sumRating = registerHomes.reduce((acc, h) => acc + (h.rating || 0), 0);
      avgRating = (sumRating / totalListings).toFixed(2);
      
      const realBookedRevenue = confirmedBookings.reduce((acc, b) => acc + (b.totalPrice || 0), 0);
      const sumPrice = registerHomes.reduce((acc, h) => acc + (h.price || 0), 0);
      estMonthlyRevenue = realBookedRevenue > 0 ? realBookedRevenue : Math.round(sumPrice * 18);
    }

    res.render("host/host-home-list", {
      registerHomes,
      hostBookings,
      pageTitle: "Host Dashboard | Manage Listings & Guest Reservations",
      currentPage: "host-home",
      isLoggedIn: req.isLoggedIn,
      user: req.session.user,
      analytics: {
        totalListings,
        avgRating,
        activeReservationsCount,
        estMonthlyRevenue
      }
    });
  } catch (err) {
    console.error("Error in getHostHomes:", err);
    res.redirect("/");
  }
};

exports.postEditHome = async (req, res, next) => {
  try {
    const {
      id,
      houseName,
      price,
      location,
      rating,
      photoUrl,
      photo1,
      photo2,
      photo3,
      category,
      description,
      bedrooms,
      bathrooms,
      maxGuests,
      amenities
    } = req.body;

    const home = await Home.findById(id);
    if (!home) {
      return res.redirect("/host/host-home-list");
    }

    // Check if new files were uploaded directly
    let uploadedUrls = [];
    if (req.files && req.files.length > 0) {
      uploadedUrls = await uploadToUploadThing(req.files);
    }

    let photoList = [...uploadedUrls];
    if (photo1 && photo1.trim()) photoList.push(photo1.trim());
    if (photo2 && photo2.trim()) photoList.push(photo2.trim());
    if (photo3 && photo3.trim()) photoList.push(photo3.trim());

    if (Array.isArray(req.body.photos)) {
      req.body.photos.forEach(p => {
        if (p && typeof p === "string" && p.trim()) photoList.push(p.trim());
      });
    }

    if (photoList.length === 0 && photoUrl && photoUrl.trim()) {
      photoList.push(photoUrl.trim());
    }

    photoList = [...new Set(photoList)];

    // Parse submitted amenities
    let submittedAmenities = [];
    if (Array.isArray(amenities)) {
      submittedAmenities = amenities.map(a => typeof a === 'string' ? a.trim() : '').filter(Boolean);
    } else if (typeof amenities === 'string' && amenities.trim()) {
      submittedAmenities = amenities.split(',').map(a => a.trim()).filter(Boolean);
    }

    home.houseName = houseName || home.houseName;
    home.price = Number(price) || home.price;
    home.location = location || home.location;
    home.rating = Number(rating) || home.rating || 4.92;

    if (photoList.length > 0) {
      home.photoUrl = photoList[0];
      home.photos = photoList;
    } else if (photoUrl && photoUrl.trim()) {
      home.photoUrl = photoUrl.trim();
      home.photos = [photoUrl.trim()];
    }

    home.category = category || home.category;
    home.description = description || home.description;
    home.bedrooms = Number(bedrooms) || home.bedrooms;
    home.bathrooms = Number(bathrooms) || home.bathrooms;
    home.maxGuests = Number(maxGuests) || home.maxGuests;
    if (submittedAmenities.length > 0) {
      home.amenities = submittedAmenities;
    }

    await home.save();
    console.log("Home Updated with amenities:", home._id, home.amenities);
    res.redirect("/host/host-home-list");
  } catch (err) {
    console.error("Error in postEditHome:", err);
    res.redirect("/host/host-home-list");
  }
};

exports.postDeleteHome = async (req, res, next) => {
  try {
    const homeId = req.params.homeId;
    console.log("Deleting home with ID:", homeId);
    await Home.findByIdAndDelete(homeId);
    res.redirect("/host/host-home-list");
  } catch (error) {
    console.error("Error while deleting home:", error);
    res.redirect("/host/host-home-list");
  }
};
