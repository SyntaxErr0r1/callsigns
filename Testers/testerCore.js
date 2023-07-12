/**
 * Core of the tester - loads the samples and has some of the evaluation functions
 * @author Juraj Dedič, xdedic07
 */

import fs from 'fs';
// import Levenshtein from 'levenshtein';


/**
 * Loads samples from dataset directory and filters them according to selectors
 * @ret array of datasamples
 */
function loadSamples(argv){
    const datasetDir = process.argv[2];
    const selectors = process.argv.slice(3);

    var verbose = false;
    for(let s of selectors){
        if(s == "-v" || s == "--verbose"){
            verbose = true;
        }
    }

    
    if(!datasetDir){
        console.log('Please provide dataset directory');
        printHelp();
        process.exit(1);
    }

    const jsonFiles = fs.readdirSync(datasetDir).filter(file => file.endsWith('.json'));


    let selectorsInfo = processSelectors(selectors, jsonFiles);
    let filteredFiles = selectorsInfo.filteredFiles;
    let lengthLimit = selectorsInfo.lengthLimit;
    let segmentSelectors = selectorsInfo.segmentSelectors;

    const apiAddress = 'http://localhost:3000/datasample';

    let filesWithoutNearbyCallsigns = 0;
    let filesWithoutTrueCallsign = 0;
    let filesWithoutRightCallsignInNearby = 0;

    console.log("Test core info:")
    console.log("All files: ",jsonFiles.length);
    console.log("Filtered files: ",filteredFiles.length);
    console.log("Limited to: ",lengthLimit);

    let datasamples = [];

    let results = [];

    for(let i = 0; i < lengthLimit; i++){

        const fileName = filteredFiles[i];

        const fileContent = fs.readFileSync(datasetDir + '/' + fileName);

        let datasample = JSON.parse(fileContent);

        if(segmentSelectors){
            if(segmentSelectors.segmentIndex != undefined){
                const segmentsIndex = Number(segmentSelectors.segmentIndex);
                const filteredOut = datasample.segments[segmentsIndex];
                if(!filteredOut){
                    console.log("Segment index out of bounds", datasample.filename);
                    exit(1);
                }
                datasample.segments = datasample.segments = [filteredOut];
            }
        }


        if(datasample.nearbyCallsigns.length == 0){
            console.log("No nearby callsigns", datasample.filename);
            filesWithoutNearbyCallsigns++;
            continue;
        }

        let airplaneTrueCallsigns = datasample.trueCallsigns;

        // if(airplaneTrueCallsigns.length == 0 || ( airplaneTrueCallsigns[0] == "UNK-1" && airplaneTrueCallsigns.length == 1)){
        //     filesWithoutTrueCallsign++;
        //     continue;
        // }

        if(airplaneTrueCallsigns.length > 0 && !intersect(airplaneTrueCallsigns, datasample.nearbyCallsigns)){
            console.log("No right callsign in nearby callsigns", datasample.filename);
            filesWithoutRightCallsignInNearby++;
        }

        datasamples.push(datasample)
    }

    console.log("Files without nearby callsigns: ", filesWithoutNearbyCallsigns);
    console.log("Files without true callsign: ", filesWithoutTrueCallsign);
    console.log("Files without right callsign in nearby: ", filesWithoutRightCallsignInNearby);

    return datasamples
}


/**
 * Processes selectors & filters files
 * @p selectors CLI arguments in format key=value
 * @p jsonFiles list of json datasamples
 * @ret object {lengthLimit - maximum number of files to read, filteredFiles }
 */
function processSelectors(selectors, jsonFiles){
    let lengthLimit = Infinity;

    let filteredFiles = jsonFiles;

    let segmentSelectors = [];

    for(let selector of selectors){
        
        if(selector[0] == '-')
            continue;

        if(!selector.includes('=')){
            console.log('Invalid selector: ' + selector);
            printHelp();
            process.exit(1);
        
        }else{
            let [command, value] = selector.split('=');
        
            if(command == 'prefix'){
                filteredFiles = filteredFiles.filter(file => file.startsWith(value));
            }else if(command == 'suffix'){
                filteredFiles = filteredFiles.filter(file => file.endsWith(value));
            }else if(command == 'length'){
                if(isNaN(value)){
                    console.log('Invalid length: ' + value);
                    printHelp();
                    process.exit(1);
                }else{
                    lengthLimit = value < lengthLimit ? value : lengthLimit;
                }
            }else if(command == 'segment'){
                segmentSelectors.segmentIndex = value;
            }else{
                console.log('Invalid command: ' + command);
                printHelp();
                process.exit(1);
            }
        }
    }

    if(filteredFiles.length < lengthLimit){
        lengthLimit = filteredFiles.length;
    }

    return {lengthLimit, filteredFiles, segmentSelectors}

}

function getSegments(results){
    let segmentsList = [];

    for(let segmentResult of results){

        let testCase = segmentResult.case;
        let res = segmentResult.res;

        for(let i = 0; i < testCase.segments.length; i++){
            let caseSeg = testCase.segments[i];

            res.segments[i].file = testCase.filename;
            if(testCase.trueCallsigns && caseSeg.tags.indexOf(1) != -1){
                res.segments[i].trueCallsigns = testCase.trueCallsigns;
            }else{
                res.segments[i].trueCallsigns = [];
            }

            segmentsList.push(res.segments[i]);
        }
    }

    return segmentsList;
}


function verbosePrint(...text){
    if(verbose)
        console.log(...text);
}

/**
 * Finds if the right span is in the result
 * @p callsignTokens array of callsign tokens
 * @p resultTokens array of result tokens
 * @p maxDistance maximum distance between callsign and result
 * @ret true if the right span is in the result
 */
function spanMatch(callsignTokens, resultTokens, maxDistance = 2){
    if(!callsignTokens)
        callsignTokens = [];
    else if(typeof callsignTokens == 'string')
        callsignTokens = callsignTokens.split(' ');
    if(!resultTokens)
        resultTokens = [];
    else if(typeof resultTokens == 'string')
        resultTokens = resultTokens.split(' ');

    if(callsignTokens.length <= 3)
        maxDistance = 1;
    else if(callsignTokens.length <= 0)
        maxDistance = 0;

    let csgSpan = callsignTokens.map(t => alterToken(t.toLowerCase()));
    let resSpan = resultTokens.map(t => alterToken(t.toLowerCase()));
    // let distance = new Levenshtein(csgSpan, resSpan).distance;
    let distance = levenshtein(csgSpan, resSpan);
    return distance <= maxDistance;
}

/**
 * Tries to normalize the tokens of the sentence
 * @param {*} token
 * @returns normalized token
 */
function alterToken(token){
    token = token.toLocaleLowerCase();
    token = token.replaceAll("<eps>","").replaceAll("alpha", "alfa").replaceAll("juliett", "juliet").replaceAll("niner", "nine").replaceAll(/_([a-z])_/gm, "$1").replaceAll("_", " ").replaceAll("  ", " ");
    return token;
}


/**
 * Finds the right span in the result
 * @p segment segment object containing text and tags
 * @ret array or tokens containing the callsign
 */
function getTrueSpan(segment){
    let span = [];
    let textSplit = (segment.textHuman || segment.text).split(' ');
    for(let i = 0; i < segment.tags.length; i++){
        if(segment.tags[i] == 1){
            span.push(textSplit[i]);
        }else if(span.length > 0){
            break;
        }
    }
    return span;
}



/**
 * Finds if any item is included in both input arrays
 * @ret true if any item is in both array
 */
function intersect(a,b){
    for(let iA of a){
        if(b.includes(iA))
            return true
    }
    return false
}

/**
 * Token level levenshtein distance
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
          }
      }
  
      return matrix[sentence2.length][sentence1.length];
}


/**
 * Prints help
 */
function printHelp(){
    console.log('Usage: node tester.js [dataset directory] [selector1] [selector2] ... <args>');
    //command can be: prefix | suffix | length
    console.log("Arguments: -v (verbose) -h (help)")
    console.log('Example (tests all files starting with praha): node tester.js /home/user/dataset1/ prefix=PRAHA');
    console.log('Example (tests first 5 files): node tester.js /home/user/dataset1 length=5');
}

/**
 * Calculating AUC using trapezoidal rule
 */
function calculateAUC(data) {
    let auc = 0;
    data.unshift({tpr: 0, fpr: 0});
    data.push({tpr: 1, fpr: 1});
    
    data.sort((a, b) => a.fpr - b.fpr);
    for (let i = 1; i < data.length; i++) {
        auc += (data[i].fpr - data[i - 1].fpr) * (data[i].tpr + data[i - 1].tpr) / 2;
    }
    return auc;
}


export {loadSamples, spanMatch, getTrueSpan, calculateAUC}