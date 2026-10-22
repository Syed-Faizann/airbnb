const Home = require("../models/home");
const User = require("../models/user");
const Booking = require("../models/booking");

// Demo sample stays removed per user request
const SAMPLE_HOMES = [];

// Helper: Get user's favourites list IDs
async function getUserFavIds(userId) {
  if (!userId) return [];
  try {
    const user = await User.findById(userId);
    return user && user.favourites ? user.favourites.map(id => id.toString()) : [];
  } catch (err) {
    return [];
  }
}

// 1. GET INDEX / HOMEPAGE
exports.getIndex = async (req, res, next) => {
  try {
    const activeCategory = req.query.category || "All";
    const searchQuery = (req.query.search || "").trim();
    const maxPrice = req.query.maxPrice ? Number(req.query.maxPrice) : null;

    let filter = {};
    if (activeCategory && activeCategory !== "All") {
      filter.category = activeCategory;
    }
    if (searchQuery) {
      filter.$or = [
        { houseName: { $regex: searchQuery, $options: "i" } },
        { location: { $regex: searchQuery, $options: "i" } }
      ];
    }
    if (maxPrice && !isNaN(maxPrice)) {
      filter.price = { $lte: maxPrice };
    }

    let registerHomes = await Home.find(filter).sort({ createdAt: -1 });

    const userId = req.session.user ? req.session.user._id : null;
    const favIds = await getUserFavIds(userId);

    res.render("store/index", {
      registerHomes,
      pageTitle: "airbnb | Vacation Rentals, Cabins, Beach Flats & More",
      currentPage: "index",
      isLoggedIn: req.isLoggedIn,
      user: req.session.user,
      favIds,
      activeCategory,
      searchQuery,
      maxPrice: maxPrice || ""
    });
  } catch (err) {
    console.error("Error in getIndex:", err);
    res.redirect("/home-list");
  }
};

// 2. GET ALL HOMES / HOME-LIST
exports.getHomes = async (req, res, next) => {
  try {
    const activeCategory = req.query.category || "All";
    const searchQuery = (req.query.search || "").trim();

    let filter = {};
    if (activeCategory && activeCategory !== "All") {
      filter.category = activeCategory;
    }
    if (searchQuery) {
      filter.$or = [
        { houseName: { $regex: searchQuery, $options: "i" } },
        { location: { $regex: searchQuery, $options: "i" } }
      ];
    }

    const registerHomes = await Home.find(filter).sort({ createdAt: -1 });
    const userId = req.session.user ? req.session.user._id : null;
    const favIds = await getUserFavIds(userId);

    res.render("store/home-list", {
      registerHomes,
      pageTitle: "Explore Homes & Flats | airbnb",
      currentPage: "home",
      isLoggedIn: req.isLoggedIn,
      user: req.session.user,
      favIds,
      activeCategory,
      searchQuery
    });
  } catch (err) {
    console.error("Error in getHomes:", err);
    res.redirect("/");
  }
};

// 3. GET HOME DETAILS
exports.getHomeDetails = async (req, res, next) => {
  try {
    const homeId = req.params.homeId;
    const home = await Home.findById(homeId);
    if (!home) {
      return res.redirect("/home-list");
    }

    const userId = req.session.user ? req.session.user._id : null;
    const favIds = await getUserFavIds(userId);
    const isFav = favIds.includes(home._id.toString());

    // Fetch confirmed upcoming bookings for this home to show availability
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const existingBookings = await Booking.find({
      home: home._id,
      status: "Confirmed",
      checkOut: { $gte: today }
    }).sort({ checkIn: 1 });

    res.render("store/home-details", {
      home,
      existingBookings,
      pageTitle: `${home.houseName} | airbnb`,
      currentPage: "home",
      isLoggedIn: req.isLoggedIn,
      user: req.session.user,
      isFav
    });
  } catch (err) {
    console.error("Error in getHomeDetails:", err);
    res.redirect("/home-list");
  }
};

// 3B. GET DEDICATED RESERVATION / AVAILABILITY PAGE
exports.getReserveHome = async (req, res, next) => {
  try {
    const homeId = req.params.homeId;
    const home = await Home.findById(homeId);
    if (!home) {
      return res.redirect("/home-list");
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const existingBookings = await Booking.find({
      home: home._id,
      status: "Confirmed",
      checkOut: { $gte: today }
    }).sort({ checkIn: 1 });

    res.render("store/reserve", {
      home,
      existingBookings,
      pageTitle: `Reserve ${home.houseName} | airbnb`,
      currentPage: "home",
      isLoggedIn: req.isLoggedIn,
      user: req.session.user,
      error: req.query.error || null,
      preCheckIn: req.query.checkIn || "",
      preCheckOut: req.query.checkOut || ""
    });
  } catch (err) {
    console.error("Error in getReserveHome:", err);
    res.redirect("/home-list");
  }
};

// 4. GET WISHLISTS / FAVOURITES
exports.getFavouriteList = async (req, res, next) => {
  try {
    if (!req.session.user) {
      return res.redirect("/login");
    }
    const userId = req.session.user._id;
    const user = await User.findById(userId).populate("favourites");
    const favHomes = (user && user.favourites) ? user.favourites : [];

    res.render("store/favourite-list", {
      registerHomes: favHomes,
      pageTitle: "Your Wishlists | airbnb",
      currentPage: "favourite",
      isLoggedIn: req.isLoggedIn,
      user: req.session.user
    });
  } catch (err) {
    console.error("Error in getFavouriteList:", err);
    res.redirect("/");
  }
};

// 5. POST ADD TO FAVOURITE
exports.postFavouriteList = async (req, res, next) => {
  try {
    if (!req.session.user) {
      return res.redirect("/login");
    }
    const homeId = req.body.id;
    const userId = req.session.user._id;
    const user = await User.findById(userId);

    if (user && !user.favourites.includes(homeId)) {
      user.favourites.push(homeId);
      await user.save();
    }
    const redirectUrl = req.headers.referer || "/favourite-list";
    res.redirect(redirectUrl);
  } catch (err) {
    console.error("Error in postFavouriteList:", err);
    res.redirect("/favourite-list");
  }
};

// 6. POST REMOVE FROM FAVOURITE
exports.postRemoveFromFavourite = async (req, res, next) => {
  try {
    if (!req.session.user) {
      return res.redirect("/login");
    }
    const homeId = req.params.homeId;
    const userId = req.session.user._id;
    const user = await User.findById(userId);

    if (user) {
      user.favourites = user.favourites.filter(fav => fav.toString() !== homeId);
      await user.save();
    }
    const redirectUrl = req.headers.referer || "/favourite-list";
    res.redirect(redirectUrl);
  } catch (err) {
    console.error("Error in postRemoveFromFavourite:", err);
    res.redirect("/favourite-list");
  }
};

// 7. GET BOOKINGS / TRIPS
exports.getBookings = async (req, res, next) => {
  try {
    if (!req.session.user) {
      return res.redirect("/login");
    }
    const userId = req.session.user._id;
    const user = await User.findById(userId).populate("bookings.home");

    const bookings = (user && user.bookings) ? user.bookings.filter(b => b.home) : [];

    res.render("store/bookings", {
      bookings,
      pageTitle: "Your Trips & Reservations | airbnb",
      currentPage: "bookings",
      isLoggedIn: req.isLoggedIn,
      user: req.session.user,
      justBooked: req.query.success === "true",
      justCancelled: req.query.cancelled === "true",
      refunded: req.query.refunded === "true",
      refundAmount: req.query.amount || "0",
      checkInDate: req.query.checkIn || ""
    });
  } catch (err) {
    console.error("Error in getBookings:", err);
    res.redirect("/");
  }
};

// 8. POST BOOK / RESERVE A HOME (With Overlap Conflict Validation)
exports.postBookHome = async (req, res, next) => {
  try {
    if (!req.session.user) {
      return res.redirect("/login");
    }
    const homeId = req.params.homeId;
    const { checkIn, checkOut, guests } = req.body;

    const home = await Home.findById(homeId);
    if (!home) {
      return res.redirect("/home-list");
    }

    // Parse checkIn and checkOut
    let inDate = new Date(checkIn);
    let outDate = new Date(checkOut);

    // Fallback if empty or invalid
    if (isNaN(inDate.getTime()) || isNaN(outDate.getTime())) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      inDate = tomorrow;
      const fourDaysLater = new Date();
      fourDaysLater.setDate(fourDaysLater.getDate() + 4);
      outDate = fourDaysLater;
    }

    // Ensure checkout is after checkin
    if (outDate <= inDate) {
      return res.redirect(`/reserve/${homeId}?error=${encodeURIComponent("Checkout date must be after check-in date.")}`);
    }

    // Check for conflicting confirmed bookings for this home
    const conflict = await Booking.findOne({
      home: home._id,
      status: "Confirmed",
      checkIn: { $lt: outDate },
      checkOut: { $gt: inDate }
    });

    if (conflict) {
      const conflictStart = conflict.checkIn.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
      const conflictEnd = conflict.checkOut.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
      const msg = `This house is not available for your selected dates. It is already reserved from ${conflictStart} to ${conflictEnd}. Please choose different dates.`;
      return res.redirect(`/reserve/${homeId}?error=${encodeURIComponent(msg)}&checkIn=${encodeURIComponent(checkIn || '')}&checkOut=${encodeURIComponent(checkOut || '')}`);
    }

    const diffTime = outDate.getTime() - inDate.getTime();
    const nights = Math.max(1, Math.round(diffTime / (1000 * 60 * 60 * 24)));
    const maxAllowedGuests = Number(home.maxGuests) || 4;
    const guestCount = Number(guests) || 1;

    if (guestCount > maxAllowedGuests) {
      const msg = `This property accommodates a maximum of ${maxAllowedGuests} guests. You selected ${guestCount} guests.`;
      return res.redirect(`/home/${homeId}?error=${encodeURIComponent(msg)}`);
    }

    const totalPrice = (home.price * nights) + 50 + 35; // base + cleaning + service fee

    const userId = req.session.user._id;
    const user = await User.findById(userId);

    // 1. Create central Booking record
    const newBooking = new Booking({
      home: home._id,
      user: userId,
      guestName: user ? `${user.firstName} ${user.lastName}` : "Guest Traveler",
      guestEmail: user ? user.email : "guest@airbnb.com",
      checkIn: inDate,
      checkOut: outDate,
      nights,
      guests: guestCount,
      pricePerNight: home.price,
      totalPrice,
      status: "Confirmed",
      refundStatus: "None",
      refundAmount: 0
    });
    await newBooking.save();

    // 2. Synchronize with User's embedded bookings array (same _id for 1:1 mapping)
    if (user) {
      const inDateStr = inDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
      const outDateStr = outDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
      user.bookings.unshift({
        _id: newBooking._id,
        home: home._id,
        checkIn: inDateStr,
        checkOut: outDateStr,
        guests: guestCount,
        totalPrice,
        status: "Confirmed",
        refundStatus: "None",
        refundAmount: 0,
        bookedAt: new Date()
      });
      await user.save();
    }

    res.redirect("/bookings?success=true");
  } catch (err) {
    console.error("Error in postBookHome:", err);
    res.redirect(`/home/${req.params.homeId}`);
  }
};

// 9. POST CANCEL BOOKING & RETURN MONEY BEFORE ARRIVAL
exports.postCancelBooking = async (req, res, next) => {
  try {
    if (!req.session.user) {
      return res.redirect("/login");
    }
    const bookingId = req.params.bookingId;
    const userId = req.session.user._id;
    const user = await User.findById(userId);

    // 1. Locate central booking
    let centralBooking = await Booking.findById(bookingId);
    let userTarget = user ? user.bookings.find(b => b._id.toString() === bookingId) : null;

    if (!centralBooking && userTarget && userTarget.home) {
      centralBooking = await Booking.findOne({
        user: userId,
        home: userTarget.home,
        status: "Confirmed"
      }).sort({ createdAt: -1 });
    }

    if (!centralBooking && !userTarget) {
      return res.redirect("/bookings");
    }

    // 2. Check if cancellation happens before arriving date
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    let checkInDate = null;
    if (centralBooking && centralBooking.checkIn) {
      checkInDate = new Date(centralBooking.checkIn);
    } else if (userTarget && userTarget.checkIn) {
      checkInDate = new Date(userTarget.checkIn);
    }

    // If cancelled before arrival date, refund 100% of the money
    let isBeforeArrival = true;
    if (checkInDate && !isNaN(checkInDate.getTime())) {
      const arrivingDate = new Date(checkInDate);
      arrivingDate.setHours(0, 0, 0, 0);
      isBeforeArrival = now < arrivingDate;
    }

    const priceToRefund = centralBooking ? centralBooking.totalPrice : (userTarget ? userTarget.totalPrice : 0);
    const refundAmount = isBeforeArrival ? priceToRefund : 0;
    const refundStatus = isBeforeArrival ? "Full Refund Processed" : "No Refund Eligible";

    // 3. Update central Booking: Set status to "Cancelled" -> IMMEDIATELY UNLOCKS AVAILABILITY FOR OTHER USERS
    if (centralBooking) {
      centralBooking.status = "Cancelled";
      centralBooking.refundStatus = refundStatus;
      centralBooking.refundAmount = refundAmount;
      centralBooking.cancelledAt = new Date();
      await centralBooking.save();
      console.log(`Central Booking ${centralBooking._id} cancelled. Refund: $${refundAmount}. Availability unlocked.`);
    }

    // 4. Update user's booking record so status is Cancelled and refund is preserved
    if (user && userTarget) {
      userTarget.status = "Cancelled";
      userTarget.refundStatus = refundStatus;
      userTarget.refundAmount = refundAmount;
      userTarget.cancelledAt = new Date();
      await user.save();
    }

    const inDateDisplay = checkInDate && !isNaN(checkInDate.getTime())
      ? checkInDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
      : "arrival";

    res.redirect(`/bookings?cancelled=true&refunded=${isBeforeArrival}&amount=${refundAmount}&checkIn=${encodeURIComponent(inDateDisplay)}`);
  } catch (err) {
    console.error("Error in postCancelBooking:", err);
    res.redirect("/bookings");
  }
};

// 10. SEED SAMPLE HOMES (DISABLED) & CLEAR DEMO DATA
exports.seedSampleHomes = async (req, res, next) => {
  res.redirect("/");
};

exports.clearDemoData = async (req, res, next) => {
  try {
    const demoHouseNames = [
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
    ];
    const demoHomes = await Home.find({
      $or: [
        { houseName: { $in: demoHouseNames } },
        { description: { $regex: "Cycladic|Manhattan skyline|Matterhorn|machiya|Gamla Stan|Tulum|Lake Como|Venetian|Jordaan|Positano|redwoods", $options: "i" } }
      ]
    });
    const demoIds = demoHomes.map(h => h._id);
    if (demoIds.length > 0) {
      await Home.deleteMany({ _id: { $in: demoIds } });
      await Booking.deleteMany({ home: { $in: demoIds } });
      await User.updateMany({}, {
        $pull: {
          favourites: { $in: demoIds },
          bookings: { home: { $in: demoIds } }
        }
      });
      console.log(`Cleared ${demoIds.length} demo listings!`);
    }
    res.redirect("/");
  } catch (err) {
    console.error("Error clearing demo listings:", err);
    res.redirect("/");
  }
};
