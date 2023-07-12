# NER
[UP](../README.md)
- Collection of files for working with NER models
- Author: Juraj Dedič

## Files

### data-conversion/ [link](data-conversion/README.md)
- Scripts needed for conversion to SpaCy DocBin
- Also JSON converter for other training pipelines

### bert_training.ipynb
- training of BERT model using HuggingFace

### bert_evaluation.ipynb
- evaluation for BERT / RoBERTa

### pytorch_roberta.ipynb
- training RoBERTa using PyTorch
- was not getting better results than BERT
- so not used anymore

### spacy_NER_eval.ipynb
- Evaluation of SpaCy NER model

### spacy_training.ipynb
- Training of SpaCy NER and SpanCat models
- The training config was changed many times but the best was described in the thesis

### spacyNER_to_SpanCat.ipynb
- The data formats for training NER and SpanCat models are different
- this file converts the data to train SpanCat

### spancat_eval.ipynb
- Evaluation of SpanCat model

## About
- JuPyter notebooks were used mostly to work with the models
- I personally don't have the hardware to train the models 
- Kaggle was used and it supports the Jupyter notebooks
- While working with the models there were tutorials used to help me create them (linked in the thesis)
- The first thing implemented was the data conversion script
- It converts the `XML` files with human transcripts to `SpaCy DocBin` 
- Next the spacy NER model was trained
- There were multiple iterations of the models and the datasets changed
- There were also models BERT & RoBERTa trained using Pytorch and HuggingFace,
- These models were not used later, because it was found out that the SpaCy NER pipeline outperformed them
- After that the SpaCy spancat model was trained
- And the detected classes changed to include also the commands and values