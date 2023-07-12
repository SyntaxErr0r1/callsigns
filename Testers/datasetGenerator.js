/**
 * @fileoverview This file converts the xml, info and cnet files into a json dataset
 * @param {string} Path - path to the files
 * @param {string} Name - name of the dataset
 * @note The output is a json file with the name of the dataset
 * @note The output file structure is described in the README.md file
 * 
 * @author: 2023, Juraj Dedič
 */


const parser = new xml2js.Parser();
import fs from 'fs';
import path from 'path';
import xml2js from 'xml2js';
import { exec } from 'child_process';
import latinize from 'latinize';


import { exit } from 'process';
import { Set, Utterance, Segment, Cnet, CnetPair, CnetWord, NearbyCallsign } from './dataset.js';

const Path = process.argv[2];
const Name = process.argv[3];

let debug = false;

function printHelp() {
    console.log('Usage: node datasetGenerator.js [path] [name]');
    console.log('Example: node datasetGenerator.js /home/user/dataset1/train dataset1-train');
}

if (process.argv.includes('-h') || process.argv.includes('--help')){
    printHelp();
    exit(0);
}

if (process.argv.includes('-d') || process.argv.includes('--debug')){
    debug = true;
}

if (!Path || !Name) {
    console.log('Please provide path and name');
    printHelp();
    exit(1);
}

//list all xml files in the path
const xmlFiles = fs.readdirSync(Path).filter(file => file.endsWith('.xml'));
//remove the .xml extension
const files = xmlFiles.map(file => file.slice(0, -4));

let regexAnyTag = /\[\/*#*[A-Za-z\- ]*\]/g;

let regexNE = /\[\/*[N|n][E|e][a-zA-Z- ]*\]/g;

let regexBracket = /\([A-Za-z\-]*\)/g;

//create a new dataset
let dataset = new Set(Name);

const entityMapping = {
    'callsign': 1,
    'command': 2,
    'value': 3,
}

let utterances = [];

//create directory for the dataset
try {
    fs.mkdirSync(Name);
} catch (err) {
    if (err.code !== 'EEXIST') throw err
}

let needsManualTagging = [];

let filesWithoutTrueCallsignInNearbyCallsigns = [];

let excludedFiles = "";

for(let filename of files){
    console.log('Processing file: ' + filename);

    let utterance = new Utterance(filename);

    let segments = generateSegments(Path + '/' + filename + '.xml');
    
    utterance.trueCallsigns = getCallsigns(segments);
    if(utterance.trueCallsigns.length == 0){
        utterance.trueCallsigns = getFullMatchCallsigns(segments, Path + '/' + filename + '.info');
    }


    if(containsOnlyUnknownCallsigns(utterance.trueCallsigns)){
        console.log('Unknown callsign, Skipping file: ' + filename);
        excludedFiles += filename + " OnlyUnknownCallsigns \n";

        if(hasCallsignTagged(segments)){
            excludedFiles += filename + " ButHasCallsignTagged \n";
            needsManualTagging.push(filename);
        }
        continue;
    }

    if(utterance.trueCallsigns.length == 0 && hasCallsignTagged(segments)){
        console.log('No true callsign, but has callsign tagged, Skipping file: ' + filename);
        excludedFiles += filename + " NoTrueCallsignButCallsignTagged \n";
        continue;
    }
    

    
    let cnet = generateCnetObject(Path + '/' + filename + '.cnet');
    if(!cnet){
        console.log('No CNET, Skipping file: ' + filename);
        excludedFiles += filename + " NoCnet \n";
        continue;
    }
    let newSegments = segmentizeCnet(segments, cnet);
    utterance.segments = newSegments;


    let nearbyCallsigns = generateNearbyCallsigns(Path + '/' + filename + '.info');
    utterance.nearbyCallsigns = nearbyCallsigns;
    
    if( utterance.trueCallsigns.length > 0 && !trueCallsignsInNearbyCallsigns(utterance.trueCallsigns, utterance.nearbyCallsigns)){
        console.log('No true callsign in nearby callsigns, Skipping file: ' + filename);
        excludedFiles += filename + " NoTrueCallsignInNearby \n";
        filesWithoutTrueCallsignInNearbyCallsigns.push(filename);
        continue;
    }

    if( !checkTextLength(utterance.segments) ){
        console.log("Cnet text length is outside the bounds " + filename);
        excludedFiles += filename + " CnetOutOfBounds \n";
        continue;
    }
    
    // utterances.push(utterance);

    utterance.trueCallsigns = utterance.trueCallsigns.filter(callsign => !callsign.includes("UNK-"));
    
    //put the utterance into .json file with the original filename in the dataset directory    
    let utteranceJson =  (debug) ? JSON.stringify(utterance, null, 2) : JSON.stringify(utterance);

    //create a new file with the original filename
    fs.writeFileSync(Name + '/' + filename + '.json', utteranceJson);

}

// if(needsManualTagging.length > 0){
//     console.log('The following files need manual tagging:');
//     console.log(needsManualTagging);
// }

// if(filesWithoutTrueCallsignInNearbyCallsigns.length > 0){
//     console.log(
//         `The following files (${filesWithoutTrueCallsignInNearbyCallsigns.length})
//      do not have true callsign in nearby callsigns:`);
//     console.log(filesWithoutTrueCallsignInNearbyCallsigns);
// }

if(excludedFiles.length > 0){
    fs.writeFileSync(Name + '/' + '/excludedFiles.txt', excludedFiles);
}


/**
 * Generates segments from the xml file
 * @param {*} xmlFilePath 
 * @returns {Array} of segment objects
 */
function generateSegments(xmlFilePath){

    //read the xml file
    let xmlFile = fs.readFileSync(xmlFilePath);

    let segmentObjs = [];
    //parse the xml file
    parser.parseString(xmlFile, function (err, result) {
        if(!result || !result.data || !result.data.segment)
            return null;
        
        let segments = result.data.segment;

        for(let seg of segments){

            let segmentObj = new Segment();
            
            let speaker = seg.speaker[0]
            let speakerLabel = seg.speaker_label[0];

            segmentObj.speaker = speaker;
            segmentObj.speakerLabel = speakerLabel;

            let text = seg.text[0]

            text = text.replaceAll(regexNE, "");
            text = text.replaceAll(regexBracket, "");
            text = text.replaceAll(regexAnyTag, " $& ");

            text = latinize(text);

            text = text.replaceAll(/[^a-zA-Z0-9\[\]\#\/ ]/g, ' ');

            let tokensRaw = text.split(' ').filter(token => token != '');

            let currentEntity = null;


            let start = seg.start[0];
            let end = seg.end[0];

            segmentObj.start = start;
            segmentObj.end = end;

            let tokens = [];

            for(let t of tokensRaw){
                //if matches a tag

                if(t.match(regexAnyTag)){
                    
                    if(t[1] == '/'){
                        //end of entity
                        currentEntity = null;
                    }else{
                        //start of entity
                        currentEntity = t.slice(2, -1);
                    }

                }else{
                    
                    //normal token
                    tokens.push(t);
                    segmentObj.tags.push(entityMapping[currentEntity] || 0);
                
                }
            }

            segmentObj.text = tokens.join(' ');

            if(segmentObj.text.length > 0){
                segmentObjs.push(segmentObj);
            }
        }
    });

    return segmentObjs;
}

/**
 * Creates segments of the cnet file based on the human segments
 * @param {Human} humanSegments Array of segmnet objects based on human annotations 
 * @param {Array} cnetObj Cnet object containing the cnet words
 * @returns {Array} Array of new segment objects containing the cnet words
 */
function segmentizeCnet(humanSegments, cnetObj){

    let cnetWordIndex = 0;

    let newSegments = [];

    for(let segment of humanSegments){
        
        let cnetText = [];
        let segmentEnd = segment.end;

        let word = cnetObj.words[cnetWordIndex];
        while(word && Number(word.start) <= segmentEnd){
            cnetText.push(word.pairs);

            cnetWordIndex++;
            word = cnetObj.words[cnetWordIndex];
        }

        segment.cnetText = cnetText;
        newSegments.push(segment);
    }

    return newSegments;
}


/**
 * Extracts the CnetWords from the cnet file
 * @param {String} cnetFilePath
 * @param {Number} pairLimit number of pairs to extract from the cnet file for each word
 * @returns {Cnet} Cnet object containing the cnet words
 */
function generateCnetObject(cnetFilePath, pairLimit = 5){
    if(!fs.existsSync(cnetFilePath)) return null;
    let cnetFile = fs.readFileSync(cnetFilePath, 'utf8');

    let cnet = new Cnet();

    let currentWord = new CnetWord();
    
    for(let line of cnetFile.split('\n')){
        if(line == '') continue;
        
        let lineSplit = line.split(' ');

        let start = lineSplit[2];
        let duration = lineSplit[3];

        currentWord.start = start;
        currentWord.duration = duration;
        
        let currentPair = new CnetPair();
        let tokens = lineSplit.slice(4)
        let even = true;
        let pairCount = 0;

        //every odd token is a word, every even token is the probability 
        for(let token of tokens){
            if(pairCount >= pairLimit) break;

            if(even){
                currentPair.t = token;
            }else{
                currentPair.p = token;
                currentWord.pairs.push(currentPair);
                currentPair = new CnetPair();
                pairCount++;
            }
            even = !even;
        }

        cnet.words.push(currentWord);
        currentWord = new CnetWord();

    }

    return cnet;
}

/**
 * Gets the true callsign from the XML file from speaker label
 * @p {Array} of segment objects
 * @returns {Array} array of contained callsigns
 */
function getCallsigns(segments){
    let callsigns = [];

    for(let segment of segments){
        
        let speakerLabel = segment.speakerLabel;
        if(!speakerLabel.includes('ATCO')){
    
            if(callsigns.indexOf(speakerLabel) == -1) {
                callsigns.push(speakerLabel.trim());
            }

        }
    }

    return callsigns;
}

/**
 * Checks if the array contains only unknown callsigns
 * @p callsignsArray {Array} array of callsigns to check against
 * @returns true if the array contains unknown callsigns, false otherwise
 */
function containsOnlyUnknownCallsigns(callsignsArray){
    if(!callsignsArray) return false;
    let filtered = callsignsArray.filter(c => c.includes("UNK-"))
    return callsignsArray.length == filtered.length && filtered.length > 0;
}

/**
 * Checks if the segment has a callsign tag
 * @p segment {Segment} segment to check
 * @returns true if the segment has a callsign tag, false otherwise
 */
function hasCallsignTagged(segments){
    for(let segment of segments){
        if(segment.tags.indexOf(1) != -1) return true;
    }
    return false;
}

/**
 * checks if at least one of the true callsigns is in the nearby callsigns
 * @param {*} callsigns 
 * @param {*} nearbyCallsigns 
 * @returns true if at least one of the true callsigns is in the nearby callsigns, false otherwise
 */
function trueCallsignsInNearbyCallsigns(callsigns, nearbyCallsigns){
    if(!callsigns || !nearbyCallsigns) return false;
    for(let callsign of callsigns){
        if(isInNearbyCallsigns(callsign, nearbyCallsigns)) return true;
    }
    return false;
}

/**
 * Checks if the callsign is in the nearby callsigns
 * @param {*} callsign
 * @param {*} nearbyCallsigns
 * @returns true if the callsign is in the nearby callsigns, false otherwise
 */
function isInNearbyCallsigns(callsign, nearbyCallsigns){
    if(!callsign || !nearbyCallsigns) return false;
    return nearbyCallsigns.find(c => c == callsign) != undefined;
}

/**
 * Generates the nearby callsigns from the info file
 * @param {String} infoFilePath
 * @returns {Array} array of NearbyCallsign objects
 */
function generateNearbyCallsigns(infoFilePath){ 
    if(!fs.existsSync(infoFilePath)) return null;
    let infoFile = fs.readFileSync(infoFilePath, 'utf8');
    let nearbyCallsigns = [];


    //processing the long version of the nearby callsigns (separated by newlines)
    let callsignsPart = false;
    for(let line of infoFile.split('\n')){
        if(line == '') continue;
        if(!callsignsPart){
            if(line == 'callsigns nearby:') callsignsPart = true;
        }else{
            let lineSplit = line.split(' : ');
            let callsignShort = lineSplit[0];
            let callsignLong = lineSplit[1];
            if(!callsignShort || !callsignLong) continue;
    
            // let callsign = new NearbyCallsign();
            // callsign.s = callsignShort;
            // callsign.l = callsignLong.trim();
    
            nearbyCallsigns.push(callsignShort);
        }
    }

    callsignsPart = false;
    //processing the short version of the nearby callsigns (separated by spaces)
    if(nearbyCallsigns.length == 0){
        for(let line of infoFile.split('\n')){
            if(line == '') continue;
            if(!callsignsPart){
                if(line == 'callsigns nearby:') callsignsPart = true;
            }else{
                let lineSplit = line.split(' ');
                for(let tok of lineSplit){
                    if(tok.length > 0){
                        // let callsign = new NearbyCallsign();
                        // callsign.s = tok;
                        // callsign.l = null;
                        nearbyCallsigns.push(tok);
                    }
                }
            }
        }
    }

    return nearbyCallsigns;
}


/**
 * Gets the full match callsigns from the nearby callsigns
 */
function getFullMatchCallsigns(segments, nearbyCallsigns){
    let callsignsInSegments = [];

    for(let segment of segments){

        let tags = segment.text.split(' ');

        for(let i = 0; i < segment.tags; i++){
            if(segment.tags[i] == 1){
                callsignsInSegments.push(tags[i]);
            }
        }

    }
    return callsignsInSegments;
}


/**
 * Checks if a callsign is tagged in the datasamples
 */
function hasTaggedCallsign(segments){
    for(let segment of segments){
        if(segment.tags.indexOf(1) != -1){
            return true;
        }
    }
    return false;
}

/**
 * Checks if the length of cnet text is within the limits (tokenized)
 * @param {*} segments
 * @param {*} min minimum relative length of the cnet text compared to the original text (0-1)
 * @returns true if the length of cnet text is within the limits, false otherwise 
 */
function checkTextLength(segments, min = 0.5){
    for(let segment of segments){
        let textLength = segment.text.split(' ').length;
        let cnetLength = segment.cnetText.length;
        
        if(cnetLength / textLength < min) 
            return false;
    }
    return true;
}