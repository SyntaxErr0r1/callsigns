/**
 * @author Juraj Dedič, xdedic07
 * File for generating variations of the callsigns
 */


import { airlines } from './airlines.js';

const phoneticMapLetters = {
    "A": "alpha",
    "A": "alfa",
    "B": "bravo",
    "C": "charlie",
    "D": "delta",
    "E": "echo",
    "F": "foxtrot",
    "G": "golf",
    "H": "hotel",
    "I": "india",
    "J": "juliet",
    "K": "kilo",
    "L": "lima",
    "M": "mike",
    "N": "november",
    "O": "oscar",
    "P": "papa",
    "Q": "quebec",
    "R": "romeo",
    "S": "sierra",
    "T": "tango",
    "U": "uniform",
    "V": "victor",
    "W": "whiskey",
    "X": "x-ray",
    "Y": "yankee",
    "Z": "zulu"
}



/**
 * Generates variations of the callsign
 * @param {*} csgShort string of the callsign ie. "UAE2666"
 * @returns array of variations (each is array of tokens)
 */
function generateVariations(csgShort){
    let variationsObj = convertToVariations(csgShort);
    
    let variations = connectVariations(variationsObj.airline, variationsObj.phonetic, variationsObj.numericVariations);
    return variations;
}

/**
 * 
 * @param {*} callsignShort 
 * @returns object {airline, phonetic, numericVariations }
 */
function convertToVariations(callsignShort) {
    let resultVariations = [];
    let phonetic = [];
    
    //get first 3 letters and try to convert throug airlineCallsigns
    let first3Letters = callsignShort.substring(0, 3).toUpperCase();
    let airline = airlines.find(x => x["ICAO"] == first3Letters);

    let numericVariations = [];
    let currentNumeric = "";
    let isNumeric = false;

    for (let i = 0; i < callsignShort.length; i++) {
        let letter = callsignShort[i];
        if(phoneticMapLetters[letter]){
            if(isNumeric){
                numericVariations = generateNumericVariations(currentNumeric);
                phonetic.push(-1)
                isNumeric = false;
            }
            phonetic.push(phoneticMapLetters[letter]);
        }else{
            isNumeric = true;
            currentNumeric += letter;
            // variations.push(letter);
        }
    }

    if(currentNumeric && numericVariations.length == 0){
        numericVariations = generateNumericVariations(currentNumeric);
    }
    
    return {
        airline: airline?.callsign || null,
        phonetic,
        numericVariations
    };
}

/**
 * Replaces item at index with the items array
 */
function replaceItemAtIndex(array,index,items){
    let left = array.slice(0,index)
    let right = array.slice(index+1)
    let final = left.concat(items).concat(right)
    return final
}

/**
 * Generates variations of the various
 * @param {*} airline airline callsign string
 * @param {*} phonetic phonetic version array of the non-numeric part (-1 is the numeric placeholder)
 * @param {*} numeric variations (each is array of tokens) of the numeric part of the callsign
 */
function connectVariations(airline, phonetic, numeric){
    let variationsList = [];
    airline = airline?.toLowerCase().split(" ");
    if(numeric){
        variationsList = numeric.map(numericVariation => {
            let numericTokens = numericVariation.split(" ");
            let numericIndex = phonetic.indexOf(-1);
            if(numericIndex != -1){
                //replace the -1 with the numeric part
                return replaceItemAtIndex(phonetic, numericIndex, numericTokens);
            }else{
                //add the numeric part to the end
                return phonetic.concat(numericTokens);
            }
        });

    }else{
        variationList = phonetic;
    }

    if(airline && airline.length > 0){
        
        let airlineVariationsList = variationsList.map(variation => {
            //airline + variation (from the 3rd index)
            variation = variation.slice(3);
            variation = airline.concat(variation);
            return variation;
        });
        variationsList = variationsList.concat(airlineVariationsList);

        if(airline.length > 1){
            //add the airline as one token together
            let airlineVariationsList = variationsList.map(variation => {
                variation = variation.slice(3);
                variation = [airline.join(" ")].concat(variation);
                return variation;
            });
            variationsList = variationsList.concat(airlineVariationsList);
        }
    }

    if(variationsList.length == 0){
        if(airline)
            variationsList.push(airline);
        variationsList.push(phonetic);
    }

    return variationsList;
}

/**
 * Gets more ways to spell the numeric part of the string
 * @param {*} numericStr
 * @returns array of phonetic values 
 * @example 2666 -> [Two Six Six Six, Twenty Six Six Six, Two Six Sixty Six, Twenty Six Sixty Six]
 */
const order1 = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine"];
const orderTeen = ["ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen"];
const order10 = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];
function generateNumericVariations(numericStr){
    let variations = [];
    numericStr = String(numericStr);
    let numeric = parseInt(numericStr);
    let numericStrLen = numericStr.length;

    let zeroVariation = "";
    //the zero-th variation is order1 of each digit
    for (let i = 0; i < numericStrLen; i++) {
        let digit = order1[numericStr[i]];
        zeroVariation += " "+digit;
    }
    arrayAddVariation(variations, zeroVariation.trim());

    /*if(numericStrLen == 1){
        arrayAddVariation(variations, order1[numeric]);
    }else*/ if(numericStrLen == 2){
        if(numeric > 9)
            arrayAddVariation(variations, twoDigitStr(numericStr));
    }else if(numericStrLen == 3){
        let first = numericStr[0];
        let second = numericStr[1];
        let third = numericStr[2];

        let first2 = twoDigitStr(first + second);
        let last2 = twoDigitStr(second + third);
        arrayAddVariation(variations, first2 + " " + order1[third]);
        arrayAddVariation(variations, order1[first] + " " + last2);
    }else if(numericStrLen == 4){
        let first = numericStr[0];
        let second = numericStr[1];
        let third = numericStr[2];
        let fourth = numericStr[3];

        //push recursive
        let first2 = twoDigitStr(first + second);
        let second2 = twoDigitStr(second + third);
        let last2 = twoDigitStr(third + fourth);

        if(third + fourth == "00"){
            arrayAddVariation(variations, first2 + " hundred");
        }

        arrayAddVariation(variations, first2 + " " + order1[third] + " " + order1[fourth]);
        arrayAddVariation(variations, order1[first] + " " + second2 + " " + order1[fourth]);
        arrayAddVariation(variations, order1[first] + " " + order1[second] + " " + last2);
        arrayAddVariation(variations, first2 + " " + last2);
    }
    return variations;
}

function arrayAddVariation(array, variation){
    if(array.indexOf(variation) == -1)
        array.push(variation);
    return array;
}

/**
 * 
 * @param {*} numericStr String of 2 digits 
 * @returns String of phonetic value
 */
function twoDigitStr(numericStr){
    let numeric = parseInt(numericStr);
    if(numeric < 10){
        if(numericStr.length > 1 && numericStr[0] == 0){
            return "zero "+order1[numeric];
        }
        return order1[numeric];
    }
    if(numeric < 20){
        return orderTeen[numeric - 10];
    }else{
        let first = numericStr[0];
        let second = numericStr[1];
        if(second == 0){
            return order10[first];
        }
        return order10[first] + " " + order1[second];
    }
}

// console.log(generateVariations("RYR23K"));

// console.log(generateNumericVariations("7219"));

// console.log(generateVariations("POL27"));

// console.log(generateVariations("QLK180"));

// console.log(generateVariations("QJE1900"));

export { generateVariations };