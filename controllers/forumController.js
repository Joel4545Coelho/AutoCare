const Post = require('../models/postModel');
const Comment = require('../models/commentModel');
const user = require('../models/user');

const listPosts = async (req, res) => {
  const currentUser = res.locals.user;
  if (!currentUser) {
    return res.status(401).json({ error: "Unauthorized: User not authenticated" });
  }

  try {
    const { tags, sort } = req.query;
    let query = {};

    if (tags) {
      const tagArray = Array.isArray(tags) ? tags : [tags];
      query = { tags: { $in: tagArray } };
    }

    let sortOption = { createdAt: -1 }; // Default: newest first
    if (sort === 'top') {
      sortOption = { score: -1, createdAt: -1 }; // Highest score first, then newest
    } else if (sort === 'hot') {
      sortOption = { 
        $add: [
          { $subtract: [{ $size: "$upvotes" }, { $size: "$downvotes" }] },
          { $divide: [
            { $subtract: [{ $size: "$upvotes" }, { $size: "$downvotes" }] },
            { $add: [1, { $divide: [{ $subtract: [new Date(), "$createdAt"] }, 1000 * 60 * 60] }] }
          ] }
        ]
      };
    }

    const posts = await Post.find(query)
      .sort(sortOption)
      .populate('author', 'username type avatar')
      .populate({
        path: 'comments',
        populate: [
          { path: 'author', select: 'username type avatar' },
          { path: 'replies', populate: { path: 'author', select: 'username type avatar' } },
        ],
      })
      .lean();

    const postsWithTags = posts.map(post => ({
      ...post,
      tags: post.tags || []
    }));
    res.status(200).json({ success: true, posts: postsWithTags });
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
          { path: 'replies', populate: { path: 'author', select: 'username type avatar' } },
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

    console.log('Raw request body:', req.body);
    console.log('Raw tags data:', req.body.tags);

    let tags = [];
    if (req.body.tags) {
      if (Array.isArray(req.body.tags)) {
        tags = req.body.tags;
      } else if (typeof req.body.tags === 'string') {
        tags = [req.body.tags];
      }
    }

    tags = tags.filter(tag => tag && typeof tag === 'string');

    console.log('Processed tags:', tags);

    const { title, content } = req.body;
    const author = currentUser._id;

    if (!title || !content) {
      return res.status(400).json({
        success: false,
        message: 'Title and content are required'
      });
    }

    const newPost = new Post({
      title,
      content,
      image: req.file.location,
      tags,
      image: req.file.location,
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
    console.error('Full error in createPost:', err);
    res.status(500).json({
      success: false,
      message: 'Error creating post',
      error: err.message
    });
  }
};

const editPost = async (req, res) => {
  try {
    const { postId } = req.params;
    const currentUser = res.locals.user;

    // Handle tags the same way as createPost
    let tags = [];
    if (req.body.tags) {
      if (Array.isArray(req.body.tags)) {
        tags = req.body.tags;
      } else if (typeof req.body.tags === 'string') {
        tags = req.body.tags.split(',').map(tag => tag.trim());
      }
    }
    tags = Array.isArray(tags) ? tags : [tags].filter(Boolean);

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    if (post.author.toString() !== currentUser._id.toString()) {
      return res.status(403).json({ success: false, message: "You can only edit your own posts" });
    }

    // Update tags explicitly
    post.tags = tags;
    post.title = req.body.title || post.title;
    post.content = req.body.content || post.content; s

    if (req.file) {
      post.image = req.file.location;
    } else if (req.body.clearImage === 'true') {
      post.image = undefined;
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
      image = req.file.location;
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
      image = req.file.location;
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
      comment.image = req.file.location;
    } else if (req.body.image === 'null') {
      comment.image = undefined;
    }

    await comment.save();
    
    const populatedComment = await Comment.findById(comment._id)
      .populate('author', 'username type avatar')
      .populate({
        path: 'replies',
        populate: {
          path: 'author',
          select: 'username type avatar'
        }
      });
      
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
      reply.image = req.file.location;
    } else if (req.body.image === 'null') {
      reply.image = undefined;
    }

    await reply.save();
    
    const populatedReply = await Comment.findById(reply._id)
      .populate('author', 'username type avatar');
      
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

// Upvote a post
const upvotePost = async (req, res) => {
  try {
    const { postId } = req.params;
    const userId = res.locals.user._id;

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }

    // Check if user already upvoted
    if (post.upvotes.includes(userId)) {
      return res.status(400).json({ success: false, message: 'You already upvoted this post' });
    }

    // Remove from downvotes if exists
    post.downvotes = post.downvotes.filter(id => !id.equals(userId));

    // Add to upvotes
    post.upvotes.push(userId);
    post.score = post.upvotes.length - post.downvotes.length;
    await post.save();

    res.json({ success: true, post });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error upvoting post', error: err.message });
  }
};

// Downvote a post
const downvotePost = async (req, res) => {
  try {
    const { postId } = req.params;
    const userId = res.locals.user._id;

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }

    // Check if user already downvoted
    if (post.downvotes.includes(userId)) {
      return res.status(400).json({ success: false, message: 'You already downvoted this post' });
    }

    // Remove from upvotes if exists
    post.upvotes = post.upvotes.filter(id => !id.equals(userId));

    // Add to downvotes
    post.downvotes.push(userId);
    post.score = post.upvotes.length - post.downvotes.length;
    await post.save();

    res.json({ success: true, post });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error downvoting post', error: err.message });
  }
};

// Remove vote from post
const removePostVote = async (req, res) => {
  try {
    const { postId } = req.params;
    const userId = res.locals.user._id;

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }

    // Remove from both upvotes and downvotes
    post.upvotes = post.upvotes.filter(id => !id.equals(userId));
    post.downvotes = post.downvotes.filter(id => !id.equals(userId));
    post.score = post.upvotes.length - post.downvotes.length;
    await post.save();

    res.json({ success: true, post });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error removing vote', error: err.message });
  }
};

// Upvote a comment
const upvoteComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    const userId = res.locals.user._id;

    const comment = await Comment.findById(commentId);
    if (!comment) {
      return res.status(404).json({ success: false, message: 'Comment not found' });
    }

    if (comment.upvotes.includes(userId)) {
      return res.status(400).json({ success: false, message: 'You already upvoted this comment' });
    }

    comment.downvotes = comment.downvotes.filter(id => !id.equals(userId));
    comment.upvotes.push(userId);
    comment.score = comment.upvotes.length - comment.downvotes.length;
    await comment.save();

    res.json({ success: true, comment });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error upvoting comment', error: err.message });
  }
};

// Downvote a comment
const downvoteComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    const userId = res.locals.user._id;

    const comment = await Comment.findById(commentId);
    if (!comment) {
      return res.status(404).json({ success: false, message: 'Comment not found' });
    }

    if (comment.downvotes.includes(userId)) {
      return res.status(400).json({ success: false, message: 'You already downvoted this comment' });
    }

    comment.upvotes = comment.upvotes.filter(id => !id.equals(userId));
    comment.downvotes.push(userId);
    comment.score = comment.upvotes.length - comment.downvotes.length;
    await comment.save();

    res.json({ success: true, comment });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error downvoting comment', error: err.message });
  }
};

// Remove vote from comment
const removeCommentVote = async (req, res) => {
  try {
    const { commentId } = req.params;
    const userId = res.locals.user._id;

    const comment = await Comment.findById(commentId);
    if (!comment) {
      return res.status(404).json({ success: false, message: 'Comment not found' });
    }

    comment.upvotes = comment.upvotes.filter(id => !id.equals(userId));
    comment.downvotes = comment.downvotes.filter(id => !id.equals(userId));
    comment.score = comment.upvotes.length - comment.downvotes.length;
    await comment.save();

    res.json({ success: true, comment });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error removing vote', error: err.message });
  }
};

module.exports = { listPosts, createPost, createComment, createReply, editPost, editComment, editReply, deletePost, deleteComment, deleteReply, listPostsN, upvotePost, downvotePost, removePostVote, upvoteComment, downvoteComment, removeCommentVote };