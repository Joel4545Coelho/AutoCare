const express = require('express');
const router = express.Router();
const auth = require("../middlewares/IsAuth");
const upload = require('../middlewares/multer');

const { listPosts, createPost, createComment, createReply, editPost, editComment, editReply, deletePost, deleteComment, deleteReply, listPostsN } = require('../controllers/forumController');

router.get('/forum', auth, listPosts);
router.get('/forumN', auth, listPostsN);
router.post('/forum/create', auth, upload.single('image'), createPost);
router.post('/forum/post/:postId/comment', auth, upload.single('image'), createComment);
router.post('/forum/post/:postId/comment/:commentId/reply', auth, upload.single('image'), createReply);
router.post('/forum/post/:postId/edit', auth, upload.single('image'), editPost);
router.post('/forum/comment/:commentId/edit', auth, upload.single('image'), editComment);
router.post('/forum/reply/:replyId/edit', auth, upload.single('image'), editReply);
router.delete('/forum/post/:postId', auth, deletePost);
router.delete('/forum/comment/:commentId', auth, deleteComment);
router.delete('/forum/reply/:replyId', auth, deleteReply);

module.exports = router;