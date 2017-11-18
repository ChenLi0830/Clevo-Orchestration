const formatAudio = require('../services/formatAudio')
const debug = require('debug')('test')
// require('dotenv').config({path: '../../.env'})
require('dotenv').config({path: '../.env'})

const data = {
  audioUrl: 'http://companies-calls.oss-cn-beijing.aliyuncs.com/20170625083904_960_18841323731_601.mp3',
  encoding: 'pcm_s16le',
  channel: 1,
  sampleRate: 8000
}

formatAudio(data)
  .then(result => {
    // const {sentenceCategories, topicCategory} = result
    // debug('sentenceCategories', sentenceCategories)
    debug('result', result)
    return result
  })
