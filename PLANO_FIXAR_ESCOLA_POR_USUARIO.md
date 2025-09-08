# Plano: Fixar campo \"Escola\" por usuário na Nova Matrícula

Objetivo: No fluxo de aluno novo (página \"Dados do Aluno\"), preencher e travar o campo `Escola` conforme a escola associada ao usuário logado no Sistema de Matrículas, garantindo mínimo impacto à arquitetura e preservando funcionalidades existentes.

## Escopo e Premissas
- Escopo: Fluxo \"Nova Matrícula\" (`src/features/matricula-nova`), especificamente o Step \"Dados do Aluno\" (`StudentFormStep`) e o estado global do formulário (`useEnrollmentForm`).
- Fonte da verdade do usuário: tabela `public.matricula_users` (campo `escola` com valores: `Pelicano` | `Sete de Setembro`).
- Mapeamento para o formulário: `student.escola` usa enum minúsculo: `pelicano` | `sete_setembro`.
- Autenticação/Contexto disponível: hooks existentes `useMatriculaAuth` (retorna `matriculaUser.escola`) e RLS já configuradas para coerência de escola.
- Não alterar o schema nem políticas por padrão (hardening opcional).

## Requisitos Funcionais
- Ao carregar o Step \"Dados do Aluno\":
  - Se o usuário logado for de matrícula (possui vínculo ativo em `matricula_users`), preencher `student.escola` automaticamente com base em sua escola e travar o campo para edição.
  - Se não houver usuário de matrícula (admin ou anônimo), manter o comportamento atual (campo editável, com validação usual).
- O valor de `student.escola` deve propagar corretamente para:
  - Filtragem de séries no Step acadêmico (já depende de `student.escola`).
  - Persistência em `enrollments.student_escola` via `EnrollmentApiService` (já mapeado).

## Requisitos Não Funcionais
- Mudanças mínimas, localizadas e com baixo risco.
- Não quebrar rotas/admin nem fluxos existentes.
- Sem dependência de novas libs.

## Decisões de Design (mínimo impacto)
1. Obter a escola do usuário via `useMatriculaAuth` (já retorna `matriculaUser.escola`).
2. Criar um util de mapeamento para converter `Pelicano` | `Sete de Setembro` -> `pelicano` | `sete_setembro` (e vice-versa se necessário).
3. Preencher `student.escola` no estado do formulário (`useEnrollmentForm`) quando:
   - Carregar a sessão e o campo ainda estiver vazio; e
   - Somente para usuários de matrícula (não admins).
4. Travar a UI do campo `Escola` no `StudentFormStep` quando houver valor proveniente de sessão de matrícula:
   - Exibir `Select` desabilitado com o valor resolvido; e
   - Exibir um hint/tooltip “Definido pelo seu perfil” para clareza.
5. Fallbacks:
   - Se não houver sessão de matrícula ou o registro não tiver `escola`, manter campo editável.
   - Admins: manter campo editável (admin pode criar para qualquer escola).

## Fases de Implementação

### Fase 0 — Levantamento e Confirmação
- Confirmar arquivos-alvo:
  - `src/features/matricula-nova/components/steps/StudentFormStep.tsx`
  - `src/features/matricula-nova/hooks/useEnrollmentForm.ts`
  - (Novo) `src/features/matricula-nova/utils/escola.ts` (map/guards)
- Confirmar mapeamentos existentes e dependências:
  - `useSeries(escola: 'pelicano' | 'sete_setembro')` já usa enum minúsculo.
  - `EnrollmentApiService` já persiste `student_escola` a partir do form.

### Fase 1 — Utilitário de Mapeamento (novo arquivo)
- Criar `mapMatriculaUserEscolaToFormValue(s: 'Pelicano' | 'Sete de Setembro'): 'pelicano' | 'sete_setembro'`.
- Criar `labelFromFormValue(s: 'pelicano' | 'sete_setembro'): 'Colégio Pelicano' | 'Instituto Sete de Setembro'` (para UX consistente).
- Exportar também guardas `isMatriculaEscola(s: string)` e `isFormEscola(s: string)` para robustez.

### Fase 2 — Preenchimento Automático no Estado do Formulário
- Em `useEnrollmentForm`:
  - Importar `useMatriculaAuth` e o util de mapeamento.
  - Efeito (useEffect) dependente da sessão de matrícula:
    - Se `session?.matriculaUser?.escola` existir e `form.getValues('student.escola')` estiver vazio, aplicar `form.setValue('student.escola', mapped)` com `shouldValidate: true` e `shouldDirty: false`.
  - Garantir que esse preenchimento não sobrescreva uma escolha manual pré-existente (somente quando vazio).
  - Isso garante a propagação automática para o hook `useSeries(escolaSelecionada)` sem acoplamento adicional.

### Fase 3 — Trava da UI no Step \"Dados do Aluno\"
- Em `StudentFormStep`:
  - Importar `useMatriculaAuth` e util de mapeamento/label.
  - Determinar `isLocked = Boolean(session?.matriculaUser?.escola)`.
  - Resolver `value` mapeado e label para renderizar.
  - Renderizar o `Select` com `disabled={isLocked}` e explicitar hint “Definido pela sua escola de usuário”.
  - Opcional: quando travado, exibir também um `Badge`/texto read-only com a unidade para reforço visual.

### Fase 4 — Testes e Validação
- Casos manuais:
  - Usuário de matrícula Pelicano: campo auto-preenchido com `pelicano`, Select desabilitado; Step acadêmico lista somente séries do Pelicano; matrícula persistida com `student_escola = 'pelicano'`.
  - Usuário de matrícula Sete de Setembro: idem para `sete_setembro`.
  - Usuário admin: campo editável; persistência respeita seleção manual; Step acadêmico filtra pela seleção.
  - Usuário anônimo (se conseguir chegar à página): campo editável.
- Verificações técnicas:
  - `useEnrollmentForm` não entra em loop; efeito só dispara quando vazio e sessão carregada.
  - `EnrollmentApiService` recebe o valor correto em `mapFormToDatabase*`.
  - RLS não quebra operações (consultas e inserts continuam válidos conforme escola).

### Fase 5 — Hardening (Opcional, sem alterar arquitetura atual por padrão)
- Trigger/Constraint no banco para forçar `student_escola` a coincidir com a escola do `matricula_user` corrente (quando `auth.role = authenticated` e há vínculo):
  - Vantagem: evita adulteração cliente.
  - Risco: precisa de migração nova; manter fora do escopo mínimo, documentado para etapa posterior.

### Fase 6 — Documentação
- Atualizar README/Notas internas sobre:
  - Comportamento do campo Escola por perfil do usuário.
  - Mapeamentos de valores e seus usos (UI, filtros, persistência).
  - Como testar em ambientes com diferentes perfis.

## Arquivos a Alterar/Criar (cirúrgico)
- Alterar: `src/features/matricula-nova/hooks/useEnrollmentForm.ts`
- Alterar: `src/features/matricula-nova/components/steps/StudentFormStep.tsx`
- Novo: `src/features/matricula-nova/utils/escola.ts`

## Riscos e Mitigações
- Inconsistência de valores (capitalização/strings):
  - Mitigar com util de mapeamento + tipos explícitos.
- Sessão de matrícula atrasada (carregamento assíncrono):
  - Efeito aplicado apenas quando sessão disponível e campo vazio.
- Admins precisando matricular em outra escola:
  - Campo permanece editável para admins.

## Critérios de Aceite
- Usuário de matrícula não consegue alterar a escola no Step \"Dados do Aluno\" e o valor corresponde ao seu cadastro.
- A seleção de séries no Step acadêmico reflete a escola resolvida.
- Matrículas persistidas têm `student_escola` correto.
- Admin mantém liberdade para escolher a escola manualmente.

## Checklist de Entrega
- [ ] Util de mapeamento criado e coberto por testes unitários simples (se aplicável).
- [ ] Auto-preenchimento implementado em `useEnrollmentForm` (sem sobrescrever manual).
- [ ] Trava de UI implementada em `StudentFormStep` com mensagens claras.
- [ ] Verificações manuais executadas com perfis Pelicano/Sete/Admin.
- [ ] Documentação das mudanças.

## Rollout
- Deploy simples (frontend); sem migrações por padrão.
- Observação pós-deploy: validar inserções recentes e filtros de séries por escola.

