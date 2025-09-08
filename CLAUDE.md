# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Sistema de Matrículas e Descontos - IESJE

Sistema de gestão de matrículas e descontos para o Instituto São João da Escócia (IESJE). O sistema permite identificação de alunos, rematrícula, nova matrícula, gestão de descontos com validação documental e geração de propostas em PDF.

## Development Commands

```bash
# Development server
npm run dev

# Build for production
npm run build

# Build for development environment
npm run build:dev

# Linting
npm run lint

# Preview production build
npm run preview
```

The development server runs on port 8080 by default.

## Architecture Overview

### Stack
- **Frontend**: React 18 + TypeScript + Vite
- **UI**: Tailwind CSS + shadcn/ui (Radix UI components)
- **Routing**: React Router DOM
- **State Management**: TanStack Query (React Query) for server state
- **Forms**: React Hook Form + Zod validation
- **Database**: Supabase (PostgreSQL with Row Level Security)
- **PDF Generation**: jsPDF + jsPDF-AutoTable

### Feature-Based Organization

The codebase follows a feature-based architecture in `src/features/`:

#### Admin System (`src/features/admin/`)
- **Authentication**: Role-based admin authentication with `useAdminAuth` hook
- **Roles**: `super_admin`, `coordenador`, `operador` with granular permissions
- **Components**: `AdminRoute`, `AdminLayout` for protected admin areas
- **Hooks**: Complete admin management system with permission checks

#### Enrollment System (`src/features/enrollment/`)
- **Discount Eligibility**: CEP-based discount eligibility system
- **Core Hook**: `useEligibleDiscounts` - analyzes discount eligibility based on student's CEP
- **Database + Hardcoded Rules**: Combines database rules with hardcoded business logic
- **Performance**: Optimized with caching and fail-safe fallbacks

#### New Enrollment (`src/features/matricula-nova/`)
- **Complete enrollment flow**: Multi-step form for new student registrations
- **Integration**: Works with discount eligibility and document validation systems

### Database Schema

PostgreSQL database managed through Supabase migrations in `supabase/migrations/`:

#### Core Tables
- **`tipos_desconto`**: Discount types with codes (IIR, RES, PASS, PBS, COL, SAE, ABI, ABP, PAV)
- **`trilhos_desconto`**: Discount approval workflows by hierarchy levels
- **`cep_desconto_elegibilidade`**: CEP-based discount eligibility rules
- **`enrollments`**: Complete student enrollment records
- **`admin_users`**: Administrative user management with role-based access

#### Business Rules
- **Maximum 60% cumulative discount** (except integral scholarships)
- **Automatic approval**: ≤20% | **Coordination**: 21-50% | **Direction**: >50%
- **CEP-based eligibility**: Automatic discount eligibility based on student location
- **Document validation**: Required documents per discount type

### Key Patterns

#### Query Management
Uses TanStack Query extensively for:
- Server state management with automatic caching
- Real-time data synchronization
- Optimistic updates
- Error handling and retries

#### Permissions System
```typescript
// Example permission check
const { permissions } = useAdminPermissions()
if (!permissions.canManageDiscounts) {
  throw new Error('Sem permissão')
}
```

#### Discount Eligibility Flow
```typescript
// Main eligibility hook
const { eligibleDiscounts, ineligibleDiscounts, stats } = useEligibleDiscounts(
  cep, 
  allDiscounts, 
  trilhoType
)
```

### Page Structure

#### Public Routes
- `/` - Main page (student identification)
- `/nova-matricula` - New enrollment flow
- `/matriculas-recentes` - Recent enrollments

#### Admin Routes (Protected)
- `/admin/login` - Admin authentication
- `/admin` - Admin dashboard
- `/admin/enrollments` - Enrollment management
- `/admin/discounts` - Discount type management
- `/admin/cep` - CEP management
- `/admin/series` - Academic series management
- `/admin/tracks` - Academic tracks management

### Configuration Notes

- **TypeScript**: Relaxed configuration for rapid development (`noImplicitAny: false`)
- **Path aliases**: `@/*` maps to `./src/*`
- **ESLint**: Standard React/TypeScript configuration with unused vars disabled
- **Hot reload**: Runs on `::` (all interfaces) port 8080 for network access

### Database Operations

Apply migrations with:
```bash
# Apply all pending migrations (use documented process in supabase/apply_migrations.md)
```

The system uses Supabase RLS (Row Level Security) extensively for data protection and multi-tenancy.

## Important Business Context

This is an active educational institution management system handling real student enrollments and financial discounts. The discount eligibility system is particularly complex, combining geographic (CEP), familial (siblings), professional (teacher/staff), and social (scholarship) criteria with strict approval workflows.