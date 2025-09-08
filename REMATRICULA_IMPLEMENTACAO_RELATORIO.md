# Relatório Técnico — Implementação Rematrícula (Fases 1–5), Ajustes, Problemas e Próximos Passos

## Visão Geral
- Este documento registra, de forma extremamente detalhada e estruturada, o que foi implementado nas Fases 1–5 do plano de Rematrícula, os ajustes no frontend e backend (Supabase), os problemas encontrados (incluindo CORS e loops de render), hipóteses de causa‑raiz e um plano de ação explícito para estabilizar o fluxo.
- Também inclui instruções de validação independente (via SQL e cURL/Postman) e uma lista de verificação do estado atual.

---

## Cronologia e Escopo do Trabalho Realizado

### 1) Fase 1 — Modelo de Dados, Índices, RLS e Auditoria
- previous_year_students (base 2025):
  - Campos paralelos a enrollments (aluno, responsáveis, endereço, acadêmico, financeiro, applied_discounts).
  - RLS restritiva: apenas service role (Edge) acessa; nenhum acesso público direto.
  - Índices por CPF (inicialmente pelo campo bruto) e trigger de updated_at.
  - Gatilho idempotente: 020_create_previous_year_students.sql ajustada para não falhar se o trigger já existir.
- validation_audit:
  - Grava tentativas de validação (hash de CPF, ip, user_agent, result), apoia rate limiting e auditoria.
- Robustez futura — MIGRAÇÃO 022 (normalização de CPF por dígitos):
  - Adicionadas colunas geradas student_cpf_digits em public.enrollments e public.previous_year_students (regexp_replace para manter apenas dígitos).
  - Criados índices sobre essas colunas para consultas rápidas e robustas, independente de máscara.

### 2) Fase 2 — Edge Function validate_cpf
- Objetivo: classificar CPF em 'current_year' | 'previous_year' | 'not_found'.
- Implementação:
  - Sanitização e validação (11 dígitos, sem sequência, dígitos verificadores).
  - Rate limiting por IP (ex.: 15 req/5min) e auditoria com hash, sem PII.
  - CORS robusto: responde OPTIONS 200; permite dev em localhost/127.0.0.1; Access‑Control‑* completos.
  - Lógica de classificação (robusta):
    1. Busca a última matrícula por student_cpf_digits em enrollments e classifica current_year vs previous_year pelo created_at.
    2. Se não encontrar, verifica em previous_year_students por student_cpf_digits + academic_year (ano anterior).
- Benefício: elimina ambiguidade de máscara, e evita depender exclusivamente de janelas de data frágeis.

### 3) Fase 1 — Edge Function get_previous_year_student
- Objetivo: fornecer prefill do ano anterior com verificação de identidade.
- Implementação:
  - Busca por student_cpf_digits + academic_year do ano anterior (robusto contra máscara).
  - Verificação de identidade via birth_date_hint (DD/MM) em relação à data de nascimento do aluno.
  - CORS robusto (OPTIONS 200, headers completos, sem redirecionar), auditoria (hash cpf), sem retorno de PII desnecessária.

### 4) Fase 3 — Frontend (Hook e UI de validação)
- Hook useStudentValidation:
  - Chamada ao Edge validate_cpf; logs detalhados (dev) com status de retorno e tempo.
  - Cancela requisições anteriores, 1 retry leve em falhas transitórias.
  - Fallback de transporte: em caso de erro no invoke, tenta fetch direto com URL corrigida (apenas diagnóstico).
- Página Identificação:
  - Botão “Validar CPF” → usa useStudentValidation e redireciona:
    - current_year → mensagem; previous_year → /rematricula com state { cpf }; not_found → /nova-matricula.
  - Acessibilidade (aria-live), ajuda textual e mensagens neutras.

### 5) Fase 2 — Mapeamento de Dados e Estado do Formulário
- Serviço PreviousYearService.getPrefill(cpf, birth_hint) → chama get_previous_year_student.
- Mapeador mapPreviousYearToEnrollmentForm → adapta o prefill ao EnrollmentFormData do useEnrollmentForm.
- Hook useRematriculaForm:
  - Carrega prefill e reseta o formulário com dados.
  - Proteções anti-duplicidade e paralelismo: lastKey (cpf|birthDateHint) e inflight flag.
  - Observação importante: removido auto‑load em useEffect; prefill agora só carrega mediante ação explícita (clique “Carregar dados”).

### 6) Fase 3 — Progressão Acadêmica
- Hook useAcademicProgression:
  - Integra com useSeries(escola) e useTracks.
  - Recomenda série via heurística (número no nome/ordem) e aplica defaults (série/trilho/turno) com null‑safety.
  - Inicialização única: initializedRef garante que os defaults não sejam re‑aplicados a cada render.

### 7) Fase 4 — Descontos (Manter/Alterar e Revalidar)
- Hook useRematriculaDiscounts:
  - Estratégia “keep_previous”: mantém descontos anteriores apenas se elegíveis (CEP e regras de trilhos).
  - Busca descontos ativos e lista documentos requeridos pelos descontos selecionados.
  - Expõe previousIneligible (códigos inelegíveis) e canMaintainPrevious.

### 8) Fase 5 — One‑Page de Rematrícula (UI)
- Página OnePageRematricula:
  - Seções: Identificação (CPF + DD/MM), Aluno (somente leitura), Responsáveis (editáveis), Endereço, Acadêmico (com recomendação), Descontos (com estratégia), Resumo Financeiro e Ações (Enviar/Limpar).
  - Renderiza o formulário apenas quando ready (prefill carregado); evita loops/pagamentos de estado antes do prefill.

---

## Problemas Observados (com evidências de console/Network)

### A) Preflight CORS falhando em get_previous_year_student
- Mensagem típica: “Ensure preflight responses are valid”, “HTTP status of preflight request didn’t indicate success”.
- Efeito: POST é bloqueado; o frontend tenta novamente (por feedback do componente), causando múltiplos OPTIONS/POST.
- Observação: Ajustes de CORS foram implementados no código das functions; é necessário garantir a publicação/execução no projeto correto do Supabase (sem redirects; status 200 no OPTIONS; headers completos).

### B) Logs repetidos de useSeries/useTracks (sensação de loop)
- Repetição de logs “Hook chamado…/Filtrando…”
- Mitigação aplicada:
  - useAcademicProgression agora aplica defaults uma única vez (initializedRef), evitando re‑aplicar série/trilho/turno a cada render.
  - useRematriculaForm não dispara mais auto‑load no mount; somente no clique “Carregar dados”, com bloqueio por inflight+lastKey.
- Continua havendo ruído se a função de prefill falhar (cada tentativa visível no console), porém o lado de UI já foi estabilizado.

### C) Matching de CPF por máscara
- Caso real: student_cpf salvo com máscara (“623.018.700-06”) e consulta por dígitos (“62301870006”).
- Correção aplicada: matching por student_cpf_digits (migração 022) e queries ajustadas nas functions.

### D) Ambiguidade de ambiente
- Sintomas: função retorna not_found para CPFs existentes; preflight falha repetidamente.
- Causas possíveis:
  - Functions e banco em projetos diferentes; service role ausente; CORS em funções não publicados.

---

## Hipóteses de Causa‑Raiz
- Funções não publicadas (ou publicadas em projeto diferente) com CORS incompleto.
- Secrets das funções ausentes/erradas (SUPABASE_SERVICE_ROLE_KEY), levando a falhas silenciosas.
- Migrations (especialmente 022) não aplicadas no mesmo banco usado pelas functions.
- Front reagindo a falhas do backend e tentando novamente (mitigado) → ruído de logs.

---

## Estado Atual (onde paramos)
- Backend (código):
  - validate_cpf e get_previous_year_student com CORS (OPTIONS 200) e matching por CPF dígitos; auditoria e rate limiting ativos.
  - Migração 022 pronta para normalizar CPFs e índices.
- Frontend:
  - Hooks ajustados para evitar loops; carregamento de prefill apenas por ação do usuário; progressão acadêmica inicializada uma única vez.
- Persistem erros no ambiente do usuário:
  - Preflight CORS falha em get_previous_year_student; múltiplos OPTIONS sem 2xx (ou com headers incompletos) causam tentativas subsequentes e ruído no console.
- Conclusão: o gargalo agora é operacional (deploy/configuração), não de lógica/código.

---

## Plano de Ação (Passo a Passo, explícito)

### 1. Publicar as Funções no projeto correto
- validate_cpf, get_previous_year_student:
  - Confirmar no Dashboard do Supabase (mesmo projeto do banco de dados).
  - Em Secrets, setar SUPABASE_SERVICE_ROLE_KEY.
  - CORS: garantir que OPTIONS retorne 200 e sem redirect; Allow-Origin ecoe o Origin (localhost em dev), Allow-Methods inclua POST, OPTIONS; Allow-Headers inclua content-type, apikey, authorization, x-supabase-auth, x-requested-with, x-client-info.

### 2. Aplicar as Migrações 020, 021 e 022 no mesmo projeto do banco
- Confirmar presença de student_cpf_digits:
  - SELECT column_name FROM information_schema.columns WHERE table_name='enrollments' AND column_name='student_cpf_digits';
  - SELECT column_name FROM information_schema.columns WHERE table_name='previous_year_students' AND column_name='student_cpf_digits';
- Confirmar índices:
  - SELECT indexname FROM pg_indexes WHERE tablename='enrollments' AND indexname='idx_enrollments_cpf_digits';

### 3. Diagnóstico de CORS independente do app
- OPTIONS /functions/v1/get_previous_year_student:
  - Headers de requisição: Origin (http://localhost:8080 ou 8081), Access-Control-Request-Method: POST, Access-Control-Request-Headers: content-type, apikey, authorization, x-supabase-auth, x-requested-with.
  - Resposta esperada: 200 com Access-Control-Allow-… completos; sem redirect.
- POST (com apikey/authorization) deve retornar 200 e payload (ou 403/404 coerentes), não CORS.

### 4. Alinhamento de ambiente
- Validar que frontend, funções e banco usam o mesmo projeto Supabase (mesmo project-ref no domínio).
- ANON_KEY do front e SERVICE_ROLE das funções pertencem ao mesmo projeto.

### 5. Frontend — verificação pós‑backend
- Em /rematricula:
  - Clicar uma única vez “Carregar dados” (sem auto‑load); ver OPTIONS 200 e POST 200/403/404.
  - Confirmar que os defaults acadêmicos são aplicados uma única vez (sem re‑aplicações a cada render).
- Em /identificacao:
  - Validar CPF; ver status e tempo no console; sem loops.

---

## Validação Final (quando backend estiver estável)
- validate_cpf:
  - 'current_year' para matrículas do ano corrente.
  - 'previous_year' para matrículas válidas do ano anterior.
  - 'not_found' caso contrário.
- get_previous_year_student:
  - Retorna o prefill do aluno do ano anterior se DD/MM estiver correto; respeita CORS em OPTIONS e POST.
- UI One‑Page:
  - Prefill carrega sem loops; aplica defaults acadêmicos apenas uma vez; lista documentos; envia rematrícula.

---

## Observações Finais
- O problema visual de “slashes” no log do CLI foi desconsiderado conforme orientação — não influencia o comportamento real do app.
- O front foi reforçado para evitar loops; o que resta para estabilização é publicação/configuração de CORS/Secrets/Migrações no projeto Supabase efetivamente em uso.
- Uma vez que o preflight retorne 200 e as funções respondam, o ruído no console deve cessar e o fluxo operar normalmente.

---

## Anexos — Exemplos de Teste (texto)

### A) SQL — confirmar CPF por dígitos (após migração 022)
```
SELECT id, student_cpf, student_cpf_digits, created_at
FROM public.enrollments
WHERE student_cpf_digits = '10524864608'
ORDER BY created_at DESC
LIMIT 3;
```

### B) Preflight OPTIONS — get_previous_year_student
- Requisição (cURL genérica):
```
curl -i -X OPTIONS \
  -H "Origin: http://localhost:8081" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: content-type, apikey, authorization, x-supabase-auth, x-requested-with" \
  https://<project>.supabase.co/functions/v1/get_previous_year_student
```
- Resposta esperada:
  - 200 OK
  - Access-Control-Allow-Origin: http://localhost:8081
  - Access-Control-Allow-Methods: POST, OPTIONS
  - Access-Control-Allow-Headers: content-type, apikey, authorization, x-supabase-auth, x-requested-with, x-client-info
  - Access-Control-Allow-Credentials: true

### C) POST — get_previous_year_student
```
curl -i -X POST \
  -H "Content-Type: application/json" \
  -H "apikey: <ANON_KEY>" \
  -H "authorization: Bearer <ANON_KEY>" \
  -d '{"cpf":"105.248.646-08", "birth_date_hint":"18/03"}' \
  https://<project>.supabase.co/functions/v1/get_previous_year_student
```
- Esperado: 200 com payload de prefill (ou 403/404 coerentes, nunca CORS/preflight).

---

## Onde ParamOS AGORA (Resumo Executivo)
- Código (repo) pronto: funções com CORS e matching por dígitos; migrations para normalização; frontend estabilizado contra loops.
- Erros persistentes: preflight CORS da função get_previous_year_student falha no ambiente atual do usuário, gerando múltiplas tentativas e ruído no console.
- Próxima ação crítica: publicar funções e aplicar migrations no mesmo projeto Supabase (com Secrets corretos), validar OPTIONS 200 e POST 200/4xx coerentes. Em seguida, o fluxo de rematrícula tende a operar de ponta a ponta.
