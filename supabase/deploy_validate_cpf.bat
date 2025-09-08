@echo off
echo Deploying validate_cpf edge function...
echo.

REM Deploy the edge function with no-verify-jwt for easier access
npx supabase functions deploy validate_cpf --no-verify-jwt

echo.
echo Deployment complete!
echo.
echo To check if the function is working, visit:
echo https://snebguohzjgkouqweavx.supabase.co/functions/v1/validate_cpf
echo.
pause