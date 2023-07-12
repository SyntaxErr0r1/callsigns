# Callsigns detection and recognition
Author: Juraj Dedič

- This is the main readme explaining the directories
- All the main code directories should have their own README describing them more in detail

## Directories 
Description of the directories used for the Callsign detection and recognition.

### Encoders/ [link](Encoders/README.md)
- contains the callsign detection APIs based on SpaCy NER and SpanCat
-  includes the trained models

### Naive/ [link](Naive/README.md)
- Contains the naive callsign recognition (/ICAO conversion) system

### NER/ [link](NER/README.md)
- Contains the files needed to train the NER models
- Includes evaluation files
- Mostly notebooks

### NER/data-conversion/ [link](NER/data-conversion/README.md)
- Contains the conversion script
- The script is used to process the original .XML files 
- Creating the train dataset


### OpenAI/ [link](OpenAI/README.md)
- contains the script for performing callsign detection (/recognition (not written in the thesis) )
- also works as an API for eval script

### Testers/ [link](Testers/README.md)
- contains the evaluation scripts for Span and ICAO tasks
- contains own dataset generator (converter)
- this converter combines the .XML, .CNET, .INFO into a single .JSON

### Text/
- directory with the latex source code

<!-- ### xdedic07-detekceVolacichZnaku.pdf [link](xdedic07-detekceVolacichZnaku.pdf)
- pdf text of the thesis -->

<!-- ### plagat.pdf [link](plagat.pdf)
- the demonstration poster of the thesis -->

<!-- ### video.mp4 [link](video.mp4)
- the demonstration video -->