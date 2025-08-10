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
    const UPDATE_INTERVAL = 100 // 檢查更新間隔(ms)
    const MAX_SEQUENCE_LENGTH = 7

    // 目前在摩斯樹的位置
    let state = START_STATE
    let sequence = ""
    let codeSelectHandler: (code: string, sequence: string) => void = null

    // 按鍵符號輸入計時參數
    let _maxDotTime = 200 // 點的最大時間(ms)
    let _maxDashTime = 1000 // 劃的最大時間(ms)
    let _maxBetweenSymbolsTime = 500 // 符號間最大停頓(ms)
    let _maxBetweenLettersTime = 2000 // 字母間最大停頓(ms)

    let keyDownEvent : number = null
    let keyUpEvent : number = null
    let keyLastUpEvent : number = null
    let symbolHandler: (sym: string) => void = null

    /**
     * 按鍵按下事件
     */
    //% blockId=keyDown block="按鍵按下"
    //% group="按鍵"
    //% weight=900
    export function keyDown() {
        const now = control.millis()

        if (keyUpEvent != null) {
            const duration = now - keyUpEvent
            // 超過符號間停頓視為字母間停頓
            if(duration > _maxBetweenSymbolsTime) {
                silence(Silence.InterLetter)
            }
        }
        keyUpEvent = null
        keyLastUpEvent = null
        keyDownEvent = now
    }

    /**
     * 按鍵放開事件
     */
    //% blockId=keyUp block="按鍵放開"
    //% group="按鍵"
    //% weight=875
    export function keyUp() {
        const now = control.millis()
        if (keyDownEvent != null) {
            const duration = now - keyDownEvent
            if (duration <= _maxDotTime) {
                dot()
            } else if (duration > _maxDotTime && duration < _maxDashTime) {
                dash()
            } else {
                // 無效時間，重設狀態
                resetDecoding()
                resetTiming()
            }
        }
        keyDownEvent = null
        keyUpEvent = now
        keyLastUpEvent = now
    }
    
    /**
     * 設定點和劃的最大持續時間 (ms)
     */
    //% blockId=setMaxDurationDotDash block="設定點長度為 $dotTime 毫秒，劃長度為 $dashTime 毫秒" 
    //% advanced=true
    //% group="按鍵"
    //% inlineInputMode=external
    //% weight=870
    //% dotTime.defl=200 dotTime.min=10 dotTime.max=5000
    //% dashTime.defl=1000 dashTime.min=10 dashTime.max=15000
    export function setMaxDurationDotDash(dotTime: number, dashTime: number) {
        _maxDotTime = Math.constrain(dotTime, 1, 5000)
        _maxDashTime = Math.constrain(dashTime, 2*_maxDotTime, 15000)
    }

    /**
     * 取得最大點時間 (ms)
     */
    //% block="最大點長度 (毫秒)" 
    //% group="按鍵"
    //% advanced=true
    //% weight=860
    export function maxDotTime() : number {
        return _maxDotTime
    }

    /**
     * 取得最大劃時間 (ms)
     */
    //% block="最大劃長度 (毫秒)" 
    //% group="按鍵"
    //% advanced=true
    //% weight=850
    export function maxDashTime(): number {
        return _maxDashTime
    }

    /**
     * 設定符號及字母間最大停頓時間 (ms)
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
     * 取得符號間最大停頓時間 (ms)
     */
    //% block="最大符號間停頓時間 (毫秒)" 
    //% group="按鍵"
    //% advanced=true
    //% weight=830
    export function maxBetweenSymbolTime(): number {
        return _maxBetweenSymbolsTime
    }

    /**
     * 取得字母間最大停頓時間 (ms)
     */
    //% block="最大字母間停頓時間 (毫秒)" 
    //% group="按鍵"
    //% advanced=true
    //% weight=820
    export function maxBetweenLetterTime(): number {
        return _maxBetweenLettersTime
    }

    /**
     * 重設按鍵計時狀態
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
     * 新符號輸入事件 (點或劃)
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
     * 字元解碼完成事件，包含點劃序列。字詞間用底線(_)表示。
     */
    //% blockId=onCodeSelected block="當 $code ($sequence) 被解碼完成"
    //% group="解碼"
    //% draggableParameters
    //% weight=775
    export function onCodeSelected(handler: (code: string, sequence: string) => void) {
        codeSelectHandler = handler
    }

    /**
     * 記錄一個點
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
     * 記錄一個劃
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
     * 停頓事件（字母間或字詞間）
     */
    //% blockId=silence block="停頓 %kind"
    //% kind.defl=Silence.InterLetter
    //% group="解碼"
    //% advanced=true
    //% weight=900
    export function silence(kind?: Silence) {

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
     * 重設解碼狀態
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
       * 查看目前解碼結果
       */
    //% blockId=peekCode block="檢視目前解碼"
    //% group="解碼"
    //% advanced=true
    //% weight=820
    export function peekCode(): string {
        return morseTree.charAt(state);
    }

    /**
     * 查看目前點劃序列
     */
    //% blockId=peekSequence block="檢視目前符號序列"
    //% group="解碼"
    //% advanced=true
    //% weight=810
    export function peekSequence(): string {
        return sequence;
    }

    // 找出單一字元的摩斯碼，無效字元回傳 '?'
    function encodeChar(character: string) : string {
        if (character.length != 1) {
            return null
        }
        character = character.toUpperCase()
        let start = morseTree.indexOf(character.charAt(0))
        if(start==-1) {
            return ERROR_CODE
        }
        let code = ""
        while(start>0) {
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
     * 將字串編碼為摩斯電碼，回傳由點、劃、停頓符號組成的字串
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
        const now = control.millis()
        if(keyUpEvent!=null) {
            const duration = now - keyUpEvent
            if(state != START_STATE) {
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
