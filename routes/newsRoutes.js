const express = require('express');
const router = express.Router();
const newsController = require('../controllers/newsController');
const auth = require('../middlewares/IsAuth');
const upload = require('../middlewares/multer'); // Import multer middleware

router.get('/get_news', auth, newsController.index);
router.get('/get_newsN', auth, newsController.indexN);
router.post('/inserir', auth, upload.single('file'), newsController.inserir); // Handle image upload
router.delete('/delete/:id', auth, newsController.deletee);
router.put('/update/:id', auth, upload.single('file'), newsController.update); // Handle image upload
router.get('/news/:id', newsController.getById);

module.exports = router;