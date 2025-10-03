import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useNavigate, Link } from 'react-router-dom'

interface Item {
  id: string
  student_name: string
  student_escola: string | null
  guardian1_name?: string | null
  created_at: string
  inad_snapshot: { meses_inadim?: number | null; codigo_inadim?: string | null } | null
}

function fmtDate(s?: string | null) {
  if (!s) return '-'
  try { return new Date(s).toLocaleString('pt-BR') } catch { return s as any }
}

export default function InadOverrideEnrollments() {
  const navigate = useNavigate()
  const { data = [], isLoading, refetch } = useQuery({
    queryKey: ['inad-override-enrollments'],
    queryFn: async (): Promise<Item[]> => {
      const { data, error } = await supabase.rpc('list_inad_override_enrollments_current')
      if (error) throw error
      return (data as any[])?.map((r) => ({
        id: r.id,
        student_name: r.student_name,
        student_escola: r.student_escola,
        guardian1_name: r.guardian1_name || null,
        created_at: r.created_at,
        inad_snapshot: r.inad_snapshot || null,
      })) || []
    },
    staleTime: 60_000,
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Matrículas com Exceção (1 mês de inadimplência)</h1>
          <p className="text-muted-foreground text-sm">
            Lista de matrículas finalizadas mediante confirmação de 1 mês de inadimplência, que <strong>ainda constam como inadimplentes</strong> na base atual.
            Dados registrados em <code>enrollments.inad_override_1m_used</code> e <code>enrollments.inad_snapshot</code>.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => refetch()}>Recarregar</Button>
          <Button variant="ghost" onClick={() => navigate('/admin/inadimplentes')}>Voltar</Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Registros</CardTitle>
          <CardDescription>{isLoading ? 'Carregando...' : `${data.length} registro(s)`}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Aluno</TableHead>
                  <TableHead>Escola</TableHead>
                  <TableHead>Meses</TableHead>
                  <TableHead>Código</TableHead>
                  <TableHead>Criado em</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.student_name}</TableCell>
                    <TableCell>{r.student_escola || '—'}</TableCell>
                    <TableCell>{typeof r.inad_snapshot?.meses_inadim === 'number' ? r.inad_snapshot?.meses_inadim : '—'}</TableCell>
                    <TableCell>{r.inad_snapshot?.codigo_inadim || '—'}</TableCell>
                    <TableCell>{fmtDate(r.created_at)}</TableCell>
                    <TableCell className="text-right">
                      <Button asChild size="sm" variant="outline">
                        <Link to={`/admin/matriculas/${r.id}`}>Ver detalhes</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {!isLoading && data.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">Nenhum registro encontrado.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
