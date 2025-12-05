const express = require("express");
const router = express.Router();
const Room = require("../models/roomModel");
const RoomReserv = require("../models/roomReservModel");
const { v4: uuidv4 } = require("uuid");
const stripe = require("stripe")(
    "sk_test_51OrgaHLC2ODdkCFk1io8uRMbTaW7JEEY198aAzWtKSL8rwLygXYMne6xH6ysDiGtmnXTIkrU0mmtPg6SbMlMVQqm00hNjRTIky");

router.get("/getallrooms", async (req, res) => {
  try {
    const rooms = await Room.find();
    res.send(rooms);
  } catch (error) {
    return res.status(400).json(error);
  }
});

router.post("/addroom", async (req, res) => {
  try {
    const newroom = new Room(req.body);
    await newroom.save();
    res.send("Room added successfully");
  } catch (error) {
    return res.status(400).json(error);
  }
});

router.post("/editroom", async (req, res) => {
  try {
    const room = await Room.findOne({ _id: req.body._id });
    room.name = req.body.name;
    room.img = req.body.img;
    room.roomType = req.body.roomType;
    room.rentPerHour = req.body.rentPerHour;
    room.capacity = req.body.capacity;
    room.amenities = req.body.amenities;
    room.floor = req.body.floor;

    await room.save();

    res.send("Room details updated successfully");
  } catch (error) {
    return res.status(400).json(error);
  }
});

router.post("/deleteroom", async (req, res) => {
  try {
    await Room.findOneAndDelete({ _id: req.body.roomid });

    res.send("Room deleted successfully");
  } catch (error) {
    return res.status(400).json(error);
  }
});

router.post("/reservroom", async(req, res) => {
    const { token } = req.body;
    try {
      const customer = await stripe.customers.create({
        email: token.email,
        source: token.id,
      });

      const payment = await stripe.charges.create(
        {
          amount: req.body.totalAmount * 100,
          currency: "uah",
          customer: customer.id,
          receipt_email: token.email
        },
        {
          idempotencyKey: uuidv4(),
        }
      );

      if (payment) {
        req.body.transactionId = payment.source.id;

        // Генерація коду доступу
        const accessCode = Math.floor(100000 + Math.random() * 900000).toString();
        req.body.accessCode = accessCode;
        req.body.lockStatus = 'pending';

        const newbooking = new RoomReserv(req.body);
        await newbooking.save();
        const room = await Room.findOne({ _id: req.body.room });
        room.bookedTimeSlots.push(req.body.bookedTimeSlots);

        await room.save();

        res.send({
          message: "Your booking is successfull",
          accessCode: accessCode
        });
      } else {
        return res.status(400).json({error: "Payment failed"});
      }
    } catch (error) {
      console.log(error);
      return res.status(400).json(error);
    }
});

router.get("/getallroomreservs", async(req, res) => {
    try {
        const reservs = await RoomReserv.find().populate('room')
        res.send(reservs)
    } catch (error) {
        return res.status(400).json(error);
    }
});

module.exports = router;
