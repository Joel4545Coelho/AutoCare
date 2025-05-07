const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
  title: { type: String, required: true },
  content: { type: String, required: true },
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'user', required: true },
  image: { type: String },
  tags: {
    type: [String],
    default: [] // Ensure default is set
  },
  comments: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Comment' }],
}, { 
  timestamps: true,
  toJSON: { virtuals: true }, // Ensure tags are included when converting to JSON
  toObject: { virtuals: true } 
});

// Add this to your Post model file
postSchema.pre('save', function(next) {
  // Ensure tags is always an array
  if (!Array.isArray(this.tags)) {
    this.tags = [];
  }
  // Remove empty tags
  this.tags = this.tags.filter(tag => tag && typeof tag === 'string');
  next();
});

module.exports = mongoose.model('Post', postSchema);