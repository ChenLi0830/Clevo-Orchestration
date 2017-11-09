const {formatAudio} = require('../services')
console.log('formatAudio', formatAudio)


function handleOSSEvents (events) {
  console.log('events', JSON.stringify(events))
  // Get all urls of all the files
  let urls = []
  events.forEach(event => {
    if (event.eventName === 'ObjectCreated:PostObject') {
      let url = `http://${event.oss.bucket.name}.oss-${event.region}.aliyuncs.com/${event.oss.object.key}`
      urls.push(url)
    }
  })

  let promises = urls.map(url => {
    formatAudio(url).then(result => {
      //    console.log('result', result)
      //    return categorizeAudio(url)
      //  }).then(result => {
      //    // save text categorization result
      //    console.log('result', result)
      //    return emotionRecognition(result)
      //  }).then(result => {
      //    // save emotion recognition result
      //    console.log('result', result)
      //  }).then(result => {
      //    // post processing and save result
      //    console.log('result', result)
      //  }).then(() => {
      console.log(`File has been processed: ${url}`)
      return url
    }).catch(error => {
      console.log('error', error)
    })
  })

  return Promise.all(promises)
    .then(results => {
      return console.log("results", results)
  })

}

module.exports = handleOSSEvents
