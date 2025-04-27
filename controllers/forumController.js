const Post = require('../models/postModel');
const Comment = require('../models/commentModel');
const user = require('../models/user');

const listPosts = async (req, res) => {
  const currentUser = res.locals.user;
  console.log(currentUser)
  if (!currentUser) {
    return res.status(401).json({ error: "Unauthorized: User not authenticated" });
  }

  try {
    const posts = await Post.find()
      .sort({ createdAt: -1 })
      .populate('author', 'username type avatar')
      .populate({
        path: 'comments',
        populate: [
          { path: 'author', select: 'username type avatar' },
          { path: 'replies', populate: { path: 'author', select: 'username type' } },
        ],
      });

    res.status(200).json({ success: true, posts });
  } catch (err) {
    console.error('Error fetching posts:', err);
    res.status(500).json({ success: false, message: 'Error fetching posts' });
  }
};

const listPostsN = async (req, res) => {
  const currentUser = res.locals.user;
  const userType = res.locals.user.type;
  if (!currentUser) {
    return res.status(401).json({ error: "Unauthorized: User not authenticated" });
  }

  try {
    const posts = await Post.find()
      .sort({ createdAt: -1 })
      .populate('author', 'username type avatar')
      .populate({
        path: 'comments',
        populate: [
          { path: 'author', select: 'username type avatar' },
          { path: 'replies', populate: { path: 'author', select: 'username type' } },
        ],
      });

      res.render("Forum/index", { success: true, posts, userType });
  } catch (err) {
    console.error('Error fetching posts:', err);
    res.status(500).json({ success: false, message: 'Error fetching posts' });
  }
}; 



const createPost = async (req, res) => {
  try {
    const currentUser = res.locals.user;
    if (!currentUser) {
      return res.status(401).json({ error: "Unauthorized: User not authenticated" });
    }

    // Debugging: Log what's being received
    console.log('Request body:', req.body);
    console.log('Request file:', req.file);

    const { title, content } = req.body;
    const author = currentUser._id;

    // Validate required fields
    if (!title || !content) {
      return res.status(400).json({ 
        success: false, 
        message: 'Title and content are required' 
      });
    }

    const newPost = new Post({
      title,
      content,
      image: req.file ? req.file.path : null,
      author,
    });

    const savedPost = await newPost.save();
    const populatedPost = await Post.findById(savedPost._id)
      .populate('author', 'username type avatar');

    res.json({ 
      success: true, 
      post: populatedPost 
    });
  } catch (err) {
    console.error('Error creating post:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Error creating post', 
      error: err.message 
    });
  }
};

const createComment = async (req, res) => {
  const currentUser = res.locals.user;
  if (!currentUser) {
    return res.status(401).json({ error: "Unauthorized: User not authenticated" });
  }

  const currentUserId = currentUser._id;
  try {
    const { content, parentComment } = req.body;
    const postId = req.params.postId;

    if (!content) {
      return res.status(400).json({ success: false, message: 'Content is required.' });
    }

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found.' });
    }

    let image = null;
    if (req.file) {
      image = req.file.path;
    }

    const comment = new Comment({
      content,
      image,
      author: currentUserId,
      post: post._id,
      parentComment: parentComment || null,
    });

    await comment.save();

    if (!parentComment) {
      post.comments.push(comment._id);
      await post.save();
    } else {
      const parent = await Comment.findById(parentComment);
      if (parent) {
        parent.replies.push(comment._id);
        await parent.save();
      }
    }
    const populatedComment = await Comment.findById(comment._id).populate('author', 'username type avatar');

    res.json({ success: true, comment: populatedComment });
  } catch (err) {
    console.error('Error creating comment:', err);
    res.status(500).json({ success: false, message: 'Error creating comment', error: err.message });
  }
};

const createReply = async (req, res) => {
  const currentUser = res.locals.user;
  if (!currentUser) {
    return res.status(401).json({ error: "Unauthorized: User not authenticated" });
  }

  const currentUserId = currentUser._id;
  try {
    const { content } = req.body;
    const { postId, commentId } = req.params;

    if (!content) {
      return res.status(400).json({ success: false, message: 'Content is required.' });
    }

    const parentComment = await Comment.findById(commentId).populate('replies');
    if (!parentComment) {
      return res.status(404).json({ success: false, message: 'Parent comment not found.' });
    }

    let image = null;
    if (req.file) {
      image = req.file.path;
    }

    const reply = new Comment({
      content,
      image,
      author: currentUserId,
      post: postId,
      parentComment: commentId,
    });

    await reply.save();

    parentComment.replies.push(reply._id);
    await parentComment.save();
    const populatedReply = await Comment.findById(reply._id).populate('author', 'username type avatar');

    return res.status(201).json({ success: true, reply: populatedReply });
  } catch (err) {
    console.error('Error creating reply:', err);
    return res.status(500).json({ success: false, message: 'Error creating reply', error: err.message });
  }
};

const editPost = async (req, res) => {
  const currentUser = res.locals.user;
  if (!currentUser) {
    return res.status(401).json({ success: false, message: "Unauthorized: User not authenticated" });
  }

  try {
    const { postId } = req.params;
    const { title, content } = req.body;

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ success: false, message: "Post not found" });
    }

    if (post.author.toString() !== currentUser._id.toString()) {
      return res.status(403).json({ success: false, message: "You can only edit your own posts" });
    }

    // Update fields
    post.title = title || post.title;
    post.content = content || post.content;
    
    // Handle image update
    if (req.file) {
      post.image = req.file.path;
    } else if (req.body.image === 'null') {
      post.image = undefined; // Remove the image
    }

    await post.save();
    const populatedPost = await Post.findById(post._id)
      .populate('author', 'username type avatar');
      
    res.json({ 
      success: true, 
      message: "Post updated successfully", 
      post: populatedPost 
    });
  } catch (err) {
    res.status(500).json({ 
      success: false, 
      message: "Error updating post", 
      error: err.message 
    });
  }
};

const editComment = async (req, res) => {
  const currentUser = res.locals.user;
  const { content } = req.body;
  const { commentId } = req.params;

  try {
    const comment = await Comment.findById(commentId);
    if (!comment || comment.author.toString() !== currentUser._id.toString()) {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    comment.content = content || comment.content;

    if (req.file) {
      comment.image = req.file.path;
    }
    await comment.save();
    const populatedComment = await Comment.findById(comment._id).populate('author', 'username type avatar');
    res.json({ success: true, comment: populatedComment });
  } catch (err) {
    res.status(500).json({ success: false, message: "Error updating comment", error: err.message });
  }
};

const editReply = async (req, res) => {
  const currentUser = res.locals.user;
  const { content } = req.body;
  const { replyId } = req.params;

  try {
    const reply = await Comment.findById(replyId);
    if (!reply || reply.author.toString() !== currentUser._id.toString()) {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }
    reply.content = content || reply.content;

    if (req.file) {
      reply.image = req.file.path;
    }
    await reply.save();
    const populatedReply = await Comment.findById(reply._id).populate('author', 'username type avatar');
    res.json({ success: true, reply: populatedReply });
  } catch (err) {
    res.status(500).json({ success: false, message: "Error updating reply", error: err.message });
  }
};

const deletePost = async (req, res) => {
  const currentUser = res.locals.user;
  if (!currentUser) {
    return res.status(401).json({ success: false, message: "Unauthorized: User not authenticated" });
  }

  try {
    const { postId } = req.params;

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ success: false, message: "Post not found" });
    }

    if (post.author.toString() !== currentUser._id.toString()) {
      return res.status(403).json({ success: false, message: "You can only delete your own posts" });
    }

    await post.deleteOne();

    res.json({ success: true, message: "Post deleted successfully" });
  } catch (err) {
    res.status(500).json({ success: false, message: "Error deleting post", error: err.message });
  }
};

const deleteComment = async (req, res) => {
  const currentUser = res.locals.user;
  const { commentId } = req.params;

  try {
    const comment = await Comment.findById(commentId);
    if (!comment || comment.author.toString() !== currentUser._id.toString()) {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    const post = await Post.findById(comment.post);
    if (post) {
      post.comments.pull(commentId);
      await post.save();
    }

    if (comment.parentComment) {
      const parentComment = await Comment.findById(comment.parentComment);
      if (parentComment) {
        parentComment.replies.pull(commentId);
        await parentComment.save();
      }
    }

    await comment.deleteOne();
    res.json({ success: true, message: "Comment deleted successfully" });
  } catch (err) {
    res.status(500).json({ success: false, message: "Error deleting comment", error: err.message });
  }
};

const deleteReply = async (req, res) => {
  const currentUser = res.locals.user;
  const { replyId } = req.params;

  try {
    const reply = await Comment.findById(replyId);
    if (!reply || reply.author.toString() !== currentUser._id.toString()) {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    const parentComment = await Comment.findById(reply.parentComment);
    if (parentComment) {
      parentComment.replies.pull(replyId);
      await parentComment.save();
    }

    await reply.deleteOne();
    res.json({ success: true, message: "Reply deleted successfully" });
  } catch (err) {
    res.status(500).json({ success: false, message: "Error deleting reply", error: err.message });
  }
};

module.exports = { listPosts, createPost, createComment, createReply, editPost, editComment, editReply, deletePost, deleteComment, deleteReply, listPostsN };