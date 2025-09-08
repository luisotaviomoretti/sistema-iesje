// Exportar todos os tipos da feature matricula-nova

// Tipos de formulário
export type {
  EnrollmentFormData,
  EnrollmentFormState,
  EnrollmentFormActions,
  StepProps,
  SelectOption,
  GuardianRelationship,
  ShiftType,
  StepValidation
} from './forms'

// Tipos de API
export type {
  DatabaseDiscount,
  DatabaseSeries,
  DatabaseTrack,
  DatabaseStudent,
  DatabaseEnrollment,
  ApiResponse,
  ApiListResponse,
  StudentSearchFilters,
  DiscountFilters,
  SeriesFilters,
  CepData
} from './api'

// Tipos de negócio
export type {
  PricingCalculation,
  ValidationResult,
  FieldValidation,
  DiscountRule,
  DiscountCondition,
  DiscountEligibility,
  ApprovalLevel,
  ApprovalRequest,
  CepDiscountResult,
  CalculationHistory,
  DocumentValidation,
  DiscountSuggestion,
  EnrollmentSummary
} from './business'