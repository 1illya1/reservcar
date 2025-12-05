const express = require('express')
const app = express()
const port = process.env.PORT || 5000
const dbConnection = require('./db')
const path = require('path')

app.use(express.json())
app.use(express.static(path.join(__dirname, 'client')))

app.use('/api/cars/' , require('./routes/carsRoute'))
app.use('/api/users/' , require('./routes/usersRoute'))
app.use('/api/reservs/' , require('./routes/reservsRoute'))
app.use('/api/rooms/' , require('./routes/roomsRoute'))
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'client', 'login.html')))


 


app.listen(port, () => console.log(`Node JS Server Started in Port ${port}`))