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
  comments: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Comment' }],
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true } 
});

postSchema.pre('save', function(next) {
  if (!Array.isArray(this.tags)) {
    this.tags = [];
  }
  // Trim and filter out empty tags
  this.tags = this.tags
    .map(tag => typeof tag === 'string' ? tag.trim() : '')
    .filter(tag => tag.length > 0);
  next();
});

module.exports = mongoose.model('Post', postSchema);