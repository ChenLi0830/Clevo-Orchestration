require('es6-promise').polyfill()
const fetch = require('isomorphic-fetch')
const debug = require('debug')('categorization-service')
const {createApolloFetch} = require('apollo-fetch')

const _defaultBannedWords = ['不清楚', '不可能', '不明白', '不知道', '黑名单', '加白', '群发短信', '沉默短信', '屏蔽']
const _defaultAlertWords = ['媒体', '记者', '工信部', '律师', '媒体', '记者', '消协', '诈骗', '曝光']

const getSpeechCategorization = (aggregatedTranscription) => {
  return new Promise((resolve, reject) => {
    return resolve('')
  })
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
      debug('body.data.updateCall', body.data.updateCall)
      return body.data.updateCall
    })
}

function callService (transcriptionResult, bannedWords, alertWords) {
  // remove the first and last quote sign to get the array
  let sentencesStr = transcriptionResult.record.transcription.result.slice(1, -1)

  // replace all single quote with double quote to parse
  let sentencesChangeSign = sentencesStr.replace(/'/g, '"')
  let sentenceList = JSON.parse(sentencesChangeSign)
  // debug('sentenceList', sentenceList)

  // const fileName = transcriptionResult.record.source.split('/').slice(-1)
  let nlpPromises = []

  // 整段对话
  let speechTranscription = sentenceList.reduce((speech, sentence) => speech + sentence, '')
  nlpPromises.push(getSpeechCategorization(speechTranscription))

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
      // debug('results', JSON.stringify(results))
      let categorizeResult = {}
      categorizeResult.topicCategory = results[0]
      categorizeResult.sentenceCategories = results.slice(1)

      return categorizeResult
    // newFields.staff = getEmployeeId(fileName, staffIdStartIndex, staffIdEndIndex)
    // staff: MongoID
    // breakdowns:
    // subject:
    // statistics: silence etc
    // organization: MongoID
    // format: EnumCallFormat
    // encoding: EnumCallEncoding
    // let durationObj = analyzeTalkDurations(transcriptionList)
    // newFields = Object.assign({}, newFields, durationObj)
    })
}

function CategorizeAndSave (transcriptionResult, bannedWords = _defaultBannedWords , alertWords = _defaultAlertWords , staffIdStartIndex, staffIdEndIndex) {
  return callService(transcriptionResult, bannedWords, alertWords, staffIdStartIndex, staffIdEndIndex)
    .then(categorizationResult => {
      debug('categorizationResult.topicCategory')
      // debug('Audio file has been transcribed: ', transcriptionResult)
      // debug('url', url)
      return saveServiceResult({_id: transcriptionResult.recordId, result: categorizationResult})
    })
}

module.exports = CategorizeAndSave
