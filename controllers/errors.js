exports.notFound = (req, res, next) => {
  // res.status(404).sendFile(path.join(rootDir, "views","404.html" ));
  res
    .status(404)
    .render("404", {
      pageTitle: "Page Not Found | airbnb",
      currentPage: "404",
      isLoggedIn: req.isLoggedIn,
      user: req.session.user,
    });
};

