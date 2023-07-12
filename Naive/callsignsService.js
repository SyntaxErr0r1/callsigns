/**
 * @author Juraj Dedič, xdedic07
 * This file contains the functions for scoring callsigns against nearby callsigns
 * The original idea was to leverage the cnet n-best list to score callsigns
 * That's why there are multiple function with Cnet in their name
 * However, I was not able to use it to improve the accuracy of the model
 * So, the final version of the model uses only the one-best token for each word
 */

import { generateVariations } from './callsignsExpansion.js';
import jaroWinkler from 'jaro-winkler';


/**
 * Calculates the score of a potential callsign string against nearby callsigns
 * @param {String} text string potentially containing a callsign
 * @param {Array} nearbyCallsigns array of nearby callsign objects
 * @param {Array} probabilityMask array of probabilities for each token in the text
 */
function findCallsignScore(text, nearbyCallsigns, probabilityMask){
    
    text = text.toLocaleLowerCase();
    if(!probabilityMask || probabilityMask.length == 0)
        text = text.replaceAll("<eps>","")
    text = alterText(text)

    let textTokens = text.split(" ");
    let nearbyCallsignsProb = [];
    
    for(let i = 0; i < nearbyCallsigns.length; i++){
        let csgN = nearbyCallsigns[i];
        let match = scoreExpandCallsign(csgN, textTokens, probabilityMask);
        let score = match.score;
        let span = match.span;
        if(score > 0){
            nearbyCallsignsProb.push({
                p: score, 
                csg: csgN, 
                span,
                variation: match.callsign,
                scoredBy: "1-Best"
            })
        }
    }

    if(nearbyCallsignsProb.length > 0){
        let mostProbableP = nearbyCallsignsProb.sort((x,y) => y.p - x.p)[0].p;

        let mostProbableCsgs = nearbyCallsignsProb.filter(x => x.p == mostProbableP);
        
        if(mostProbableCsgs.length > 1){
            //find the one with the longest variation
            let longestVariation = mostProbableCsgs.sort((x,y) => y.variation.length - x.variation.length)[0];
            //find it's index in nearbyCallsignsProb
            let longestVariationIndex = nearbyCallsignsProb.findIndex(x => x.csg == longestVariation.csg);
            //increase it's probability
            nearbyCallsignsProb[longestVariationIndex].p += 0.01;
        }
    }

    return nearbyCallsignsProb;
}

/**
 * Calculates the score of a potential callsign string against nearby callsigns
 * @param {Array} cnetText array of words from the cnet (each word is an array of potential tokens)
 * @param {Array} nearbyCallsigns array of nearby callsign objects
 * @returns array of callsigns with their scores
 */ 
function findCallsignScoreCnet(cnetText, nearbyCallsigns){
    // console.log("findCallsignScoreCnet", cnetText, nearbyCallsigns)
    let oneBestThreshold = 0.0; //threshold for scoring using one best token for each word
    let nBest = 5;  //number of best tokens to consider for each word

    let cnetAltered = alterCnetSequence(cnetText, nBest);

    let cnetStr = cnetAltered.map(pairs => pairs[0].t).join(" ")
    let cnetProb = cnetAltered.map(pairs => pairs[0].p)
    
    let oneBestCnet = findCallsignScore(cnetStr, nearbyCallsigns, cnetProb)
    oneBestCnet = oneBestCnet.sort((x,y) => y.p - x.p)
    // if(oneBestCnet.length && oneBestCnet[0].p >= oneBestThreshold){
        return oneBestCnet;
    // }

    /**
     * This was an attempt to use the n-best tokens for each word in the cnet
     * It didn't work well, so it's not used. 
     * 
     */

    let nearbyCallsignsProb = [];
    
    for(let i = 0; i < nearbyCallsigns.length; i++){
        let csgN = nearbyCallsigns[i];
        let match = scoreExpandCallsignCnet(csgN, cnetText);
        let score = match.score;
        if(score > 0){
            nearbyCallsignsProb.push({
                p: score, 
                csg: csgN, 
                variation: match.callsign,
                scoredBy: `${nBest}-Best`
            })
        }
    }
    
    return nearbyCallsignsProb;
}

/**
 * Generates a score for a callsign based on the score of the different variations of the callsign
 * @param {*} callsign short form of the callsign
 * @param {*} text (tokenized) text to compare the callsign against
 * @param {*} probabilityMask array of probabilities for each token in the text
 * @returns the best match object
 */
function scoreExpandCallsign(callsign, text, probabilityMask){
    let callsignVariations = generateVariations(callsign);
    let scores = [];
    for(let i = 0; i < callsignVariations.length; i++){
        let callsignVariation = callsignVariations[i];
        let {score, span} = windowingScore(callsignVariation, text, probabilityMask);
        scores.push({callsign: callsignVariation, score, span});
    }
    let maxScore = scores.sort((a, b) => b.score - a.score)[0];
    return maxScore;
}

/**
 * Generates a score for a callsign based on the score of the different variations of the callsign
 * @param {*} callsign short form of the callsign
 * @param {*} textCnet cnet word tokens to compare the callsign against
 * @returns the best match object
 */
function scoreExpandCallsignCnet(callsign, textCnet){
    
    let callsignVariations = generateVariations(callsign);
    let scores = [];
    for(let i = 0; i < callsignVariations.length; i++){
        let callsignVariation = callsignVariations[i];
        let score = windowingScoreCnet(callsignVariation, textCnet);
        scores.push({callsign: callsignVariation, score: score});
    }
    let maxScore = scores.sort((a, b) => b.score - a.score)[0];

    return maxScore;
}

/**
 * Alters the whole cnetText to remove <eps> and keep only the n-best tokens for each word
 * @param {*} cnetText array of words from the cnet (each word is an array of potential tokens)
 * @param {*} nBest number of best tokens to consider for each word
 * @returns altered cnetText
 */
function alterCnetSequence(cnetText, nBest = 1){
    let wordValidityThreshold = 0.15; //minimum probability of a token to be considered (usually taken into account when <eps> is removed to check whether to use the next most probable word)

    cnetText = cnetText.map(w => alterCnetWord(w).slice(0,nBest));
    cnetText = cnetText.filter(w => w.length > 0 && w[0].t.length > 0 && w[0].p > wordValidityThreshold);
    
    return cnetText;
}

/**
 * Tries to normalize CNET word
 * @note removes the positions where <eps> was removed
 * @param {*} word
 * @returns normalized word
 */
function alterCnetWord(word){
    let newWord = word.map(token => {
        token.t = alterText(token.t);
        return token;
    })
    newWord = newWord.filter(token => token.t.length > 0);
    return newWord;
}

/**
 * Tries to normalize the tokens of the sentence
 * @param {*} text
 * @returns normalized text
 */
function alterText(text){
    text = text.toLocaleLowerCase();
    text = text.replaceAll("<eps>","")
    .replaceAll("alfa", "alpha")
    .replaceAll("juliet ", "juliett ")
    .replaceAll("juliet\n", "juliett\n")
    .replaceAll("juliet\r", "juliett\r")
    .replaceAll("juliet\t", "juliett\t")
    .replaceAll("juliet.", "juliett.")
    .replaceAll("juliet$", "juliett")
    .replaceAll("^juliet", "juliett")
    .replaceAll("niner", "nine")
    .replaceAll(/_([a-z])_/gm, "$1")
    .replaceAll("_", " ")
    .replaceAll("  ", " ");
    return text;
}

/**
 * Creates window of the callsign length. Moves the window over the text and calculates the scores
 * @param {*} callsignTokens array of tokens of the potential callsign
 * @param {*} textTokens array of tokens of the text potentially containing the callsign
 * @returns score of the window with the highest score
 */
function windowingScore(callsignTokens, textTokens, probabilityMask = []){
    let scores = [];
    let windowSize = callsignTokens.length;
    // if(windowSize + 1 < textTokens.length)
    //     windowSize += 1;
    probabilityMask = probabilityMask.map(p => Number(p));

    for(let i = 0; i <= textTokens.length - windowSize; i++){
        let window = textTokens.slice(i, i + windowSize);
        // let score = jaroWinkler(callsignTokens, window);
        let score = levenshteinScore(callsignTokens, window);
        // let score = jaccardIndex(callsignTokens, window);
        
        let modifier = getScoreModifier(i,windowSize,probabilityMask);
        score *= modifier;

        scores.push({window,score});
    }

    if(textTokens.length - windowSize < 0){
        let score = jaroWinkler(callsignTokens, textTokens);
        let modifier = getScoreModifier(0,windowSize,probabilityMask);
        score *= modifier;
        scores.push({window: textTokens, score});
    }

    let maxScore =  scores.sort((x,y) => y.score - x.score)[0];

    maxScore.span = getSpan(callsignTokens, maxScore.window);

    return maxScore || 0;
}

/**
 * Returns the smallest span of the callsign in the text
 * @note removes tokens from the beginning and end of the window to the shortest span still retaining the score
 * @param {*} callsignTokens array of tokens of the potential callsign
 * @param {*} window window of the text potentially containing the callsign
 * @returns span of the callsign in the text
 */
function getSpan(callsignTokens, window){
    let lastScore = jaroWinkler(callsignTokens, window);

    let editedWindow = [...window]
    for(let i = 0; i < window.length; i++){
        let windowCopy = [...window];
        windowCopy = windowCopy.splice(i);
        let score = jaroWinkler(callsignTokens, windowCopy);
        if(score >= lastScore){
            editedWindow = windowCopy;
            lastScore = score;
        }else{
            break;
        }
    }

    for(let i = editedWindow.length; i >= 0; i--){
        let windowCopy = [...editedWindow];
        windowCopy = windowCopy.splice(0, i);
        let score = jaroWinkler(callsignTokens, windowCopy);
        if(score >= lastScore){
            editedWindow = windowCopy;
            lastScore = score;
        }else{
            break;
        }
    }

    return editedWindow;
}

/**
 * Calculates the modifier based on the average probability of the window
 * @param {*} i index of the window
 * @param {*} windowSize size of the window
 * @param {*} probabilityMask array of probabilities of the text
 * @returns modifier
 */
function getScoreModifier(i,windowSize,probabilityMask){
    let modifier = 1;
    if(probabilityMask.length > 0){
        let probabilityMaskWindow = probabilityMask.slice(i, i + windowSize)
        // modifier = probabilityMaskWindow.reduce((a,b) => a*b, 1);
        modifier = probabilityMaskWindow.reduce((a,b) => a + b, 0) / probabilityMaskWindow.length;
    }
    return modifier;
}


/**
 * Creates window of the callsign length. Moves the window over the text and calculates the scores
 * @param {Array} callsignTokens array of tokens of the potential callsign
 * @param {Array} texCnet array of tokens of the text potentially containing the callsign
 * @returns score of the window with the highest score
 * @deprecated
 */
function windowingScoreCnet(callsignTokens, textCnet){
    let scores = [];
    let windowSize = callsignTokens.length;
    if(windowSize + 3 < textCnet.length)
        windowSize += 3;

    let wordPairIndexes = textCnet.map(word => 0);

    let i = 0;
    let highestScore = 0;
    let firstPass = true;
    let indexOfShiftedWord = 0;

    while( i <= textCnet.length - windowSize){
        // console.log("highestScore", highestScore);
        let window = textCnet.slice(i, i + windowSize);
        let windowWords = getCurrentWindowTokens(wordPairIndexes, window, i)
        let windowWordsTokens = windowWords.map(w => w.t);
        // console.log("windowingScoreCnet", i, indexOfShiftedWord, windowWords)
        
        let scoreProbabilities = windowWords.map(w => Number(w.p));
        // let scoreProbabilities = wordPairIndexes.map(w => Number(w));
        // let scoreProbabilities = wordPairIndexes.slice(i, i + windowSize).map(w =>  (5-w)/5);
        // console.log("scoreProbabilities", scoreProbabilities);
        let scoreModifer = scoreProbabilities.reduce((a, b) => a + b, 0) / scoreProbabilities.length;
        // console.log("scoreModifer", scoreModifer);
        let score = jaroWinkler(callsignTokens, windowWordsTokens) * scoreModifer;
        // console.log("score", score);
        if(firstPass){
            highestScore = score;
            firstPass = false;
            
            let shift = shiftWord(wordPairIndexes, textCnet, indexOfShiftedWord);
            if(shift != null){
                wordPairIndexes = shift;
                // console.log("shifting forward");
                continue;
            }else{
                shiftWordToPosition(wordPairIndexes, textCnet, indexOfShiftedWord, 0);
                indexOfShiftedWord++;
                // console.log("resetting and shifting next word");
            }
            
        }
        else if(score < highestScore){
            //the previous window was better so we shift back and start shifting the next word
            wordPairIndexes = shiftWord(wordPairIndexes, textCnet, indexOfShiftedWord, true);
            indexOfShiftedWord++;
            // console.log("shifting back and shifting next word");
        }else if(score == highestScore){
            //this word pair is the same as the previous one, continue shifting current word
            let shift = shiftWord(wordPairIndexes, textCnet, indexOfShiftedWord);
            if(shift != null){
                wordPairIndexes = shift;
                // console.log("shifting forward");
                continue;
            }else{
                shiftWordToPosition(wordPairIndexes, textCnet, indexOfShiftedWord, 0);
                indexOfShiftedWord++;
                // console.log("resetting and shifting next word");
            }

        }else{
            //this word pair is better than the previous one so we shift the next word
            highestScore = score;
            indexOfShiftedWord++;
            // console.log("FOUND BETTER TOKEN. Shifting next word");
        }

        if(indexOfShiftedWord >= i + windowSize){
            let windowIndexes = wordPairIndexes.slice(i, i + windowSize);
            firstPass = true;
            scores.push({score, windowWords, windowIndexes});
            i++;
        }
    }

    let maxScore =  scores.sort((x,y) => y.score - x.score)[0];
    // console.log("best score for callsign", callsignTokens, maxScore)

    return maxScore?.score || 0;
}

/**
 * Scores the callsign tokens against the text tokens
 * @param {*} callsignTokens array of tokens of the potential callsign
 * @param {*} textTokens array of CnetWords of the text potentially containing the callsign
 * @returns score of the callsign tokens against the text tokens
 * @deprecated
 */
function cnetScoreSearching(callsignTokens, textCnet){
    
    let overallScore = 1;

    for(let callsignToken of callsignTokens){
        // console.log("cnetScoreSearching", callsignToken)
        let found = false;
        let maximumP = 0;
        for(let [wi, word] of textCnet.entries()){
            for(let token of word){
                if(token.t == callsignToken){
                    // overallScore++;
                    // found = true;
                    // break;
                    // leverage the distance between the callsign tokens to increase the score
                    let distance = Math.abs(callsignTokens.indexOf(callsignToken) - textCnet.indexOf(word));
                    let tokP = Number(token.p)
                    let p = tokP / (distance + 1);
                    if(p > maximumP){
                        maximumP = p;
                        // console.log("found better token", callsignToken, token)
                    }
                }
            }
            if(found)
                break;
        }
        overallScore *= maximumP;
    }
    // console.log("returning overall score", overallScore, "for callsign", callsignTokens, "and text", textCnet)
    return overallScore;

}

/**
 * Initial attempt at scoring the callsign tokens against the text tokens
 * @deprecated
 */
function calculateCallSignProbability(callSign, transcript) {
    const words = callSign;
    const numWords = words.length;
  
    // Initialize worldProbabilities with 1 for all possible prefixes of the callsign
    const worldProbabilities = Array(numWords).fill().map(() => ({ prefixProb: 1 }));
  
    for (const t of transcript) {
      const pairs = t;
      console.log("pairs", pairs)
  
      for (let i = 0; i < numWords; i++) {
        const word = words[i];
        const prevProb = (i > 0) ? worldProbabilities[i - 1].prefixProb : 1;
  
        // Initialize probability for current word as 0
        let wordProb = 0;
  
        // Check all possible pairs in the transcript for this word
        for (const pair of pairs) {
          if (pair.t === word) {
            wordProb = pair.p;
            break;
          }
        }
  
        // Update the probability for the current prefix
        const prefixProb = prevProb * wordProb;
        if (prefixProb > worldProbabilities[i].prefixProb) {
          worldProbabilities[i].prefixProb = prefixProb;
        }
  
        // Check if we can skip this word and still have a valid prefix
        if (i > 0) {
          const prevPrefixProb = worldProbabilities[i - 1].prefixProb;
          const skippedPrefixProb = prevPrefixProb * (1 - wordProb);
  
          if (skippedPrefixProb > worldProbabilities[i].prefixProb) {
            worldProbabilities[i].prefixProb = skippedPrefixProb;
          }
        }
      }
    }
  
    // Return the final probability for the full call sign
    return worldProbabilities[numWords - 1].prefixProb;
}

/**
 * Shifts the word pair indexes to the next position
 * @param {Array} wordPairIndexes array of indexes for the word pairs in the cnet
 * @param {Array} texCnet array of cnetWords in the text
 * @param {Number} i index of the first word in the window
 * @param {Number} goBack (optional) if true, shift the indexes back
 * @returns {Array} array of word pair indexes
 * @returns {null} if the position is out of bounds
 */
function shiftWord(wordPairIndexes, texCnet, i, goBack = false){
    let wordPairIndex = wordPairIndexes[i];
    
    if(goBack)
        wordPairIndex--;
    else
        wordPairIndex++;

    if(wordPairIndex >= texCnet[i].length)
        return null;
    wordPairIndexes[i] = wordPairIndex;

    return wordPairIndexes;
}

/**
 * Shifts the word pair indexes to the position of the word pair in the cnet
 * @param {Array} wordPairIndexes array of indexes for the word pairs in the cnet
 * @param {Array} texCnet array of cnetWords in the text
 * @param {Number} i index of the first word in the window
 * @param {Number} position position of the word pair in the cnet
 * @returns {Array} array of word pair indexes
 * @returns {null} if the position is out of bounds
 */
function shiftWordToPosition(wordPairIndexes, texCnet, i, position){
    let wordPairIndex = wordPairIndexes[i];
    
    wordPairIndex = position;

    if(wordPairIndex >= texCnet[i].length)
        return null;
    wordPairIndexes[i] = wordPairIndex;

    return wordPairIndexes;
}

/**
 * Returns the word pairs for the current window
 * @param {Array} wordPairIndexes array of indexes for the word pairs in the cnet
 * @param {Array} window array of cnetWords in the window
 * @param {Number} i index of the first word in the window
 * @returns {Array} array of word pairs
 */

function getCurrentWindowTokens(wordPairIndexes, window, i){
    let windowsWords = []
    
    //j is the index of the word inside the window
    //i is the starting index of the window
    for(let j = 0; j < window.length; j++){
        let cnetWord = window[j];
        
        let wordPairIndex = wordPairIndexes[i + j];

        if(wordPairIndex >= cnetWord.length)
            wordPairIndex = 0;
        
        let wordPair = cnetWord[wordPairIndex];

        windowsWords.push(wordPair);
    }
    return windowsWords;
}

function sigmoid(x, k=0.1){
    let s = 1 / (1 + Math.exp( (-x) / k)) 
    return s
}

/**
 * Token level levenstein distance - edited for this use case
 * @note Edited from https://github.com/Yuvashree135/levenshtein-js
 * @param {Array} sentence1 array of tokens
 * @param {Array} sentence2 array of tokens
 * @returns {Number} levenshtein distance
 */
function levenshtein(sentence1, sentence2) {

    // returns -1 if the sentence is null or empty
      if (!sentence1 || !sentence2) {
          return -1;
      }
  
      let matrix = [];
  
      // increment along the first column of each row
      let i;
      for (i = 0; i <= sentence2.length; i = i + 1) {
          matrix[i] = [i];
      }
  
      // increment each column in the first row
      let j;
      for (j = 0; j <= sentence1.length; j = j + 1) {
          matrix[0][j] = j;
      }
  
      // Fill in the rest of the matrix
      for (i = 1; i <= sentence2.length; i = i + 1) {
          for (j = 1; j <= sentence1.length; j = j + 1) {
              if (sentence2[i - 1] === sentence1[j - 1]) {
                  matrix[i][j] = matrix[i - 1][j - 1];
              } else {
                  matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, // substitution
                          Math.min(matrix[i][j - 1] + 1, // insertion
                          matrix[i - 1][j] + 1)); // deletion
              }
			//   weight the 0,0 cell
			if(i === 1 && j === 1){
				matrix[i][j] = matrix[i][j] * 2;
			}
          }
      }
  
      return matrix[sentence2.length][sentence1.length];
}

/**
 * Returns the levenshtein score for the current window
 * @param {Array} callsignTokens array of tokens in the callsign
 * @param {Array} window array of cnetWords in the window
 * @returns {Number} levenshtein score
 **/
function levenshteinScore(callsignTokens, window){
    var distance = levenshtein(callsignTokens, window);
    let length = Math.max(callsignTokens.length, window.length);
    var relative = length === 0
    ? 0
    : (distance / length);
    let score = 1 - relative;
    return score;
}

/**
 * Jaccard index for the current window
 */
function jaccardIndex(arr1, arr2) {
    // Create sets of unique elements in each array
    const set1 = new Set(arr1);
    const set2 = new Set(arr2);
  
    // Find the intersection of the two sets
    const intersection = new Set([...set1].filter(x => set2.has(x)));
  
    // Find the union of the two sets
    const union = new Set([...set1, ...set2]);
  
    // Calculate the Jaccard Index
    const jaccardIndex = intersection.size / union.size;
  
    return jaccardIndex;
}



  

export {findCallsignScore, findCallsignScoreCnet, cnetScoreSearching, calculateCallSignProbability, windowingScoreCnet, getSpan}