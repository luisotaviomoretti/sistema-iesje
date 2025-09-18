# ADR-001 — Classificação de `tag_matricula` no Servidor (Trigger BEFORE INSERT)

Status: Accepted (Fase 1)
Data: 2025-09-11
Autor: Equipe IESJE — Matrículas

## Contexto

Na Fase 0 (pré-checagens), constatamos que:
- A coluna `public.enrollments.tag_matricula` (enum `public.tag_matricula_enum`) existe.
- A função RPC `public.enroll_finalize(p_enrollment jsonb, p_discounts jsonb, p_client_tx_id uuid)` insere em `public.enrollments`, porém sua whitelist de colunas não inclui `tag_matricula` (migrations `025`/`026`).
- Distribuição recente mostra maioria de matrículas com `tag_matricula = NULL`, coerente com o uso predominante da RPC.
- O frontend por vezes envia `tag_matricula` no payload (novo aluno/rematrícula), mas a RPC ignora esse campo.

Problema: As flags de origem não estão sendo gravadas de forma consistente para novas matrículas.

## Decisão

Centralizar a classificação de `tag_matricula` no servidor, via gatilho BEFORE INSERT em `public.enrollments`, utilizando `student_cpf_digits` para cruzar com `public.previous_year_students.student_cpf_digits`.

Detalhes da decisão:
- O gatilho irá definir `NEW.tag_matricula` como:
  - `'rematricula'` se existir match por `student_cpf_digits` em `previous_year_students`.
  - `'novo_aluno'` caso contrário.
- Política de sobrescrita: sempre sobrescrever o valor enviado pelo cliente (fonte única da verdade). Motivos:
  - Reduz acoplamento com frontend.
  - Garante consistência para qualquer via (RPC/INSERT direto).
  - Evita estados divergentes em diferentes clientes/versões.
- Imutabilidade: a `tag_matricula` deve ser tratada como imutável após o INSERT. A ativação de um gatilho de proteção BEFORE UPDATE será avaliada após estabilização em produção (janela de 48–72h). Até lá, manteremos a possibilidade de correção manual por administradores caso necessário.
- A RPC `public.enroll_finalize` não terá sua assinatura alterada. Ela continuará inserindo nos campos existentes e se beneficiará do gatilho no momento do INSERT.

## Segurança e RLS

- A função de gatilho será `SECURITY DEFINER` e terá `SET search_path = public, pg_temp` para garantir resolução segura de objetos.
- O owner da função deverá possuir permissão de leitura em `public.previous_year_students`. Caso haja RLS na tabela de referência, revisar se o definer/owner atende os requisitos sem mudanças disruptivas nas policies.
- Nenhuma alteração nas RLS de `public.enrollments` está prevista.

## Consequências

- Simplificação do frontend: ele deixa de decidir/apontar a origem; qualquer payload incompleto ou divergente será corrigido no servidor.
- Comportamento uniforme: RPC e INSERT direto passam a ter o mesmo resultado para `tag_matricula`.
- Dependência de dados de referência: a acurácia depende da qualidade/atualização de `previous_year_students`. Será incluída verificação de cobertura/anual.

## Alternativas consideradas

1) Incluir `tag_matricula` na whitelist da RPC e confiar no frontend.
   - Contras: mantém acoplamento e risco de inconsistência entre vias de inserção; múltiplos clientes/versões podem divergir.

2) Criar nova RPC que derive a flag server-side e deprecar a antiga.
   - Contras: aumenta superfície pública e esforço de migração, sem benefício adicional frente ao gatilho.

3) Derivar a flag no frontend (como hoje) e apenas reforçar validações.
   - Contras: frágil e sujeita a divergências; não cobre outros caminhos (p.ex., inserts diretos).

A opção do gatilho BEFORE INSERT atinge o mesmo objetivo com menor disrupção e maior robustez.

## Plano de implementação (resumo das fases seguintes)

- Fase 2 (DEV): criar migração `03x_set_enrollment_tag_trigger.sql` contendo:
  - Função `public.set_enrollment_tag_from_previous_year()` (SECURITY DEFINER, search_path controlado).
  - `TRIGGER BEFORE INSERT` em `public.enrollments`.
  - (Opcional) Função + gatilho de imutabilidade, a ativar numa segunda migração após validação em PROD.
- Fase 3 (DEV): testes com BEGIN/ROLLBACK cobrindo RPC e INSERT direto, CPF com e sem match; casos de borda (máscara, duplicidade).
- Fase 4 (STG): deploy + amostras reais; métricas agregadas.
- Fase 5 (PROD): janela curta + smoke tests + monitoramento inicial.
- Fase 6 (Backfill): executar `supabase/backfill_029_tag_matricula.sql` Passo 1 (rematrícula por match) para histórico.
- Fase 8 (Limpeza frontend): remover `tag_matricula` dos payloads e atualizar `docs/rpc-enroll-finalize.md` para refletir classificação server-side.

## Métricas e observabilidade

- Consultas periódicas (7 e 30 dias) para distribuição por `tag_matricula` e detecção de `NULL` em novos registros (esperado ≈ 0 após a mudança).
- Alerta diário se `NULL` em novas matrículas exceder limiar (ex.: > 3/dia).

## Rollback

- Remover o trigger (`DROP TRIGGER`) e manter a função para auditoria/ajustes ou removê-la (`DROP FUNCTION`) conforme necessário. Nenhuma alteração estrutural adicional precisa ser revertida.

## Itens de validação prévia (pré-Fase 2)

- Confirmar existência/índice de `student_cpf_digits` em `enrollments` e `previous_year_students` (migração 022).
- Confirmar grants/RLS para que o definer tenha leitura em `previous_year_students`.
- Aprovar este ADR com a equipe e stakeholders.
