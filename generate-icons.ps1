Add-Type -AssemblyName System.Drawing

function Create-Icon {
    param(
        [string]$Path,
        [int]$Size
    )
    $bmp = New-Object System.Drawing.Bitmap($Size, $Size)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit

    # Background - sage green
    $brush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(61, 139, 110))
    $g.FillRectangle($brush, 0, 0, $Size, $Size)

    # Text - white GoL
    $fontSize = [int]($Size * 0.28)
    $font = New-Object System.Drawing.Font('Segoe UI', $fontSize, [System.Drawing.FontStyle]::Bold)
    $textBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
    $sf = New-Object System.Drawing.StringFormat
    $sf.Alignment = [System.Drawing.StringAlignment]::Center
    $sf.LineAlignment = [System.Drawing.StringAlignment]::Center
    $rect = New-Object System.Drawing.RectangleF(0, 0, $Size, $Size)
    $g.DrawString('GoL', $font, $textBrush, $rect, $sf)

    $bmp.Save($Path, [System.Drawing.Imaging.ImageFormat]::Png)
    $g.Dispose()
    $bmp.Dispose()
}

$base = 'C:\Users\marti\Desktop\UnbornCompany_Apps\Organization-Planner\icons'
Create-Icon (Join-Path $base 'icon-192.png') 192
Create-Icon (Join-Path $base 'icon-512.png') 512
Write-Host 'Icons created successfully'
