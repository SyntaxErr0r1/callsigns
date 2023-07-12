# Results of testing


## baseline
- one best cnet
Human segments:  1149
Human true positives:  1027
Human true negatives:  27
Human false positives:  94
Human false negatives:  1
Human precision:  0.9161462979482605
Human recall:  0.9990272373540856
Human F1:  0.955793392275477
Human correct 1054
Cnet Count:  1149
Cnet true positives:  649
Cnet true negatives:  28
Cnet false positives:  414
Cnet false negatives:  58
Cnet precision:  0.6105362182502352
Cnet recall:  0.917963224893918
Cnet F1:  0.7333333333333333
Human correct 677
Files without right callsign in nearby: (%)  0
Files without nearby callsigns:  0
Files without true callsign:  27
---------------------------------

## baseline one best
- changing cnet algorhitm
- difference is that <eps> were shifted to next most probable word instead of removing the word completely

Human segments:  1149
Human true positives:  1027
Human true negatives:  27
Human false positives:  94
Human false negatives:  1
Human precision:  0.9161462979482605
Human recall:  0.9990272373540856
Human F1:  0.955793392275477
Human correct 1054
Cnet Count:  1149
Cnet true positives:  601
Cnet true negatives:  26
Cnet false positives:  470
Cnet false negatives:  52
Cnet precision:  0.5611577964519141
Cnet recall:  0.9203675344563553
Cnet F1:  0.697215777262181
Human correct 627
Files without right callsign in nearby: (%)  0
Files without nearby callsigns:  0
Files without true callsign:  27
-----------------------------------------------

## considering 4 best

- cause of lower score: ?

Human segments:  1149
Human true positives:  1027
Human true negatives:  27
Human false positives:  94
Human false negatives:  1
Human precision:  0.9161462979482605
Human recall:  0.9990272373540856
Human F1:  0.955793392275477
Human correct 1054
Cnet Count:  1149
Cnet true positives:  480
Cnet true negatives:  22
Cnet false positives:  599
Cnet false negatives:  48
Cnet precision:  0.4448563484708063
Cnet recall:  0.9090909090909091
Cnet F1:  0.5973864343497199
Human correct 502
Files without right callsign in nearby: (%)  0
Files without nearby callsigns:  0
Files without true callsign:  27
-----------------------------------------------


## Considering 4 best
- filtering out words where the most probable pair has p < 0.15
- this removes most of words where <eps> was the most probable

Human segments:  1149
Human true positives:  1027
Human true negatives:  27
Human false positives:  94
Human false negatives:  1
Human precision:  0.9161462979482605
Human recall:  0.9990272373540856
Human F1:  0.955793392275477
Human correct 1054
Cnet Count:  1149
Cnet true positives:  533
Cnet true negatives:  25
Cnet false positives:  538
Cnet false negatives:  53
Cnet precision:  0.4976657329598506
Cnet recall:  0.909556313993174
Cnet F1:  0.6433313216656609
Human correct 558
Files without right callsign in nearby: (%)  0
Files without nearby callsigns:  0
Files without true callsign:  27 

## Combination of 1-best and 5-best

- considering 1-best if score is at least 0.7
- otherwise windowing through the cnet considering 5-best
- window score is calculated using jaro-winkler * modifier
- modifier = SUM( (5-tokenIndex)/5 ) for each word of window
  - if taking first token (most probable token) in row modifier will be 1
  - if last modifier is 0

Human segments:  1149
Human true positives:  1027
Human true negatives:  27
Human false positives:  94
Human false negatives:  1
Human precision:  0.9161462979482605
Human recall:  0.9990272373540856
Human F1:  0.955793392275477
Human correct 1054
Cnet Count:  1149
Cnet true positives:  662
Cnet true negatives:  24
Cnet false positives:  413
Cnet false negatives:  50
Cnet precision:  0.6158139534883721
Cnet recall:  0.9297752808988764
Cnet F1:  0.7409065472859541
Human correct 686
Files without right callsign in nearby: (%)  0
Files without nearby callsigns:  0
Files without true callsign:  27
-----------------------------------------------



## cnetScoreSearch

use one-best if one-best > .7
else use cnetScoreSearch

- with weird distance calculation

Human segments:  1149
Human true positives:  1027
Human true negatives:  27
Human false positives:  94
Human false negatives:  1
Human precision:  0.9161462979482605
Human recall:  0.9990272373540856
Human F1:  0.955793392275477
Human correct 1054
Cnet Count:  1149
Cnet true positives:  609
Cnet true negatives:  40
Cnet false positives:  264
Cnet false negatives:  236
Cnet precision:  0.697594501718213
Cnet recall:  0.7207100591715976
Cnet F1:  0.7089639115250291
Human correct 649
Files without right callsign in nearby: (%)  0
Files without nearby callsigns:  0
Files without true callsign:  27


## Fixes in callsign expansion and windowing 

- scoring also on utterance shorter than CSG 


Human segments:  1147
Human true positives:  1050
Human true negatives:  27
Human false positives:  70
Human false negatives:  0
Human precision:  0.9375
Human recall:  1
Human F1:  0.967741935483871
Human correct 1077
Cnet Count:  1147
Cnet true positives:  680
Cnet true negatives:  24
Cnet false positives:  394
Cnet false negatives:  49
Cnet precision:  0.633147113594041
Cnet recall:  0.9327846364883402
Cnet F1:  0.7542983915696062
Cnet correct 704
Files without right callsign in nearby: (%)  0
Files without nearby callsigns:  0
Files without true callsign:  27
-----------------------------------------------