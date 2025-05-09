const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
  title: { type: String, required: true },
  content: { type: String, required: true },
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'user', required: true },
  image: { type: String },
  tags: {
    type: [String],
    default: [],
    validate: {
      validator: function(tags) {
        return tags.every(tag => typeof tag === 'string' && tag.trim().length > 0);
      },
      message: 'All tags must be non-empty strings'
    }
  },
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
  score: { type: Number, default: 0 }, // Calculated field: upvotes.length - downvotes.length
  comments: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Comment' }],
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true } 
});

// Calculate score before saving
postSchema.pre('save', function(next) {
  if (!Array.isArray(this.tags)) {
    this.tags = [];
  }
  this.tags = this.tags
    .map(tag => typeof tag === 'string' ? tag.trim() : '')
    .filter(tag => tag.length > 0);
  
  // Calculate score
  this.score = this.upvotes.length - this.downvotes.length;
  next();
});

module.exports = mongoose.model('Post', postSchema);