const express = require("express");
const router = express.Router();
const { getInqueritos, createInquerito, InqueritoG,getPerguntasByDoenca } = require("../controllers/inqueritoscontroller");
const auth = require("../middlewares/IsAuth");
 
router.get("/inqueritosGET", auth, InqueritoG);
router.post("/inquerito", auth, createInquerito);
router.get("/getinqueritos", auth, getInqueritos);
router.get("/doencas/:doenca",getPerguntasByDoenca);
 
 
module.exports = router;