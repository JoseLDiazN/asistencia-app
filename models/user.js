const { Schema, model } = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new Schema({
  username:   { type: String, unique: true, required: true },
  password:   { type: String, required: true },
  role:       { type: String, enum: ['admin','employee'], default: 'employee' },
});

// Hash antes de guardar
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// Verificar password
userSchema.methods.verifyPassword = function(pass) {
  return bcrypt.compare(pass, this.password);
};

module.exports = model('User', userSchema);