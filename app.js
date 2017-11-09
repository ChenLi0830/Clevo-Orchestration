// var OSS = require('ali-oss')
const client = require('./ossClient')

// Todo: implement using event trigger in the future (e.g. ObjectCreated:PutObject, ObjectCreated:UploadPart)
setInterval(() => {
  client.list()
    .then(result => {
      console.log('result.objects.length', result.objects.length)
    //   console.log('result.objects', result.objects)
    })
}, 3000)
