```package
morse=github:bsiever/pxt-morse
```

```package
clicks=github:bsiever/microbit-pxt-clicks
```

# Morse Code: Keying-in, Decoding, and Encoding

This extension can decode and encode dots/dashes of Morse Code as well as manage the detection of keying-in of Morse code. 

* There are three major components to this extension:
  * [Keying](#morse-keying)-detection, which will convert a set of key presses (key up and key down) into the major symbols used in morse code:  dots, dashes, and silences between key presses.  Keys presses and releases must be carefully timed to be detected. 
  * [Decoding](#morse-decoding) a sequence representing dots, dashes, and silences into a symbol (letter or number) based on Morse code. 
  * [Encoding](#morse-encoding) a sequence of letters or numbers into symbols that represent the sequence of dots and dashes needed to send those letters via Morse code.

The term "dit" is sometimes used rather than dot. And "dah" rather than dash.

# Keying #morse-keying

"Keying" refers to keying in the dots, dashes, and the important silences that occur.    The keying blocks, ``[morse.keyDown()]`` and ``[morse.keyUp()]``, are used to indicate when a key is pressed and released.  Key presses and releases will automatically be decoded, first to dots and dashes and then, following an appropriate "silence", a code letter or number if it's a valid code (the sequence of dots and dashes will be provided for invalid codes).

Standard Morse code timing expects:
* a dot is considered 1 time unit
* a dash to be 3 time units
* a silence of 1 time unit is required between dots the dashs that represent a letter or number
* a silence of 3 units indicating the end of a letter (or the gap between two different letters)
* a silence of 7 time units between words (indicating a "space")

This extension uses four timing values to decode key presses: 
* ``[morse.maxDotTime()]``
* ``[morse.maxDashTime()]``
* ``[morse.maxBetweenSymbolTime()]``
* ``[morse.maxBetweenLetterTime()]``

If the duration of time between  ``[morse.keyDown()]`` and  ``[morse.keyUp()]`` is:
* \[1...``[morse.maxDotTime()]``], it is considered a successful dot. 
* \(``[morse.maxDotTime()]``...``[morse.maxDashTime()]``], it is considered a successful "dash". 
* \(``[morse.maxDashTime()]``...], it is considered an invalid key.  Any preceeding dots and dashes are discarded.

If, following a ``[morse.keyUp()]``, there is no ``[morse.keyDown()]`` for more than ``[morse.maxBetweenSymbolTime()]``, any successful dots and dashes are treated as a letter and ``[morse.onCodeSelected()]`` is executed.  
If, following a ``[morse.keyUp()]``, there is no ``[morse.keyDown()]`` for more than ``[morse.maxBetweenLetterTime()]``, any successful dots/dashes are treated as a letter and ``[morse.onCodeSelected()]`` is executed. The `code` will be a space (`" "`) to indicate the gap between words.

By default the timing is comparable to a dit that lasts about 160ms, but requiring an extra long gap between words:
* A dot is any press that's 1-200ms (~0-0.20 seconds).
* A dash is anything from 201-1000ms (0.2-1 seconds).
* A silence of more than 500 ms (1s) is considered to signify the end of a letter. 
* A silence of more than 2000ms (2s) is considered the end of a word.  

### ~hint

Keying with the built-in buttons may be easier if the [Button Clicks](https://makecode.microbit.org/pkg/bsiever/microbit-pxt-clicks) extension's `on button down` and `on button up` blocks are used.

### ~

## Key Down #morse-keydown

```sig
morse.keyDown() : void
``` 
The Morse code key has been pressed.

## Key Up  #morse-keyup

```sig
morse.keyUp() : void
``` 
The Morse code key has been released.

## Set Dot and Dash Times / Timing  #morse-setmaxdurationdotdash

```sig 
morse.setMaxDurationDotDash(dotTime: number, dashTime: number) {
```

Set the maximum time (in milliseconds) of dots and dashes. 
* A dot is when the key is held between 1ms and the max dot time (\[1ms..`maxDotTime`]).
* A dash when the key is held more than a dot and less than the max dash time ((`maxDotTime`..`maxDashTime`]). 
* If the key is held longer than the max dash time, the decoding state will be reset. That is, current set of dots/dashes will be discarded. 

## Get the Max Dot Time  #morse-maxdottime

```sig
morse.maxDotTime()
```

Provides the current maximum dot time. 

## Get the Max Dot Time  #morse-maxdashtime

```sig
morse.maxDashTime()
```

Provides the current maximum dash time. 

## Set Silence Between Symbols Letters Times / Timing  #morse-setMaxSilenceBetweenSymbolsLetters

```sig 
morse.setMaxSilenceBetweenSymbolsLetters(symbolTime: number, letterTime: number) 
```

Set the maximum time (in millisecondes) of slience allowed between symbols (dots/dashes) and letters of a word. 
* If the silence exceeds the `symbolTime`, the sequence of dots/dashes will be considered to be compelte and will be decoded. 
* If the silence exceeds the `letterTime`, it will be considered a "space" between words (decoded as a space (`" "`)).
  * The `letterTime` will be greather than or equal to the `symbolTime`.

## Get the Maximum Between Symbol Time  #morse-maxbetweensymboltime

```sig
morse.maxBetweenSymbolTime()
```

Provides the current maximum time allowed between symbols (dots and dashes) before considering the sequence of dots/dashes completed.  When this time is exceeded any preceeding dots and dashes are decoded and ``[morse.onCodeSelected()]`` is executed.

## Get the Maximum Between Letter Time  #morse-maxbetweenlettertime

```sig
morse.maxBetweenLetterTime()
```

Provides the current maximum time before considering the preceeding letters to be completed That is, before being considered a space between words or end of transmissions.  When this time is exceeded ``[morse.onCodeSelected()]`` is executed and the `code` will be a space (`" "`). 

## Reset Key timing  #morse-resettiming

```sig
morse.resetTiming() : void
``` 

Reset the timing of keying. This ignores any current key up/down activities. 

A reset may be needed if timing parameters are changed while in the midst of keying in a symbol. Resetting decoding may also be needed.

# Identifying when individual symbols (dots, dashes, silences) are Keyed In  #morse-onnewsymbol

```sig
morse.onNewSymbol(handler: (symbol: string) => void)
```

The `symbol` will indicate the which symbol has been detected/entered:
* Dots and dashes: `.`, `-`
* The silence between letters: `` (empty string)
* The silence between words: `" "` (single space)


# Decoding  #morse-decoding

Decoding refers to decoding a sequence of dots, dashes, and silences into letters based on Morse code.

## Dot  #morse-dot

```sig
morse.dot() : void
``` 

Register that a complete "dot" has happened. 

## Dash #morse-dash

```sig
morse.dash() : void
``` 

Register that a complete "dash" has happened.

## Silence  #morse-silence

```sig
morse.silence(kind?: morse.Silence) : void
``` 

Register that a silence between the key being pressed (down) has happened:
* ``[morse.silence(morse.Silence.Small)]`` is a "small silence" used between dots and dashes, which is ignored. 
* ``[morse.silence(morse.Silence.InterLetter)]`` is a silence between letters.  Any existing dots/dashes are decoded. 
* ``[morse.silence(morse.Silence.InterWord)]`` is the silence between words and is decoded as a space (`" "`). 

### ~alert

# Silences are needed

A `morse.Silence.InterLetter` or `morse.Silence.InterWord` is required to detect a letter. 

### ~

## Reset Decoding  #morse-resetdecoding

```sig
morse.resetDecoding() : void
``` 

Reset dash/dot processing. That is, start at the beginning as though nothing had been keyed in.


## On Code Selected  #morse-oncodeselected

```sig
morse.onCodeSelected(handler: (code: string, sequence: string) => void) 
``` 
A code has been selected (following a  `morse.Silence.InterLetter` or a  `morse.Silence.InterWord`). A valid code will be represented with a valid Morse character.  An invalid Morse code will be indicated with a code that is a question mark (`?`).  `sequence` will be the sequence of dots and dashes in the code.  If there's an end-of-word silence (``[morse.silence(morse.Silence.InterWord)]``), the code will be a space (`"  "`) and the sequence will be empty.

Note that several codes are unused by traditional Morse code.  In these cases the `code` will be `?` and the `sequence` will indicate the sequence of dots and dashes. This extension will track the first seven (7) dots/dashes.  Any more than 7 will be ignored. 

Unused codes include:
* Four sequences of four symbols: `..--`, `.-.-`, `---.`, `----`
* And several sequences of 5 symbols:  `...-.`, `..-..`, `..-.-`, `..--.`, `.-...`, `.-..-`, `.-.--`, `.--..`, `.--.-`, `.---.`, `-..--`, `-.-..`, `-.-.-`, `-.--.`, `-.---`, `--..-`, `--.-.`, `--.--`, `---.-`
* Any sequence of 6 dots/dashes. 
* Any sequence of 7 dots/dashes. 

## Peek at the current Code  #morse-peekcode

```sig
morse.peekCode()
```

Provide the code described by the currently entered dots and dashes. Note that the current code is not compelte until a suitable silence has occurred. 

For example, if a single dot was entered, ``[morse.peekCode()]`` would return an `E`, which is represented by a single dot.  If a second dot is entered before any sufficient "silence", it would then return a `O`, which is represented by two dots. Etc.

## Peek at the current sequence  #morse-peeksequence

```sig
morse.peekSequence()
```

Provide the sequence of dots and dashes that is currently entered but not yet complete (there hasn't yet been a sufficient silence).  

A maximum of seven symbols are stored.  Any more than seven will be ignored.

# Encoding #morse-encoding

Encoding refers to converting letters and spaces to Morse code.

## Encoding text as Morse Code   #morse-encode

```sig
morse.encode(characters: string) : string 
```

The given string will be converted to a represntation of Morse code using dots (.), dashes (-), spaces indicating gaps between the symbols for a letter, and underscores indicating the gaps between words.

For example, ``[morse.encode("SOS SOS")]`` would return `"... --- ..._... --- ..."`.

# Examples

## Morse Code Trainer

[This example](https://makecode.microbit.org/S35338-07015-24700-09611) can help you learn the "code" part of Morse code without the key timing.
* Use button A to enter a dot 
* Use button B to enter a dash 
* Use button A+B when you are done with a full symbol and the screen will display the symbol you selected. 

For example, the code for the letter U is "..-".  To practice entering a "U" you would press button A twice, then button B, then A+B.  The screen should show the "U". 

```blocks 
input.onButtonPressed(Button.A, function () {
    morse.dot()
    basic.showLeds(`
        . . . . .
        . . . . .
        . . # . .
        . . . . .
        . . . . .
        `)
    basic.pause(200)
    basic.clearScreen()
})
morse.onCodeSelected(function (code, sequence) {
    basic.showString("" + (code))
})

input.onButtonPressed(Button.AB, function () {
    basic.showIcon(IconNames.Yes)
    morse.silence(morse.Silence.InterLetter)
})
input.onButtonPressed(Button.B, function () {
    morse.dash()
    basic.showLeds(`
        . . . . .
        . . . . .
        # # # # #
        . . . . .
        . . . . .
        `)
    basic.pause(200)
    basic.clearScreen()
})

```

## Key Timing Trainer

[This example](https://makecode.microbit.org/S52037-21678-12056-83632) allows you to practice the timing of key presses/releases for Morse code:
* Button A acts as the key.  The project uses the [Button clicks](https://makecode.microbit.org/pkg/bsiever/microbit-pxt-clicks) to detect when it is pressed down and released. 
* The `start` block can be used to change the timing of dots, dashes, and "silences".  It's set to the default times.
* The display will show:
  * A single dot or a dash after successfully keying in a dot or dash. 
  * A letter / code after a successfully keying a code (and waiting the appropriate "silence" time). 
  * An underscore (`_`) for the silence at the conclusion of a word/transmission.

Start practicing by trying to prefect the dot and dash times of individual letters:
* An "E" is a single dot (".")
  * Click button A quickly. You should see a dot on the screen.  If you held it too long, a "-" will appear instead. 
  * If you saw a single dot, following a brief pause you should see "E" appear on the screen.  
  * After a longer pause an underscore ("_") will appear to indicate the "end of the transmission"
* An "S" is three dots ("..."). 
  * Practice entering dots until you can reliably produce an "S". 
* A "T" is a single dash ("-"). 
  * Click and briefly hold button A (hold for less than 1 second). You should see a dash on the screen.  If you didn't hold it long enough, you'll see just a dot (".").
  * Practive entering dashes until you can reliably produce a "T".  
* An "O" is three dashes ("---"). As before, practive entering dashes until you can reliably enter an "O". 
* Review the entire [Morse Code](https://en.wikipedia.org/wiki/Morse_code) alphabet and practice keying in entire words or sentences!


### ~alert

The example uses a special form of `showString` to ensure it's shown fast enough 
to keep up with Morse code entry.  This version of "Show String" isn't available as a block, so it is placed in a `function` that can be used from blocks.

### ~

### ~alert

This example requires the [Button clicks](https://makecode.microbit.org/pkg/bsiever/microbit-pxt-clicks) extension to detect when button A is pressed (``[morse.keyDown()]``) and released (``[morse.keyUp()]``).

### ~

```blocks
// Show a string "now" without a delay / scrolling
function showStringNow (theString: string) {
    basic.showString(theString, 0)
}
morse.onCodeSelected(function (code, sequence) {
    // Make silences visible.
    if (code == " ") {
        code = "_"
    }
    serial.writeLine("Code: " + code)
    showStringNow(code)
})
buttonClicks.onButtonUp(buttonClicks.AorB.A, function () {
    morse.keyUp()
})
// Show dot/dash
morse.onNewSymbol(function (newSymbol) {
    serial.writeLine(newSymbol)
    showStringNow(newSymbol)
})
buttonClicks.onButtonDown(buttonClicks.AorB.A, function () {
    morse.keyDown()
})
input.onButtonPressed(Button.B, function () {
    morse.resetTiming()
    morse.resetDecoding()
})
morse.setMaxDurationDotDash(
200,
1000
)
morse.setMaxSilenceBetweenSymbolsLetters(
500,
2000
)

```

## Morse Code Keying Trainer 

[This example](https://makecode.microbit.org/S13813-53146-89461-03345) can be used to practice keying in Morse code.  It will show the code letter for the current sequence of dots/dashes that were entered with button A.  It will "flash" when the code is completed/accepted (that is, after a long enough silence to indicate the end of the letter). 

For example, after a single dot is entered it will show "E" until either: 1) Another dot/dash occurs or 2) Enough time has elapsed to consider the current letter to be done. If a second "dot" is keyed in before the time is up (now at ".."), it will display an "I". Etc. 

```blocks 
// Show a string "now" without a delay / scrolling
function showStringNow (theString: string) {
    basic.showString(theString, 0)
}
morse.onCodeSelected(function (code, sequence) {
    showStringNow(code)
    game.addScore(1)
})
buttonClicks.onButtonUp(buttonClicks.AorB.A, function () {
    morse.keyUp()
})
morse.onNewSymbol(function (newSymbol) {
    if (newSymbol == "-" || newSymbol == ".") {
        showStringNow(morse.peekCode())
    }
})
buttonClicks.onButtonDown(buttonClicks.AorB.A, function () {
    morse.keyDown()
})
morse.setMaxDurationDotDash(
200,
1000
)
morse.setMaxSilenceBetweenSymbolsLetters(
500,
2000
)

```

### ~alert

The example uses a special form of `showString` to ensure it's shown fast enough 
to keep up with Morse code entry.  This version of "Show String" isn't available as a block, so it is placed in a `function` that can be used from blocks.

### ~

### ~alert

This example requires the [Button clicks](https://makecode.microbit.org/pkg/bsiever/microbit-pxt-clicks) extension to detect when button A is pressed (``[morse.keyDown()]``) and released (``[morse.keyUp()]``).

### ~

# Challenges 

1. Use `radio` extensions to recieve Morse code from remote "keys". 
2. Combine this with the Bluetooth HID extension (micro:bit v2 only) to create a Morse Code keybaord!
3. Create a program that uses tones to play the dots/dashes as they are being keyed in. 

# Extras

Here's a fun "tone trainer" to practice decoding Morse code yourself (v2 micro:bit only): [Tone Trainer w/ Voice](https://makecode.microbit.org/S10038-01737-87603-28610). You can modify the `codes` in the `start` to practice just a few Morse codes characters at a time. 

# Acknowledgements 

This was inspired by the work of "grandpaBond" on the Micro:bit Developer Slack Forum, who created this fantastic example to help kids learn Morse Code: [https://makecode.microbit.org/24561-13529-14704-94719](https://makecode.microbit.org/24561-13529-14704-94719).

Icon based on [Font Awesome icon 0xF141](https://www.iconfinder.com/search?q=f141) SVG.

# Misc. 

I develop micro:bit extensions in my spare time to support activities I'm enthusiastic about, like summer camps and science curricula.  You are welcome to become a sponsor of my micro:bit work (one time or recurring payments), which helps offset equipment costs: [here](https://github.com/sponsors/bsiever). Any support at all is greatly appreciated!

## Supported targets

for PXT/microbit

<script src="https://makecode.com/gh-pages-embed.js"></script>
<script>makeCodeRender("{{ site.makecode.home_url }}", "{{ site.github.owner_name }}/{{ site.github.repository_name }}");</script>
