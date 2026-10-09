const { default: mongoose } = require("mongoose");


const userSchema = new mongoose.Schema({
 firstName:{
    type: String,
    required:[true, 'First name is required']
 },
 lastName:{
     type: String,
    required:[true, 'Last name is required']
 },
 email:{
     type: String,
     required:[true, 'Email is required'],
     unique:true
 }, 

password:{
    type: String,
    required:[true, 'Password is required']
}, 
userType:{
    type: String,
    enum: ['guest', 'host'],
    default: 'guest'
},
favourites: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Home'
}],
bookings: [{
    home: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Home'
    },
    checkIn: { type: String, default: 'Tomorrow' },
    checkOut: { type: String, default: '5 days later' },
    guests: { type: Number, default: 2 },
    totalPrice: { type: Number },
    bookedAt: { type: Date, default: Date.now },
    status: { type: String, default: 'Confirmed' },
    refundStatus: { type: String, default: 'None' },
    refundAmount: { type: Number, default: 0 },
    cancelledAt: { type: Date }
}]
});

module.exports = mongoose.model('User', userSchema);