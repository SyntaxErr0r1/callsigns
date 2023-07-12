#import docbin
import spacy
from spacy.tokens import DocBin
from spacy import displacy
from spacy.scorer import Scorer
from spacy.training import Example
import spacy_transformers
import re

nlp = spacy.load(R"results/s2/model-best") #load the best model
# test_sentences = [x[0] for x in TEST_DATA[0:100]] # extract the sentences from [sentence, entity]

from flask import Flask, request, jsonify

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

st = "november tango x-ray contact apron one two one decimal eight five five"
print(normalize_text(st))

@app.route("/", methods=['POST'])
def index_path():
    content_type = request.headers.get('Content-Type')
    if (content_type == 'application/json'):
        json = request.json
        text = normalize_text(json['text'])
        doc_ner = nlp(text)

        #add the scores to the spans
        spans = doc_ner.spans["sc"]
        if spans == None or len(spans) == 0:
            return jsonify([])
        for span, confidence in zip(spans, spans.attrs["scores"]):
            span.set_extension("confidence", default=None, force=True)
            setattr(span._, "confidence", confidence)

        #sort the spans by score
        spans = sorted(spans, key=lambda span: span._.confidence, reverse=True)

        best_span = spans[0]

        #mask for the best span over the text words 
        tags = [0] * len(doc_ner)

        if best_span != None:
            for i in range(best_span.start, best_span.end):
                tags[i] = 1
        
        #get the text of the span
        best_span = doc_ner[best_span.start:best_span.end]
        
        json = {
            "text": best_span.text, 
            "confidence": str(best_span._.confidence), 
            "startChar": best_span.start_char, 
            "endChar": best_span.end_char, 
            "tags": tags,
            "span": best_span.text,
        }
        
        results_final = []
        results_final.append(json)
        return jsonify(results_final)
    else:
        return 'Content-Type not supported!'
    
app.run(port=4000)