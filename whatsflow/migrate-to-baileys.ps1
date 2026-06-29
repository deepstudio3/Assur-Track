# Script de Migration vers Baileys
# Executer ce script pour migrer de OpenWA vers Baileys

Write-Host "Migration vers Baileys - WhatsFlow" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

# Etape 1 : Verification Docker
Write-Host "Etape 1/6 : Verification de Docker..." -ForegroundColor Yellow
try {
    docker --version | Out-Null
    Write-Host "[OK] Docker est installe et fonctionnel" -ForegroundColor Green
} catch {
    Write-Host "[ERREUR] Docker n'est pas disponible. Veuillez l'installer." -ForegroundColor Red
    exit 1
}

# Etape 2 : Arret des conteneurs WhatsApp existants
Write-Host ""
Write-Host "Etape 2/6 : Arret des conteneurs WhatsApp existants..." -ForegroundColor Yellow
$containers = docker ps -a --filter "name=whatsapp_" --format "{{.ID}}"
if ($containers) {
    Write-Host "Arret des conteneurs..." -ForegroundColor Cyan
    docker stop $containers 2>&1 | Out-Null
    docker rm $containers 2>&1 | Out-Null
    Write-Host "[OK] Conteneurs arretes et supprimes" -ForegroundColor Green
} else {
    Write-Host "[INFO] Aucun conteneur WhatsApp a arreter" -ForegroundColor Gray
}

# Etape 3 : Suppression de l'ancienne image
Write-Host ""
Write-Host "Etape 3/6 : Suppression de l'ancienne image OpenWA..." -ForegroundColor Yellow
$oldImage = docker images -q whatsapp-openwa-engine:latest
if ($oldImage) {
    docker rmi -f whatsapp-openwa-engine:latest 2>&1 | Out-Null
    Write-Host "[OK] Ancienne image supprimee" -ForegroundColor Green
} else {
    Write-Host "[INFO] Aucune ancienne image a supprimer" -ForegroundColor Gray
}

# Etape 4 : Construction de la nouvelle image Baileys
Write-Host ""
Write-Host "Etape 4/6 : Construction de l'image Baileys..." -ForegroundColor Yellow
Write-Host "Cette etape peut prendre 2-3 minutes..." -ForegroundColor Cyan

$buildOutput = docker-compose build --no-cache whatsapp-engine 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "[OK] Image Baileys construite avec succes" -ForegroundColor Green
} else {
    Write-Host "[ERREUR] Erreur lors de la construction de l'image" -ForegroundColor Red
    Write-Host $buildOutput -ForegroundColor Red
    exit 1
}

# Etape 5 : Verification de l'image
Write-Host ""
Write-Host "Etape 5/6 : Verification de l'image..." -ForegroundColor Yellow
$newImage = docker images -q whatsapp-baileys-engine:latest
if ($newImage) {
    $imageInfo = docker images whatsapp-baileys-engine:latest --format "table {{.Repository}}`t{{.Tag}}`t{{.Size}}"
    Write-Host $imageInfo -ForegroundColor Cyan
    Write-Host "[OK] Image verifiee" -ForegroundColor Green
} else {
    Write-Host "[ERREUR] Image non trouvee" -ForegroundColor Red
    exit 1
}

# Etape 6 : Redemarrage des services
Write-Host ""
Write-Host "Etape 6/6 : Redemarrage des services..." -ForegroundColor Yellow
docker-compose down 2>&1 | Out-Null
docker-compose up -d

if ($LASTEXITCODE -eq 0) {
    Write-Host "[OK] Services redemarres avec succes" -ForegroundColor Green
} else {
    Write-Host "[ERREUR] Erreur lors du redemarrage des services" -ForegroundColor Red
    exit 1
}

# Resume
Write-Host ""
Write-Host "======================================" -ForegroundColor Cyan
Write-Host "Migration terminee avec succes !" -ForegroundColor Green
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Prochaines etapes :" -ForegroundColor Yellow
Write-Host "  1. Verifier les logs : docker-compose logs -f api" -ForegroundColor White
Write-Host "  2. Tester la creation de session : python tests\test_baileys_migration.py" -ForegroundColor White
Write-Host "  3. Scanner le QR code avec WhatsApp" -ForegroundColor White
Write-Host ""
Write-Host "Documentation : MIGRATION_BAILEYS.md" -ForegroundColor Cyan
Write-Host ""

# Afficher les services en cours d'execution
Write-Host "Services actifs :" -ForegroundColor Yellow
docker-compose ps
