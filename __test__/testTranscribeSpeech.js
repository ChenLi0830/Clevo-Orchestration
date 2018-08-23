/*******************************************************************************
 * Copyright (C) 2017-2018 Clevo Artificial Intelligence Inc.
 * Creator: Chen Li<chen.li@clevoice.com>
 * Creation Date: 2017-08
 * Service test: speech transcription
 *******************************************************************************/
const transcribeSpeechAndSave = require('../services/transcribeSpeech')
const debug = require('debug')('test')
// require('dotenv').config({path: '../../.env'})
require('dotenv').config({path: '../.env'})

let audioUrl = 'http://processed-wav-dev-uswest.oss-us-west-1.aliyuncs.com/20170625083904_960_18841323731_601.wav'

transcribeSpeechAndSave(audioUrl)
  .then(result => {
    // const {sentenceCategories, topicCategory} = result
    // debug('sentenceCategories', sentenceCategories)
    debug('result', result)
    return result
  })
