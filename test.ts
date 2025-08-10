
// 1. Test encoding process by encoding all Morse symbols
const toEncode = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
const expected = ".- -... -.-. -.. . ..-. --. .... .. .--- -.- .-.. -- -. --- .--. --.- .-. ... - ..- ...- .-- -..- -.-- --.. ----- .---- ..--- ...-- ....- ..... -.... --... ---.. ----."
let encoded = morse.encode(toEncode)
if(encoded!=expected) {
    serial.writeLine("Test 1a: Encoding failed!")
} else {
    serial.writeLine("Test 1a: Success!")
}
encoded = morse.encode(toEncode.toUpperCase())
if (encoded != expected) {
    serial.writeLine("Test 1b: Encoding failed!")
} else {
    serial.writeLine("Test 1b: Success!")
}

function randomWait(lower: number, upper: number) {
    let time = lower+(Math.random() * (upper-lower))
    basic.pause(time)
}

function keyDot() {
    let dotTime = morse.maxDotTime()
    morse.keyDown()
    randomWait(10, dotTime-10)
    morse.keyUp()
}

function keyDash() {
    let dotTime = morse.maxDotTime()
    let dashTime = morse.maxDashTime()
    morse.keyDown()
    randomWait(dotTime + 10, dashTime - 10)
    morse.keyUp()
}

function waitWithinLetter() {
    let symbolTime = morse.maxBetweenSymbolTime()
    randomWait(10, symbolTime-10)
}

function waitEndOfLetter() {
    let letterTime = morse.maxBetweenLetterTime()
    let symbolTime = morse.maxBetweenSymbolTime()
    randomWait(symbolTime + 10, letterTime - 10)
}

function waitEndOfWord() {
    let letterTime = morse.maxBetweenLetterTime()
    randomWait(letterTime + 10, 2*letterTime)
}


let expectedCodes: string = null
let expectedSequence: [string] = null
let expectedDitsDahs: [string] = null
let decodingSuccess = true
morse.onCodeSelected( function (code: string, sequence: string) {
    if(expectedCodes!=null && expectedCodes.length > 0) {
        let ec = expectedCodes.charAt(0)
         if(ec != code) {
            serial.writeLine("ERR: Expected " + ec + "got " + code)
            decodingSuccess = false
        } else {
            serial.writeLine("Success: Expected (" + ec + ") got (" + code + ")")
        }
        expectedCodes = expectedCodes.substr(1)
    }
    if (expectedSequence != null && expectedSequence.length > 0) {
        let es = expectedSequence.get(0)
        if (es != sequence) {
            serial.writeLine("ERR: Expected (" + es + ") got (" + sequence + ")")
        }
        expectedSequence.shift()
    }
})

morse.setMaxDurationDotDash(50, 400)
morse.setMaxSilenceBetweenSymbolsLetters(400, 800)

serial.writeLine("Test 2:")
let toSend = ".- -... -.-. -.. . ..-. --. .... .. .--- -.- .-.. -- -. --- .--. --.- .-. ... - ..- ...- .-- -..- -.-- --.. ----- .---- ..--- ...-- ....- ..... -.... --... ---.. ----."
expectedCodes = "A B C D E F G H I J K L M N O P Q R S T U V W X Y Z 0 1 2 3 4 5 6 7 8 9"
decodingSuccess = true
for(let i = 0;i<toSend.length;i++) {
    serial.writeString(toSend.charAt(i))
    switch(toSend.charAt(i)) {
        case ".": keyDot();    break;
        case "-": keyDash();   break;
        case " ": waitEndOfWord(); serial.writeLine(""); break;
    }
    if(i<toSend.length-1 && toSend.charAt(i) != " ") {
        waitWithinLetter()
    }
}

// Wait for end of test / timeouts 
for(let i=0;i<5;i++) {
    waitEndOfWord()
}

if (decodingSuccess!=true) {
    serial.writeLine("Test 2 Failed. Remaining codes:")
    serial.writeLine(expectedCodes)
} else {
    serial.writeLine("Test 2 Passed")
}
