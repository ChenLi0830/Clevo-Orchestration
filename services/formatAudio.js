/*******************************************************************************
 * Copyright (C) 2017-2018 Clevo Artificial Intelligence Inc.
 * Creator: Chen Li<chen.li@clevoice.com>
 * Creation Date: 2017-08
 * Call format-audio service, and get the url of formatted audio file.
 *******************************************************************************/
const { createApolloFetch } = require('apollo-fetch')

/**
 * Format Audio using corresponding parameters
 */
const formatAudio = ({audioUrl, encoding = 'pcm_s16le', channel = 1, sampleRate = 8000}) => {
  const fetch = createApolloFetch({
    uri: process.env.FORMAT_AUDIO_ENDPOINT || `http://localhost:3030/graphql`
  })

  const query = `
    mutation formatAudio(
      $audioUrl:String!
      $encoding: Encoding
      $channel: Int
      $sampleRate: Int
    ){
      formatAudioFile(
        audioUrl:$audioUrl, 
        encoding: $encoding, 
        channel: $channel
        sampleRate: $sampleRate
      ){
        url
      }
    }
  `

  return fetch({
    query,
    variables: {
      audioUrl,
      encoding,
      channel,
      sampleRate
    }
  }).then(({errors, data}) => {
    if (errors) {
      throw errors[0]
    }
    if (!data) {
      throw new Error(`call format Audio service failed`)
    }
    return data.formatAudioFile.url
  })
}

module.exports = formatAudio
