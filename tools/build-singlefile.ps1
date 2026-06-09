# FATHOM — single-file build. Inlines every <script src> in index.html into one
# self-contained dist/fathom.html that runs by double-click (no server, no deps).
#
#   powershell -ExecutionPolicy Bypass -File tools\build-singlefile.ps1
#
param(
  [string]$Root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path,
  [string]$OutDir = $null
)

if (-not $OutDir) { $OutDir = Join-Path $Root 'dist' }
$indexPath = Join-Path $Root 'index.html'
if (-not (Test-Path $indexPath)) { Write-Error "index.html not found at $indexPath"; exit 1 }

$html = Get-Content -Raw -Encoding UTF8 $indexPath
$pattern = '<script src="([^"]+)"></script>'
$matches = [regex]::Matches($html, $pattern)
Write-Output ("Inlining {0} scripts..." -f $matches.Count)

foreach ($m in $matches) {
  $tag = $m.Value
  $rel = $m.Groups[1].Value
  $file = Join-Path $Root ($rel -replace '/', [System.IO.Path]::DirectorySeparatorChar)
  if (-not (Test-Path $file)) { Write-Warning "  missing: $rel (left as-is)"; continue }
  $code = Get-Content -Raw -Encoding UTF8 $file
  # Guard against an accidental closing-tag sequence inside JS.
  $code = $code -replace '</script>', '<\/script>'
  $repl = "<script>`n/* === $rel === */`n$code`n</script>"
  $html = $html.Replace($tag, $repl)
}

if (-not (Test-Path $OutDir)) { New-Item -ItemType Directory -Force $OutDir | Out-Null }
$outFile = Join-Path $OutDir 'fathom.html'
# Write UTF-8 without BOM so older browsers don't choke.
[System.IO.File]::WriteAllText($outFile, $html, (New-Object System.Text.UTF8Encoding($false)))

$size = [math]::Round((Get-Item $outFile).Length / 1KB, 1)
Write-Output ("Built {0} ({1} KB) - double-click to play." -f $outFile, $size)
