const mongoose = require("mongoose");

const newsSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    content: {
        type: String,
        required: true
    },
    image: { 
        type: String 
    },
    organization_id: {
        type: mongoose.Schema.Types.ObjectId,ref: 'user',  required: true
    },

},{ timestamps: true });


const news = mongoose.model("news", newsSchema);

module.exports = news;