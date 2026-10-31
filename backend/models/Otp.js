const mongoose = require('mongoose');
const otpSchema = new mongoose.Schema({
  email:String, role:String, otp:String,
  purpose:{type:String,enum:['register','reset'],default:'register'},
  createdAt:{type:Date,default:Date.now,expires:300}
});
module.exports = mongoose.model('Otp',otpSchema);
