# Dataset ATCO 4H JSON remake version
[UP](./readme.md)

This file describes the format of the JSON objects 
<!-- 
## Structure

``` json
{
    sets:
    [
        {
            name: "test",
            samplesCount: 1024,
            utterances: [
                /**Sentence objects */
            ]
        }
    ]
}

``` -->


## Utterance object:
```json
{
    filename: "RADAR_PRAHA_5mhz_10031892",
    nearbyCallsigns: ["BLA1RK", "BRU861", ...],
    segments: [SegmentObj],
    trueCallsigns: ["BRU861"]
}

```

## Segment
- tags: array of tags for each token in the sentence. Each tag is either 0 or 1. 0 means that the token is not a callsign, 1 means that the token is a callsign.
- possible more tags in the future
```json
{
    text: ["oscar kilo foxtrot charlie alpha you be leave tma praha"],
    tags: [1,1,1,1,1,0,0,0,0,0],
    textCnet: [CnetObject, ...],
    speaker: "A",
    start: 0,
    end: 3.48,
}
```


## CNET object
Object created from each line of the .cnet file which was created using ASR.

This object represents one word from the sentence.

Specifically it contains array of pairs (`t`,`p`). `t` is the token recognised by the ASR and `p` is the probability of the token in the place of the current word.
```json
[
    {
        t: "<eps>", 
        p: 0.9999633 
    },
    {
        t: "go",
        p: 1.297652e-05
    },
    {
        t: "it",
        p: 6.019365e-06
    },
    {
        t: "two",
        p: 5.743921e-06
    },
    {
        t: "to",
        p: 5.034454e-06
    }
]
```


## Nearby callsign object

These objects are extracted from the .info file and have the following structure:

DEPRECATED - now using only short form
```json
{
    callsign: "AFR58MK",
    long: "Air France Five Eight Mike Kilo"
}
```

```json
    "AFR58MK"
```

# Calculating posterior probability
<!-- The posterior probability of a callsign is calculated as follows:
 - The algorithm has a window of the length of the callsign.
 - It moves this window over the sentence and calculates the probability of the callsign in the current position.
 - This probability is calculated for each (spoken) variation of the callsign for every nearby callsign. -->

## Notes
 <!-- - The probability calculated from the CNET is currently taking into account only the most probable token for each word. -->
 <!-- - The CNET is sometimes noisy and the actual word is not the most probable one.  -->
 <!-- - Not matching times of words in cnet and xml segments for example LKPR_RUZYNE_Radar_120_520MHz_20201024_221711.cnet  -->

## TODO
 <!-- - Threshold for callsign detection in sentence  -->
   <!-- - ROC curve -->
 <!-- - API for neural callsign recognition -->
 <!-- - ?Filter out only possible relevant words based on info -->
 <!-- - ?Weight airline detection so it has heavier impact on the score  -->
 - refactor testerCore.js 
   - getSegments 2 times in the files - similar behavior
 - DATASET
   <!-- - fix (-ding) [ne french] in human text  -->
   <!-- - remove files where CNET segments have way less tokens than human segments -->
 <!-- - 2 tasks comparison BERT vs naive, human vs cnet, different airports different WERs: -->
   <!-- - ICAO DETECTION:
     - naive: Already working (using nearby callsign) Human & Cnet
     <!-- - bert: BERT returns entity tokens (pair with native to get ICAO) --> -->
   <!-- - callsign CONTENT/POSITION detection:
     - evaluation should be based on content (EDIT DISTANCE >= ? ACCEPTED). (possible shift of indexes cnet versus human)
       - a function that returns whether it is a match
     - naive: todo return match content
       - get the smallest possible content window while keeping the score
     - bert: working Human & TODO CNET  -->
 <!-- - More accurate testing:  -->
   <!-- - testing for callsign segment wise  -->
   <!-- - or connecting the segments -->
   <!-- - or labeling the segments manually -->
   <!-- - matching segmentation human and cnet -->
   <!-- - accurate scoring -->
   <!-- - dataset contains only correct samples -->
 <!-- - LKPR_RUZYNE_Radar_120_520MHz_20201025_120512 has no speaker label containing the CSG so it is skipped -->
   <!-- - could check if there is the long version tagged in the XML in DatasetGenerator
   - if so, the real callsign will be found in the INFO -->

 - 2 tasks:
 - charts: 
   - Human SOLID, Cnet DOTTED
   - Naive Orange, BERT(or combined) Blue
   - each chart has 4 lines 
 - Task 1: Get the SPAN
   - Naive & BERT
   - Chart All
 - Task 2: Get the ICAO
   - Naive & Combined 
 - plan:
   - Generate JSONs with the thresholded data for each task and airport
   - Plot after that
   -  


## check cases

Human correct but CNET wrong:
 - LSGS_SION_Tower_118_3MHz_20210503_152021 
 - LSGS_SION_Tower_118_3MHz_20210503_145725
 - LSGS_SION_Tower_118_3MHz_20210503_145432

both incorrect:
 - LSGS_SION_Tower_118_3MHz_20210503_150138
 - LSGS_SION_Tower_118_3MHz_20210503_145725


### CNET wrong Human correct (new):
- YSSY_SYDNEY_Tower_120_5MHz_20210604_214945
  - text: Rex Six Seven Sixty two
  - cnet: rex <eps> six seven <eps> qatari <eps> three
  - true callsign RXA6762 (score .81)
    - score is normalised by 5
  - detected callsign RXA6117 (score .86)
    - this callsign has a variation where seventeen is one token and therefore the number of tokens is lower 
    - therefore score is normalised by 4 
  - Solution: aditional denormalisation based on length of the detected variation
- YSSY_SYDNEY_Tower_120_5MHz_20210604_200316
  - cnet text empty
  - Solution: remove files (or segments) where there is no cnet transcript available
  - same problem:
    - YSSY_SYDNEY_Tower_120_5MHz_20210604_113755

## Verifikace
- roc krivka
  


### RESULTS
## ALL -   1172 
### WER 0.38968050769799273
![](img/all.svg)
![](img/all_spancat.svg)

### ICAO
Naive
- AUC Human 0.9517522457280021
- AUC Cnet 0.4771841689383993

### SPAN
Naive
- AUC Human 0.9097380731256094
- AUC Cnet 0.44705291869997527

BERT 
AUC Human 0.8916034874756622
AUC Cnet 0.3997592629077808

## LKPR -  66
### WER 0.2101033590514311
![alt text](img/LKPR.svg "Title")
![alt text](img/LKPR_spancat.svg "Title")

### ICAO
Naive
- AUC Human 0.9761904761904762
- AUC Cnet 0.7206007998608852

### SPAN
BERT
- AUC Human 0.5592529529876917
- AUC Cnet 0.5755590698265426

Naive
- AUC Human 0.9268353174603174
- AUC Cnet 0.6879572943077298

## LSGS -  104
### WER 0.3268911284233094
![](img/LSGS.svg)
![](img/LSGS_spancat.svg)

### ICAO
Naive
- AUC Human 0.9287227032537697
- AUC Cnet 0.7319040229285058

### SPAN

BERT
- AUC Human 0.8150569199554409
- AUC Cnet 0.6804041577231494

Naive
- AUC Human 0.8914828464257134
- AUC Cnet 0.68345370052336

## LSZ - 228
### WER 0.29790151820727184
![](img/LSZ.svg)
![](img/LSZ_spancat.svg) 

### ICAO
Naive
- AUC Human 0.876266674916576
- AUC Cnet 0.711667280998883

### SPAN
BERT
- AUC Human 0.9286464600211768
- AUC Cnet 0.7419057166524715

Naive
- AUC Human 0.846518555585525
- AUC Cnet 0.669373474702547


## LSZB -  43
### WER 0.28667964879883445

## LSZH -  185
### WER 0.30050984461031405

## LZIB -  62
### WER: 0.1834896008323603
![](img/LZIB.svg)
![](img/LZIB_spancat.svg)

### ICAO
- AUC Human 0.9152857681534152
- AUC Cnet 0.7854670532848176

### SPAN

BERT
- AUC Human 0.5573936760512216
- AUC Cnet 0.6539098114900969

Naive
- AUC Human 0.6367394958401111
- AUC Cnet 0.6669259333990194

## YSSY -  708
### WER: 0.46415723337914
![](img/YSSY.svg)
![](img/YSSY_spancat.svg)

### ICAO
- AUC Human 0.9861187690643256
- AUC Cnet 0.25715760094205553

### SPAN
BERT
- AUC Human 0.5525061677380345
- AUC Cnet 0.11432009683725904

Naive
- AUC Human 0.68299622419411
- AUC Cnet 0.2434591663644502


###
Results various similarity algorithms for CSG detection


Jaro Winkler

Human accuracy:  0.9057093425605537
Human precision:  0.9057093425605537
Cnet segments:  1156
Cnet correct:  677
Cnet no detection:  56
Cnet false positive:  423
Cnet accuracy:  0.5856401384083045
Cnet precision:  0.6154545454545455

Jaro Winkler Join

Human accuracy:  0.8529411764705882
Human precision:  0.8529411764705882
Cnet segments:  1156
Cnet correct:  537
Cnet no detection:  45
Cnet false positive:  574
Cnet accuracy:  0.46453287197231835
Cnet precision:  0.48334833483348333

Levenshtein 

Human accuracy:  0.8693771626297578
Human precision:  0.8701298701298701
Cnet segments:  1156
Cnet correct:  523
Cnet no detection:  44
Cnet false positive:  589
Cnet accuracy:  0.4524221453287197
Cnet precision:  0.47032374100719426

Levenshtein Join

Human accuracy:  0.835820895522388
Human precision:  0.835820895522388
Cnet segments:  938
Cnet correct:  515
Cnet no detection:  25
Cnet false positive:  398
Cnet accuracy:  0.5490405117270789
Cnet precision:  0.5640744797371303

Jaccard

Human accuracy:  0.7517301038062284
Human precision:  0.7517301038062284
Cnet segments:  1156
Cnet correct:  445
Cnet no detection:  38
Cnet false positive:  673
Cnet accuracy:  0.38494809688581316
Cnet precision:  0.39803220035778175