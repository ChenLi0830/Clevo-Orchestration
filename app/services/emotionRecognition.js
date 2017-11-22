const { createApolloFetch } = require('apollo-fetch')
const debug = require('debug')('emotion-recognition-service')

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
    //   debug('body', body)
    //   debug('body.data', body.data)
      debug('body.data.callUpdate', body.data.callUpdate)
      return body.data.callUpdate
    })
}

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
