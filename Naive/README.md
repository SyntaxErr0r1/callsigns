# Callsign naive recognition
[UP](../README.md)
- Detecting nearby plane in the transcript
- API searching for nearby callsigns inside the transcript
- Author: Juraj Dedič

## Mechanism
- For each airplane of the nearby callsigns list:
  - callsign example: RYR83H
  - sentence example: Ryanair eighty three hotel descend flight level one hundred
  - (Expansion) - It generates possible variations of the callsign in it's spoken form:
    - possible variations example:
      - Romeo Yankee Romeo eight three Hotel
      - Romeo Yankee Romeo eighty three Hotel
      - Ryanair eighty three Hotel
      - Ryanair Romeo eighty three Hotel
    - (Scoring) for each variation it scores it based on windowing algorithm:
      - The algorithm uses a *window*, which is an N-gram of the transcript.
      - Where N is the number of tokens of the callsign
      - The algorithm finds the maximum score after iterating through each position of the window
    - The most probable variation is returned for each callsign
  - The callsign scores are then compared
  - The best matching callsign is chosen
  - If there are multiple callsigns with the same score, then the longest match will be returned
  
## About the script
- The way it was meant to work initially was to leverage the n-best hypothesis
- Somehow using the way I intended did not gave me better results
- That is why there are functions doing similar things (labeled as deprecated) but for CNET words
- It was switched to use 1-best CNET sequence
- It normalizes the input text
- Also for some reason, I initially implemented the datasample endpoint, which maybe just made things more difficult

## Files
- `callsignsExpansion.js` is the script responsible for generating the variations for more accurate matching
- `callsignsService.js` the main script doing the hard work
- `airlines.js` mappings of ICAO callsigns
- `index.js` the main JS file which should be run

## API 

The API accepts content type `application/json`.
It listens for requests on following endpoints:

### POST /datasample
 - Used for testing 
 - The request body should contain whole datasample described in the ATCO JSON dataset readme
 - returns matches for each segment of the datasample

### POST /:threshold?
 - **Recommended** primary endpoint
 - Accepts the transcript of a single segment
 - The request should contain one segment
 - threshold is an optional parameter (default = 0.6)
 - threshold is for filtering low probability results
 - Request body should have following form:
```json
    {
        "text": "Ryanair eighty three hotel romeo descend flight level one hundred",
        "nearbyCallsigns": [
            "RYR8HR", "RYR93V", "OKFCA", "CSA183"
        ] 
    }
   ```
 - returns *match* object with the most probable variation of the contained callsign:
```json
    {
        "callsign": "RYR8HR",
        "variation": "Ryanair eighty three hotel romeo",
        "p": 1.0
    }
```
 - If none of the potential callsigns has score higher than the threshold, it returns:
```json
    {}
```

## Installation and Running the script

The following section describes how to properly install the API and run it using Node.js.

### Installation

Run one of the following commands inside this directory to install the script:

```sh
yarn install
```

or

```sh
npm install
```

### Start the server
To run the server, use one of the following commands:

```sh
yarn start
```

or

```sh
npm run-script start
```

yarn start

### Requirements 

These applications are needed to successfully install and run the server script:
 - Node.js v18