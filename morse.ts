//% color=#6a8694
//% icon="\uf141"
//% block="摩斯電碼"
//% groups="['按鍵', '解碼', '編碼', '進階']"
namespace morse {

    export enum Silence {
        //% block="字母間間隔"
        InterLetter = 3,
        //% block="字詞間間隔"
        InterWord = 7,
        //% block="點與點間間隔"
        Small = 0,
    }
        
    const DOT = 1
    const DASH = 2
    const DOT_CHAR = "."
    const DASH_CHAR = "-"  
    const morseTree = "?ETIANMSURWDKGOHVF?L?PJBXCYZQ??54?3???2??+????16=/?????7???8?90?"
    const MAX_STATE = morseTree.length-1
    const START_STATE = 0
    const ERROR_CODE = '?'
    const UPDATE_INTERVAL = 100 // ms to check for updates
    const MAX_SEQUENCE_LENGTH = 7

    // Current position in Morse tree
    let state = START_STATE
    let sequence = ""
    let codeSelectHandler: (code: string, sequence: string) => void = null

    // State variables for timing of keying in new symbols
    let _maxDotTime = 200 // ms 
    let _maxDashTime = 1000 // ms
    let _maxBetweenSymbolsTime = 500 // ms
    let _maxBetweenLettersTime = 2000 // ms

    let keyDownEvent : number = null
    let keyUpEvent : number = null
    let keyLastUpEvent : number = null
    let symbolHandler: (sym: string) => void = null

    /**
     * The "key" to enter a Morse character has been pressed
     */
    //% blockId=keyDown block="按鍵按下"
    //% group="按鍵"
    //% weight=900
    export function keyDown() {
        const now = control.millis()

        if (keyUpEvent != null) {
            const duration = now - keyUpEvent
            // Check for word spacing
            if(duration > _maxBetweenSymbolsTime) {
                silence(Silence.InterLetter)
            }
        }
        keyUpEvent = null
        keyLastUpEvent = null
        keyDownEvent = now
    }

    /**
     * The "key" to enter a Morse character has been released
     */
    //% blockId=keyUp block="按鍵放開"
    //% group="按鍵"
    //% weight=875
    export function keyUp() {
        const now = control.millis()
        // Process how long the key was down 
        if (keyDownEvent != null) {
            const duration = now - keyDownEvent
            if (duration <= _maxDotTime) {
                dot()
            } else if (duration > _maxDotTime && duration < _maxDashTime) {
                dash()
            } else { // > _maxDashTime 
                // Invalid duration; Reset this symbol 
                resetDecoding()
                resetTiming()
            }
        }
        keyDownEvent = null
        keyUpEvent = now
        keyLastUpEvent = now
    }
    
    /**
     * Set the length of time for a "dot" and "dash" in milliseconds (10ms-5000ms)
     * The max dash time will always be at least twice the dot time.
     * A dash will be any key hold between 10ms and the max dot time.  A dash will be anything greater than the dot time and less than the max dash time.
     * Values greater than the max dash time will "reset" the state of decoding.
     */
    //% blockId=setMaxDurationDotDash block="設定點長度為 $dotTime 毫秒，劃長度為 $dashTime 毫秒" 
    //% advanced=true
    //% group="按鍵"
    //% inlineInputMode=external
    //% weight=870
    //% dotTime.defl=200 dotTime.min=10 dotTime.max=5000
    //% dashTime.defl=1000 dashTime.min=10 dashTime.max=15000
    export function setMaxDurationDotDash(dotTime: number, dashTime: number) {
        // Minimum time of 100ms
        _maxDotTime = Math.constrain(dotTime, 1, 5000)
        _maxDashTime = Math.constrain(dashTime, 2*_maxDotTime, 15000)
    }

    /**
     * The maximum length of time for a "dot" in milliseconds (1-5000ms)
     */
    //% block="最大點長度 (毫秒)" 
    //% group="按鍵"
    //% advanced=true
    //% weight=860
    export function maxDotTime() : number {
        // Minimum time of 100ms
        return _maxDotTime
    }

    /**
     * The maximum length of time for a "dash" in milliseconds (2*max dot time-15000ms)
     */
    //% block="最大劃長度 (毫秒)" 
    //% group="按鍵"
    //% advanced=true
    //% weight=850
    export function maxDashTime(): number {
        return _maxDashTime
    }


    /**
     * Set the length of time for a silence events in milliseconds. The time between letters will always be at least the time between symbols.
    */
    //% blockId=setMaxSilenceBetweenSymbolsLetters block="設定符號間最大停頓時間 $symbolTime 毫秒，字母間最大停頓時間 $letterTime 毫秒" 
    //% advanced=true
    //% group="按鍵"
    //% weight=840
    //% inlineInputMode=external
    //% symbolTime.defl=500 symbolTime.min=10 symbolTime.max=5000
    //% letterTime.defl=2000 letterTime.min=10 letterTime.max=15000
    export function setMaxSilenceBetweenSymbolsLetters(symbolTime: number, letterTime: number) {
        _maxBetweenSymbolsTime = Math.constrain(symbolTime, 1, 5000)
        _maxBetweenLettersTime = Math.constrain(letterTime, _maxBetweenSymbolsTime, 15000)
    }

    /**
     * The maximum length of time between symbols  (dots/dashes) in milliseconds
     */
    //% block="最大符號間停頓時間 (毫秒)" 
    //% group="按鍵"
    //% advanced=true
    //% weight=830
    export function maxBetweenSymbolTime(): number {
        return _maxBetweenSymbolsTime
    }

    /**
     * The maximum length of time between letters of a word in milliseconds
     */
    //% block="最大字母間停頓時間 (毫秒)" 
    //% group="按鍵"
    //% advanced=true
    //% weight=820
    export function maxBetweenLetterTime(): number {
        return _maxBetweenLettersTime
    }


    /**
     * Reset timing for key up/down
     */
    //% blockId=resetTiming block="重設計時"
    //% group="按鍵" advanced=true
    //% weight=810
    export function resetTiming() {
        keyDownEvent = null
        keyUpEvent = null
        keyLastUpEvent = null
    }

    /**
     *  Respond to a new symbol
     */
    //% blockId=onNewSymbol block="當輸入新符號 $newSymbol 時"
    //% group="按鍵"
    //% draggableParameters
    //% advanced=true
    //% weight=800
    export function onNewSymbol(handler: (newSymbol: string) => void) {
        symbolHandler = handler
    }

    /**
     *  Respond to a completed code for a character (includes the sequences of dots/dashes). Code will be an underscore (_) when words are completed. 
     */
    //% blockId=onCodeSelected block="當 $code ($sequence) 被解碼完成"
    //% group="解碼"
    //% draggableParameters
    //% weight=775
    export function onCodeSelected(handler: (code: string, sequence: string) => void) {
        codeSelectHandler = handler
    }

    /**
     * Record a complete dot
     */
    //% blockId=dot block="點"
    //% group="解碼"
    //% advanced=true
    //% weight=950
    export function dot() {
        state = Math.min(2 * state + DOT, MAX_STATE)
        if (sequence.length < MAX_SEQUENCE_LENGTH) {
            sequence += DOT_CHAR
        }
        if(symbolHandler != null) {
            symbolHandler(".")
        }
    }

    /**
     * Record a complete dash
     */
    //% blockId=dash block="劃"
    //% group="解碼"
    //% advanced=true
    //% weight=925
    export function dash() {
        state = Math.min(2 * state + DASH, MAX_STATE)
        if (sequence.length < MAX_SEQUENCE_LENGTH) {
            sequence += DASH_CHAR
        }
        if (symbolHandler != null) {
            symbolHandler("-")
        }
    }

    /**
     * Record a silence of some sort (between characters or words)
     */
    //% blockId=silence block="停頓 %kind"
    //% kind.defl=Silence.InterLetter
    //% group="解碼"
    //% advanced=true
    //% weight=900
    export function silence(kind?: Silence) {

        // Ignore small silences (between symbols of code)
        if (kind == null || kind == Silence.Small) {
            return;
        }

        if (symbolHandler != null) {
            switch(kind) {
                case Silence.InterWord:
                    symbolHandler(" ")
                    break
                case Silence.InterLetter:
                default:
                    symbolHandler("")
                    break
            }
        }

        // Process code: Send " " for end of word/transmission.
        if (codeSelectHandler != null) {
            if(kind == Silence.InterWord) {
                codeSelectHandler(" ", "")
            } else {
                const code = morseTree.charAt(state)
                codeSelectHandler(code, sequence)
            }
        }
        resetDecoding()
    }

    /**
     * Reset processing of a dot/dash/silence sequence
     */
    //% blockId=resetDecoding block="重設解碼狀態"
    //% group="解碼"
    //% advanced=true
    //% weight=675
    export function resetDecoding() {
        state = START_STATE
        sequence = ""
    }  

    /**
       * Peek at the code that would be chosen from the current sequence if there is a sufficient silence
       */
    //% blockId=peekCode block="檢視目前解碼"
    //% group="解碼"
    //% advanced=true
    //% weight=820
    export function peekCode(): string {
        return morseTree.charAt(state);
    }

    /**
     * Peek at the sequence of dots/dashes that is currently entered. 
     * 
     */
    //% blockId=peekSequence block="檢視目前符號序列"
    //% group="解碼"
    //% advanced=true
    //% weight=810
    export function peekSequence(): string {
        return sequence;
    }

    // Find the code for a single character 
    // Length of string must be exactly 1
    // Returns null for invalid characters
    function encodeChar(character: string) : string {
        if (character.length != 1) {
            return null
        }
        // Upper case it
        character = character.toUpperCase()
        let start = morseTree.indexOf(character.charAt(0))
        if(start==-1) {
            return ERROR_CODE
        }
        let code = ""
        while(start>0) {
            // Odds represent dots
            if(start%2==1) {
                code = DOT_CHAR + code
            } else {
                code = DASH_CHAR + code
            }
            start = Math.idiv(start-1, 2)
        }
        return code
    }

    /**
     * Encode the given characters to morse code.
     * @return string of dots, dashes, silences (between chars), _ (between words), "?" (invalid character for Morse Code), and newlines (for newlines).
     */
    //% blockId=encode block="編碼 $characters 為摩斯電碼"
    //% group="編碼"
    //% weight=500
    export function encode(characters: string) : string {
        let result = ""
        let lastC = null
        for(let c of characters) {
            switch(c) {
                case " ":
                    result += "_"
                break;
                case "\n":
                    result += c
                break;
                default: 
                    // Silence between any real characters
                    if(lastC!=null && lastC!=" " && lastC!="\n") {
                        result += " " 
                    }
                    result += encodeChar(c)
            }
            lastC = c
        }
        return result
    }

    loops.everyInterval(UPDATE_INTERVAL, function () {
        // Check for silences / dones (no key pressed for a bit)
        const now = control.millis()
        if(keyUpEvent!=null) {
            const duration = now - keyUpEvent
            // Weed out any start states / empty codes (blips)
            if(state != START_STATE) {
                // Check for letter completion
                if (duration > _maxBetweenSymbolsTime) {
                    silence(Silence.InterLetter)
                    keyUpEvent = null
                }
            }
        }
        if(keyLastUpEvent != null) {
            const duration = now - keyLastUpEvent
            if (duration > _maxBetweenLettersTime) {
                silence(Silence.InterWord)
                keyLastUpEvent = null
            } 
        }
    })
}
