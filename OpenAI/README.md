## OPENAI - callsign detection
[UP](../README.md)
- This is the API for performing callsign detection in transcripts using OpenAI models
- The API endpoint is compatible with the testerSpan.js script
- Author: Juraj Dedič

### Running the script
- You need to have up to date Python 3 on your system
- The script uses Python packages `openai` and `flask`
- The set port (default 5000) must be available
- For getting the resposnses of the model `OPENAI_API_KEY` environment variable must be present
- It is recommended to use a paid OpenAI account as the free account is limited to 3 requests per second

Run using: 
```sh
python csg.py
```

### Detection using the script
- It uses `ChatCompletion` model `gpt-3.5-turbo`.
- The system message describes the role of the model
- Using `Completion` was also implemented, but not used as it is more expensive
- There are 2 examples in the prompt for the model to learn the task
- The aproximate number of tokens per segment is around `140`

### Recognition
- It was experimented to recognize the ICAO callsigns. 
- This was later abandoned because the OpenAI API was really getting a lot of traffic and it was sometimes difficult to test even detection
- The aproximate number of tokens per segment is more than thousand if I remember correctly, so much more expensive than detection
- BUT it could be interesting to test out in the future


### About the script

- Note that the OpenAI API is not always available
- Even with paid account it was sometimes unavailable
- The script also implements a simple cache in JSON format to save some time and money while experimenting.
- The cache is not perfect because of some weird way the strings are compared 


### API endpoint
- request:
```json
{
    "text": "Swiss one eight contact apron"
}
```

```json
[{
    "text": "Swiss one eight",
    "span": "Swiss one eight"
}]
```

- note that there is redundant `text` and `span` this is only for compatibility purposes between the scripts used