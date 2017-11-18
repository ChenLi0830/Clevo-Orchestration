require('es6-promise').polyfill()
const debug = require('debug')('categorization-service')
const {createApolloFetch} = require('apollo-fetch')

const getSpeechCategorization = (aggregatedTranscription) => {
  return new Promise((resolve, reject) => {
    return resolve('')
  })
}

const getSentenseCategorization = (sentence) => {
  debug('endpoint', process.env.SENTENCE_CATEGORIZATION_ENDPOINT || `http://localhost:3030/graphql`)

  const fetch = createApolloFetch({
    uri: process.env.SENTENCE_CATEGORIZATION_ENDPOINT || `http://localhost:3030/graphql`
  })

  const variables = {
    text: sentence
  }

  const query = `
    mutation categorizeSentence($text: String!){
      categorizeSentence(text:$text){
        categoriesOfSentence
      }
    }
  `

  return fetch({query, variables})
    .then(body => {
      // debug('service response body', body)
      let data = body.data
      if (!data) {
        throw new Error(`call categorization-speech service failed`)
      }
      return data.categorizeSentence
    })
}

function saveServiceResult ({_id, result}) {
  const fetch = createApolloFetch({
    uri: process.env.SERVER_ENDPOINT || `http://localhost:4000/graphql`
  })

  debug('result', result)
  const query = `
    mutation updateCall(
      $id: MongoID!
      $nlp: CallNlpInput
    ){
      callUpdate(record: {
        _id: $id
        nlp: $nlp
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
      'nlp': {
        'processor': 'clevo',
        'status': 'completed',
        'result': result
      }
    }
  })

    .then(body => {
      debug('body', body)
      debug('body.data', body.data)
      debug('body.data.callUpdate', body.data.callUpdate)
      return body.data.callUpdate
    })
}

function callService (transcriptionResult) {
  // remove the first and last quote sign to get the array
  let sentencesStr = transcriptionResult.record.transcription.result.slice(1, -1)

  // replace all single quote with double quote to parse
  let sentencesChangeSign = sentencesStr.replace(/'/g, '"')
  let sentenceList = JSON.parse(sentencesChangeSign)
  // debug('sentenceList', sentenceList)

  let nlpPromises = []

  // 整段对话
  let speechTranscription = sentenceList.reduce((speech, sentence) => speech + sentence, '')
  nlpPromises.push(getSpeechCategorization(speechTranscription))

  // 每句对话
  sentenceList.forEach(transcription => {
    let singleSentensePromise = getSentenseCategorization(transcription.onebest)
      .then(category => {
        return {
          bg: transcription.bg,
          ed: transcription.ed,
          speaker: transcription.speaker,
          categories: category.categoriesOfSentence
          // categories: category,
        }
      })

    nlpPromises.push(singleSentensePromise)
  })

  return Promise.all(nlpPromises)
    .then(results => {
      // debug('results', JSON.stringify(results))
      let categorizeResult = {}
      categorizeResult.topicCategory = results[0]
      categorizeResult.sentenceCategories = results.slice(1)

      return categorizeResult
    })
}

function CategorizeAndSave (transcriptionResult) {
  return callService(transcriptionResult)
    .then(categorizationResult => {
      debug('categorizationResult.topicCategory')
      // debug('Audio file has been transcribed: ', transcriptionResult)
      // debug('url', url)
      return saveServiceResult({_id: transcriptionResult.recordId, result: categorizationResult})
    })
}

module.exports = CategorizeAndSave
