import { useState, useCallback } from 'react'
import { addressAPI } from '@/api'

interface CEPData {
  cep: string
  logradouro: string
  bairro: string
  cidade: string
  estado: string
  complemento?: string
}

interface UseCEPReturn {
  loading: boolean
  error: string | null
  data: CEPData | null
  fetchCEP: (cep: string) => Promise<CEPData | null>
}

export function useCEP(): UseCEPReturn {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<CEPData | null>(null)

  const fetchCEP = useCallback(async (cep: string): Promise<CEPData | null> => {
    const cleanCEP = cep.replace(/\D/g, '')

    if (cleanCEP.length !== 8) {
      setError('CEP deve ter 8 dígitos')
      return null
    }

    setLoading(true)
    setError(null)

    try {
      const response = await addressAPI.getByCep(cleanCEP)

      // Handle response wrapped in { isValid, data } structure (NestJS backend)
      const responseData = response.data || response

      if (response.isValid === false) {
        setError(response.error || 'CEP não encontrado')
        return null
      }

      const cepData: CEPData = {
        cep: responseData.cep || cleanCEP,
        logradouro: responseData.logradouro || responseData.street || responseData.address || '',
        bairro: responseData.bairro || responseData.neighborhood || '',
        cidade: responseData.localidade || responseData.city || '',
        estado: responseData.uf || responseData.state || '',
        complemento: responseData.complemento || responseData.complement || '',
      }
      setData(cepData)
      return cepData
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Erro ao buscar CEP')
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  return { loading, error, data, fetchCEP }
}
