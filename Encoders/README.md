# Callsign detection
[UP](../README.md)

This program uses Flask for API server.
It uses SpaCy model trained on data from ATCO2 4-hour dataset of VHF transcripts.
It recognizes the contained callsign as a named entity in the transcript. 

## Requirements:
 - Python version 3.10^
 - Packages: `json`, `spacy`, `spacy_transformers`, `flask`

## Trained models location
`Results/` contains some of the trained models:
- `s2` is the spancat model
- `n1` is the NER model detecting only callsigns
- `n2` is the NER model detecting callsigns, commands & values
- `m2` is the NER model trained in the earlier stages (HuggingFace)

## Installation and running the server:
- Install the required packages & then run
- You should make sure that the port is available

Run using:
```sh
    python ner.py
```

```sh
    python spancat.py
```

## Common features of the scripts
- There are normalisations of the input text
- It detects one callsign per segment (practical reasons during the evaluation)

## About ner.py 
- The ICAO conversion functions were an attempt to recognize/convert. This was later considered inefficient
- So instead if there is a need to convert it, it is handled by the Naive system which sends request to this API for the detection and then converts the callsign

## About spancat.py
- The difference is that SpanCat returns array of possible callsigns which have probabilities (there can be many of them)
- Only the best one is selected



## API
The API has the following endpoints:

### POST /
 - It accepts requests with following JSON body:
 ```json
    {
        "text": "Lufthansha Eight Hotel Romeo descend flight level one hundred"
    }
   ```  
 - It returns a JSON array with the detected named callsigns entities.
 - There is a normalisation of the text
 ```json
    [
        {
            "confidence": "0.9924429",
            "endChar": 28,
            "span": "Lufthansha Eight Hotel Romeo",
            "startChar": 0,
            "tags": [
                1, 1, 1, 1, 0, 0, 0, 0, 0
            ],
            "text": "Lufthansha Eight Hotel Romeo"
        }
    ]
   ```

   - note that ner.py does not return confidence as the spacy library does not return them for this task