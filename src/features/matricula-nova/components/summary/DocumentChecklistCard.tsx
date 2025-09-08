import React, { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Progress } from '@/components/ui/progress'
import { 
  FileText,
  CheckCircle,
  AlertTriangle,
  Info,
  Upload,
  Eye,
  Download,
  Clock,
  User,
  Home,
  GraduationCap,
  Percent,
  HelpCircle
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface DocumentItem {
  id: string
  name: string
  description: string
  category: 'student' | 'guardian' | 'address' | 'academic' | 'discount'
  required: boolean
  discountRelated?: string // Código do desconto que requer este documento
  acceptedFormats: string[]
  maxSize?: string
  isChecked?: boolean
  isUploaded?: boolean
  uploadedAt?: Date
  fileName?: string
}

interface DocumentChecklistCardProps {
  documents: DocumentItem[]
  selectedDiscounts?: Array<{
    id: string
    codigo: string
    nome: string
  }>
  onDocumentCheck: (documentId: string, checked: boolean) => void
  onUploadDocument?: (documentId: string) => void
  onViewDocument?: (documentId: string) => void
  className?: string
  showUploadButtons?: boolean
  readOnlyMode?: boolean
}

const DocumentCategorySection: React.FC<{
  title: string
  icon: React.ReactNode
  documents: DocumentItem[]
  onDocumentCheck: (id: string, checked: boolean) => void
  onUploadDocument?: (id: string) => void
  onViewDocument?: (id: string) => void
  showUploadButtons?: boolean
  readOnlyMode?: boolean
}> = ({ 
  title, 
  icon, 
  documents, 
  onDocumentCheck, 
  onUploadDocument,
  onViewDocument,
  showUploadButtons = false,
  readOnlyMode = false
}) => {
  
  if (documents.length === 0) return null

  const requiredDocs = documents.filter(d => d.required)
  const checkedRequiredDocs = requiredDocs.filter(d => d.isChecked)
  const completionPercentage = requiredDocs.length > 0 ? (checkedRequiredDocs.length / requiredDocs.length) * 100 : 100

  return (
    <div className="space-y-3">
      <div className="flex items-center space-x-2">
        {icon}
        <h4 className="font-medium text-gray-900">{title}</h4>
      </div>

      <div className="space-y-2">
        {documents.map((doc) => (
          <div key={doc.id} className="p-3 border rounded-lg bg-gray-50 border-gray-200">
            <div className="flex items-start space-x-3">
              {/* Ícone de documento */}
              <div className="mt-1">
                <FileText className="w-4 h-4 text-gray-600" />
              </div>

              {/* Conteúdo */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <h5 className="font-medium text-sm text-gray-900">
                        {doc.name}
                      </h5>
                      
                      {doc.required && (
                        <Badge className="bg-red-100 text-red-800 border-red-300 text-xs">
                          Obrigatório
                        </Badge>
                      )}
                      
                      {doc.discountRelated && (
                        <Badge className="bg-blue-100 text-blue-800 border-blue-300 text-xs">
                          {doc.discountRelated}
                        </Badge>
                      )}
                    </div>

                    <p className="text-xs text-gray-600 mt-1">
                      {doc.description}
                    </p>

                    <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                      <span>Formatos: {doc.acceptedFormats.join(', ')}</span>
                      {doc.maxSize && <span>Máx: {doc.maxSize}</span>}
                    </div>

                    {/* Status do Upload */}
                    {doc.isUploaded && doc.fileName && (
                      <div className="mt-2 p-2 bg-white border border-green-200 rounded text-xs">
                        <div className="flex items-center space-x-2">
                          <CheckCircle className="w-3 h-3 text-green-600" />
                          <span className="text-green-800">
                            Arquivo: {doc.fileName}
                          </span>
                          {doc.uploadedAt && (
                            <span className="text-gray-500">
                              ({doc.uploadedAt.toLocaleDateString('pt-BR')})
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Ações */}
                  {showUploadButtons && !readOnlyMode && (
                    <div className="flex space-x-1 ml-2">
                      {!doc.isUploaded ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onUploadDocument?.(doc.id)}
                          className="h-6 px-2 text-xs"
                        >
                          <Upload className="w-3 h-3 mr-1" />
                          Upload
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onViewDocument?.(doc.id)}
                          className="h-6 px-2 text-xs"
                        >
                          <Eye className="w-3 h-3 mr-1" />
                          Ver
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function DocumentChecklistCard({
  documents,
  selectedDiscounts = [],
  onDocumentCheck,
  onUploadDocument,
  onViewDocument,
  className,
  showUploadButtons = false,
  readOnlyMode = false
}: DocumentChecklistCardProps) {

  const [expandedHelp, setExpandedHelp] = useState(false)

  // Filtrar documentos por categoria
  const categorizeDocuments = () => {
    const categories = {
      student: documents.filter(d => d.category === 'student'),
      guardian: documents.filter(d => d.category === 'guardian'),
      address: documents.filter(d => d.category === 'address'),
      academic: documents.filter(d => d.category === 'academic'),
      discount: documents.filter(d => d.category === 'discount')
    }

    // Filtrar documentos de desconto apenas para os descontos selecionados
    const selectedDiscountCodes = selectedDiscounts.map(d => d.codigo)
    categories.discount = categories.discount.filter(d => 
      d.discountRelated && selectedDiscountCodes.includes(d.discountRelated)
    )

    return categories
  }

  const categorizedDocs = categorizeDocuments()

  // Estatísticas gerais
  const totalRequired = documents.filter(d => d.required).length
  const totalChecked = documents.filter(d => d.isChecked).length
  const totalRequiredChecked = documents.filter(d => d.required && d.isChecked).length
  const completionPercentage = totalRequired > 0 ? (totalRequiredChecked / totalRequired) * 100 : 100

  // Status geral
  const isComplete = completionPercentage === 100
  const hasWarnings = totalRequired > totalRequiredChecked
  const hasUncheckedOptional = documents.some(d => !d.required && !d.isChecked)

  return (
    <Card className={cn("overflow-hidden", className)}>
      <div className="p-6">
        
        {/* Header */}
        <div className="mb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-blue-100 text-blue-600">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">
                📋 Documentos Necessários
              </h3>
              <p className="text-sm text-gray-600">
                Lista de documentos necessários para os descontos selecionados
              </p>
            </div>
          </div>
        </div>


        {/* Seções por Categoria */}
        <div className="space-y-6">
          <DocumentCategorySection
            title="👤 Documentos do Aluno"
            icon={<User className="w-4 h-4 text-blue-600" />}
            documents={categorizedDocs.student}
            onDocumentCheck={onDocumentCheck}
            onUploadDocument={onUploadDocument}
            onViewDocument={onViewDocument}
            showUploadButtons={showUploadButtons}
            readOnlyMode={readOnlyMode}
          />

          <DocumentCategorySection
            title="👨‍👩‍👧‍👦 Documentos dos Responsáveis"
            icon={<User className="w-4 h-4 text-green-600" />}
            documents={categorizedDocs.guardian}
            onDocumentCheck={onDocumentCheck}
            onUploadDocument={onUploadDocument}
            onViewDocument={onViewDocument}
            showUploadButtons={showUploadButtons}
            readOnlyMode={readOnlyMode}
          />

          <DocumentCategorySection
            title="🏠 Comprovantes de Residência"
            icon={<Home className="w-4 h-4 text-purple-600" />}
            documents={categorizedDocs.address}
            onDocumentCheck={onDocumentCheck}
            onUploadDocument={onUploadDocument}
            onViewDocument={onViewDocument}
            showUploadButtons={showUploadButtons}
            readOnlyMode={readOnlyMode}
          />

          <DocumentCategorySection
            title="🎓 Documentos Acadêmicos"
            icon={<GraduationCap className="w-4 h-4 text-indigo-600" />}
            documents={categorizedDocs.academic}
            onDocumentCheck={onDocumentCheck}
            onUploadDocument={onUploadDocument}
            onViewDocument={onViewDocument}
            showUploadButtons={showUploadButtons}
            readOnlyMode={readOnlyMode}
          />

          {categorizedDocs.discount.length > 0 && (
            <div className="space-y-2">
              {categorizedDocs.discount.map((doc) => (
                <div key={doc.id} className="p-3 border rounded-lg bg-gray-50 border-gray-200">
                  <div className="flex items-start space-x-3">
                    {/* Ícone de documento */}
                    <div className="mt-1">
                      <FileText className="w-4 h-4 text-gray-600" />
                    </div>

                    {/* Conteúdo */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <h5 className="font-medium text-sm text-gray-900">
                              {doc.name}
                            </h5>
                            
                            {doc.required && (
                              <Badge className="bg-red-100 text-red-800 border-red-300 text-xs">
                                Obrigatório
                              </Badge>
                            )}
                            
                            {doc.discountRelated && (
                              <Badge className="bg-blue-100 text-blue-800 border-blue-300 text-xs">
                                {doc.discountRelated}
                              </Badge>
                            )}
                          </div>

                          <p className="text-xs text-gray-600 mt-1">
                            {doc.description}
                          </p>

                          <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                            <span>Formatos: {doc.acceptedFormats.join(', ')}</span>
                            {doc.maxSize && <span>Máx: {doc.maxSize}</span>}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>



        {/* Footer com informações */}
        {!readOnlyMode && (
          <div className="mt-4 pt-3 border-t border-gray-200">
            <div className="text-xs text-gray-500 space-y-1">
              <div className="flex items-center justify-between">
                <span>Última atualização: {new Date().toLocaleString('pt-BR')}</span>
                {hasUncheckedOptional && (
                  <span className="text-blue-600">
                    Documentos opcionais podem ser enviados depois
                  </span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </Card>
  )
}

export default DocumentChecklistCard