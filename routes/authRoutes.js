const express = require("express");
const { 
  index, 
  login, 
  logout, 
  SignIn, 
  SignInSub, 
  forgotPassword,
  resetPassword,
  getinfo,
  teste, 
  teste1,
  verifyEmail,
  resendVerification
} = require("../controllers/authController");
const auth = require("../middlewares/IsAuth");

const router = express.Router();

router.get("/getinfo", auth, getinfo);
router.get("/", index);
router.post("/login", login);
router.get("/logout", logout);
router.get("/SignUp", SignIn);
router.post("/SignIn_submit", SignInSub);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);
router.get("/verify-email", verifyEmail);
router.post("/resend-verification", resendVerification); // Added
router.get("/chats", auth, teste);
router.get("/inquerito", auth, teste1);

module.exports = router;