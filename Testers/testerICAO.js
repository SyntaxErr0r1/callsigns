/**
 * Tester for ICAO callsign recognition
 * @author Juraj Dedič, xdedic07
 * @note This script uses the datasample API to test the Naive system 
 * @note This scipt is not particularly clean code, sorry if it is difficult to read
 * @note I tried to comment the code to make it more readable
 * @note I don't want to make big changes so I don't break it before submitting
 */
import { exit } from 'process';
import { loadSamples, getTrueSpan, spanMatch, calculateAUC } from './testerCore.js';
import * as fs from 'fs';
import { plot } from 'nodeplotlib';

//usage node tester.js <dataset directory>

// Span API - SpanCat
// const spanAPI = 'http://127.0.0.1:4000/';

// Span API - NER
const spanAPI = 'http://127.0.0.1:2000/';

// datasample API
const apiAddress = 'http://localhost:3000/datasample/0.0';

// const apiAddress = 'http://localhost:3000/random-datasample';

let results = [];

let datasamples = loadSamples(process.argv);
let finished = 0;

var verbose = true;

/**
 * Main testing loop
 * Iterates over all test cases and sends them to the datasample API
 */
for(let datasample of datasamples){
    // datasample.spanAPI = spanAPI;    //uncomment to use NER model for span detection
    fetch(apiAddress, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(datasample)
    }).then(async response => {
        await response.json().then(data => {
            
            results.push( {res: data, case: datasample} )

        });
    }).catch(error => {
        console.log(error);
    }).finally(() => {
        finished++;

        if(finished >= datasamples.length){
            printResults(results)
            let segmentsList = getSegments(results);
            console.log("Segments count: ", segmentsList.length);
            // let roc = getROC(segmentsList, true, true);
            // plotROC(segmentsList, false);
        }
    });
}


function verbosePrint(...text){
    if(verbose)
        console.log(...text);
}

/**
 * Determines the result of the match
 * @param {*} match 
 * @param {*} segment 
 * @returns 0 - true positive, 1 - true negative, 2 - false positive, 3 - false negative
 */
function getMatchResultICAO(match, segSample, airplaneTrueCallsigns){
    
    let csgTagged = segSample.tags.includes(1)

    if(match){
        if(airplaneTrueCallsigns.includes(match.csg) && csgTagged){
            // console.log("Correct match: ", match.csg);
            return 0;
        }else{
            verbosePrint("Incorrect match: ",  match.csg || "none");
            return 2;
        }
    }else{
        // verbosePrint("SEGSAMPLE: ", segSample)
        const trueNoCallsign = (airplaneTrueCallsigns.length == 0 || !csgTagged) && match == null
        if(trueNoCallsign){
            // verbosePrint("Correct match: none");
            return 1;
        }else{
            verbosePrint("Incorrect - no match");
            return 3;
        }
    }
}


function getMatchResultSpan(match, segSample){
    console.log("MATCH: ", match);
}

/**
 * Get the statistics of a test case
 * @p test case object
 * @ret statistics object
 */
function processCase(testCase){
    let res = testCase.res;
    let datasample = testCase.case;
        
    const airplaneTrueCallsigns = datasample.trueCallsigns;

    let humanStats = processCaseSegments(res, datasample, airplaneTrueCallsigns);
    let cnetStats = processCaseSegments(res, datasample, airplaneTrueCallsigns, true);
    
    
    let resObj = {
        human: humanStats,
        cnet: cnetStats,
        filename: datasample.filename,
        trueCallsigns: airplaneTrueCallsigns
    }

    if(humanStats.truePositives + humanStats.trueNegatives != humanStats.count/*  && cnetStats.count != cnetStats.truePositives*/){
        console.log("File: ", datasample.filename);
        console.log("Real callsigns: ", airplaneTrueCallsigns.join(","));
        
        console.log(resObj);
        
        console.log(JSON.stringify(res, null, 2));

        console.log("-------------------------------------------------");
    }

    return resObj;
}

/**
 * Get the statistics of a test case
 * @p test case object
 * @ret statistics object
 * @param {*} res
 * @param {*} datasample
 * @param {*} airplaneTrueCallsigns
 * @param {*} processCnet
 * @param {*} span
 */
function processCaseSegments(res, datasample, airplaneTrueCallsigns, processCnet = false, span = false){
    let segmentsCount = 0;
    let truePositives = 0;
    let trueNegatives = 0;
    let falsePositives = 0;
    let falseNegatives = 0;

    for(let i = 0; i < res.segments.length; i++){
        let seg = res.segments[i];
        let segSample = datasample.segments[i];

        segmentsCount++;
        let match = processCnet ? seg.matchCnet : seg.matchHuman;

        let matchResult;
        if(span){
            matchResult = getMatchResultSpan(match, segSample);
        }else{
            matchResult = getMatchResultICAO(match, segSample, airplaneTrueCallsigns);
        }
        
        if(matchResult == 0){
            truePositives++;
        }else if(matchResult == 1){
            trueNegatives++;
        }else if(matchResult == 2){
            falsePositives++;
        }else if(matchResult == 3){
            falseNegatives++;
        }
    }

    return {
        count: segmentsCount, 
        truePositives: truePositives,
        trueNegatives: trueNegatives,
        falsePositives: falsePositives,
        falseNegatives: falseNegatives,
    }
}

/**
 * Prints results from array of result objects
 * @p array of result objects
 */
function printResults(results){
    
    let humanCount = 0;
    let cnetCount = 0;
    
    let humanTruePositives = 0;
    let humanTrueNegatives = 0;
    let humanFalsePositives = 0;
    let humanFalseNegatives = 0;

    let cnetTruePositives = 0;
    let cnetTrueNegatives = 0;
    let cnetFalsePositives = 0;
    let cnetFalseNegatives = 0;

    
    for(let test of results){
        // console.log( JSON.stringify(test , null, 4))
        
        let processCaseResult = processCase(test);

        humanCount += processCaseResult.human.count;
        humanTruePositives += processCaseResult.human.truePositives;
        humanTrueNegatives += processCaseResult.human.trueNegatives;
        humanFalsePositives += processCaseResult.human.falsePositives;
        humanFalseNegatives += processCaseResult.human.falseNegatives;
        
        cnetCount += processCaseResult.cnet.count;
        cnetTruePositives += processCaseResult.cnet.truePositives;
        cnetTrueNegatives += processCaseResult.cnet.trueNegatives;
        cnetFalsePositives += processCaseResult.cnet.falsePositives;
        cnetFalseNegatives += processCaseResult.cnet.falseNegatives;
    }

    console.log("--------------------RESULTS--------------------");
    console.log("Human segments: ", humanCount);
    console.log("Human true positives: ", humanTruePositives);
    console.log("Human true negatives: ", humanTrueNegatives);
    console.log("Human false positives: ", humanFalsePositives);
    console.log("Human false negatives: ", humanFalseNegatives);
    console.log("Human accuracy: ", (humanTruePositives + humanTrueNegatives)/humanCount);
    console.log("Human correct", humanTruePositives + humanTrueNegatives);

    console.log("Cnet Count: ", cnetCount);
    console.log("Cnet true positives: ", cnetTruePositives);
    console.log("Cnet true negatives: ", cnetTrueNegatives);
    console.log("Cnet false positives: ", cnetFalsePositives);
    console.log("Cnet false negatives: ", cnetFalseNegatives);
    console.log("Cnet accuracy: ", (cnetTruePositives + cnetTrueNegatives)/cnetCount);
    console.log("Cnet correct", cnetTruePositives + cnetTrueNegatives);

    console.log("-----------------------------------------------");
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

/**
 * Processes single datasample file
 */
function getSegments(results){
    let segmentsList = [];

    for(let segmentResult of results){

        let testCase = segmentResult.case;
        let res = segmentResult.res;

        for(let i = 0; i < testCase.segments.length; i++){
            let caseSeg = testCase.segments[i];

            res.segments[i].file = testCase.filename;
            res.segments[i].tags = caseSeg.tags;
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

/**
 * Returns true if the true match is found in segment
 */
function isMatched(match, segment, span = false, cnet = false){
    if(span){
        let trueSpan = getTrueSpan(segment);
        let matchSpan = match?.span;
        let res = spanMatch(trueSpan, matchSpan, (cnet) ? 2 : 2);
        console.log(matchSpan)
        console.log(trueSpan)
        console.log(res)
        return res;
    }else{
        let matchCsg = match?.csg;
        return segment.trueCallsigns.includes(matchCsg);
    }
}

/**
 * Returns the threshold stats for the given segments
 * @p segmentsList list of segments
 * @p cnet true if cnet results should be used, false if human results should be used
 * @p span true if span matching should be used, false if callsign matching should be used
 * @ret array of threshold stats
 */
function getROC(segmentsList, cnet = false, span = false){
    let thresholdStats = [];
    const points = 10000;
    for(let i = 0; i <= points; i+=1){
        thresholdStats.push({threshold: i/points, truePositives: 0, trueNegatives: 0, falsePositives: 0, falseNegatives: 0});
    }

    for(let segment of segmentsList){

        let match = cnet ? segment.matchCnet : segment.matchHuman
        let matchP = match?.p;
        let matchCsg = match?.csg;
        // console.log(segment.file)
        
        let positiveFind = isMatched(match, segment, span, cnet);
        for(let i = 0; i < thresholdStats.length; i++){
            let thresholdP = thresholdStats[i].threshold;
            if(matchCsg && matchP >= thresholdP){
                if(positiveFind){
                    thresholdStats[i].truePositives++;
                }else{
                    thresholdStats[i].falsePositives++;
                }
            }else{
                if(segment.trueCallsigns.length){
                    thresholdStats[i].falseNegatives++;
                }else{
                    thresholdStats[i].trueNegatives++;
                }
            }
        }
    }

    thresholdStats = thresholdStats.map(stat => {
        stat.tpr = stat.truePositives/(stat.truePositives+stat.falseNegatives)
        stat.fpr = stat.falsePositives/(stat.trueNegatives+stat.falsePositives)
        return {tpr: stat.tpr, fpr: stat.fpr};
    })

    return thresholdStats;
}

function plotROC(segmentsList, span = false){

    let thresholdStatsHuman = getROC(segmentsList, false, span)
    let thresholdStatsCnet = getROC(segmentsList, true, span)

    let plotData = [
        {
            x: [1],
            y: [1],
            type: 'scatter',
            name: 'Human',
            // line: {shape: 'spline'},
            // mode: 'markers',
            // name: '',
        },
        {
            x: [1],
            y: [1],
            type: 'scatter',
            name: 'Cnet',
            // line: {shape: 'spline'},
            // mode: 'markers',
            // name: '',
        }
    ]

    for(let i = 0; i < thresholdStatsHuman.length; i++){

        const statH = thresholdStatsHuman[i];
        const statC = thresholdStatsCnet[i];

        plotData[0].x.push(statH.fpr)
        plotData[0].y.push(statH.tpr)
        plotData[1].x.push(statC.fpr)
        plotData[1].y.push(statC.tpr)
    }

    plotData[0].x.push(0)
    plotData[0].y.push(0)
    plotData[1].x.push(0)
    plotData[1].y.push(0)

    var config = {
        toImageButtonOptions: {
            format: 'svg', // one of png, svg, jpeg, webp
            filename: 'custom_image',
            height: 500,
            width: 500,
            scale: 1 // Multiply title/legend/axis/canvas sizes by this factor
        }
    };

    var layout = {
        autosize: false,
        width: 500,
        height: 500,
        xaxis: {
          range: [0, 1],
          type: 'linear',
          title: 'False positive rate',
        },
        yaxis: {
          range: [0, 1],
          type: 'linear',
          title: 'True positive rate',
        },
        title: {
            text:'1-Best',
            font: {
              size: 24
            },
            xref: 'paper',
            // x: 0.05,
        },
    };

    plot(plotData, layout , config);

    console.log("AUC Human", calculateAUC(thresholdStatsHuman));
    console.log("AUC Cnet", calculateAUC(thresholdStatsCnet));

    let obj = {
        human: thresholdStatsHuman, 
        cnet: thresholdStatsCnet
    }

    // write it into a file
    fs.writeFile('Naive.json', JSON.stringify(obj), (err) => {
        if (err) throw err;
        console.log('The file has been saved!');
    });

}
