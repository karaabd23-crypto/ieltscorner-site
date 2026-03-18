param(
  [switch]$PrintOnly
)

$repoRoot = Split-Path -Parent $PSScriptRoot
$memoryDir = Join-Path $repoRoot 'memory'
$projectBriefPath = Join-Path $memoryDir 'project-brief.md'
$chatSessionsDir = Join-Path $memoryDir 'chat-sessions'
$sessionCatalogPath = Join-Path $memoryDir 'session-catalog.md'

$latestNote = Get-ChildItem -Path $chatSessionsDir -Filter '*.md' -File -ErrorAction SilentlyContinue |
  Sort-Object LastWriteTimeUtc -Descending |
  Select-Object -First 1

$latestNoteLine = if ($latestNote) {
  "2. Read memory/chat-sessions/$($latestNote.Name)"
} else {
  '2. Read the latest file in memory/chat-sessions/'
}

$promptLines = @(
  'IELTS Corner repo startup checklist:'
  "1. Read memory/project-brief.md"
  $latestNoteLine
  '3. If prior chat history matters, run npm run session:index and review memory/session-catalog.md'
  '4. Use npm run session:show -- "<query>" to inspect a specific prior session'
  '5. Default deploy path: commit + push to main so GitHub Actions deploy-live.yml handles production'
  '6. Webinar strip color is intentionally deferred unless explicitly requested'
  ''
  "Project brief: $projectBriefPath"
  "Session catalog: $sessionCatalogPath"
)

$starterPrompt = $promptLines -join [Environment]::NewLine

$copiedToClipboard = $false
if (-not $PrintOnly) {
  try {
    Set-Clipboard -Value $starterPrompt
    $copiedToClipboard = $true
  } catch {
    $copiedToClipboard = $false
  }
}

Write-Output $starterPrompt

if (-not $PrintOnly) {
  if ($copiedToClipboard) {
    Write-Output ''
    Write-Output 'Copied starter prompt to the clipboard.'
  } else {
    Write-Output ''
    Write-Output 'Clipboard copy failed; prompt printed above.'
  }
}
