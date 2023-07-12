# Dataset ATCO 4H JSON remake version
[UP](../README.md)

Directory containing files needed to evaluate the systems

## About
- Dataset was converted again using `datasetGenerator.js`
- both of the tester scripts normalize the input sequence

## Installation
- The packages needed for the scripts can be installed using:
```sh
  yarn install
```
```sh
  npm install
```


## datasetGenerator.js - Dataset [link](dataset.md)
- This dataset generator converts the:
  -  `.XML` - containing human transcript and correct timing of segments and speaker labels
  -  `.INFO` - containing the nearby callsigns list
  -  `.CNET` - containing the ASR transcript
- Converts the files into single `.json` for each XML source file
- It is run by `Usage: node datasetGenerator.js [path] [name]`
  - Where `path` is the directory containing the source dataset files ie. `test-set`
  - And `name` is the name of output directory for the `.json` files ie. `acc11`


## testerCore.js
- loads the samples and has some of the evaluation functions
- implemented dataset filtering using for example:
  - `prefix=LKPR` will test only files from Praha airport 
- it matches the `speaker-label` from the XML (`trueCallsigns` in the JSON) with the recognized callsign for scoring

## testerICAO.js
- for running the ICAO tester (for naive API) use for example:
- `node .\testerICAO.js acc11 prefix=LK`
  - where `acc11` can is the name of JSON dataset directory
  - And `prefix=LK` means only LKPR and LKTB will be run (with my dataset)

## testerSpan.js
- running of this script is the same as the ICAO tester (but with changed script name):
- `node .\testerSpan.js acc11 prefix=LK`
- The script supports multiple test subjects (`NER`, `SpanCat`, `GPT-3.5`, `Naive`)
- The script usage is kind of rough in terms of changing it's output
- Changing the tested subject requires un/commenting one of the `apiAddress` definitions
- The script in it's current stage tests human transcript for testing the ASR
  - to switch to testing ASR `segment = switchTextToCnet(segment);` needs to be uncommented 


## Running the tester scripts