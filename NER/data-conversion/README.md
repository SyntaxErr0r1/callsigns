# Data conversion
[UP](../README.md)
- Author: Juraj Dedič
- This directory was used to convert the human transcript in the `XML` files into dataset format used for training

## Requirements
- Python packages: `bs4` 

## Running the script
You can run the script in following way
```sh
    python3 convert.py <input_dir> [True (if augmentation_enabled)]
```

## converter.py
- OOP seemed as a reasonable way to solve this
- The `converter.py` script reads the provided directory name and finds all `XML` files
- It then procceeds to extract the entities and assign them to the `Utterance` object which holds the `Entity` object.
- This way all the XML files are converted to the `Utterance` objects
- After that there are callsigns extracted from the sentences (the first callsign)
- Augmentation can be optionally performed in this step (Which did not increase the scores so it was not used later)
- After that the dataset is converted to iterable format which is then processed into `Spacy DocBin`
- The output `.spacy` file holding the dataset written in the same name is the input directory
- It also generates `.list` file of all the filenames of the original files used

## spacyToJSON.py
- this file converts the `DocBin .spacy` file to `JSON` for using it Pytorch 

## train/
- this directory is an example of most commonly used way of running the script
- simply runnig `python convert.py train` and the output was `train.spacy`