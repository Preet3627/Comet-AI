#Requires AutoHotkey v2.0
#SingleInstance Force
#NoTrayIcon
; ~*^s:: Reload

; CapsLock + S - Global Trigger
; This allows CapsLock to work as a normal key on release, but as a modifier when held.
~*CapsLock:: {
    ; Empty block to prevent native toggle on down press
}

CapsLock & s::
{
    TriggerPopup()
}

; RButton (Forward Mouse Button) - Press and hold to launch popup search
RButton::
{
    StartTime := A_TickCount
    KeyWait "RButton"
    PressDuration := A_TickCount - StartTime

    if (PressDuration < 300) {
        Send("{RButton}")
    } else {
        TriggerPopup()
    }
}

TriggerPopup() {
    ; Save current clipboard
    savedClipboard := ClipboardAll()
    A_Clipboard := ""

    ; Attempt to copy selected text
    Send("^c")

    ; Wait for clipboard (0.3s for speed)
    ClipWait(0.3)

    selectedText := A_Clipboard
    encodedText := UriEncode(selectedText)

    ; Send to Electron
    try {
        whr := ComObject("WinHttp.WinHttpRequest.5.1")
        whr.Open("GET", "http://127.0.0.1:49152/search?q=" . encodedText, false)
        whr.Send()
    } catch {
        ; Fallback to running the app if not responding
        exePath := A_ScriptDir . "\PopSearch.exe"
        if FileExist(exePath) {
            Run('"' . exePath . '" --search="' . StrReplace(selectedText, '"', "'") . '"', A_ScriptDir, "Hide")
        }
    }

    ; Restore clipboard
    A_Clipboard := savedClipboard
}

#HotIf ; Reset HotIf

/*
COMPILATION TIPS:
1. Compile Electron: Use `npm run build` after setting up electron-builder.
2. Compile AHK: Right-click this script and select "Compile Script"
   to create a standalone "pop_search_trigger.exe".
*/

; Helper function for URL encoding
UriEncode(str) {
    static doc := ComObject("HTMLFile")
    doc.write('<meta http-equiv="X-UA-Compatible" content="IE=9">')
    return doc.parentWindow.encodeURIComponent(str)
}
