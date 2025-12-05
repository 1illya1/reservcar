const mongoose = require("mongoose");

const roomSchema = new mongoose.Schema({

    name : {type : String , required : true} ,
    img : {type : String , required : true} ,
    capacity : {type : Number , required : true},
    roomType : {type : String , required : true} ,
    bookedTimeSlots : [
        {
            from : {type : String , required : true},
            to : {type : String , required : true}
        }
    ] ,

    rentPerHour : {type : Number , required : true},
    amenities : {type : String},
    floor : {type : Number}

}, {timestamps : true}

)
const roomModel = mongoose.model('rooms' , roomSchema)
module.exports = roomModel
