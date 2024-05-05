const mongoose = require("mongoose");

function conectDB(){
    mongoose.connect("mongodb+srv://reservcars:hello123@cluster0.simyqc9.mongodb.net/test",{useUnifiedTopology:true,useNewUrlParser:true})
    
    const connection = mongoose.connection

    connection.on('connected', ()=>{
        console.log('Mongo DB Successful')
    })

    connection.on('error',()=>{
        console.log('error');
    })
}

conectDB()

module.exports = mongoose

// npx json-server --routes routes.json db.json --port 5000