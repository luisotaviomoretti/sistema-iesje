import React, { useEffect, useMemo, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Save, RotateCcw, User, Shield, UserX, Clock } from 'lucide-react'
import { useAdminEnrollment } from '@/features/matricula-nova/hooks/admin/useAdminEnrollment'
import { useUpdateAdminEnrollment } from '@/features/matricula-nova/hooks/admin/useAdminEnrollmentMutations'
import type { EnrollmentRecord } from '@/types/database'
import { toast } from 'sonner'
import { useAdminAuth } from '@/features/admin/hooks/useAdminAuth'

type EditableKeys = keyof Pick<EnrollmentRecord,
  'student_name' | 'student_cpf' | 'student_rg' | 'student_birth_date' | 'student_gender' | 'student_escola' |
  'guardian1_name' | 'guardian1_cpf' | 'guardian1_phone' | 'guardian1_email' | 'guardian1_relationship' |
  'guardian2_name' | 'guardian2_cpf' | 'guardian2_phone' | 'guardian2_email' | 'guardian2_relationship' |
  'address_cep' | 'address_street' | 'address_number' | 'address_complement' | 'address_district' | 'address_city' | 'address_state' |
  'series_id' | 'series_name' | 'track_id' | 'track_name' | 'shift' |
  'status' | 'approval_level' | 'approval_status'
>

const baseEditableFields: EditableKeys[] = [
  'student_name','student_cpf','student_rg','student_birth_date','student_gender','student_escola',
  'guardian1_name','guardian1_cpf','guardian1_phone','guardian1_email','guardian1_relationship',
  'guardian2_name','guardian2_cpf','guardian2_phone','guardian2_email','guardian2_relationship',
  'address_cep','address_street','address_number','address_complement','address_district','address_city','address_state',
  'series_id','series_name','track_id','track_name','shift',
  'status','approval_level','approval_status'
]
const financialEditableFields = [
  'base_value',
  'total_discount_percentage',
  'total_discount_value',
  'final_monthly_value',
  'material_cost',
] as const
type FinancialEditableKey = typeof financialEditableFields[number]

const EnrollmentEdit: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const { data: record, isLoading, error } = useAdminEnrollment(id)
  const updateMutation = useUpdateAdminEnrollment()
  const { data: session } = useAdminAuth()

  const isSuperAdmin = session?.role === 'super_admin'

  const [form, setForm] = useState<Partial<EnrollmentRecord>>({})
  const [financialErrors, setFinancialErrors] = useState<string[]>([])

  useEffect(() => {
    if (record) {
      setForm({ ...record })
    }
  }, [record])

  const setField = <K extends EditableKeys>(key: K, value: EnrollmentRecord[K] | string) => {
    setForm(prev => ({ ...prev, [key]: value as any }))
  }
  const round2 = (n: number) => Math.round(n * 100) / 100

  const validateFinancial = (state: Partial<EnrollmentRecord>): string[] => {
    const errs: string[] = []
    const base = Number(state.base_value ?? 0)
    const perc = Number(state.total_discount_percentage ?? 0)
    const disc = Number(state.total_discount_value ?? 0)
    const final = Number(state.final_monthly_value ?? 0)
    const material = Number(state.material_cost ?? 0)

    if (base < 0) errs.push('Base não pode ser negativa')
    if (material < 0) errs.push('Material não pode ser negativo')
    if (perc < 0 || perc > 100) errs.push('% Desconto deve estar entre 0 e 100')
    if (disc < 0) errs.push('Valor de desconto não pode ser negativo')
    if (disc > base) errs.push('Valor de desconto não pode exceder a base')
    if (final < 0) errs.push('Valor final não pode ser negativo')

    const expectedDisc = round2(base * (perc / 100))
    const expectedFinal = round2(base - disc)
    // tolerância de 1 centavo por arredondamento
    if (Math.abs(disc - expectedDisc) > 0.01) {
      errs.push('Inconsistência: valor de desconto não corresponde ao percentual aplicado')
    }
    if (Math.abs(final - expectedFinal) > 0.01) {
      errs.push('Inconsistência: valor final deve ser Base - Desconto')
    }
    return errs
  }

  const setNumberField = <K extends FinancialEditableKey>(key: K, value: string) => {
    const input = Number(value)
    const n = isNaN(input) ? undefined : input
    setForm(prev => {
      const next: Partial<EnrollmentRecord> = { ...prev }
      const base = Number(next.base_value ?? 0)
      const perc = Number(next.total_discount_percentage ?? 0)
      const disc = Number(next.total_discount_value ?? 0)
      const final = Number(next.final_monthly_value ?? 0)

      // helper setters with clamp/round
      const setBase = (v: number) => { next.base_value = round2(Math.max(0, v)) }
      const setPerc = (v: number) => { next.total_discount_percentage = round2(Math.min(100, Math.max(0, v))) }
      const setDisc = (v: number) => { next.total_discount_value = round2(Math.min(Math.max(0, v), Number(next.base_value ?? 0))) }
      const setFinal = (v: number) => { next.final_monthly_value = round2(Math.max(0, v)) }
      const setMaterial = (v: number) => { next.material_cost = round2(Math.max(0, v)) }

      switch (key) {
        case 'base_value': {
          const newBase = n ?? base
          setBase(newBase)
          // recalcular a partir do percentual atual
          const newDisc = round2((next.total_discount_percentage ?? perc) * (newBase) / 100)
          setDisc(newDisc)
          setFinal(newBase - newDisc)
          break
        }
        case 'total_discount_percentage': {
          const newPerc = n ?? perc
          setPerc(newPerc)
          const newDisc = round2((newPerc) * (next.base_value ?? base) / 100)
          setDisc(newDisc)
          setFinal((next.base_value ?? base) - newDisc)
          break
        }
        case 'total_discount_value': {
          const newDiscVal = n ?? disc
          setDisc(newDiscVal)
          const b = Number(next.base_value ?? base)
          const newPerc = b > 0 ? round2((Number(next.total_discount_value ?? newDiscVal) / b) * 100) : 0
          setPerc(newPerc)
          setFinal(b - (next.total_discount_value ?? newDiscVal))
          break
        }
        case 'final_monthly_value': {
          const newFinal = n ?? final
          setFinal(newFinal)
          const b = Number(next.base_value ?? base)
          const newDiscVal = round2(b - newFinal)
          setDisc(newDiscVal)
          const newPerc = b > 0 ? round2((newDiscVal / b) * 100) : 0
          setPerc(newPerc)
          break
        }
        case 'material_cost': {
          setMaterial(n ?? Number(next.material_cost ?? 0))
          break
        }
      }

      // atualizar erros financeiros (apenas super admin)
      if (isSuperAdmin) {
        setFinancialErrors(validateFinancial(next))
      }
      return next
    })
  }

  const hasChanges = useMemo(() => {
    if (!record) return false
    const fields = isSuperAdmin ? [...baseEditableFields, ...financialEditableFields] : baseEditableFields
    return fields.some(k => (form as any)[k] !== (record as any)[k])
  }, [form, record, isSuperAdmin])

  const buildPatch = (): Partial<EnrollmentRecord> => {
    const patch: Partial<EnrollmentRecord> = {}
    if (!record) return patch
    const fields = isSuperAdmin ? [...baseEditableFields, ...financialEditableFields] : baseEditableFields
    for (const k of fields) {
      const cur = (form as any)[k]
      const orig = (record as any)[k]
      if (cur !== orig) {
        ;(patch as any)[k] = cur
      }
    }
    return patch
  }

  const handleSave = async () => {
    try {
      if (!id) return
      const patch = buildPatch()
      if (Object.keys(patch).length === 0) {
        toast.info('Nenhuma alteração para salvar')
        return
      }
      if (isSuperAdmin) {
        const errs = validateFinancial({ ...record, ...form, ...patch })
        if (errs.length > 0) {
          setFinancialErrors(errs)
          toast.error('Corrija os erros financeiros antes de salvar')
          return
        }
      }
      const updated = await updateMutation.mutateAsync({ id, patch })
      setForm({ ...updated })
      toast.success('Matrícula atualizada com sucesso')
    } catch (err) {
      console.error(err)
      toast.error('Erro ao atualizar matrícula')
    }
  }

  const handleReset = () => {
    if (record) setForm({ ...record })
  }

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Carregando...</div>
  }
  if (error || !record) {
    return <div className="text-sm text-red-600">Erro ao carregar matrícula.</div>
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm">
            <Link to="/admin/matriculas">
              <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
            </Link>
          </Button>
          <h1 className="text-2xl font-bold">Editar Matrícula</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleReset} disabled={!hasChanges}>
            <RotateCcw className="w-4 h-4 mr-2" /> Descartar
          </Button>
          <Button variant="default" size="sm" onClick={handleSave} disabled={!hasChanges || updateMutation.isPending || (isSuperAdmin && financialErrors.length > 0)}>
            <Save className="w-4 h-4 mr-2" /> Salvar
          </Button>
        </div>
      </div>

      {/* Informações de Rastreamento */}
      {record && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Informações de Rastreamento
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="text-xs text-muted-foreground">Criado em</label>
                <p className="text-sm font-medium">
                  {new Date(record.created_at).toLocaleString('pt-BR')}
                </p>
              </div>
              
              <div>
                <label className="text-xs text-muted-foreground">Criado por</label>
                <div className="flex items-center gap-2 mt-1">
                  {record.created_by_user_type === 'admin' && (
                    <>
                      <Badge variant="destructive" className="text-xs">
                        <Shield className="w-3 h-3 mr-1" />
                        Admin
                      </Badge>
                      <span className="text-sm">{record.created_by_user_name || 'N/A'}</span>
                    </>
                  )}
                  {record.created_by_user_type === 'matricula' && (
                    <>
                      <Badge variant="default" className="text-xs">
                        <User className="w-3 h-3 mr-1" />
                        Matrícula
                      </Badge>
                      <span className="text-sm">{record.created_by_user_name || 'N/A'}</span>
                    </>
                  )}
                  {record.created_by_user_type === 'anonymous' && (
                    <Badge variant="secondary" className="text-xs">
                      <UserX className="w-3 h-3 mr-1" />
                      Anônimo
                    </Badge>
                  )}
                </div>
              </div>
              
              <div>
                <label className="text-xs text-muted-foreground">Email do usuário</label>
                <p className="text-sm font-medium">
                  {record.created_by_user_email || 'N/A'}
                </p>
              </div>
              
              <div>
                <label className="text-xs text-muted-foreground">ID do usuário</label>
                <p className="text-sm font-mono text-muted-foreground">
                  {record.created_by_user_id ? (
                    <code className="bg-muted px-1 rounded text-xs">
                      {record.created_by_user_id}
                    </code>
                  ) : (
                    'N/A'
                  )}
                </p>
              </div>
            </div>
            
            {record.updated_at && record.updated_at !== record.created_at && (
              <div className="mt-3 pt-3 border-t">
                <label className="text-xs text-muted-foreground">Última atualização</label>
                <p className="text-sm text-muted-foreground">
                  {new Date(record.updated_at).toLocaleString('pt-BR')}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Dados do Aluno */}
      <Card>
        <CardHeader>
          <CardTitle>Dados do Aluno</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="text-xs text-muted-foreground">Nome</label>
            <Input value={form.student_name || ''} onChange={(e) => setField('student_name', e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">CPF</label>
            <Input value={form.student_cpf || ''} onChange={(e) => setField('student_cpf', e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">RG</label>
            <Input value={form.student_rg || ''} onChange={(e) => setField('student_rg', e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Nascimento</label>
            <Input type="date" value={(form.student_birth_date || '').slice(0,10)} onChange={(e) => setField('student_birth_date', e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Gênero</label>
            <Select value={form.student_gender || 'M'} onValueChange={(v) => setField('student_gender', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="M">Masculino</SelectItem>
                <SelectItem value="F">Feminino</SelectItem>
                <SelectItem value="other">Outro</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Escola</label>
            <Select value={form.student_escola || 'sete_setembro'} onValueChange={(v) => setField('student_escola', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="sete_setembro">Sete de Setembro</SelectItem>
                <SelectItem value="pelicano">Pelicano</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Responsáveis */}
      <Card>
        <CardHeader>
          <CardTitle>Responsáveis</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="md:col-span-3 font-medium text-sm text-muted-foreground">Principal</div>
          <div>
            <label className="text-xs text-muted-foreground">Nome</label>
            <Input value={form.guardian1_name || ''} onChange={(e) => setField('guardian1_name', e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">CPF</label>
            <Input value={form.guardian1_cpf || ''} onChange={(e) => setField('guardian1_cpf', e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Telefone</label>
            <Input value={form.guardian1_phone || ''} onChange={(e) => setField('guardian1_phone', e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Email</label>
            <Input value={form.guardian1_email || ''} onChange={(e) => setField('guardian1_email', e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Parentesco</label>
            <Input value={form.guardian1_relationship || ''} onChange={(e) => setField('guardian1_relationship', e.target.value)} />
          </div>

          <div className="md:col-span-3 font-medium text-sm text-muted-foreground mt-4">Secundário</div>
          <div>
            <label className="text-xs text-muted-foreground">Nome</label>
            <Input value={form.guardian2_name || ''} onChange={(e) => setField('guardian2_name', e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">CPF</label>
            <Input value={form.guardian2_cpf || ''} onChange={(e) => setField('guardian2_cpf', e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Telefone</label>
            <Input value={form.guardian2_phone || ''} onChange={(e) => setField('guardian2_phone', e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Email</label>
            <Input value={form.guardian2_email || ''} onChange={(e) => setField('guardian2_email', e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Parentesco</label>
            <Input value={form.guardian2_relationship || ''} onChange={(e) => setField('guardian2_relationship', e.target.value)} />
          </div>
        </CardContent>
      </Card>

      {/* Endereço */}
      <Card>
        <CardHeader>
          <CardTitle>Endereço</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="text-xs text-muted-foreground">CEP</label>
            <Input value={form.address_cep || ''} onChange={(e) => setField('address_cep', e.target.value)} />
          </div>
          <div className="md:col-span-2">
            <label className="text-xs text-muted-foreground">Rua</label>
            <Input value={form.address_street || ''} onChange={(e) => setField('address_street', e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Número</label>
            <Input value={form.address_number || ''} onChange={(e) => setField('address_number', e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Complemento</label>
            <Input value={form.address_complement || ''} onChange={(e) => setField('address_complement', e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Bairro</label>
            <Input value={form.address_district || ''} onChange={(e) => setField('address_district', e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Cidade</label>
            <Input value={form.address_city || ''} onChange={(e) => setField('address_city', e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Estado</label>
            <Input value={form.address_state || ''} onChange={(e) => setField('address_state', e.target.value)} />
          </div>
        </CardContent>
      </Card>

      {/* Acadêmico & Status */}
      <Card>
        <CardHeader>
          <CardTitle>Acadêmico e Status</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="text-xs text-muted-foreground">Série (ID)</label>
            <Input value={form.series_id || ''} onChange={(e) => setField('series_id', e.target.value)} />
          </div>
          <div className="md:col-span-2">
            <label className="text-xs text-muted-foreground">Série (Nome)</label>
            <Input value={form.series_name || ''} onChange={(e) => setField('series_name', e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Trilho (ID)</label>
            <Input value={form.track_id || ''} onChange={(e) => setField('track_id', e.target.value)} />
          </div>
          <div className="md:col-span-2">
            <label className="text-xs text-muted-foreground">Trilho (Nome)</label>
            <Input value={form.track_name || ''} onChange={(e) => setField('track_name', e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Turno</label>
            <Select value={form.shift || 'morning'} onValueChange={(v) => setField('shift', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="morning">Manhã</SelectItem>
                <SelectItem value="afternoon">Tarde</SelectItem>
                <SelectItem value="night">Noite</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Status</label>
            <Select value={form.status || 'draft'} onValueChange={(v) => setField('status', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Rascunho</SelectItem>
                <SelectItem value="submitted">Enviado</SelectItem>
                <SelectItem value="approved">Aprovado</SelectItem>
                <SelectItem value="rejected">Rejeitado</SelectItem>
                <SelectItem value="deleted">Excluído</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Nível de Aprovação</label>
            <Select value={form.approval_level || 'automatic'} onValueChange={(v) => setField('approval_level', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="automatic">Automática</SelectItem>
                <SelectItem value="coordinator">Coordenação</SelectItem>
                <SelectItem value="director">Direção</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Status de Aprovação</label>
            <Select value={form.approval_status || 'pending'} onValueChange={(v) => setField('approval_status', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pendente</SelectItem>
                <SelectItem value="approved">Aprovado</SelectItem>
                <SelectItem value="rejected">Rejeitado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Financeiro (editável apenas para Super Admin) */}
      <Card>
        <CardHeader>
          <CardTitle>Financeiro</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {isSuperAdmin && financialErrors.length > 0 && (
            <div className="md:col-span-4 p-3 bg-red-50 border border-red-200 rounded text-xs text-red-700">
              {financialErrors.map((e, i) => (<div key={i}>• {e}</div>))}
            </div>
          )}
          <div>
            <label className="text-xs text-muted-foreground">Base</label>
            <Input type="number" step="0.01" value={String(form.base_value ?? 0)} onChange={(e) => setNumberField('base_value', e.target.value)} disabled={!isSuperAdmin} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">% Desconto</label>
            <Input type="number" step="0.01" value={String(form.total_discount_percentage ?? 0)} onChange={(e) => setNumberField('total_discount_percentage', e.target.value)} disabled={!isSuperAdmin} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Valor Desconto</label>
            <Input type="number" step="0.01" value={String(form.total_discount_value ?? 0)} onChange={(e) => setNumberField('total_discount_value', e.target.value)} disabled={!isSuperAdmin} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Valor Final</label>
            <Input type="number" step="0.01" value={String(form.final_monthly_value ?? 0)} onChange={(e) => setNumberField('final_monthly_value', e.target.value)} disabled={!isSuperAdmin} />
          </div>
          <div className="md:col-span-1">
            <label className="text-xs text-muted-foreground">Material</label>
            <Input type="number" step="0.01" value={String(form.material_cost ?? 0)} onChange={(e) => setNumberField('material_cost', e.target.value)} disabled={!isSuperAdmin} />
          </div>
          {!isSuperAdmin && (
            <div className="md:col-span-3 text-xs text-muted-foreground self-center">
              Somente Super Admin pode alterar os campos financeiros.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default EnrollmentEdit
