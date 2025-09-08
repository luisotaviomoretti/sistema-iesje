import { ReactNode } from 'react'
import MatriculaHeader from './MatriculaHeader'
import { useMatriculaAuth } from '@/features/matricula/hooks/useMatriculaAuth'

interface MatriculaLayoutProps {
  children: ReactNode
}

const MatriculaLayout = ({ children }: MatriculaLayoutProps) => {
  const { data: session } = useMatriculaAuth()

  // Só mostra o header se houver sessão
  if (!session) {
    return <>{children}</>
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <MatriculaHeader />
      <main className="container mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  )
}

export default MatriculaLayout