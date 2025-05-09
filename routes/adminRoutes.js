const express = require("express");
const { getAllUsers, deleteUser, updateUser, addUser } = require("../controllers/admin_pagesController");
const auth = require("../middlewares/IsAuth");

const router = express.Router();

router.get("/users", auth, getAllUsers);
router.post('/users', auth, addUser);
router.delete('/users/:id', auth, deleteUser);
router.put('/users/:id', auth, updateUser);

module.exports = router;
