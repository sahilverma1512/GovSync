const mongoose = require('mongoose');

const UserLoginSchema = new mongoose.Schema({
  firstName: {
    type: String,
   

  },
  lastName: {
    type: String,
    
  },
  email: {
    type: String,
   
  },
  PhoneNumber: {
    type: String,
   
},

  dob: {
    type: Date,
   
  },
  gender: {
    type: String,
    enum: ['Male', 'Female', 'Others'],
    
  },
  address: {
    type: String,
  
  },
  city: {
    type: String,
  },
  region: {
    type: String,
  },
  
  department:{
    type:String,
  },
  password: {
    type: String,
  
  },
  uniqueId: {
    type: String,
   
  }
},{ validateBeforeSave: false });

const UserLogin = mongoose.model('OfficerRegistration', UserLoginSchema);

module.exports = UserLogin;
