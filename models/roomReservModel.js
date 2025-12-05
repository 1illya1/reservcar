const mongoose = require("mongoose");

const roomBookingSchema = new mongoose.Schema({

    room : {type : mongoose.Schema.Types.ObjectID , ref:'rooms'},
    user : {type : mongoose.Schema.Types.ObjectID , ref:'users'},
    bookedTimeSlots : {
        from : {type : String} ,
        to : {type : String}
    } ,
    totalHours : {type : Number},
    totalAmount : {type : Number},
    transactionId : {type : String},
    userName : {type : String},
    userEmail : {type : String}

}, {timestamps : true})

const roomReservModel = mongoose.model('roomreservs' , roomBookingSchema)

module.exports = roomReservModel
