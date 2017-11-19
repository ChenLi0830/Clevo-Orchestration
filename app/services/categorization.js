require('es6-promise').polyfill()
const debug = require('debug')('categorization-service')
const {createApolloFetch} = require('apollo-fetch')
const retry = require('async-retry')

const MAX_RETRY = 3
let trialCount = 0

const getSpeechCategorization = (aggregatedTranscription) => {
  return new Promise((resolve, reject) => {
    return resolve('')
  })
}

const getSentenseCategorization = (sentence) => {
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
    .catch(error => {
      console.log('error: ', error)
      console.log('trialCount', trialCount, 'MAX_RETRY', MAX_RETRY)
      if (trialCount < MAX_RETRY) {
        console.log('Retry...')
        trialCount++
        return getSentenseCategorization(sentence)
      }
    })
}

function saveServiceResult ({_id, result}) {
  const fetch = createApolloFetch({
    uri: process.env.SERVER_ENDPOINT || `http://localhost:4000/graphql`
  })

  debug('Saving Categorization Result...')
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
      debug('Result is saved successfully', body)
      // debug('body.data', body.data)
      // debug('body.data.callUpdate', body.data.callUpdate)
      return body.data.callUpdate
    })
    .catch(error => {
      console.log('error: ', error)
      console.log('trialCount', trialCount, 'MAX_RETRY', MAX_RETRY)
      if (trialCount < MAX_RETRY) {
        console.log('Retry...')
        trialCount++
        return saveServiceResult({_id, result})
      }
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

  // 每句对话 - 串行处理
  async function categorizeInSeries (sentenceList) {
    let results = []
    // let index = 0
    for (const transcription of sentenceList) {
      // index += 1
      // let retries = 0
      await retry(async bail => {
        let category = await getSentenseCategorization(transcription.onebest)
        let categoryResult = {
          bg: transcription.bg,
          ed: transcription.ed,
          speaker: transcription.speaker,
          categories: category.categoriesOfSentence
          // categories: category,
        }
        debug('categoryResult', categoryResult)
        // if (index === 2) {
        //   if (retries <= 2) {
        //     retries++
        //     throw new Error('test error!')
        //   }
        // }
        results.push(categoryResult)
      }, {
        retries: 3,
        factor: 1
      })
    }
    debug('categorizationFinalResult', results)
    return results
  }
  return categorizeInSeries(sentenceList)

  // // 每句对话 - 并行处理
  // sentenceList.forEach(transcription => {
  //   let singleSentensePromise = getSentenseCategorization(transcription.onebest)
  //     .then(category => {
  //       return {
  //         bg: transcription.bg,
  //         ed: transcription.ed,
  //         speaker: transcription.speaker,
  //         categories: category.categoriesOfSentence
  //         // categories: category,
  //       }
  //     })

  //   nlpPromises.push(singleSentensePromise)
  // })

  // return Promise.all(nlpPromises)
  //   .then(results => {
  //     // debug('results', JSON.stringify(results))
  //     debug('Categorization finished.')
  //     let categorizeResult = {}
  //     categorizeResult.topicCategory = results[0]
  //     categorizeResult.sentenceCategories = results.slice(1)

  //     return categorizeResult
  //   })
}

function CategorizeAndSave (transcriptionResult) {
  debug('endpoint', process.env.SENTENCE_CATEGORIZATION_ENDPOINT || `http://localhost:3030/graphql`)

  return callService(transcriptionResult)
    .then(categorizationResult => {
      // debug('categorizationResult.topicCategory')
      // debug('Audio file has been transcribed: ', transcriptionResult)
      // debug('url', url)
      return saveServiceResult({_id: transcriptionResult.recordId, result: categorizationResult})
    })
}

module.exports = CategorizeAndSave
