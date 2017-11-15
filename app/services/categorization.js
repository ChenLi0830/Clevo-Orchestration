require('es6-promise').polyfill()
const fetch = require('isomorphic-fetch')
const debug = require('debug')('categorization-service')
const {createApolloFetch} = require('apollo-fetch')

const _defaultBannedWords = ['不清楚', '不可能', '不明白', '不知道', '黑名单', '加白', '群发短信', '沉默短信', '屏蔽']
const _defaultAlertWords = ['媒体', '记者', '工信部', '律师', '媒体', '记者', '消协', '诈骗', '曝光']

const callNLPMethod = (inputTxt, url) => {
  let params = {text: inputTxt}
  const searchParams = Object.keys(params).map((key) => {
    return encodeURIComponent(key) + '=' + encodeURIComponent(params[key])
  }).join('&')

  return fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8'
    },
    body: searchParams
  })
    .then((response) => {
      debug('callNLPMethod response', response)
      return response.text()
    })
    .then(result => {
      return result
    })
}

const getSpeechCategorization = (aggregatedTranscription) => {
  return callNLPMethod(aggregatedTranscription, 'https://clevo-categorize.appspot.com/')
}

const getSentenseCategorization = (sentence) => {
  // return new Promise((resolve, reject) => {
  //   return resolve(['扣款查询', '回答问题'])
  // })
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

const getWordsFromTranscript = (transcript, words) => {
  let result = []
  words.forEach(word => {
    if (transcript.indexOf(word) > -1) result.push(word)
  })
  return result
}

// function saveServiceResult ({result, sourceUrl}) {
//   const fetch = createApolloFetch({
//     uri: process.env.SERVER_ENDPOINT || `http://localhost:4000/graphql`
//   })

//   debug('result, sourceUrl', result, sourceUrl)
//   const query = `
//     mutation callCreate (
//         $status: EnumCallStatus,
//         $format: EnumCallFormat,
//         $encoding: EnumCallEncoding,
//         $source: String,
//         $transcription: CallTranscriptionInput,
//     ) { callCreate (record: {
//         status: $status,
//         format: $format,
//         encoding: $encoding,
//         source: $source,
//         transcription: $transcription,
//     }) {
//         recordId
//         record {
//         _id,
//         status,
//         format,
//         encoding,
//         source,
//         transcription {
//             processor,
//             taskId,
//             status,
//             result
//         },
//         createdAt,
//         updatedAt
//         }
//     }}
//   `
//   return fetch({
//     query,
//     variables: {
//       status: 'active',
//       format: 'wav',
//       encoding: 'pcm',
//       source: sourceUrl,
//       transcription: {
//         processor: 'iflytek',
//         taskId: result.id,
//         status: result.status,
//         result: JSON.parse(result.result)
//       }
//     }
//   })

//     .then(body => {
//       debug('body', body)
//       debug('body.data', body.data)
//       debug('body.data.callCreate', body.data.callCreate)
//       return body.data.callCreate
//     })
// }

function callService (transcriptionResult, bannedWords, alertWords) {
  // remove the first and last quote sign to get the array
  let sentencesStr = transcriptionResult.record.transcription.result.slice(1, -1)
  // replace all single quote with double quote to parse
  let sentencesChangeSign = sentencesStr.replace(/'/g, '"')
  let sentenceList = JSON.parse(sentencesChangeSign)
  // debug('sentenceList', sentenceList)

  const fileName = transcriptionResult.record.source.split('/').slice(-1)

  // nlp promises 包括两部分，对整段话getSpeechCategorization和对每句话getSentenseCategorization
  let nlpPromises = []

  // 整段对话
  // let speechTranscription = sentenceList.reduce((speech, sentence) => speech + sentence, '')
  // nlpPromises.push(getSpeechCategorization(speechTranscription))

  // 每句对话
  sentenceList.forEach(transcription => {
    let singleSentensePromise = getSentenseCategorization(transcription.onebest)
      .then(category => {
        let appearedBanWords = getWordsFromTranscript(transcription.onebest, bannedWords)
        let appearedAlertWords = getWordsFromTranscript(transcription.onebest, alertWords)
        return {
          bg: transcription.bg,
          ed: transcription.ed,
          onebest: transcription.onebest,
          speaker: transcription.speaker,
          categories: category,
          // categories: category,
          bannedWords: appearedBanWords,
          alertWords: appearedAlertWords
        }
      })

    nlpPromises.push(singleSentensePromise)
  })

  return Promise.all(nlpPromises)
    .then(results => {
      debug('results', JSON.stringify(results))
    })

    // return Promise.all(nlpPromises)
    //   .then(results => {
    //     let newFields = {}
    //     newFields.categorizedSpeechTopic = results[0]
    //     newFields.categorizeResult = results.slice(1)
    //     newFields.employeeId = getEmployeeId(fileName)
    //     let durationObj = analyzeTalkDurations(transcriptionList)
    //     newFields = Object.assign({}, newFields, durationObj)

    //     debug('newFields', newFields)

//     return processedSpeechUpdate(fileName, newFields)
//   })
}

function CategorizeAndSave (transcriptionResult, bannedWords = _defaultBannedWords, alertWords = _defaultAlertWords) {
  return callService(transcriptionResult, bannedWords, alertWords)
    .then(categorizationResult => {
      // debug('Audio file has been transcribed: ', transcriptionResult)
      // debug('url', url)
      // return saveServiceResult({result: categorizationResult})
      return {sentenceCategories: '', topicCategory: ''}
    })
}

module.exports = CategorizeAndSave
