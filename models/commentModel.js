const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
  content: { type: String, required: true },
  image: { type: String, default: null },
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'user', required: true },
  post: { type: mongoose.Schema.Types.ObjectId, ref: 'Post', required: true },
  parentComment: { type: mongoose.Schema.Types.ObjectId, ref: 'Comment', default: null },
  upvotes: { 
    type: [mongoose.Schema.Types.ObjectId], 
    ref: 'user',
    default: [] 
  },
  downvotes: { 
    type: [mongoose.Schema.Types.ObjectId], 
    ref: 'user',
    default: [] 
  },
  score: { type: Number, default: 0 },
  replies: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Comment' }],
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true } 
});

// Calculate score before saving
commentSchema.pre('save', function(next) {
  this.score = this.upvotes.length - this.downvotes.length;
  next();
});

module.exports = mongoose.model('Comment', commentSchema);