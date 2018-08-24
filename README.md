# Orchestration Service

This service is triggered by Aliyun OSS, and is responsible for organizing all data-processing services for analyzing the audio file. The services includes reformatting (encoding), recognizing emotions, categorizing intentions and calculating statistics.

### Running the app


```bash
npm install
npm run start
```

### Test the app


```bash
node __test__/test${ServiceName}
```


