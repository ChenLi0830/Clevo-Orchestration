require('dotenv').config()

const express = require('express')
const app = express()
const bodyParser = require('body-parser')
const handleOSSEvents = require('./handlers/handleOSSEvents')
const debug = require('debug')('express')

//const convertAudioToWav = require('./handler')

const OSSErrorHandler = (err, req, res, next) => {
  // Log error
  console.error("err", err)
  if (!req.body) {
    return res.status(500).send({ error: err.message })
  } else {
    next(err)
  }
}

// parse body
app.use(bodyParser.json())       // to support JSON-encoded bodies
app.use(bodyParser.urlencoded({     // to support URL-encoded bodies
  extended: true
}))
app.use(bodyParser.text()) // to support plain text

// routes
app.get('/', (req, res) => res.send('Orchestration Service is up :D!'))
app.get('/notifications', (req, res) => res.send('/notifications Orchestration Service is up :D!'))

app.post('/', (req, res) => {
  debug('req', req)
  res.send('Got a POST request')
})

app.post('/notifications', (req, res, next) => {
  // Decode base64
  const bodyStr = new Buffer(req.body, 'base64').toString('ascii')
  const body = JSON.parse(bodyStr)

  //  let body = new Buffer("eyJldmVudHMiOiBbewogICAgICAgICAgICAiZXZlbnROYW1lIjogIk9iamVjdENyZWF0ZWQ6UG9zdE9iamVjdCIsCiAgICAgICAgICAgICJldmVudFNvdXJjZSI6ICJhY3M6b3NzIiwKICAgICAgICAgICAgImV2ZW50VGltZSI6ICIyMDE3LTExLTA5VDE3OjU5OjQzLjAwMFoiLAogICAgICAgICAgICAiZXZlbnRWZXJzaW9uIjogIjEuMCIsCiAgICAgICAgICAgICJvc3MiOiB7CiAgICAgICAgICAgICAgICAiYnVja2V0IjogewogICAgICAgICAgICAgICAgICAgICJhcm4iOiAiYWNzOm9zczpjbi1iZWlqaW5nOjE4MjUyMjgzMzUyMzAyNDk6Y29tcGFuaWVzLWNhbGxzIiwKICAgICAgICAgICAgICAgICAgICAibmFtZSI6ICJjb21wYW5pZXMtY2FsbHMiLAogICAgICAgICAgICAgICAgICAgICJvd25lcklkZW50aXR5IjogIjE4MjUyMjgzMzUyMzAyNDkiLAogICAgICAgICAgICAgICAgICAgICJ2aXJ0dWFsQnVja2V0IjogIiJ9LAogICAgICAgICAgICAgICAgIm9iamVjdCI6IHsKICAgICAgICAgICAgICAgICAgICAiZGVsdGFTaXplIjogMjcyNTkyLAogICAgICAgICAgICAgICAgICAgICJlVGFnIjogIkY3MzRCOENBRUI3ODc3MzI0N0UwMTlGNEYzNjQzQjU5IiwKICAgICAgICAgICAgICAgICAgICAia2V5IjogIjIwMTcwNjI1MDgzOTA0Xzk2MF8xODg0MTMyMzczMV82MDEubXAzIiwKICAgICAgICAgICAgICAgICAgICAic2l6ZSI6IDI3MjU5Mn0sCiAgICAgICAgICAgICAgICAib3NzU2NoZW1hVmVyc2lvbiI6ICIxLjAiLAogICAgICAgICAgICAgICAgInJ1bGVJZCI6ICJ0ZXN0In0sCiAgICAgICAgICAgICJyZWdpb24iOiAiY24tYmVpamluZyIsCiAgICAgICAgICAgICJyZXF1ZXN0UGFyYW1ldGVycyI6IHsic291cmNlSVBBZGRyZXNzIjogIjIwNi4yMTQuMjQ2LjE5NiJ9LAogICAgICAgICAgICAicmVzcG9uc2VFbGVtZW50cyI6IHsicmVxdWVzdElkIjogIjVBMDQ5NzgzM0Y0MzRCQUQ0OURFNERGOSJ9LAogICAgICAgICAgICAidXNlcklkZW50aXR5IjogeyJwcmluY2lwYWxJZCI6ICIxODI1MjI4MzM1MjMwMjQ5In19XX0=", 'base64').toString('ascii')
  if (!body || !body.events){
    return next(new Error('Request body is empty, it seems this request is not triggered by OSS'))
  }

  handleOSSEvents(body.events)

  res.send('/notifications got a POST request')
})

// handle error
app.use(OSSErrorHandler)

let port = process.env.PORT || 3000
app.listen(port, () => console.log(`App listening on port ${port}!`))


