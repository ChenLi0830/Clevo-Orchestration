/*******************************************************************************
 * Copyright (C) 2017-2018 Clevo Artificial Intelligence Inc.
 * Creator: Chen Li<chen.li@clevoice.com>
 * Creation Date: 2017-08
 * Audio data processing pipeline: orchestrate all services
 *******************************************************************************/

const debug = require('debug')('handleOSSEvent')
const formatAudioService = require('../services/formatAudio')
const transcribeSpeechAndSave = require('../services/transcribeSpeech')
const categorizeSpeechAndSave = require('../services/categorization')
const recognizeEmotionAndSave = require('../services/emotionRecognition')
const postProcessingAndSave = require('./postProcessing')

/**
 * orchestrate all services
 * @param {Array<String>} urlArr array of audio file urls
 */
function processAudioFiles (urlArr) {
  let promises = urlArr.map(url => {
    // todo read company configuration, and use the configurations for the variables for this
    debug('Start formatting audio')
    return formatAudioService({audioUrl: url})
      .then(savedAudioUrl => {
        debug(`Audio file has been formatted: ${savedAudioUrl}`)
        debug(`Start transcribing speech`)
        return transcribeSpeechAndSave(savedAudioUrl)
      })
      .then(savedTranscription => {
        debug('Speech has been transcribed', savedTranscription)
        debug('Start categorizing speech')
        return categorizeSpeechAndSave(savedTranscription)
      })
      .then(categorizationResult => {
        debug('Speech has been categorized', categorizationResult)
        debug('Start recognizing emotions')
        return recognizeEmotionAndSave(categorizationResult)
      })
      .then(emotionRecognizationResult => {
        debug('Emotion has been recognized', emotionRecognizationResult)
        // debug('Start post processing')
        // return postProcessingAndSave(emotionRecognizationResult)
      })
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

      // return result
      .catch(error => {
        console.log('error', error)
      })
  })

  return Promise.all(promises)
    .then(results => {
      return console.log('results', results)
    })
}

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

  return processAudioFiles(urls)
}

module.exports = handleOSSEvents
