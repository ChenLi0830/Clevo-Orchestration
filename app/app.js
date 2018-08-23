/*******************************************************************************
 * Copyright (C) 2017-2018 Clevo Artificial Intelligence Inc.
 *
 * Creator: Chen Li<chen.li@clevoice.com>
 * Creation Date: 2017-08
 *
 * Node Server Configuration
 *******************************************************************************/

require('dotenv').config({path: '../.env'})

const express = require('express')
const app = express()
const bodyParser = require('body-parser')
const handleOSSEvents = require('./handlers/handleOSSEvents')
const debug = require('debug')('express')

/**
 * Handle OSS file read / write Errors
 * @param {Error} err 
 * @param {*} req 
 * @param {*} res 
 * @param {*} next 
 */
const OSSErrorHandler = (err, req, res, next) => {
  // Log error
  console.error('err', err)
  if (!req.body) {
    return res.status(500).send({ error: err.message })
  } else {
    next(err)
  }
}

/**
 * Parse request body
 */
app.use(bodyParser.json()) // to support JSON-encoded bodies
app.use(bodyParser.urlencoded({ // to support URL-encoded bodies
  extended: true
}))
app.use(bodyParser.text()) // to support plain text

/**
 * Routes
 */
app.get('/', (req, res) => res.send('Orchestration Service is up :D!'))
app.get('/notifications', (req, res) => res.send('/notifications Orchestration Service is up :D!'))

app.post('/notifications', (req, res, next) => {
  const bodyStr = Buffer.from(req.body, 'base64').toString('ascii') // Decode base64
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
server.setTimeout(60 * 60 * 1000)
