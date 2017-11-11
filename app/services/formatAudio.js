const { createApolloFetch } = require('apollo-fetch')

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
