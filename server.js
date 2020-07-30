const express = require('express')
const app = express()
const bodyParser = require('body-parser')

const cors = require('cors')

const mongoose = require('mongoose')
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });

app.use(cors())


app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});


const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})

let exerciseSessionSchema = new mongoose.Schema({
  description: {type: String, required: true},
  duration: {type: Number, required: true},
  date: String
})

let userSchema = new mongoose.Schema({
  username: {type: String, required: true},
  log: [exerciseSessionSchema]
})

let Session = mongoose.model('Session', exerciseSessionSchema)
let User = mongoose.model('User', userSchema)

app.post('/api/exercise/new-user', bodyParser.urlencoded({ extended: false }), (req, res) => {
  let newUser = new User({username: req.body.username})
  newUser.save((err, savedUser) => {
    if(!err){
      let resObj = {}
      resObj['username'] = savedUser.username
      resObj['_id'] = savedUser.id
      res.json(resObj)
    }
  })
})

app.get('/api/exercise/users', (req, res) => {
  
  User.find({}, (err, usersArray) => {
    if(!err){
      res.json(usersArray)
    }
  })
})

app.post('/api/exercise/add', bodyParser.urlencoded({ extended: false }), (req, res) => {
  
  let newSession = new Session({
    description: req.body.description,
    duration: parseInt(req.body.duration),
    date: req.body.date
  })
  
  if(newSession.date === ''){
    newSession.date = new Date().toISOString().substring(0, 10)
  }
  
  User.findByIdAndUpdate(
    req.body.userId,
    {$push: {log: newSession}},
    {new: true},
    (err, updatedUser) => {
      if(!err){
        let resObj = {}
        resObj['_id'] = updatedUser.id
        resObj['username'] = updatedUser.username
        resObj['date'] = new Date(newSession.date).toDateString()
        resObj['duration'] = newSession.duration
        resObj['description'] = newSession.description
        res.json(resObj)
      }
    }
  )
})

app.get('/api/exercise/log', (req, res) => {
  
  User.findById(req.query.userId, (err, result) => {
    if(!err){
      let resObj = result
      

      
      if(req.query.from || req.query.to) {
        let fromDate = new Date(0)
        let toDate = new Date()
        
        if(req.query.from) {
          fromDate = new Date(req.query.from)
        }
        
        if(req.query.to) {
          toDate = new Date(req.query.to)
        }
        
        fromDate = fromDate.getTime()
        toDate = toDate.getTime()
        
        resObj.log = resObj.log.filter((session) => {
          let sessionDate = new Date(session.date).getTime()
          
          return sessionDate >= fromDate && sessionDate <= toDate
        })
      }
      
      if(req.query.limit) {
        result.log = result.log.slice(0, req.query.limit)
      }
      
      resObj = resObj.toJSON()
      resObj['count'] = result.log.length
      resObj.log.forEach((session) => {
        delete session['_id']
        return session
      })
      res.json(resObj)
      
    }
  })
})