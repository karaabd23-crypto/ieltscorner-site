@echo off
REM Bulk fix for lesson file emoji and table formatting
setlocal enabledelayedexpansion

set "lessonDir=c:\Users\Karaa\Documents\ieltscorner-site\src\content\lessons"

REM For each markdown file, use PowerShell to perform replacements
powershell -Command ^
"$dir = '%lessonDir%'; ^
$updated = 0; ^
Get-ChildItem -Path $dir -Filter '*.md' | ForEach-Object { ^
  $file = $_; ^
  $content = [System.IO.File]::ReadAllText($file.FullName, [System.Text.Encoding]::UTF8); ^
  $orig = $content; ^
  ^
  # Fix table-based weak vs strong ^
  $content = $content -replace '\| [^|]*Weak sentence[^|]*\|[^|]*Better sentence[^|]*\|[^|]*Why[^|]*\|.*?\n\|---\|---\|---\|.*?\n', ''; ^
  ^
  # Fix broken emoji sequences ^
  $content = $content -replace '(####|###) [ðÂâ][^a-zA-Z0-9]*', '$1 '; ^
  ^
  if ($content -ne $orig) { ^
    [System.IO.File]::WriteAllText($file.FullName, $content, [System.Text.Encoding]::UTF8); ^
    $updated++; ^
    Write-Host \" ✅ $($file.Name)\"; ^
  } ^
}; ^
Write-Host \"`n📊 Updated $updated files\""
