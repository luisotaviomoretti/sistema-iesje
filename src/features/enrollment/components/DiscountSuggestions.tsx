import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Lightbulb, Plus } from "lucide-react";

interface DiscountSuggestionsProps {
  suggestions: string[];
  rejectedDiscount: {
    code: string;
    description: string;
    reason?: string;
  };
  onSelectSuggestion?: (suggestionCode: string) => void;
  className?: string;
}

export function DiscountSuggestions({ 
  suggestions, 
  rejectedDiscount, 
  onSelectSuggestion,
  className 
}: DiscountSuggestionsProps) {
  if (suggestions.length === 0) return null;

  return (
    <Card className={`border-amber-200 bg-amber-50 ${className}`}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-amber-800 text-sm">
          <Lightbulb className="h-4 w-4" />
          Alternativas Sugeridas
        </CardTitle>
        <CardDescription className="text-xs">
          <strong>{rejectedDiscount.code}</strong> não está disponível para sua região.
          {rejectedDiscount.reason && (
            <span className="block mt-1 text-amber-700">{rejectedDiscount.reason}</span>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-2">
          <p className="text-xs text-amber-800 font-medium">
            Considere estas opções similares:
          </p>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((suggestion, index) => {
              // Extrair código e descrição da sugestão (formato: "CODIGO - Descrição (X%)")
              const parts = suggestion.split(' - ');
              const code = parts[0];
              const description = parts[1] || suggestion;
              
              return (
                <div key={index} className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs bg-white border-amber-300">
                    {description}
                  </Badge>
                  {onSelectSuggestion && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-6 px-2 text-xs hover:bg-amber-100 border-amber-300"
                      onClick={() => onSelectSuggestion(code)}
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Usar
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}