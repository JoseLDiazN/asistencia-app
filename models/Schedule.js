const { Schema, model } = require('mongoose');

const scheduleSchema = new Schema({
  name: { type: String, required: true },
  startTime: { type: String, required: true },  // "08:00"
  endTime: { type: String, required: true },    // "17:00"
  lunchDuration: { type: Number, required: true } // minutos
});

module.exports = model('Schedule', scheduleSchema);