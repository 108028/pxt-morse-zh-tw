//% color=#6a8694
//% icon="\uf141"
//% block="摩斯密碼"
//% groups="['按鍵輸入', '解碼', '編碼', '進階功能']"
namespace morse {

    export enum Silence {
        //% block="字母間隔"
        InterLetter = 3,
        //% block="字詞間隔"
        InterWord = 7,
        //% block="短劃間隔"
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
    const UPDATE_INTERVAL = 100 // 每100毫秒看看有沒有新動作
    const MAX_SEQUENCE_LENGTH = 7

    // 目前在摩斯樹的位置
    let state = START_STATE
    let sequence = ""
    let codeSelectHandler: (code: string, sequence: string) => void = null

    // 計時參數，控制短劃和長劃的長短還有停頓時間
    let _maxDotTime = 200
    let _maxDashTime = 1000
    let _maxBetweenSymbolsTime = 500
    let _maxBetweenLettersTime = 2000

    let keyDownEvent : number = null
    let keyUpEvent : number = null
    let keyLastUpEvent : number = null
    let symbolHandler: (sym: string) => void = null

    /**
     * 按鍵按下了，開始計時
     */
    //% blockId=keyDown block="按鍵按下"
    //% group="按鍵輸入"
    //% weight=900
    export function keyDown() {
        const now = control.millis()

        if (keyUpEvent != null) {
            const duration = now - keyUpEvent
            // 停頓超過符號間隔？那就是字母之間囉
            if(duration > _maxBetweenSymbolsTime) {
                silence(Silence.InterLetter)
            }
        }
        keyUpEvent = null
        keyLastUpEvent = null
        keyDownEvent = now
    }

    /**
     * 按鍵放開了，根據按的時間判斷短劃或長劃
     */
    //% blockId=keyUp block="按鍵放開"
    //% group="按鍵輸入"
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
                // 按太久了，可能按錯了，就重頭開始吧
                resetDecoding()
                resetTiming()
            }
        }
        keyDownEvent = null
        keyUpEvent = now
        keyLastUpEvent = now
    }
    
    /**
     * 想調整短劃和長劃的長度嗎？這邊可以設定喔
     */
    //% blockId=setMaxDurationDotDash block="設定「短劃」最大長度 $dotTime 毫秒，「長劃」最大長度 $dashTime 毫秒" 
    //% advanced=true
    //% group="按鍵輸入"
    //% inlineInputMode=external
    //% weight=870
    //% dotTime.defl=200 dotTime.min=10 dotTime.max=5000
    //% dashTime.defl=1000 dashTime.min=10 dashTime.max=15000
    export function setMaxDurationDotDash(dotTime: number, dashTime: number) {
        _maxDotTime = Math.constrain(dotTime, 1, 5000)
        _maxDashTime = Math.constrain(dashTime, 2*_maxDotTime, 15000)
    }

    /**
     * 最大「短劃」時間（毫秒）
     */
    //% block="最大「短劃」時間 (毫秒)" 
    //% group="按鍵輸入"
    //% advanced=true
    //% weight=860
    export function maxDotTime() : number {
        return _maxDotTime
    }

    /**
     * 最大「長劃」時間（毫秒）
     */
    //% block="最大「長劃」時間 (毫秒)" 
    //% group="按鍵輸入"
    //% advanced=true
    //% weight=850
    export function maxDashTime(): number {
        return _maxDashTime
    }

    /**
     * 想調整符號之間和字母之間停頓多久？這裡可以設定
    */
    //% blockId=setMaxSilenceBetweenSymbolsLetters block="設定符號間最大停頓 $symbolTime 毫秒，字母間最大停頓 $letterTime 毫秒" 
    //% advanced=true
    //% group="按鍵輸入"
    //% weight=840
    //% inlineInputMode=external
    //% symbolTime.defl=500 symbolTime.min=10 symbolTime.max=5000
    //% letterTime.defl=2000 letterTime.min=10 letterTime.max=15000
    export function setMaxSilenceBetweenSymbolsLetters(symbolTime: number, letterTime: number) {
        _maxBetweenSymbolsTime = Math.constrain(symbolTime, 1, 5000)
        _maxBetweenLettersTime = Math.constrain(letterTime, _maxBetweenSymbolsTime, 15000)
    }

    /**
     * 最大符號停頓時間
     */
    //% block="最大符號間停頓 (毫秒)" 
    //% group="按鍵輸入"
    //% advanced=true
    //% weight=830
    export function maxBetweenSymbolTime(): number {
        return _maxBetweenSymbolsTime
    }

    /**
     * 最大字母停頓時間
     */
    //% block="最大字母間停頓 (毫秒)" 
    //% group="按鍵輸入"
    //% advanced=true
    //% weight=820
    export function maxBetweenLetterTime(): number {
        return _maxBetweenLettersTime
    }

    /**
     * 重設按鍵計時，從頭開始
     */
    //% blockId=resetTiming block="重設計時"
    //% group="按鍵輸入" advanced=true
    //% weight=810
    export function resetTiming() {
        keyDownEvent = null
        keyUpEvent = null
        keyLastUpEvent = null
    }

    /**
     * 新輸入符號事件，會傳入「短劃」或「長劃」
     */
    //% blockId=onNewSymbol block="輸入新符號 $newSymbol"
    //% group="按鍵輸入"
    //% draggableParameters
    //% advanced=true
    //% weight=800
    export function onNewSymbol(handler: (newSymbol: string) => void) {
        symbolHandler = handler
    }

    /**
     * 字元解碼完成的事件，會告訴你解到哪個字和符號序列
     */
    //% blockId=onCodeSelected block="解碼完成 $code ($sequence)"
    //% group="解碼"
    //% draggableParameters
    //% weight=775
    export function onCodeSelected(handler: (code: string, sequence: string) => void) {
        codeSelectHandler = handler
    }

    /**
     * 記錄一個「短劃」
     */
    //% blockId=dot block="輸入「短劃」"
    //% group="解碼"
    //% advanced=true
    //% weight=950
    export function dot() {
        state = Math.min(2 * state + DOT, MAX_STATE)
        if (sequence.length < MAX_SEQUENCE_LENGTH) {
            sequence += DOT_CHAR
        }
        if(symbolHandler != null) {
            symbolHandler("\".\"")
        }
    }

    /**
     * 記錄一個「長劃」
     */
    //% blockId=dash block="輸入「長劃」"
    //% group="解碼"
    //% advanced=true
    //% weight=925
    export function dash() {
        state = Math.min(2 * state + DASH, MAX_STATE)
        if (sequence.length < MAX_SEQUENCE_LENGTH) {
            sequence += DASH_CHAR
        }
        if (symbolHandler != null) {
            symbolHandler("\"-\"")
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
     * 重設解碼狀態，從頭開始唷
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
       * 看看目前解到什麼了
       */
    //% blockId=peekCode block="看目前解碼"
    //% group="解碼"
    //% advanced=true
    //% weight=820
    export function peekCode(): string {
        return morseTree.charAt(state);
    }

    /**
     * 看看目前符號序列長什麼樣
     */
    //% blockId=peekSequence block="看目前符號序列"
    //% group="解碼"
    //% advanced=true
    //% weight=810
    export function peekSequence(): string {
        return sequence;
    }

    // 找單一字的摩斯密碼，找不到就回傳問號
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
     * 把字串轉成摩斯密碼，回傳點、劃和停頓的組合
     */
    //% blockId=encode block="編碼 $characters 成摩斯密碼"
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
