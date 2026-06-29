# Script pour corriger l'encodage de tous les fichiers JS
$srcDir = "c:\Users\Studio D\Desktop\DASHBOARD SWIFT AI\whatsflow\whatsapp-engine\src"

Write-Host "Correction de l'encodage des fichiers JS..." -ForegroundColor Cyan

Get-ChildItem -Path $srcDir -Filter *.js | ForEach-Object {
    $file = $_.FullName
    Write-Host "Traitement: $($_.Name)" -ForegroundColor Yellow
    
    try {
        # Lire le contenu
        $content = [System.IO.File]::ReadAllText($file, [System.Text.Encoding]::UTF8)
        
        # Reecrire en UTF-8 sans BOM
        $utf8NoBom = New-Object System.Text.UTF8Encoding $false
        [System.IO.File]::WriteAllText($file, $content, $utf8NoBom)
        
        Write-Host "  [OK] $($_.Name)" -ForegroundColor Green
    }
    catch {
        Write-Host "  [ERREUR] $($_.Name): $_" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "Termine !" -ForegroundColor Green
