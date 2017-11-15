const { createApolloFetch } = require('apollo-fetch')
const debug = require('debug')('transcribe-service')

function saveServiceResult ({result, sourceUrl}) {
  const fetch = createApolloFetch({
    uri: process.env.SERVER_ENDPOINT || `http://localhost:4000/graphql`
  })

  const query = `
    mutation callCreate (
        $status: EnumCallStatus,
        $format: EnumCallFormat,
        $encoding: EnumCallEncoding,
        $source: String,
        $transcription: CallTranscriptionInput,
    ) { callCreate (record: {
        status: $status,
        format: $format,
        encoding: $encoding,
        source: $source,
        transcription: $transcription,
    }) {
        recordId
        record {
        _id,
        status,
        format,
        encoding,
        source,
        transcription {
            processor,
            taskId,
            status,
            result
        },
        createdAt,
        updatedAt
        }
    }}
  `

  debug('JSON.parse(result.result)', JSON.parse(result.result))
  debug('JSON.stringify(result.result)', JSON.stringify(result.result))
  return fetch({
    query,
    variables: {
      status: 'active',
      format: 'wav',
      encoding: 'pcm',
      source: sourceUrl,
      transcription: {
        processor: 'iflytek',
        taskId: result.id,
        status: result.status,
        // result: result.result
        result: JSON.parse(result.result)
      }
    }
  })

    .then(body => {
      debug('body.data.callCreate', body.data.callCreate)
      return body.data.callCreate
    })
}

function callService (audioUrl) {
  debug('endpoint', process.env.TRANSCRIBE_SPEECH_ENDPOINT || `http://localhost:3030/graphql`)

  const fetch = createApolloFetch({
    uri: process.env.TRANSCRIBE_SPEECH_ENDPOINT || `http://localhost:3030/graphql`
  })

  const variables = {
    file: audioUrl
  }

  const query = `
      mutation transcribeFile($file:String!){
        transcriptionCreate(file: $file){
          id
          status
          result
        }
      }
    `

  return fetch({
    query,
    variables
  })
  .then(body => {
    // debug('service response body', body)
    let data = body.data
    if (!data) {
      throw new Error(`call transcribe-speech service failed`)
    }
    return data.transcriptionCreate
  })
}

function transcribeSpeechAndSave (audioUrl) {
  return callService(audioUrl)
    .then(transcriptionResult => {
      debug('Audio file has been transcribed: ', transcriptionResult)
      // debug('Audio file has been transcribed: ', transcriptionResult)
      // console.log('url', url)
      return saveServiceResult({result: transcriptionResult, sourceUrl: audioUrl})
    })
}

module.exports = transcribeSpeechAndSave
