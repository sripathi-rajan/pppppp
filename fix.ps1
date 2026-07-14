$content = Get-Content "mobile/app/(tabs)/ask.tsx" -Raw
$content = $content -replace "import \{ requestRecordingPermissionsAsync, setAudioModeAsync, AudioRecorder, RecordingPresets \} from 'expo-audio';", "import { requestRecordingPermissionsAsync, setAudioModeAsync, useAudioRecorder, RecordingPresets } from 'expo-audio';"

$content = $content -replace "const recordingRef = useRef<any>\(null\);`r`n", "const recordingRef = useRef<any>(null);`r`n  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);`r`n"

$content = $content -replace "(?s)const recording = null as any; // Ignore audio recording for now since useAudioRecorder needs refactor`r`n      await recording\.prepareToRecordAsync\(\);`r`n      recording\.record\(\);`r`n      recordingRef\.current = recording;", "const recording = audioRecorder;`r`n      await recording.prepareToRecordAsync();`r`n      recording.record();`r`n      recordingRef.current = recording;"

$content = $content -replace "\}\\} as any", "}}"

$content | Set-Content "mobile/app/(tabs)/ask.tsx"
