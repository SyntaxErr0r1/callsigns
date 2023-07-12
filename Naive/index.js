/**
 * @author Juraj Dedič, xdedic07
 * Index file for the callsigns service.
 * Contains API for various experiments and also the main API for the callsigns service.
 */

//create a rest api to find the most probable callsign
import express from 'express'
import bodyParser from 'body-parser'
import { findCallsignScore, findCallsignScoreCnet } from './callsignsService.js'

let jsonParser = bodyParser.json()

const app = express()
const port = process.env.PORT || 3000;

const maxRequestBodySize = '1mb';

app.use(express.json({limit: maxRequestBodySize}));
app.use(express.urlencoded({limit: maxRequestBodySize}));



/**
 * Used by the ICAO tester.
 * @note should be removed in production
 * @note spanAPI parameter might be unsecure in production and should instead be a config parameter???
 */
app.post('/datasample/:threshold?', jsonParser, async (req, res) => {

    let datasample = req.body
    let results = [];
    
    let segments = [];

    let spanAPI = datasample.spanAPI;

    for(let seg of datasample.segments){
        let str = seg.text
        let cnetStr = seg.cnetText.map(w => w[0].t).join(" ")

        if(spanAPI){
            // fetch the span from the API
            let spanHuman = await fetch(spanAPI, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({text: str})
            });
            spanHuman = await spanHuman.json();

            let spanCnet = await fetch(spanAPI, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({text: cnetStr})
            });
            spanCnet = await spanCnet.json();

            str = spanHuman[0]?.span || str;
            cnetStr = spanCnet[0]?.span || cnetStr;
        }

        
        let threshold = req.params.threshold || 0.5;
        // console.log(str, cnetStr)
        let scoresHuman = findCallsignScore(str, datasample.nearbyCallsigns)
        scoresHuman = scoresHuman.sort((x,y) => y.p - x.p)
        // console.log(scoresHuman)

        let cnetWords = seg.cnetText
        let scoresCnet = findCallsignScoreCnet(cnetWords, datasample.nearbyCallsigns)
        scoresCnet = scoresCnet.sort((x,y) => y.p - x.p)

        let matchHuman = scoresHuman[0]
        let matchCnet = scoresCnet[0]

        if(matchHuman?.p < threshold){
            matchHuman = undefined
        }
        if(matchCnet?.p < threshold){
            matchCnet = undefined
        }

        segments.push({
            text: str,
            cnetText: cnetStr,
            speaker: seg.speaker,
            matchHuman,
            matchCnet,
        })
    }

    results = {segments};

    res.send(results)
    
})


app.post("/cnet", jsonParser, (req, res) => {
    let cnet = req.body
    let results = [];

    let scoresCnet = findCallsignScoreCnet(cnet.words, cnet.nearbyCallsigns)
    scoresCnet = scoresCnet.sort((x,y) => y.p - x.p)

    results = {match: scoresCnet[0]}

    res.send(results)
})

/**
 * API with similar interface to transformer models
 */
app.post("/spacy-compat/:threshold?", jsonParser, (req, res) => {
    let segment = req.body;
    let text = segment?.text;
    let nearbyCallsigns = segment?.nearbyCallsigns;

    let threshold = req.params.threshold || 0.7;

    if(!segment.text || !nearbyCallsigns || nearbyCallsigns.length == 0){
        res.status(400).send("Request body must contain text and nearbyCallsigns")
    }else{
        if(typeof text == Array){
            text = text.join(" ")
        }
        
        let scores = findCallsignScore(text, nearbyCallsigns)
        scores = scores.sort((x,y) => y.p - x.p)

        let topScore = scores[0]
        
        if(topScore?.p > threshold){
            topScore.confidence = topScore.p
            topScore.span = topScore.span.join(" ")
            
            res.send([topScore])
        }else{
            res.send([])
        }
        
    }
})


/**
 * Random with API interface like /datasample/
 */
app.post('/random-datasample', jsonParser, (req, res) => {

    let datasample = req.body
    let results = [];
    
    let segments = [];

    for(const seg of datasample.segments){
        let str = seg.text
        let cnetStr = seg.cnetText.map(w => w[0].t).join(" ")
        
        let cnetWords = seg.cnetText

        let randomScoresHuman = datasample.nearbyCallsigns.map(csg => ({
            csg,
            p: Math.random()
        }))

        let randomScoresCnet = datasample.nearbyCallsigns.map(csg => ({
            csg,
            p: Math.random()
        }))

        let bestHuman = randomScoresHuman.sort((x,y) => y.p - x.p)[0]
        let bestCnet = randomScoresCnet.sort((x,y) => y.p - x.p)[0]
            

        // let randomIndexHuman = Math.round(Math.random() * datasample.nearbyCallsigns.length)
        // let randomIndexCnet = Math.round(Math.random() * datasample.nearbyCallsigns.length)

        // let bestHuman = {csg: datasample.nearbyCallsigns[randomIndexHuman], p: Math.random()};
        // let bestCnet = {csg: datasample.nearbyCallsigns[randomIndexCnet], p: Math.random()};

        // console.log(bestHuman, bestCnet)

        console.log(bestHuman, bestCnet)

        segments.push({
            text: str,
            cnetText: cnetStr,
            speaker: seg.speaker,
            matchHuman: bestHuman,
            matchCnet: bestCnet,
        })
    }

    results = {segments};

    res.send(results)
    
})

/**
 * The standard API interface for the naive model
 * @note made for the purpose of public API at https://callsigns.herokuapp.com/
 */
app.post("/:threshold?", jsonParser, (req, res) => {
    let segment = req.body;
    let text = segment?.text;
    let nearbyCallsigns = segment?.nearbyCallsigns;

    let threshold = req.params.threshold || 0.7;

    if(!segment.text || !nearbyCallsigns || nearbyCallsigns.length == 0){
        res.status(400).send("Request body must contain text and nearbyCallsigns")
    }else{
        if(typeof text == Array){
            text = text.join(" ")
        }
        
        let scores = findCallsignScore(text, nearbyCallsigns)
        scores = scores.sort((x,y) => y.p - x.p)

        let topScore = scores[0]
        
        if(topScore?.p > threshold){
            res.send(topScore)
        }else{
            res.send({})
        }
        
    }
})

app.get('/', (req, res) => {
    res.send('Callsigns API')
})

app.listen(port, () => {
    console.log(`App listening at http://localhost:${port}`)
})

