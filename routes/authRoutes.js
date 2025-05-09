const express = require("express");
const { index, login, logout, SignIn, SignInSub, teste, teste1, getinfo } = require("../controllers/authController");
const auth = require("../middlewares/IsAuth")

const router = express.Router();

router.get("/getinfo", auth , getinfo)
router.get("/", index);
router.post("/login", login);
router.get("/logout", logout);
router.get("/SignUp", SignIn);
router.post("/SignIn_submit", SignInSub);
router.get("/chats", auth , teste);
router.get("/inquerito", auth , teste1);

module.exports = router;

