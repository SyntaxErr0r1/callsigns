"""
Converting the SpaCy .spacy files to .json files used for training the NER model.
Author: Juraj Dedič, xdedic07
"""
import sys
# get first argument from command line
try:
    path = sys.argv[1]
except IndexError:
    print("No path given")
    path = None
    exit()

import datasets 
from datasets import Dataset
from spacy.tokens import DocBin
import spacy
import json




db = DocBin()
db.from_disk(path+".spacy")
nlp = spacy.load("en_core_web_sm")

docs = list(db.get_docs(nlp.vocab))

def getTokenPartOfEntity(token, ents):
    for entity in ents:
#         print("checking ",token["start"],token["end"],"against",entity["start"],entity["end"])
        if token["start"] >= entity["start"] and token["end"] <= entity["end"]:
            return entity["label"]
    return None

def convertDocToDataset(identifier,doc):
    tokens = []
    ner_tags = []

    obj = doc.to_json()
    ents = obj["ents"]
    for token in obj["tokens"]:
        entity_label = getTokenPartOfEntity(token, ents) 
        if(entity_label != None):
            ner_tags.append(1)
        else:
            ner_tags.append(0)
        tokens.append(token["lemma"])
    final_dict = {
        "id": identifier,
        "tokens": tokens,
        "ner_tags": ner_tags
    }
    return final_dict

lst = []
for i, doc in enumerate(docs):
    conv = convertDocToDataset(i,doc)
    lst.append(conv)
    if i < 5:
        print(conv)



# save the list as JSON array
with open(path+".json", 'w') as f:
    json.dump(lst, f)