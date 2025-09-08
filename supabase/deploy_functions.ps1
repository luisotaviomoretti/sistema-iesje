# Script de Deploy de Edge Functions para Supabase
# Autor: Sistema de Matrículas IESJE

$ErrorActionPreference = "Stop"

# Cores para output
function Write-Success { Write-Host $args -ForegroundColor Green }
function Write-Error { Write-Host $args -ForegroundColor Red }
function Write-Info { Write-Host $args -ForegroundColor Cyan }
function Write-Warning { Write-Host $args -ForegroundColor Yellow }

Clear-Host
Write-Host "========================================" -ForegroundColor Magenta
Write-Host "  DEPLOY DE EDGE FUNCTIONS - SUPABASE  " -ForegroundColor Magenta
Write-Host "========================================" -ForegroundColor Magenta
Write-Host ""

# Configurações
$PROJECT_REF = "snebguohzjgkouqweavx"
$FUNCTIONS = @(
    "validate_cpf",
    "get_previous_year_student",
    "create_matricula_user"
)

# Verificar se npx está disponível
Write-Info "[1/5] Verificando dependências..."
try {
    $null = Get-Command npx -ErrorAction Stop
    Write-Success "✓ npx encontrado"
} catch {
    Write-Error "✗ npx não encontrado. Por favor, instale o Node.js e npm."
    Read-Host "Pressione Enter para sair"
    exit 1
}

# Verificar login no Supabase
Write-Host ""
Write-Info "[2/5] Verificando login no Supabase..."
$loginCheck = npx supabase whoami 2>&1

if ($LASTEXITCODE -ne 0) {
    Write-Warning "Você não está logado no Supabase."
    Write-Info "Executando login..."
    npx supabase login
    if ($LASTEXITCODE -ne 0) {
        Write-Error "✗ Falha no login"
        Read-Host "Pressione Enter para sair"
        exit 1
    }
}
Write-Success "✓ Login verificado"

# Linkar projeto
Write-Host ""
Write-Info "[3/5] Linkando projeto..."
Write-Info "Projeto: $PROJECT_REF"
$linkResult = npx supabase link --project-ref $PROJECT_REF 2>&1

if ($linkResult -match "already linked") {
    Write-Success "✓ Projeto já estava linkado"
} elseif ($LASTEXITCODE -eq 0) {
    Write-Success "✓ Projeto linkado com sucesso"
} else {
    Write-Warning "⚠ Possível erro ao linkar projeto (continuando...)"
}

# Deploy das functions
Write-Host ""
Write-Info "[4/5] Fazendo deploy das Edge Functions..."
Write-Host ""

$deployResults = @()
foreach ($func in $FUNCTIONS) {
    Write-Info "Deploying: $func"
    
    $deployOutput = npx supabase functions deploy $func --no-verify-jwt 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Success "✓ $func deployed successfully"
        $deployResults += @{ Function = $func; Status = "Success" }
    } else {
        Write-Error "✗ Falha ao fazer deploy de $func"
        Write-Warning "Erro: $deployOutput"
        $deployResults += @{ Function = $func; Status = "Failed" }
    }
    Write-Host ""
}

# Verificar status
Write-Info "[5/5] Verificando status das functions..."
Write-Host ""
npx supabase functions list

# Resumo
Write-Host ""
Write-Host "========================================" -ForegroundColor Magenta
Write-Host "         RESUMO DO DEPLOY               " -ForegroundColor Magenta
Write-Host "========================================" -ForegroundColor Magenta
Write-Host ""

foreach ($result in $deployResults) {
    if ($result.Status -eq "Success") {
        Write-Success ("✓ {0}: Deployed" -f $result.Function)
    } else {
        Write-Error ("✗ {0}: Failed" -f $result.Function)
    }
}

Write-Host ""
Write-Info "URLs das Edge Functions:"
foreach ($func in $FUNCTIONS) {
    Write-Host "  • https://$PROJECT_REF.supabase.co/functions/v1/$func" -ForegroundColor Gray
}

Write-Host ""
Write-Success "Deploy concluído!"
Write-Host ""
Read-Host "Pressione Enter para sair"