# ADR 002 — Rematrícula cross-school e modal da Home

- Status: Accepted
- Data: 2025-09-12 06:35 -03:00
- Relacionado: `familia-desconto-iesje/ajustes-rematricula.md`, `familia-desconto-iesje/PLANO_CLASSIFICACAO_TAG_MATRICULA_SERVIDOR.md`

## Contexto

Precisamos ajustar o fluxo de Rematrícula para lidar com dois pontos:
1) Na Home, quando o CPF informado existir em `previous_year_students`, exibir um aviso profissional informando a escola atual do aluno e solicitar confirmação para prosseguir.
2) No fluxo de Rematrícula, quando o CPF pertencer a outra escola (origem diferente da escola do usuário logado), seguir o fluxo normalmente, mas a escola de destino deve ser a escola do usuário logado — refletindo no card de dados do aluno e na submissão para `public.enrollments`.

Requisitos não funcionais:
- Execução super segura, diligente e inteligente.
- Sem mudanças disruptivas na arquitetura Supabase-first.
- Respeitar RLS; manter a integridade dos dados.
- Rollout com feature flags e kill switch.

## Decisão

1. Escola de destino (default): será sempre a escola do usuário logado (`school_id_session`).
   - A submissão para `public.enrollments` utilizará `school_id = school_id_session` após confirmação do usuário no caso cross-school.

2. Modal da Home (CPF encontrado em PYS): será exibido um aviso profissional com a escola de origem e botões “Prosseguir” e “Cancelar”.
   - Texto base: “Identificamos que o CPF informado consta como aluno atualmente vinculado à escola {ESCOLA_ORIGEM}. Deseja prosseguir para a rematrícula nesta unidade?”
   - Texto cross-school: “Atenção: o aluno está vinculado à escola {ESCOLA_ORIGEM}. Ao prosseguir, a rematrícula será registrada nesta unidade ({ESCOLA_DESTINO}). Deseja continuar mesmo assim?”

3. Política de permissão/RLS: manteremos a RLS restritiva para inserir matrículas somente na escola do usuário logado.
   - Inserções em outras escolas não serão suportadas pelo fluxo regular; dependem de perfis administrativos e não fazem parte desta decisão.

4. Auditoria: será obrigatória em PROD para o evento “prosseguir” em caso cross-school; opcional em DEV/STG durante desenvolvimento inicial.
   - Campos mínimos: `cpf_digits`, `user_id`, `school_id_origin`, `school_id_session`, `proceeded`, `timestamp`, `context`.

5. Feature flags: os recursos serão protegidos por flags, com ativação gradual (kill switch disponível):
   - `modal_cpf_warning_enabled`
   - `rematricula_cross_school_enabled`
   - `audit_cross_school_enabled`

6. RPCs e Backend: criaremos uma função read-only `public.get_previous_school_by_cpf(p_cpf_digits)` para obter a escola de origem e melhorar a UX do modal.
   - Nenhuma mudança na assinatura pública da RPC `enroll_finalize`.
   - A classificação `tag_matricula` permanece server-side via trigger BEFORE INSERT sobre `public.enrollments`.

## Alternativas Consideradas

- A) Não exibir modal na Home e decidir tudo no backend: rejeitada por UX e por falta de consentimento explícito em casos cross-school.
- B) Permitir inserção direta na escola de origem quando diferente da escola do usuário logado: rejeitada para o fluxo regular; conflita com RLS e aumenta risco operacional. Pode ser tratado por processo administrativo separado.
- C) Alterar `enroll_finalize` para aceitar e forçar `school_id_origin`: rejeitada para evitar mudanças disruptivas e duplicidade de responsabilidade. A escola de destino deve ser a do operador.

## Consequências

- Mantemos a integridade e a segurança de RLS, simplificando o mental model: cada operador registra matrículas em sua própria escola.
- A UX esclarece ao operador quando está diante de um aluno vinculado a outra escola.
- A auditoria garante rastreabilidade das confirmações cross-school.
- Zero mudança de assinatura em RPCs críticas, reduzindo risco de regressão.

## Plano de Rollout

1. DEV
   - Implementar `get_previous_school_by_cpf` (read-only) e o modal da Home atrás de flag.
   - Ajustar o card da Rematrícula para exibir “Escola de destino” = escola do usuário + “Origem: {ESCOLA_ORIGEM}” quando houver.
   - Garantir submissão com `school_id_session` após confirmação.
   - Ativar auditoria opcionalmente.

2. STAGING
   - Publicar backend e frontend com flags inicialmente desligadas.
   - Ativar `modal_cpf_warning_enabled` para equipe piloto e avaliar UX.
   - Ativar `rematricula_cross_school_enabled` gradualmente; acompanhar métricas e logs de RLS.
   - Se aprovado, ativar `audit_cross_school_enabled`.

3. PRODUÇÃO (janela de baixo risco)
   - Ativar `modal_cpf_warning_enabled` globalmente.
   - Ativar `rematricula_cross_school_enabled` gradualmente (por escola ou por grupo de usuários).
   - Auditoria obrigatória em PROD.

## Observabilidade e Métricas

- Contagem de modais exibidos (por escola, por operador).
- Taxa de prosseguimento vs. cancelamento em casos cross-school.
- Tempo médio entre exibição do modal e submissão.
- Erros de RLS relacionados à inserção em `enrollments`.

## Backout Plan

- Desligar as flags (`kill switch`).
- Frontend volta a não exibir modal e a não destacar origem/destino.
- A função `get_previous_school_by_cpf` é read-only e pode permanecer sem causar efeitos colaterais.
- Auditoria pode ser mantida para histórico.

## Considerações de Segurança e Privacidade

- Minimizar exposição de PII: usar `cpf_digits` e exibir apenas informações necessárias no modal.
- Restringir acesso às tabelas de referência com RLS ou funções `SECURITY DEFINER` bem configuradas (`SET search_path = public, pg_temp`).
- Aplicar logs/auditoria com retenção conforme política interna.

## Ações Relacionadas (não parte desta ADR, mas correlatas)

- `docs/prechecks_rematricula_cross_school.sql` para validar schema/índices/RLS e baseline.
- Implementar tabela de auditoria `public.rematricula_cross_school_audit` (opcional, recomendada).
- Atualizar documentação de frontend com os textos aprovados do modal.
