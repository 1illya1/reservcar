const express = require("express");
const router = express.Router();
const Reserv = require("../models/reservModel");
const Car = require("../models/carModel");
const { v4: uuidv4 } = require("uuid");
const stripe = require("stripe")(
    "sk_test_51OrgaHLC2ODdkCFk1io8uRMbTaW7JEEY198aAzWtKSL8rwLygXYMne6xH6ysDiGtmnXTIkrU0mmtPg6SbMlMVQqm00hNjRTIky");

router.post("/reservcar", async(req, res) => {
    const { token } = req.body;
    try {
      const customer = await stripe.customers.create({
        email: token.email,
        source: token.id,
      });
  
      const payment = await stripe.charges.create(
        {
          amount: req.body.totalAmount * 100,
          currency: "inr",
          customer: customer.id,
          receipt_email: token.email
        },
        {
          idempotencyKey: uuidv4(),
          
        }
      );
  
      if (payment) {
        req.body.transactionId = payment.source.id;
        const newbooking = new Reserv(req.body);
        await newbooking.save();
        const car = await Car.findOne({ _id: req.body.car });
        console.log(req.body.car);
        car.bookedTimeSlots.push(req.body.bookedTimeSlots);
  
        await car.save();
        res.send("Your booking is successfull");
      } else {
        return res.status(400).json(error);
      }
    } catch (error) {
      console.log(error);
      return res.status(400).json(error);
    }
  });
  

router.get("/getallreservs", async(req, res) => {

    try {

        const reservs = await Reserv.find().populate('car')
        res.send(reservs)
        
    } catch (error) {
        return res.status(400).json(error);
    }
  
});


module.exports = router;