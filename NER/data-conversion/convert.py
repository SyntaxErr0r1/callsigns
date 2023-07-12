"""
This file converts the original .XML files into SpaCy DocBin files.
It allows the user to specify whether they want to use the augmentation or not.
Author: Juraj Dedič, xdedic07
"""

from bs4 import BeautifulSoup
import xml.etree.ElementTree as ET
import os
import re
import sys
import random
import copy

import datasets

#matches any tag marking non-english part
regex_ne_czech = re.compile("\[NE[a-zA-Z ]*\]")

#matches any tag (ending or starting or single tag)
regex_any_tag = re.compile("\[\/*#*[A-Za-z\- ]*\]")

#check if arguments contains help
if len(sys.argv) == 1 or (len(sys.argv) > 1 and (sys.argv[1] == "--help" or sys.argv[1] == "-h")):
    print("Usage: python3 convert.py <input_dir> [True (if augmentation_enabled)]")
    print("input_dir: directory with xml files (also the output name for .list and .spacy files)")
    exit(0)

input_output_name = sys.argv[1]

AUGMENTATION_ENABLED = False
if len(sys.argv) > 2:
    AUGMENTATION_ENABLED = sys.argv[2] == "--augmentation" or sys.argv[2] == "-a"

print("Augmentation enabled:", AUGMENTATION_ENABLED)

#load xml file
def load_xml_file(filename):
    try:
        tree = ET.parse(filename)
    except:
        print("Error parsing file", filename)
        return None
    root = tree.getroot()
    return root

#load text elements from xml file
def load_text_elements(root):
    text_elements = []
    for child in root:
        #one segment
        current_text = ''
        approved = False
        for subchild in child:
            if subchild.tag == 'text':
                current_text = subchild.text
            if subchild.tag == 'tags':
                for subsubchild in subchild:
                    if subsubchild.tag == 'non_english':
                        if subsubchild.text == '0':
                            approved = True
        if approved and current_text != '' and current_text != None:
            text_elements.append(current_text)
    return text_elements

def get_utterances_from_file(filename):
    root = load_xml_file(filename)
    if root is None:
        return []
    text_elements = load_text_elements(root)
    utterances = []
    for text_element in text_elements:
        utterances.append(text_element)
    return utterances

def read_utterances_from_dir(directory, augmentation_enabled = False):
    """
    Reads the raw utterances from the directory (in the text tag of XML files)
    INPUT: filename (string)
    OUTPUT: List of pair [raw utterance (string), filename (string)]
    """

    utterances_raw = []
    file_list = []

    for filename in os.listdir(directory+"/"):
        # print(filename)
        with open(directory+"/"+filename, 'r') as f: # open in readonly mode
            
            try:
                data = f.read()
                # data = data.decode('utf-8', 'ignore')
            except:
                continue

            #removing invisible characters
            
            # 
            
            file_list.append(filename)

            
            segments_el = get_utterances_from_file(directory+"/"+filename)

            for segment in segments_el:
                # try:
                #     # print("text: (filename",filename,")", segment)
                # except:
                #     # print("text: (filename",filename,")", "ERROR PRINTING")
                utterances_raw.append([segment,filename])

    write_filenames(file_list, directory, augmentation_enabled)
    return utterances_raw

def write_filenames(file_list, output_name, augmentation_enabled = False):
    """
    Writes the filenames to a file <output_name>.list
    INPUT: List of strings, String
    OUTPUT: None
    """
    with open(output_name+".list", 'w') as list_file:
        if augmentation_enabled:
            list_file.write("+AUGMENTED\n")
        for filename in file_list:
            list_file.write(filename+"\n")

class Entity:
    tokens_indices = []
    entity = ""
    def __init__(self, tokens_indices, entity):
        self.tokens_indices = tokens_indices
        self.entity = entity
    def __str__(self):
        return "["+str(self.tokens_indices)+", \""+self.entity+"\"]"
    def contains_index(self, index):
        return index in self.tokens_indices

    def get_last_index(self):
        return self.tokens_indices[-1]
    
    def does_overlap(self, other):
        for index in self.tokens_indices:
            if other.contains_index(index):
                return True
        return False
    
def get_detected_opening_tag(tag):
    """
    Returns the detected opening tag or None if the tag is not a valid opening tag (matching exactly)
    """
    if tag == "[#callsign]":
        return "CALLSIGN"
    elif tag == "[#value]":
        return "VALUE"
    elif tag == "[#command]":
        return "COMMAND"
    return None

def is_detected_closing_tag(tag):
    """
    Returns True if the tag is a detected closing tag, False otherwise
    """
    if tag == "[/#callsign]" or tag == "[/#value]" or tag == "[/#command]":
        return True
    return False

class Utterance:
    tokens = [],
    entities = [],
    filename = "",
    is_augmented = False,

    def __init__(self, tokens, entities, filename):
        self.tokens = tokens
        self.entities = entities
        self.filename = copy.deepcopy(filename)
    def __str__(self):
        entities_str = ""
        augmentation = "(AUGMENTED)" if self.is_augmented else ""
        for entity in self.entities:
            entities_str += str(entity)+", "
        return augmentation + self.filename+": ["+str(self.tokens)+", ["+entities_str+"]]"
    
    def connect_adjacent_entities(self):
        new_entities = []
        for i in range(len(self.entities)):
            if i == 0:
                new_entities.append(self.entities[i])
            else:
                equivalent_entities = self.entities[i].entity == self.entities[i-1].entity
                consequent_entities = self.entities[i].get_last_index() == self.entities[i-1].get_last_index() + 1
                if equivalent_entities and consequent_entities:
                    new_entities[-1].tokens_indices += self.entities[i].tokens_indices
                else:
                    new_entities.append(self.entities[i])
        self.entities = new_entities
    
    def generate_iterable(self):
        iterable = []
        
        string = ""
        #create new list of iterable entities
        iterable_entities = list()

        current_entity = [-1, -1, ""]
        for i in range(len(self.tokens)):
            current_token_start_index = len(string)
            current_token_end_index = current_token_start_index + len(self.tokens[i])

            string += self.tokens[i]+" "

            #if the current token is an entity
            for entity in self.entities:
                if entity.contains_index(i):
                    if current_entity[0] == -1:
                        current_entity = [current_token_start_index, current_token_end_index, entity.entity]
                    else:
                        current_entity[1] = current_token_end_index
                        current_entity[2] = entity.entity
                    #check if the current token is the last token of the entity
                    if entity.get_last_index() == i:
                        # print("Found entity: ", current_entity)
                        #print type of iterable_entities
                        iterable_entities.append(current_entity)
                        current_entity = [-1, -1, ""]
        
        iterable.append(string)
        iterable.append(iterable_entities)
        iterable.append(self.filename)
        return iterable
    
    #replaces the first entity with another one
    def replace_entity(self, replacement, new_tokens):
        entity_original = copy.deepcopy(self.entities[0])
        replacement_aug = copy.deepcopy(replacement)
        
        new_entity_length_diff = (len(replacement_aug.tokens_indices) - len(entity_original.tokens_indices))

        #start index of the replacement entity
        replacement_aug.tokens_indices[0] = entity_original.tokens_indices[0]
        #set each token index to the previous one + 1
        for i in range(len(replacement_aug.tokens_indices)):
            if i != 0:
                replacement_aug.tokens_indices[i] = replacement_aug.tokens_indices[i-1]+1
        self.is_augmented = True


        #remove the original tokens from the utterance
        self.tokens = copy.copy(self.tokens[:entity_original.tokens_indices[0]] + self.tokens[entity_original.get_last_index()+1:])

        #add the replacement tokens to the utterance
        self.tokens = self.tokens[:replacement_aug.tokens_indices[0]] + new_tokens + self.tokens[replacement_aug.tokens_indices[0]:]

        self.entities[0] = replacement_aug

        #update the indices of the other entities
        for i in range(1, len(self.entities)):
            for j in range(len(self.entities[i].tokens_indices)):
                self.entities[i].tokens_indices[j] += new_entity_length_diff
    
    def get_first_entity_tokens(self):
        return self.tokens[self.entities[0].tokens_indices[0]:self.entities[0].get_last_index()+1]

    def do_entities_overlap(self):
        for i in range(len(self.entities)):
            for j in range(i+1, len(self.entities)):
                if self.entities[i].does_overlap(self.entities[j]):
                    return True
        return False
            

    def create_from_tokens(self, utterance_tok):
        #matches any tag 
        
        entity = Entity([], "CALLSIGN")

        inside_tag = False
        for j,token in enumerate(utterance_tok):
            #check if token is a tag
            if re.match(regex_any_tag, token):
                detected_opening_tag = get_detected_opening_tag(token)
                if detected_opening_tag:
                    inside_tag = True
                    entity.entity = detected_opening_tag
                elif is_detected_closing_tag(token):
                    inside_tag = False
                    if len(entity.tokens_indices) > 0:
                        self.entities.append(copy.deepcopy(entity))
                        entity = Entity([], "CALLSIGN")
            else:
                #if token is not a tag
                self.tokens.append(token.lower())
                
                #if inside a tag add the token to the entity
                if inside_tag:
                    current_token_index = len(self.tokens)-1
                    entity.tokens_indices.append(current_token_index)
                #else if the entity is not empty add it to the utterance
                # else:
                    
                        

        #if an entity was left over add it to the utterance
        if len(entity.tokens_indices) > 0:
            self.entities.append(copy.deepcopy(entity))
            entity = Entity([], "CALLSIGN")

        self.connect_adjacent_entities()


def remove_spaces_from_ne_tags(utterance):
    return utterance.replace("[NE ", "[NE")

#pad the tags with spaces and tokenize the utterance
def tokenize(utterances_raw):
    """
    Tokenizes the utterance
    INPUT: List of pair [utterance (string),filename (string)]
    OUTPUT: List of pair [tokens (list of strings), filename (string)]    
    """
    utterances_tokenized = []
    for utterance in utterances_raw:
        #put space before and after tags
        utterance_text = utterance[0]
        utterance_text = re.sub(regex_any_tag, " \\g<0> ", utterance_text)
        
        utterance_text = remove_spaces_from_ne_tags(utterance_text)

        #split by whitespace
        tokens = utterance_text.split()

        utterances_tokenized.append([tokens, utterance[1]])

    return utterances_tokenized


def create_utterances(tokenized_utterances):
    """
    Creates the utterance objects
    INPUT: List of pair [tokens (list of strings), filename (string)]
    OUTPUT: List of Utterance objects
    """
    utterance_objects = []

    for i, utterance_tok_pair in enumerate(tokenized_utterances):
        
        filename = copy.deepcopy(utterance_tok_pair[1])
        utterance_tok = copy.deepcopy(utterance_tok_pair[0])
        
        utterance_obj = Utterance([], [], filename=filename)
        utterance_obj.create_from_tokens(utterance_tok)
        
        utterance_objects.append(utterance_obj)

    return utterance_objects
            

def get_callsigns(utterance_objects):
    """
    Gets the callsigns from the utterances
    INPUT: List of Utterance objects
    OUTPUT: List of pair [callsign (object), callsign_tokens (list of strings)]
    """
    callsigns = []
    for utterance in utterance_objects:
        if len(utterance.entities) > 0:
            if utterance.entities[0].entity != "CALLSIGN":
                continue
            callsign_obj = utterance.entities[0]
            callsign_tokens = utterance.get_first_entity_tokens()
            callsigns.append([callsign_obj, callsign_tokens])
    return callsigns


def create_iterables(utterance_objects):
    TRAIN_DATA = []
    """
    Creates the iterables for the training data
    INPUT: List of Utterance objects
    OUTPUT: List of iterables
    """
    for i,utterance in enumerate(utterance_objects):
        # if len(utterance.entities) == 0:
        #     continue
        iterable_utterance = utterance.generate_iterable()

        TRAIN_DATA.append(iterable_utterance)

    return TRAIN_DATA


def augment_utterances(utterances, callsigns):
    """
    Augments the utterances with the augmentations
    INPUT: List of Utterance objects, List of callsign pairs [callsign (object), callsign_tokens (list of strings)]
    OUTPUT: List of Utterance objects
    """
    augmented_utterances = []
    for utterance in utterances:
        if len(utterance.entities) == 0:
            continue
        
        replacement_callsign = random.choice(callsigns)
        utterance_aug = copy.deepcopy(utterance)
        utterance_aug.replace_entity(replacement_callsign[0], replacement_callsign[1])
        
        augmented_utterances.append(utterance_aug)

        if utterance_aug.do_entities_overlap():
            print("Overlap:", str(utterance_aug))

    return augmented_utterances


def iterables_to_DocBin(TRAIN_DATA, filenameDB):
    """
    Converts the iterables to a DocBin
    INPUT: List of iterables (utterances), filename (string)
    OUTPUT: DocBin written into <filename>.spacy
    """
    # the DocBin will store the documents
    import spacy
    from spacy.tokens import DocBin
    from spacy import displacy

    nlp = spacy.load("en_core_web_sm")

    db = DocBin(store_user_data=True)
    for text, annotations, filename in TRAIN_DATA:
        doc = nlp(text)
        ents = []
        for start, end, label in annotations:
            span = doc.char_span(start, end, label=label)
            ents.append(span)
        doc.ents = ents
        doc.user_data["filename"] = filename
        db.add(doc)
        # displacy.render(doc,jupyter=True, style = "ent")
    db.to_disk("./"+filenameDB+".spacy")


def create_huggingface_dataset(utterance_objects, filename):
    """
    Creates a huggingface dataset
    INPUT: List of Utterance objects, filename (string)
    OUTPUT: Dataset written into <filename>.csv
    """
    import pandas as pd
    import numpy as np

    df = pd.DataFrame(columns=["text", "entities"])
    for utterance in utterance_objects:
        df = df.append({"text": utterance.tokens, "entities": utterance.entities}, ignore_index=True)

    df.to_csv(filename+".csv", index=False, header=False)

utterances_raw = read_utterances_from_dir(input_output_name, AUGMENTATION_ENABLED)
tokenized_utterances = tokenize(utterances_raw)
utterance_objects = create_utterances(tokenized_utterances)

if AUGMENTATION_ENABLED:
    callsigns = get_callsigns(utterance_objects)
    utterance_objects += augment_utterances(utterance_objects, callsigns)

TRAIN_DATA = create_iterables(utterance_objects)
print("TRAIN_DATA COUNT: ", len(TRAIN_DATA))

iterables_to_DocBin(TRAIN_DATA, input_output_name)
# create_huggingface_dataset(utterance_objects, input_output_name)
# print(utterance_objects[0].tokens)