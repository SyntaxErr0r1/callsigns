/**
 * Tester for the detection of callsigns in a text
 * @author Juraj Dedič, xdedic07
 */

import { loadSamples, getTrueSpan, spanMatch, calculateAUC } from "./testerCore.js";
import fscore from "fscore";
import fs from "fs";
import { plot } from 'nodeplotlib';


/**
 * definitions of the implemented APIs
 */

// Naive
// const apiAddress = 'http://127.0.0.1:3000/spacy-compat/0';

// SpaCy SpanCat
// const apiAddress = 'http://127.0.0.1:4000/';

// SpaCy NER
// const apiAddress = 'http://127.0.0.1:2000/';

// OpenAI
const apiAddress = 'http://127.0.0.1:5000/';

const debug = true;

let resultsHuman = [];
let resultsCnet = [];

let datasamples = loadSamples(process.argv);
let finished = 0;

function getSegments(datasamples){
    let segments = [];
    for(let datasample of datasamples){
        for(let segment of datasample.segments){
            segment.trueCallsigns = [];
            if(segment.tags.indexOf(1) != -1) 
                segment.trueCallsigns = datasample.trueCallsigns;
            segment.filename = datasample.filename;
            segment.nearbyCallsigns = datasample.nearbyCallsigns;
            segments.push(segment);
        }
    }
    return segments;
}

let segments = getSegments(datasamples);

console.log("Segments count: ", segments.length);

for( let segment of segments ){

    // getting resHuman and resCnet at the same time is only for generating the ROC curve
    // if you want to test only one of the APIs, (un)commenting the switchTextToCnet() function call is enough
    // let resHuman = await fetch(apiAddress, {
    //     method: 'POST',
    //     headers: {
    //         'Content-Type': 'application/json'
    //     },
    //     body: JSON.stringify(segment)
    // })

    // segment = switchTextToCnet(segment); //uncomment for Human testing using Human transcript data
    let resCnet = await fetch(apiAddress, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(segment)
    })

    // resultsHuman.push({segment, res: await resHuman.json()});
    resultsCnet.push({segment, res: await resCnet.json()});

    finished++;

    // printResults(results);
    if(finished >= segments.length){
        console.log("Finished");
        printResults(resultsCnet);

        let resultsJoined = {
            human: resultsHuman,
            cnet: resultsCnet
        }
        // plotROC(resultsJoined, true);

        // saveResults(resultsHuman, "resultsHuman.json");
        // saveResults(resultsCnet, "resultsCnet.json");

    }


    if(!debug){
        process.stdout.clearLine(0);
        let progress = "Finished segments "+ finished + " / " + segments.length;
        process.stdout.write(progress);
        process.stdout.cursorTo(0);

    }
    
    // break;
}

function switchTextToCnet(segment){
    segment.textHuman = segment.text;
    let cnetText = normalizeSpan( segment.cnetText.map(w => w[0].t) );
    // let cnetText = segment.cnetText.map(w => w[0].t.toLowerCase());
    segment.text = cnetText.join(" ")
    delete segment.cnetText
    return segment;
}

/**
 * Normalizes the span for more accurate comparison
 * @param {*} span
 */
function normalizeSpan(span){
    let txt = span.join(" ").toLowerCase();
    txt = txt.replaceAll("<eps>","")
    .replaceAll("alfa", "alpha")
    .replaceAll("juliet ", "juliett ")
    .replaceAll("juliet\n", "juliett\n")
    .replaceAll("juliet\r", "juliett\r")
    .replaceAll("juliet\t", "juliett\t")
    .replaceAll("juliet.", "juliett.")
    .replaceAll("juliet$", "juliett")
    .replaceAll("^juliet", "juliett")
    .replaceAll("niner", "nine")
    .replaceAll("x ray", "x-ray")
    .replaceAll(/_([a-z])_/gm, "$1")
    .replaceAll("_", " ")
    .replaceAll("  ", " ");
    return txt.split(" ");
}


/**
 * Prints the results from the results array
 * @param {*} results
 */
function printResults(results){
    
    let cumulative = {precision: 0, recall: 0, fscore: 0};
    
    for(let result of results){
        let seg = result.segment;

        let res = result?.res || [];
        let match = res[0];
        let predictedEntity = [];
        if(match && match.span){
            console.log("MATCH:", match.span)
            predictedEntity = match.span.split(" ")
        }

        let trueEntity = getTrueSpan(seg);

        predictedEntity = normalizeSpan(predictedEntity);
        trueEntity = normalizeSpan(trueEntity);

        console.log("RES:", predictedEntity, trueEntity)


        if(trueEntity.length == 0 && predictedEntity.length == 0){
            console.log("Both empty")
            cumulative.precision += 1;
            cumulative.recall += 1;
            cumulative.fscore += 1;
            continue;
        }

        let score = fscore( trueEntity, predictedEntity, {format: "detailed"} );

        if(score.fscore < 1){
            console.log(seg.filename)
            console.log("F-Score: ", score.fscore);
            console.log(seg.text)
            console.log("True callsigns: ", trueEntity);
            console.log("Predicted callsigns: ", predictedEntity);
            console.log("Confidence: ",result.res.map(e => e.confidence));
            console.log("-----------------");
        }


        cumulative.precision += score.precision;
        cumulative.recall += score.recall;
        cumulative.fscore += score.fscore;
        
    }

    cumulative.precision /= results.length;
    cumulative.recall /= results.length;
    cumulative.fscore /= results.length;

    console.log("Cumulative Score: ", cumulative);
    console.log("F-Score (recalculated by formula): ", 2 * cumulative.precision * cumulative.recall / (cumulative.precision + cumulative.recall));
}


/**
 * returns the sequences which should be tagged as callsigns
 * @param {*} segment 
 * @returns The true tagged callsigns (as written in the segment)
 * @deprecated Use getTrueSpan instead
 */
function getTrueEntities(segment){

    let text = segment.textHuman || segment.text
    let tokens =  text.split(' ');

    let currentEntity = [];
    let entities = [];
    for(let i = 0; i < segment.tags.length; i++){
        if(segment.tags[i] == 1){
            currentEntity.push(tokens[i]);
        }else if(currentEntity.length > 0){
            entities.push(currentEntity.join(' '));
            currentEntity = [];
        }
    }

    if(currentEntity.length > 0){
        entities.push(currentEntity.join(' '));
    }

    return entities;
}

/**
 * saves the results to a file
 */
function saveResults(results, name = "results.json"){
    results = results.map(r => {
        delete r.segment.cnetText;
        delete r.segment.start
        delete r.segment.end
        delete r.segment.tags
        delete r.segment.textCnet
        return r;
    })
    let json = JSON.stringify(results);
    fs.writeFileSync(name, json);
}

/**
 * Checks if the match is correct (based on Levenshtein distance used in the thesis when evaluating the coverage)
 */
function isMatched(match, segment, span = false, cnet = false){
    if(span){
        let trueSpan = getTrueSpan(segment);
        let matchSpan = match?.span;
        let res = spanMatch(trueSpan, matchSpan, (cnet) ? 2 : 1);
        console.log("match:",matchSpan)
        console.log("true:",trueSpan)
        console.log("RES:",res)
        return res;
    }else{
        let matchCsg = match?.csg;
        return segment.trueCallsigns.includes(matchCsg);
    }
}

/**
 * Returns the threshold stats for the given results
 * @param {*} resultsList
 * @param {*} cnet
 * @param {*} span
 * @returns The threshold stats
 * @note This is the ROC described in the thesis. Not the standard ROC (I think, but I thought it's more useful for this purpose).
 */
function getROC(resultsList, cnet = false, span = false){
    let thresholdStats = [];
    const points = 10000;
    for(let i = 0; i <= points; i+=1){
        thresholdStats.push({threshold: i/points, truePositives: 0, trueNegatives: 0, falsePositives: 0, falseNegatives: 0});
    }

    for(let result of resultsList){

        let segment = result.segment;

        let res = result?.res || [];
        let match = res[0];
        let matchP = Number(match?.confidence);
        let matchCsg = match?.span;
        
        // let positiveFind = getTrueEntities(segment).includes(matchCsg);
        console.log(segment.filename)
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

    // console.log(thresholdStats);

    return thresholdStats;
}

/**
 * Returns the threshold stats for the given results
 * @param {*} resultsList
 * @param {*} cnet
 * @note The difference is that this function uses ROC formula as classifying each token of the sequence
 * @note The results are boring so getROC is used instead 
 */
function getTokenLevelROC(resultsList, cnet = false){
    let thresholdStats = [];
    const points = 10000;
    for(let i = 0; i <= points; i+=1){
        thresholdStats.push({threshold: i/points, truePositives: 0, trueNegatives: 0, falsePositives: 0, falseNegatives: 0});
    }

    for(let result of resultsList){

        let segment = result.segment;

        let res = result?.res || [];
        let match = res[0];
        let matchP = Number(match?.confidence);
        let matchCsg = match;

        console.log("match", matchCsg);
        
        // let positiveFind = getTrueEntities(segment).includes(matchCsg);
        for(let i = 0; i < thresholdStats.length; i++){
            let thresholdP = thresholdStats[i].threshold;
            let thresholdedTags = (matchP >= thresholdP) ? match.tags : new Array(segment.tags.length).fill(0);

            for(let j = 0; j < segment.tags.length; j++){
                if(thresholdedTags[j] == 1){
                    if(segment.tags[j] == 1){
                        thresholdStats[i].truePositives++;
                    }else{
                        thresholdStats[i].falsePositives++;
                    }
                }else{
                    if(segment.tags[j] == 1){
                        thresholdStats[i].falseNegatives++;
                    }else{
                        thresholdStats[i].trueNegatives++;
                    }
                }
            }
        }
    }

    thresholdStats.map(stat => {
        stat.tpr = stat.truePositives/(stat.truePositives+stat.falseNegatives)
        stat.fpr = stat.falsePositives/(stat.trueNegatives+stat.falsePositives)
        return {tpr: stat.tpr, fpr: stat.fpr};
    })

    // console.log("stats", thresholdStats);

    return thresholdStats;
}


/**
 * Plots the ROC curve for the given results
 * @param {*} resultsList 
 * @param {*} span
 */
function plotROC(resultsList, span = false ){

    let resultsHuman = resultsList.human;
    let resultsCnet = resultsList.cnet;

    let thresholdStatsHuman = getROC(resultsHuman, false, span)
    let thresholdStatsCnet = getROC(resultsCnet, true, span)

    let plotData = [
        {
            // x: [1],
            // y: [1],
            x: [],
            y: [],
            type: 'scatter',
            name: 'Human',
            // mode: 'markers',
            // name: '',
        },
        {
            x: [],
            y: [],
            type: 'scatter',
            name: 'Cnet',
            // mode: 'markers',
            // name: '',
        }
    ]

    for(let i = 0; i < thresholdStatsHuman.length; i++){

        const statH = thresholdStatsHuman[thresholdStatsHuman.length - i - 1];
        const statC = thresholdStatsCnet[thresholdStatsCnet.length - i - 1];

        // to start from 0,0 and end at 1,1
        plotData[0].x.push(statH.fpr)
        plotData[0].y.push(statH.tpr)
        plotData[1].x.push(statC.fpr)
        plotData[1].y.push(statC.tpr)
    }

    // if(tokenLevel){
    //     plotData[0].x.push(1)
    //     plotData[0].y.push(1)
    // }

    // plotData[0].x.push(0)
    // plotData[0].y.push(0)
    // plotData[1].x.push(0)
    // plotData[1].y.push(0)

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
    fs.writeFile('BERT.json', JSON.stringify(obj), (err) => {
        if (err) throw err;
        console.log('The file has been saved!');
    });

}