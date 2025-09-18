import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Users, 
  FileText, 
  MapPin, 
  Settings,
  TrendingUp,
  AlertCircle,
  Activity,
  Clock,
  GraduationCap,
  Route
} from "lucide-react";
import { Link } from "react-router-dom";
import { useDiscountTypes } from "@/features/admin/hooks/useDiscountTypes";
import { useCepStatistics } from "@/features/admin/hooks/useCepRanges";
import { useSystemConfigs } from "@/features/admin/hooks/useSystemConfigs";
import { useAdminAuth } from "@/features/admin/hooks/useAdminAuth";
import EnrollmentsAreaChart from "@/features/admin/components/EnrollmentsAreaChart";

const AdminDashboard = () => {
  console.log('🔥 AdminDashboard rendering...');
  
  const { data: session } = useAdminAuth();
  const { data: discountTypes, isLoading: loadingDiscounts } = useDiscountTypes(true);
  const { data: cepStats, isLoading: loadingCeps } = useCepStatistics();
  const { data: configs, isLoading: loadingConfigs } = useSystemConfigs();

  // Calcular métricas
  const activeDiscounts = discountTypes?.filter(d => d.ativo).length || 0;
  const inactiveDiscounts = discountTypes?.filter(d => !d.ativo).length || 0;
  const totalConfigs = configs?.length || 0;

  const quickActions = [
    {
      title: "Gerenciar Descontos",
      description: "Adicionar, editar ou desativar tipos de desconto",
      href: "/admin/descontos",
      icon: FileText,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      requiredRole: 'coordenador' as const,
    },
    {
      title: "Trilhos de Desconto",
      description: "Gerenciar trilhos, caps e regras de compatibilidade",
      href: "/admin/trilhos",
      icon: Route,
      color: "text-violet-600",
      bgColor: "bg-violet-50",
      requiredRole: 'operador' as const,
    },
    {
      title: "Configurar CEPs",
      description: "Gerenciar faixas de CEP e classificações",
      href: "/admin/ceps",
      icon: MapPin,
      color: "text-green-600",
      bgColor: "bg-green-50",
      requiredRole: 'coordenador' as const,
    },
    {
      title: "Gerenciar Séries",
      description: "Configurar séries/anos escolares e valores",
      href: "/admin/series",
      icon: GraduationCap,
      color: "text-indigo-600",
      bgColor: "bg-indigo-50",
      requiredRole: 'coordenador' as const,
    },
    {
      title: "Usuários Admin",
      description: "Gerenciar usuários administrativos",
      href: "/admin/usuarios",
      icon: Users,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
      requiredRole: 'super_admin' as const,
    },
    {
      title: "Configurações",
      description: "Configurações gerais do sistema",
      href: "/admin/configuracoes",
      icon: Settings,
      color: "text-orange-600",
      bgColor: "bg-orange-50",
      requiredRole: 'super_admin' as const,
    },
  ];

  // Debug: Log para verificar quickActions e filtros
  console.log('📋 Quick Actions Array:', quickActions);
  console.log('👤 User Session Role:', session?.role);
  console.log('🔍 Checking permissions for each action...');
  
  // Filtrar ações baseadas na permissão do usuário
  const allowedActions = quickActions.filter(action => {
    if (!action.requiredRole) return true;
    const hasPermission = checkRolePermission(session?.role || 'operador', action.requiredRole);
    console.log(`   ${action.title}: required=${action.requiredRole}, userRole=${session?.role}, hasPermission=${hasPermission}`);
    return hasPermission;
  });
  
  console.log('✅ Allowed Actions:', allowedActions);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Dashboard Administrativo
        </h1>
        <p className="text-muted-foreground">
          Bem-vindo, {session?.adminUser.nome}! Aqui está o resumo do seu sistema.
        </p>
      </div>

      {/* Matrículas por dia (Shadcn + Recharts) */}
      <EnrollmentsAreaChart />

      {/* Métricas Principais */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Tipos de Desconto
            </CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loadingDiscounts ? '-' : activeDiscounts}
            </div>
            <p className="text-xs text-muted-foreground">
              {inactiveDiscounts > 0 && (
                <span className="text-amber-600">
                  {inactiveDiscounts} inativos
                </span>
              )}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Faixas de CEP
            </CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loadingCeps ? '-' : cepStats?.ativo || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {cepStats?.inativo || 0} inativas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Configurações
            </CardTitle>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loadingConfigs ? '-' : totalConfigs}
            </div>
            <p className="text-xs text-muted-foreground">
              parâmetros do sistema
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Sistema
            </CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              Online
            </div>
            <p className="text-xs text-muted-foreground">
              Operacional
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Distribuição de CEPs */}
      {cepStats && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Distribuição de CEPs por Categoria
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">
                  {cepStats.por_categoria.fora}
                </div>
                <div className="text-sm text-muted-foreground">Fora de Poços</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-amber-600">
                  {cepStats.por_categoria.baixa}
                </div>
                <div className="text-sm text-muted-foreground">Baixa Renda</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {cepStats.por_categoria.alta}
                </div>
                <div className="text-sm text-muted-foreground">Alta Renda</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Ações Rápidas */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Ações Rápidas</h2>
        <div className="text-sm text-muted-foreground mb-2">
          Debug: Mostrando {allowedActions.length} ações de {quickActions.length} total
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2">
          {allowedActions.map((action) => {
            const Icon = action.icon;
            return (
              <Card 
                key={action.href} 
                className="hover:shadow-md transition-shadow cursor-pointer"
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className={`p-2 rounded-lg ${action.bgColor}`}>
                      <Icon className={`h-5 w-5 ${action.color}`} />
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {action.requiredRole === 'super_admin' ? 'Super Admin' : 
                       action.requiredRole === 'coordenador' ? 'Coordenador+' : 'Todos'}
                    </Badge>
                  </div>
                  <CardTitle className="text-lg">{action.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    {action.description}
                  </p>
                  <Button asChild size="sm" className="w-full">
                    <Link to={action.href}>
                      Acessar
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Status do Sistema */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Status do Sistema
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <div>
                <div className="font-medium">Base de Dados</div>
                <div className="text-sm text-muted-foreground">Conectado</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <div>
                <div className="font-medium">API Supabase</div>
                <div className="text-sm text-muted-foreground">Operacional</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <div>
                <div className="font-medium">Sistema de Matrícula</div>
                <div className="text-sm text-muted-foreground">Funcionando</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Alertas */}
      {inactiveDiscounts > 0 && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-amber-600" />
              <div>
                <div className="font-medium text-amber-900">
                  Tipos de Desconto Inativos
                </div>
                <div className="text-sm text-amber-700">
                  {inactiveDiscounts} tipo(s) de desconto estão inativos e não aparecerão no sistema de matrícula.
                </div>
              </div>
              <Button asChild size="sm" variant="outline" className="ml-auto">
                <Link to="/admin/descontos">
                  Revisar
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

// Função para verificar hierarquia de permissões
function checkRolePermission(
  userRole: 'super_admin' | 'coordenador' | 'operador',
  requiredRole: 'super_admin' | 'coordenador' | 'operador'
): boolean {
  const roleHierarchy = {
    'operador': 1,
    'coordenador': 2, 
    'super_admin': 3
  }
  
  return roleHierarchy[userRole] >= roleHierarchy[requiredRole];
}

export default AdminDashboard;
