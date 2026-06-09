# FATHOM dev static server — zero dependencies (raw TcpListener, no admin / URL-ACL
# needed). Serves the project root over http://127.0.0.1:<port>/ so the game can be
# loaded by a browser without the file:// module/extension restrictions.
#
#   powershell -ExecutionPolicy Bypass -File tools\serve.ps1 -Port 8137
#
param(
  [int]$Port = 8137,
  [string]$Root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
)

$mime = @{
  '.html'='text/html; charset=utf-8'; '.js'='application/javascript; charset=utf-8';
  '.css'='text/css; charset=utf-8'; '.json'='application/json; charset=utf-8';
  '.png'='image/png'; '.jpg'='image/jpeg'; '.svg'='image/svg+xml'; '.ico'='image/x-icon';
  '.woff'='font/woff'; '.woff2'='font/woff2'; '.txt'='text/plain; charset=utf-8'
}

$listener = New-Object System.Net.Sockets.TcpListener([System.Net.IPAddress]::Loopback, $Port)
$listener.Start()
Write-Output ("FATHOM serving '{0}' at http://127.0.0.1:{1}/  (Ctrl+C to stop)" -f $Root, $Port)

while ($true) {
  $client = $listener.AcceptTcpClient()
  try {
    $stream = $client.GetStream()
    $stream.ReadTimeout = 5000
    $buf = New-Object byte[] 4096
    $read = $stream.Read($buf, 0, $buf.Length)
    if ($read -le 0) { $client.Close(); continue }
    $req = [System.Text.Encoding]::ASCII.GetString($buf, 0, $read)
    $line = ($req -split "`r`n")[0]
    $parts = $line -split ' '
    $path = if ($parts.Length -ge 2) { $parts[1] } else { '/' }
    $path = ($path -split '\?')[0]
    $path = [System.Uri]::UnescapeDataString($path)
    if ($path -eq '/' -or $path.EndsWith('/')) { $path += 'index.html' }
    $rel = $path.TrimStart('/').Replace('/', [System.IO.Path]::DirectorySeparatorChar)
    $full = [System.IO.Path]::GetFullPath((Join-Path $Root $rel))

    if (-not $full.StartsWith($Root) -or -not (Test-Path $full -PathType Leaf)) {
      $body = [System.Text.Encoding]::UTF8.GetBytes('404 Not Found: ' + $path)
      $head = "HTTP/1.1 404 Not Found`r`nContent-Type: text/plain`r`nContent-Length: $($body.Length)`r`nConnection: close`r`n`r`n"
      $hb = [System.Text.Encoding]::ASCII.GetBytes($head)
      $stream.Write($hb, 0, $hb.Length); $stream.Write($body, 0, $body.Length)
    } else {
      $ext = [System.IO.Path]::GetExtension($full).ToLower()
      $ct = if ($mime.ContainsKey($ext)) { $mime[$ext] } else { 'application/octet-stream' }
      $bytes = [System.IO.File]::ReadAllBytes($full)
      $head = "HTTP/1.1 200 OK`r`nContent-Type: $ct`r`nContent-Length: $($bytes.Length)`r`nCache-Control: no-cache, no-store`r`nConnection: close`r`n`r`n"
      $hb = [System.Text.Encoding]::ASCII.GetBytes($head)
      $stream.Write($hb, 0, $hb.Length); $stream.Write($bytes, 0, $bytes.Length)
    }
    $stream.Flush()
  } catch { }
  finally { $client.Close() }
}
