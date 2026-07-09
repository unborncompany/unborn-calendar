# ============================================================
# Generate-Icons.ps1 — Game of Life PWA Icons
# ============================================================
# Generates all required icon sizes from icon-512.png
# Requirements: .NET System.Drawing (built into Windows)
#
# Usage:
#   Right-click → Run with PowerShell
#   Or: .\generate-icons.ps1
# ============================================================

$ErrorActionPreference = "Stop"
$iconsDir = Join-Path $PSScriptDir "icons"
$sourceFile = Join-Path $iconsDir "icon-512.png"

if (-not (Test-Path $sourceFile)) {
    Write-Host "ERROR: icon-512.png not found in icons/ folder!" -ForegroundColor Red
    Write-Host "Place a 512x512 PNG icon at: $sourceFile" -ForegroundColor Yellow
    exit 1
}

# Required sizes for PWA + iOS + Android
$sizes = @(72, 96, 128, 144, 152, 167, 180, 192, 512)

# Maskable versions need extra padding (center crop with safe zone)
$maskableSizes = @(192, 512)

Write-Host "Generating PWA icons from icon-512.png..." -ForegroundColor Cyan
Write-Host ""

Add-Type -AssemblyName System.Drawing

function Resize-Image {
    param(
        [string]$SourcePath,
        [string]$DestPath,
        [int]$TargetSize,
        [int]$PaddingPercent = 0
    )

    $source = [System.Drawing.Image]::FromFile($SourcePath)

    if ($PaddingPercent -gt 0) {
        # For maskable icons: draw on a background with padding
        $canvas = New-Object System.Drawing.Bitmap($TargetSize, $TargetSize)
        $g = [System.Drawing.Graphics]::FromImage($canvas)
        $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality

        # Fill background
        $bgBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(61, 139, 110))
        $g.FillRectangle($bgBrush, 0, 0, $TargetSize, $TargetSize)

        # Calculate safe zone (80% of canvas)
        $safeSize = [math]::Floor($TargetSize * 0.80)
        $offset = [math]::Floor(($TargetSize - $safeSize) / 2)

        $g.DrawImage($source, $offset, $offset, $safeSize, $safeSize)

        $g.Dispose()
        $canvas.Save($DestPath, [System.Drawing.Imaging.ImageFormat]::Png)
        $canvas.Dispose()
    } else {
        # Regular icon: just resize
        $canvas = New-Object System.Drawing.Bitmap($TargetSize, $TargetSize)
        $g = [System.Drawing.Graphics]::FromImage($canvas)
        $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality

        $g.DrawImage($source, 0, 0, $TargetSize, $TargetSize)

        $g.Dispose()
        $canvas.Save($DestPath, [System.Drawing.Imaging.ImageFormat]::Png)
        $canvas.Dispose()
    }

    $source.Dispose()
}

# Generate regular icons
foreach ($size in $sizes) {
    $outFile = Join-Path $iconsDir "icon-${size}.png"
    try {
        Resize-Image -SourcePath $sourceFile -DestPath $outFile -TargetSize $size
        Write-Host "  [OK] icon-${size}.png" -ForegroundColor Green
    } catch {
        Write-Host "  [FAIL] icon-${size}.png — $_" -ForegroundColor Red
    }
}

# Generate maskable icons (with padding)
foreach ($size in $maskableSizes) {
    $outFile = Join-Path $iconsDir "icon-${size}-maskable.png"
    try {
        Resize-Image -SourcePath $sourceFile -DestPath $outFile -TargetSize $size -PaddingPercent 20
        Write-Host "  [OK] icon-${size}-maskable.png (maskable)" -ForegroundColor Green
    } catch {
        Write-Host "  [FAIL] icon-${size}-maskable.png — $_" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "Done! Generated $($sizes.Count + $maskableSizes.Count) icons in icons/" -ForegroundColor Cyan
Write-Host ""
Write-Host "Files created:" -ForegroundColor Yellow
Get-ChildItem $iconsDir -Filter "*.png" | Sort-Object Name | ForEach-Object {
    Write-Host "  $($_.Name) ($([math]::Round($_.Length / 1KB))KB)"
}
