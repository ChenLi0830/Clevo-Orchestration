/*******************************************************************************
 * Copyright (C) 2017-2018 Clevo Artificial Intelligence Inc.
 * Creator: Chen Li<chen.li@clevoice.com>
 * Creation Date: 2017-08
 * Call emotion-recognition service, and save resulted emotion list to DB
 *******************************************************************************/
const { createApolloFetch } = require('apollo-fetch')
const debug = require('debug')('emotion-recognition-service')

/**
 * Save emotion recognition result list to DB
 * @param {*} param0
 */
function saveServiceResult ({_id, result}) {
  const fetch = createApolloFetch({
    uri: process.env.SERVER_ENDPOINT || `http://localhost:4000/graphql`
  })

  debug('result', result)
  const query = `
        mutation saveEmotionToCall(
            $id: MongoID!
            $emotion: CallEmotionInput
        ){
            callUpdate(record: {
            _id: $id
            emotion: $emotion
            }){
            record {
                status
                format
                encoding
                source
                startedAt
                subject
                createdAt
                updatedAt
                organization {
                name
                status
                createdAt
                updatedAt
                }
                emotion {
                processor
                taskId
                status
                result
                }
                statistics {
                speechDuration
                slienceDuration
                staffTalkDuraion
                customerTalkDuration
                }
                breakdowns {
                begin
                end
                transcript
                intent
                speaker
                _id
                }
                transcription {
                processor
                taskId
                status
                result
                }
                nlp {
                processor
                taskId
                status
                result
                }
            }
            recordId
            }
        }
      `
  return fetch({
    query,
    variables: {
      'id': _id,
      'emotion': {
        'processor': 'clevo',
        'status': 'completed',
        'result': result
      }
    }
  })
    .then(body => {
      debug('body.data.callUpdate', body.data.callUpdate)
      return body.data.callUpdate
    })
}

/**
 * Emotion recognition based on transcription segment
 * @param {String} audioURL url of the audio file
 * @param {Array} transcriptionList segmented audio transcription text list
 */
function callService (audioURL, transcriptionList) {
  debug('endpoint', process.env.EMOTION_RECOGNITION_ENDPOINT || `http://localhost/graphql`)
  debug('audioURL, transcriptionList', audioURL, transcriptionList)

  const fetch = createApolloFetch({
    uri: process.env.EMOTION_RECOGNITION_ENDPOINT || `http://localhost:3030/graphql`
  })

  const variables = {
    audioURL,
    transcriptionList
  }

  const query = `
    mutation recognizeEmotion($audioURL: String!, $transcriptionList: String!){
      recognizeEmotion(audioURL:$audioURL, transcriptionList: $transcriptionList){
        emotions{
          begin
          end
          prob
          tag
        }
      }
    }
  `

  return fetch({
    query,
    variables
  })
    .then(body => {
      debug('service response body', body)
      let data = body.data
      if (!data) {
        throw new Error(`call emotion-recognition service failed`)
      }
      return data.recognizeEmotion.emotions
    })
}

/**
 * Service Orchestration: recognize emotions and save
 * @param {Object} categorizationResult obj returned by categorization service
 */
function recognizeEmotionAndSave (categorizationResult) {
  let audioURL = categorizationResult.record.source
  let transcriptionList = categorizationResult.record.transcription.result.trim()
  if (transcriptionList[0] === '\'') {
    transcriptionList = transcriptionList.substr(1, transcriptionList.length - 2)
  }
  return callService(audioURL, transcriptionList)
    .then(emotions => saveServiceResult({_id: categorizationResult.recordId, result: emotions}))
}

module.exports = recognizeEmotionAndSave
