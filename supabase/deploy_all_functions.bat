@echo off
echo ========================================
echo   DEPLOY DE EDGE FUNCTIONS - SUPABASE
echo ========================================
echo.

REM Verificar se o Supabase CLI está instalado
where npx >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERRO] npx não encontrado. Por favor, instale o Node.js e npm.
    pause
    exit /b 1
)

echo [1/4] Verificando login no Supabase...
npx supabase whoami >nul 2>nul
if %errorlevel% neq 0 (
    echo.
    echo Você não está logado no Supabase.
    echo Executando login...
    npx supabase login
    if %errorlevel% neq 0 (
        echo [ERRO] Falha no login.
        pause
        exit /b 1
    )
)
echo ✓ Login verificado

echo.
echo [2/4] Linkando projeto...
echo Projeto: snebguohzjgkouqweavx
npx supabase link --project-ref snebguohzjgkouqweavx
if %errorlevel% neq 0 (
    echo [AVISO] Projeto já pode estar linkado ou houve um erro.
    echo Continuando...
)
echo ✓ Projeto linkado

echo.
echo [3/4] Fazendo deploy das Edge Functions...
echo.

echo Deploying: validate_cpf
npx supabase functions deploy validate_cpf --no-verify-jwt
if %errorlevel% neq 0 (
    echo [ERRO] Falha ao fazer deploy de validate_cpf
) else (
    echo ✓ validate_cpf deployed
)
echo.

echo Deploying: get_previous_year_student
npx supabase functions deploy get_previous_year_student --no-verify-jwt
if %errorlevel% neq 0 (
    echo [ERRO] Falha ao fazer deploy de get_previous_year_student
) else (
    echo ✓ get_previous_year_student deployed
)
echo.

echo Deploying: create_matricula_user
npx supabase functions deploy create_matricula_user --no-verify-jwt
if %errorlevel% neq 0 (
    echo [ERRO] Falha ao fazer deploy de create_matricula_user
) else (
    echo ✓ create_matricula_user deployed
)
echo.

echo [4/4] Verificando status das functions...
npx supabase functions list

echo.
echo ========================================
echo   DEPLOY CONCLUÍDO!
echo ========================================
echo.
echo URLs das Edge Functions:
echo - https://snebguohzjgkouqweavx.supabase.co/functions/v1/validate_cpf
echo - https://snebguohzjgkouqweavx.supabase.co/functions/v1/get_previous_year_student
echo - https://snebguohzjgkouqweavx.supabase.co/functions/v1/create_matricula_user
echo.
pause