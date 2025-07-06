const { Schema, model } = require('mongoose');

const recordSchema = new Schema({
  employeeId: { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
  type: {
    type: String,
    enum: ['in', 'lunchOut', 'lunchIn', 'out'],
    required: true
  },
  timestamp: { type: Date, default: Date.now }
});

module.exports = model('Record', recordSchema);