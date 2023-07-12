"""
Author: Juraj Dedič, xdedic07
This script calculates the WER for the given folder with .JSON files version of the dataset
"""


from jiwer import wer
import os
import json
import re
import sys


def normalize(text):
    text = text.lower().replace("alpha", "alfa").replace("juliett", "juliet").replace("niner", "nine").replace("ryan air", "ryanair")
    text = re.sub(r'_([a-z])_', r'\1', text)
    text = text.replace("_", " ")
    return text

def print_help():
    print("Usage: python WER.py <path_to_acc8_folder> <prefix_filter>")
    print("Example: python WER.py acc8/ LKPR")

if len(sys.argv) < 2: 
    print_help()
    exit()

# get the path to the acc9 folder
path = sys.argv[1]

# get the prefix filter
if len(sys.argv) >= 3:
    prefix_filter = sys.argv[2]
else:
    prefix_filter = None

count = 0
wer_sum = 0
# list all files in acc8 folder
for file in os.listdir(path):
    
    if prefix_filter is not None:
        if not file.startswith(prefix_filter):
            continue
        
    if file.endswith(".json"):
        sys.stdout.flush()
        print(os.path.join(path, file + "            "), end='\r')
        # open file
        with open(os.path.join(path, file)) as f:
            # read the json file
            data = json.load(f)
            # get the segment array
            segments = data["segments"]
            
            # loop through the segments
            for segment in segments:
                text = segment["text"]
                cnet_text = segment["cnetText"]

                norm_text = normalize(text)

                # cnet text is a list of lists of words
                # get the first list for each item
                cnet = [item[0]["t"] for item in cnet_text if item[0]["t"] != "<eps>"]
                cnet_text = " ".join(cnet)
                norm_cnet = normalize(cnet_text)
                
                error = wer(norm_text, norm_cnet)
                # print(error)
                wer_sum += error
                count += 1


                if(error > 0):
                    print("---------")
                    print("normalized text: ", norm_text)
                    print("normalized cnet: ", norm_cnet)
                    print("WER: ", error)

    # if count == 10:
    #     break

print("\n")
print("Segment count: ", count)
print("Average WER: ", wer_sum/count)
        