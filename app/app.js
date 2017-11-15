require('dotenv').config({path: '../.env'})

const express = require('express')
const app = express()
const bodyParser = require('body-parser')
const handleOSSEvents = require('./handlers/handleOSSEvents')
const debug = require('debug')('express')

// const convertAudioToWav = require('./handler')

const OSSErrorHandler = (err, req, res, next) => {
  // Log error
  console.error('err', err)
  if (!req.body) {
    return res.status(500).send({ error: err.message })
  } else {
    next(err)
  }
}

// parse body
app.use(bodyParser.json()) // to support JSON-encoded bodies
app.use(bodyParser.urlencoded({ // to support URL-encoded bodies
  extended: true
}))
app.use(bodyParser.text()) // to support plain text

// routes
app.get('/', (req, res) => res.send('Orchestration Service is up :D!'))
app.get('/notifications', (req, res) => res.send('/notifications Orchestration Service is up :D!'))

app.post('/', (req, res) => {
  // debug('req', req)
  require('./__test__/testCategorization')()
    .then(result => {
      debug('test result', result)
    })
  // debug('test', test)
  res.send('Got a POST request')
})

app.post('/notifications', (req, res, next) => {
  // Decode base64
  const bodyStr = Buffer.from(req.body, 'base64').toString('ascii')
  const body = JSON.parse(bodyStr)

  if (!body || !body.events) {
    return next(new Error('Request body is empty, it seems this request is not triggered by OSS'))
  }

  handleOSSEvents(body.events)

  res.send('/notifications got a POST request')
})

// handle error
app.use(OSSErrorHandler)

let port = process.env.PORT || 3000
const server = app.listen(port, () => debug(`App listening on port ${port}!`))

// increase the timeout to 1 hour
// app.timeout = 3600000
server.setTimeout(60 * 60 * 1000)
