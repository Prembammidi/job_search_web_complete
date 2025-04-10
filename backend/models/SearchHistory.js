const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const SearchHistorySchema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  keywords: {
    type: [String],
    default: []
  },
  location: {
    type: String
  },
  isRemote: {
    type: Boolean
  },
  hoursAgo: {
    type: Number,
    default: 2
  },
  resultCount: {
    type: Number,
    default: 0
  },
  searchDate: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('SearchHistory', SearchHistorySchema);
