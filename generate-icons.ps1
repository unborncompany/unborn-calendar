# PowerShell 5.1 compatible icon generator
Add-Type -AssemblyName System.IO.Compression

$BG = @(0x1a, 0x1a, 0x2e)
$FG = @(0x3d, 0x8b, 0x6e)

$GLYPH = @(60, 102, 96, 48, 24, 12, 6, 6, 102, 60)

function CRC32Bytes([byte[]]$bytes) {
  $table = New-Object int[] 256
  for ($n = 0; $n -lt 256; $n++) {
    $v = $n
    for ($k = 0; $k -lt 8; $k++) {
      if ($v -band 1) { $v = 0xedb88320 -bxor ($v -shr 1) } else { $v = $v -shr 1 }
    }
    $table[$n] = $v
  }
  $c = [int32]0xFFFFFFFF
  foreach ($b in $bytes) {
    $c = $table[(($c -bxor [int32]$b) -band 0xFF)] -bxor ($c -shr 8)
  }
  return [int32]($c -bxor [int32]0xFFFFFFFF)
}

function Int32ToBE([int32]$val) {
  return [byte[]](
    [byte](($val -band 0xFF000000) -shr 24),
    [byte](($val -band 0x00FF0000) -shr 16),
    [byte](($val -band 0x0000FF00) -shr 8),
    [byte]($val -band 0x000000FF)
  )
}

function MakeChunk([string]$typeStr, [byte[]]$data) {
  $typeBytes = [System.Text.Encoding]::ASCII.GetBytes($typeStr)
  $lenBytes = Int32ToBE $data.Length
  $combined = New-Object byte[] ($typeBytes.Length + $data.Length)
  [Array]::Copy($typeBytes, 0, $combined, 0, $typeBytes.Length)
  [Array]::Copy($data, 0, $combined, $typeBytes.Length, $data.Length)
  $crcVal = CRC32Bytes $combined
  $crcBytes = Int32ToBE $crcVal
  $result = New-Object byte[] ($lenBytes.Length + $combined.Length + $crcBytes.Length)
  [Array]::Copy($lenBytes, 0, $result, 0, 4)
  [Array]::Copy($combined, 0, $result, 4, $combined.Length)
  [Array]::Copy($crcBytes, 0, $result, 4 + $combined.Length, 4)
  return $result
}

function CreatePNG([int32]$w, [int32]$h, [byte[]]$pixels) {
  $rowSize = 1 + ($w * 4)
  $rawSize = $rowSize * $h
  $raw = New-Object byte[] $rawSize
  for ($y = 0; $y -lt $h; $y++) {
    $rowOff = $y * $rowSize
    $raw[$rowOff] = 0
    for ($x = 0; $x -lt $w; $x++) {
      $si = ($y * $w + $x) * 4
      $di = $rowOff + 1 + ($x * 4)
      $raw[$di] = $pixels[$si]
      $raw[$di+1] = $pixels[$si+1]
      $raw[$di+2] = $pixels[$si+2]
      $raw[$di+3] = $pixels[$si+3]
    }
  }

  $ms = New-Object System.IO.MemoryStream
  $ms.WriteByte(0x78)
  $ms.WriteByte(0x01)
  $ds = New-Object System.IO.Compression.DeflateStream($ms, [System.IO.Compression.CompressionLevel]::Optimal, $true)
  $ds.Write($raw, 0, $raw.Length)
  $ds.Dispose()
  [int32]$a1 = 1
  [int32]$a2 = 0
  foreach ($b in $raw) {
    $a1 = ($a1 + [int32]$b) % 65521
    $a2 = ($a2 + $a1) % 65521
  }
  $adler = ($a2 -shl 16) -bor $a1
  $adlerBytes = Int32ToBE $adler
  $ms.Write($adlerBytes, 0, 4)
  $zlibData = $ms.ToArray()
  $ms.Dispose()

  $sig = [byte[]]@(137, 80, 78, 71, 13, 10, 26, 10)
  $ihdr = New-Object byte[] 13
  $ihdrW = Int32ToBE $w
  $ihdrH = Int32ToBE $h
  [Array]::Copy($ihdrW, 0, $ihdr, 0, 4)
  [Array]::Copy($ihdrH, 0, $ihdr, 4, 4)
  $ihdr[8] = 8; $ihdr[9] = 6; $ihdr[10] = 0; $ihdr[11] = 0; $ihdr[12] = 0

  $ihdrChunk = MakeChunk "IHDR" $ihdr
  $idatChunk = MakeChunk "IDAT" $zlibData
  $iendChunk = MakeChunk "IEND" (New-Object byte[] 0)

  $total = $sig.Length + $ihdrChunk.Length + $idatChunk.Length + $iendChunk.Length
  $png = New-Object byte[] $total
  $off = 0
  [Array]::Copy($sig, 0, $png, $off, $sig.Length); $off += $sig.Length
  [Array]::Copy($ihdrChunk, 0, $png, $off, $ihdrChunk.Length); $off += $ihdrChunk.Length
  [Array]::Copy($idatChunk, 0, $png, $off, $idatChunk.Length); $off += $idatChunk.Length
  [Array]::Copy($iendChunk, 0, $png, $off, $iendChunk.Length)
  return $png
}

function GenerateIcon([int32]$size) {
  $pixels = New-Object byte[] ($size * $size * 4)
  for ($i = 0; $i -lt ($size * $size); $i++) {
    $pixels[$i*4] = $BG[0]; $pixels[$i*4+1] = $BG[1]; $pixels[$i*4+2] = $BG[2]; $pixels[$i*4+3] = 255
  }
  $glyphW = 8; $glyphH = 10
  $scale = [math]::Floor($size / 14)
  if ($scale -lt 1) { $scale = 1 }
  $gw = $glyphW * $scale; $gh = $glyphH * $scale
  $ox = [math]::Floor(($size - $gw) / 2)
  $oy = [math]::Floor(($size - $gh) / 2)
  for ($gy = 0; $gy -lt $glyphH; $gy++) {
    for ($gx = 0; $gx -lt $glyphW; $gx++) {
      if ($GLYPH[$gy] -band (1 -shl (7 - $gx))) {
        for ($sy = 0; $sy -lt $scale; $sy++) {
          for ($sx = 0; $sx -lt $scale; $sx++) {
            $px = $ox + $gx * $scale + $sx
            $py = $oy + $gy * $scale + $sy
            if ($px -lt $size -and $py -lt $size) {
              $idx = ($py * $size + $px) * 4
              $pixels[$idx] = $FG[0]; $pixels[$idx+1] = $FG[1]; $pixels[$idx+2] = $FG[2]; $pixels[$idx+3] = 255
            }
          }
        }
      }
    }
  }
  return CreatePNG $size $size $pixels
}

$iconsDir = Join-Path $PSScriptRoot "icons"
New-Item -ItemType Directory -Force -Path $iconsDir | Out-Null

[System.IO.File]::WriteAllBytes((Join-Path $iconsDir "icon-192.png"), (GenerateIcon 192))
Write-Host "Created icons/icon-192.png"
[System.IO.File]::WriteAllBytes((Join-Path $iconsDir "icon-512.png"), (GenerateIcon 512))
Write-Host "Created icons/icon-512.png"
Write-Host "Done."
