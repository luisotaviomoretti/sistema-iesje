# Guia de Deploy - Sistema IESJE no Vercel

Este guia fornece um passo a passo detalhado para realizar o deploy do Sistema de Matrículas e Descontos do IESJE na plataforma Vercel.

## 📋 Pré-requisitos

### Tecnologias Utilizadas
- **Frontend**: React 18 + TypeScript + Vite
- **Database**: Supabase (PostgreSQL)
- **Hosting**: Vercel
- **Repositório**: GitHub

### Contas Necessárias
- [x] Conta no GitHub
- [x] Conta no Vercel ([vercel.com](https://vercel.com))
- [x] Projeto Supabase configurado

## 🗄️ Preparação do Banco de Dados (Supabase)

### 1. Verificar Projeto Supabase
```bash
# Confirmar que o projeto Supabase está funcionando
npx supabase status
```

### 2. Aplicar Migrações Pendentes
```bash
# Aplicar todas as migrações ao banco de produção
npx supabase db push
```

### 3. Configurar RLS (Row Level Security)
Verificar se todas as políticas de segurança estão aplicadas:
- Tabelas de usuários administrativos
- Tabelas de matrículas
- Tabelas de descontos
- Tabelas de inadimplência

### 4. Anotar Credenciais do Supabase
Acesse o painel do Supabase e anote:
- **Project URL**: `https://snebguohzjgkouqweavx.supabase.co
- **Anon Key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNuZWJndW9oempna291cXdlYXZ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY1NzQyODcsImV4cCI6MjA3MjE1MDI4N30.trSMI_hGT1sT3yGQuG7i3_lPwlIe1csmIBh6XA9Ikk8`
- **Service Role Key**: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNuZWJndW9oempna291cXdlYXZ4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjU3NDI4NywiZXhwIjoyMDcyMTUwMjg3fQ.ftH4MotV9aZl9MoMmX4HP4eVmmnt6_6Y6LWsn-HTsXk

## 📁 Preparação do Código

### 1. Limpeza do Projeto
```bash
# Remover arquivos de build anteriores
rm -rf dist/
rm -rf node_modules/.vite/

# Reinstalar dependências
npm ci
```

### 2. Teste Local de Build
```bash
# Testar build de produção
npm run build

# Verificar se não há erros
npm run preview
```

### 3. Configurar Variáveis de Ambiente
Criar arquivo `.env.production` (NÃO commitar):
```env
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 4. Verificar Configuração do Vite
Confirmar que `vite.config.ts` está configurado corretamente:
```typescript
// vite.config.ts deve ter a configuração atual
export default defineConfig(({ mode }) => ({
  // Configurações atuais estão corretas
}));
```

## 🐙 Upload para GitHub

### 1. Preparar Repositório
```bash
# Verificar status atual
git status

# Adicionar mudanças finais
git add .

# Commit final antes do deploy
git commit -m "🚀 Preparação para deploy em produção"
```

### 2. Criar/Verificar Repositório no GitHub
```bash
# Se ainda não existir, criar repositório remoto
# Ir para github.com e criar novo repositório: familia-desconto-iesje

# Adicionar remote origin (se necessário)
git remote add origin https://github.com/SEU_USUARIO/familia-desconto-iesje.git

# Push para o GitHub
git push -u origin main
```

### 3. Configurar .gitignore
Verificar se o arquivo `.gitignore` inclui:
```gitignore
# Variáveis de ambiente
.env
.env.local
.env.production
.env.development

# Build
dist/
dist-ssr/

# Cache do Vite
node_modules/.vite/
```

## 🚀 Deploy no Vercel

### 1. Conectar GitHub ao Vercel

1. Acesse [vercel.com](https://vercel.com)
2. Faça login com sua conta GitHub
3. Clique em **"New Project"**
4. Selecione o repositório `familia-desconto-iesje`
5. Clique em **"Import"**

### 2. Configurar Build Settings

Na página de configuração do projeto:

**Framework Preset**: `Vite`
**Build Command**: `npm run build`
**Output Directory**: `dist`
**Install Command**: `npm ci`

### 3. Configurar Variáveis de Ambiente

Na seção **Environment Variables**, adicione:

| Name | Value |
|------|-------|
| `VITE_SUPABASE_URL` | `https://seu-projeto.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` |

⚠️ **IMPORTANTE**: Use as mesmas variáveis para todos os ambientes (Production, Preview, Development)

### 4. Configurações Avançadas

**Node.js Version**: `18.x` (recomendado)
**Build & Development Settings**:
- Build Command: `npm run build`
- Output Directory: `dist`
- Install Command: `npm ci`

### 5. Deploy Inicial
1. Clique em **"Deploy"**
2. Aguarde o processo de build (2-5 minutos)
3. Verifique se não há erros no log

## 🔧 Configuração Pós-Deploy

### 1. Configurar Domínio Personalizado (Opcional)
1. Na dashboard do Vercel, vá em **Settings** > **Domains**
2. Adicione seu domínio personalizado
3. Configure os DNS conforme instruções

### 2. Configurar CORS no Supabase
No painel do Supabase:
1. Vá em **Settings** > **API**
2. Em **CORS origins**, adicione:
   - `https://seu-app.vercel.app`
   - `https://seu-dominio-personalizado.com` (se aplicável)

### 3. Testar Funcionalidades

Verificar se funcionam corretamente:
- [x] Login de estudantes/responsáveis
- [x] Sistema de identificação por CPF
- [x] Processo de matrícula
- [x] Sistema de descontos
- [x] Área administrativa
- [x] Geração de PDFs
- [x] Validação de documentos

### 4. Configurar Monitoramento

**Vercel Analytics** (Opcional):
1. Vá em **Analytics** no dashboard
2. Ative o monitoramento
3. Configure alertas de performance

## 🚨 Resolução de Problemas

### Build Failures

**Erro de TypeScript**:
```bash
# Executar localmente para diagnosticar
npm run build
npx tsc --noEmit
```

**Erro de importação**:
- Verificar paths relativos
- Confirmar alias `@/*` no `vite.config.ts`

### Problemas de Conectividade

**Erro de conexão com Supabase**:
1. Verificar variáveis de ambiente no Vercel
2. Testar URLs e keys no console do browser
3. Verificar CORS no Supabase

**Erro 404 em rotas**:
Adicionar arquivo `vercel.json` na raiz:
```json
{
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

### Performance Issues

**Bundle muito grande**:
```bash
# Analisar bundle
npm run build -- --analyze
```

**Problemas de carregamento**:
- Implementar lazy loading
- Otimizar imagens
- Configurar cache headers

## 📊 Monitoramento e Manutenção

### 1. Logs e Debugging
- **Vercel Functions**: Dashboard > Functions > Logs
- **Runtime Logs**: Dashboard > Project > Functions tab
- **Build Logs**: Deployments tab

### 2. Atualizações Contínuas
```bash
# Workflow para atualizações
git add .
git commit -m "feat: nova funcionalidade"
git push origin main
# Deploy automático no Vercel
```

### 3. Backup e Rollback
- **Rollback**: Dashboard > Deployments > Promote previous deployment
- **Backup**: Manter branches estáveis no GitHub

## 🔐 Considerações de Segurança

### 1. Variáveis de Ambiente
- NUNCA commitar `.env` files
- Usar apenas variáveis `VITE_*` no frontend
- Manter service role keys seguras

### 2. CORS e CSP
- Configurar origins permitidos no Supabase
- Implementar Content Security Policy se necessário

### 3. Rate Limiting
- Monitorar uso da API Supabase
- Implementar rate limiting nas edge functions se necessário

## 📝 Checklist Final

### Pré-Deploy
- [x] Banco Supabase configurado e testado
- [x] Build local funciona sem erros
- [x] Variáveis de ambiente documentadas
- [x] Código enviado para GitHub

### Durante Deploy
- [x] Projeto importado no Vercel
- [x] Variáveis de ambiente configuradas
- [x] Build settings corretos
- [x] Deploy executado com sucesso

### Pós-Deploy
- [x] Aplicação acessível via URL
- [x] Todas funcionalidades testadas
- [x] CORS configurado no Supabase
- [x] Monitoramento ativo

## 🎯 URLs Importantes

- **Aplicação**: `https://seu-app.vercel.app`
- **Dashboard Vercel**: `https://vercel.com/dashboard`
- **Supabase Dashboard**: `https://app.supabase.com`
- **Repositório GitHub**: `https://github.com/seu-usuario/familia-desconto-iesje`

---

**🔥 DICA PRO**: Mantenha este documento atualizado conforme novas funcionalidades forem adicionadas ao sistema. O processo de deploy deve ser repetível e documentado.

**⚡ DEPLOY RÁPIDO**: Após a configuração inicial, deploys futuros são automáticos via git push!