"""\
Author: Juraj Dedič, xdedic07
Binds to port 2000 and accepts POST requests with JSON body.
Usage: ner.py
"""
#import docbin
import spacy
from spacy.tokens import DocBin
from spacy import displacy
from spacy.scorer import Scorer
from spacy.training import Example
import spacy_transformers
import re
import warnings
warnings.filterwarnings("ignore")
import json

from flask import Flask, request, jsonify


callsigns_operators = json.load(open("callsigns-icao-edit.json", "r"))

alphabet = {}
with open('nato.json') as f:
    alphabet = json.load(f)


# these 3 functions are attempt to match the ICAO callsigns right from the detected spans
# not used in the evaluation
def getAirlineLetters(callsign):
    for callsign_obj in callsigns_operators:
        if callsign_obj['callsign'].lower() == callsign.lower():
            return callsign_obj['ICAO']
    return None

def getAlphabetLetter(word):
    word = word.lower()
    if word in alphabet:
        return alphabet[word]
    if getAirlineLetters(word) is not None:
        return getAirlineLetters(word)
    return None


def convertToCallsign(words):
    words = words.split()
    strn = ""
    for word in words:
        if getAlphabetLetter(word) is None:
            return None
        else:
            strn += getAlphabetLetter(word)
    return strn

ner = spacy.load(R"results/n1/model-best") #load the best model

app = Flask(__name__)

def normalize_text(txt):
    txt = txt.lower()
    txt = txt.replace('<eps>', '') \
             .replace('alfa', 'alpha') \
             .replace('niner', 'nine')
             
    txt = re.sub(r'\bjuliet\b', 'juliett', txt)
    txt = re.sub(r'_([a-z])_', r'\1', txt)
    txt = txt.replace('_', '')
    return txt

@app.route("/legacy/", methods=['POST'])
def legacy():
    content_type = request.headers.get('Content-Type')
    if (content_type == 'application/json'):
        json = request.json
        text = json['text']
        doc_ner = ner(text)
        print(doc_ner.ents)
        print(doc_ner.spans)
        print([ent for ent in doc_ner.ents if ent.label_ == "CALLSIGN"])
        return jsonify([ent.text for ent in doc_ner.ents if ent.label_ == "CALLSIGN"])
    else:
        return 'Content-Type not supported!'
    
@app.route("/", methods=['POST'])
def new():
    content_type = request.headers.get('Content-Type')
    if (content_type == 'application/json'):
        json = request.json

        text = normalize_text( json['text'] )
        doc_ner = ner(text)

        callsign_ents = [ent for ent in doc_ner.ents if ent.label_ == "CALLSIGN"]
        if len(callsign_ents) == 0:
            return jsonify([])
        else:
            # taking only one callsign
            first_ent = callsign_ents[0]
            callsign = first_ent.text
            start_char = first_ent.start_char
            end_char = first_ent.end_char
            tags = [0] * len(doc_ner)
            for i in range(first_ent.start, first_ent.end):
                tags[i] = 1
            
            json = {
                "text": callsign,
                "startChar": start_char,
                "endChar": end_char,
                "tags": tags,
                "span": callsign,
            }
            return jsonify([json])
    else:
        return 'Content-Type not supported!'
    
app.run(port=2000)