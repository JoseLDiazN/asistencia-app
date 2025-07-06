const { Schema, model } = require('mongoose');

const employeeSchema = new Schema({
  code:       { type: String, unique: true, required: true },
  name:       { type: String, required: true },
  department: { type: String },
  scheduleId: { type: Schema.Types.ObjectId, ref: 'Schedule', required: true }
});

module.exports = model('Employee', employeeSchema);