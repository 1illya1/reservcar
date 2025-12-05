const express = require("express");
const router = express.Router();
const Room = require("../models/roomModel");

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

module.exports = router;
