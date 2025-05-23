const User = require("../models/user");
const { parse } = require("cookie");
const jwt = require("jsonwebtoken");
const jwtkey = "zzzzzzzzzz";

const verifyToken = async (req, res, next) => {
  let token = null;

  // 1. Try to get token from cookies
  const cookies = parse(req.headers.cookie || "");
  if (cookies.auth) {
    token = cookies.auth;
  }

  // 2. If not in cookies, try to get from Authorization header
  if (!token && req.headers.authorization && req.headers.authorization.startsWith("Bearer ")) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    res.locals.user = null;
    return res.status(401).json({ message: "Token not provided" });
  }

  try {
    const decoded = jwt.verify(token, jwtkey);
    const user = await User.findById(decoded.id);

    if (!user) {
      res.locals.user = null;
      return res.status(401).json({ message: "User not found" });
    }

    res.locals.user = user;
    next();
  } catch (err) {
    console.error("JWT verification error:", err);
    return res.status(401).json({ message: "Invalid token" });
  }
};

const checkSubscriptionStatus = async (userId) => {
  const subscription = await Subscription.findOne({ userId });
  if (!subscription?.easypayId) return;

  const response = await axios.get(
    `https://api.prod.easypay.pt/2.0/subscription/${subscription.easypayId}`,
    { headers: { AccountId: ACCOUNT_ID, ApiKey: API_KEY } }
  );

  if (response.data.status === 'active') {
    await Subscription.updateOne(
      { _id: subscription._id },
      { status: 'active', paymentStatus: 'completed' }
    );
  }
};

module.exports = verifyToken; // Export verifyToken directly