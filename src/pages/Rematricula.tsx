import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";

export default function Rematricula() {
  const navigate = useNavigate();

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-amber-500" />
            Rematrícula - Em Desenvolvimento
          </CardTitle>
          <CardDescription>
            O sistema de rematrícula está sendo completamente reconstruído para melhor atendê-lo.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Estamos implementando um novo fluxo de rematrícula mais eficiente e intuitivo. 
            Por favor, utilize o sistema de nova matrícula enquanto finalizamos as melhorias.
          </p>
          
          <div className="flex gap-3">
            <Button onClick={() => navigate("/nova-matricula")}>
              Ir para Nova Matrícula
            </Button>
            <Button variant="outline" onClick={() => navigate("/")}>
              Voltar ao Início
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}