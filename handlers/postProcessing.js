/*******************************************************************************
 * Copyright (C) 2017-2018 Clevo Artificial Intelligence Inc.
 * Creator: Chen Li<chen.li@clevoice.com>
 * Creation Date: 2017-08
 * Get statistics for each phone call based on the prior service-call result
 *******************************************************************************/
const retry = require('async-retry')
const debug = require('debug')('post-Processing')

const _defaultBannedWords = ['不清楚', '不可能', '不明白', '不知道', '黑名单', '加白', '群发短信', '沉默短信', '屏蔽']
const _defaultAlertWords = ['媒体', '记者', '工信部', '律师', '媒体', '记者', '消协', '诈骗', '曝光']

/**
 * Count banned and alert words during the call
 * @param {*} transcript
 * @param {*} words
 */
function getWordsFromTranscript (transcript, words) {
  let result = []
  words.forEach(word => {
    if (transcript.indexOf(word) > -1) result.push(word)
  })
  return result
}

/**
 * Assign the emotion value for each sentence based on the segmented emotion recognition result
 * @param {*} emotionOfSentences 
 * @param {*} bg begin time of the sentence in sec
 * @param {*} ed end time of the sentence in sec
 */
function getEmotionValue (emotionOfSentences, bg, ed) {
  let value = 0
  for (let emotion of emotionOfSentences) {
    if (emotion.begin >= bg && emotion.end <= ed) {
      value = Math.max(emotion.prob[0], value)
    }
  }
  return value
}

/**
 * Get statistics for each phone call
 * @param {*} callData 
 * @param {*} bannedWords 
 * @param {*} alertWords 
 */
function getSpeechBreakdownAndStatistics (callData, bannedWords, alertWords) {
  let categorizedSentences = callData.nlp.result
  let transcriptedSentences = callData.transcription.result
  let emotionOfSentences = callData.emotion.result

  debug('categorizedSentences', categorizedSentences)
  debug('transcriptedSentences', transcriptedSentences)
  debug('emotionOfSentences', emotionOfSentences)

  emotionOfSentences = JSON.parse(emotionOfSentences.replace(/'/g, '"'))

  debug('emotionOfSentences', emotionOfSentences)

  let breakdowns = []
  let statistics = {
    speechDuration: categorizedSentences.slice(-1)[0].ed,
    slienceDuration: categorizedSentences.slice(-1)[0].ed,
    staffTalkDuraion: 0,
    customerTalkDuration: 0
  }

  categorizedSentences.forEach((sentence, i) => {
    let appearedBanWords = getWordsFromTranscript(transcriptedSentences[i].onebest, bannedWords)
    let appearedAlertWords = getWordsFromTranscript(transcriptedSentences[i].onebest, alertWords)
    let emotionValue = getEmotionValue(emotionOfSentences, sentence.bg, sentence.ed)

    let breakdown = {
      begin: sentence.bg,
      end: sentence.ed,
      speaker: sentence.speaker === 0 ? 'staff' : 'customer',
      intent: sentence.categories[0],
      // intents: sentence.categories
      transcript: transcriptedSentences[i].onebest,
      emotion: emotionValue,
      bannedWords: appearedBanWords,
      sensitiveWords: appearedAlertWords
    }
    debug('getSpeechBreakdown breakdown', breakdown)
    breakdowns.push(breakdowns)

    if (breakdown.speaker === 'staff') {
      statistics.staffTalkDuraion += (breakdown.end - breakdown.begin)
    } else {
      statistics.customerTalkDuration += (breakdown.end - breakdown.begin)
    }
  })

  statistics.slienceDuration = statistics.speechDuration - statistics.staffTalkDuraion - statistics.customerTalkDuration

  return {
    breakdowns,
    statistics
  }
}

function processResult (emotionRecognizationResult, staffIdSeparator = '_', staffIdIndex = '1', bannedWords, alertWords) {
  let result = {}

  let fileName = emotionRecognizationResult.source.split('/').slice(-1)[0]
  result.staff = fileName.split(staffIdSeparator)[staffIdIndex]

  result.subject = emotionRecognizationResult.nlp.result.topicCategory

  const tempResult = getSpeechBreakdownAndStatistics(emotionRecognizationResult, bannedWords = _defaultBannedWords, alertWords = _defaultAlertWords)
  result.breakdowns = tempResult.breakdowns
  result.statistics = tempResult.statistics

  result.organization = null
}

/**
 * Service orchestration
 * @param {*} emotionRecognizationResult
 * @param {*} staffIdSeparator special character used to separate staffIds
 * @param {*} staffIdIndex the index of staffId in the data
 * @param {*} bannedWords list of banned words
 * @param {*} alertWords list of alerted words
 */
async function postProcessingAndSave (emotionRecognizationResult, staffIdSeparator, staffIdIndex, bannedWords = _defaultBannedWords, alertWords = _defaultAlertWords) {
  let result = processResult(emotionRecognizationResult.record, staffIdSeparator, staffIdIndex, bannedWords, alertWords)
  debug('result', result)

  let savedResult = await retry(async bail => {
  }, {
    retries: 3,
    factor: 1
  })

  return savedResult
}

module.exports = postProcessingAndSave
