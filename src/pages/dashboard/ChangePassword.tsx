import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { authApi } from '@/api/auth'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { PasswordInput } from '@/components/ui/password-input'
import { validatePasswordStrength } from '@/lib/password-utils'

export function ChangePassword() {
  const { user } = useAuth()
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })

  const changePasswordMutation = useMutation({
    mutationFn: (payload: { currentPassword: string; newPassword: string }) =>
      authApi.changePassword(payload.currentPassword, payload.newPassword),
    onSuccess: () => {
      setForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
      toast.success('Senha atualizada com sucesso!')
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Nao foi possivel alterar a senha. Verifique os dados informados.')
    },
  })

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()

    if (!form.currentPassword || !form.newPassword || !form.confirmPassword) {
      toast.error('Preencha todos os campos obrigatorios.')
      return
    }

    const validation = validatePasswordStrength(form.newPassword)
    if (!validation.valid) {
      toast.error(`Senha inválida: ${validation.errors.join(', ')}`)
      return
    }

    if (form.newPassword !== form.confirmPassword) {
      toast.error('A confirmacao da nova senha nao confere.')
      return
    }

    changePasswordMutation.mutate({
      currentPassword: form.currentPassword,
      newPassword: form.newPassword,
    })
  }

  return (
    <div className="flex justify-center">
      <div className="w-full max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>Alterar Senha</CardTitle>
            <CardDescription>
              {user?.email
                ? `Atualize a senha utilizada para acessar sua conta (${user.email}).`
                : 'Atualize a senha utilizada para acessar sua conta.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="currentPassword">Senha atual</Label>
                <Input
                  id="currentPassword"
                  type="password"
                  value={form.currentPassword}
                  onChange={(event) => setForm({ ...form, currentPassword: event.target.value })}
                  placeholder="Digite sua senha atual"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <PasswordInput
                  id="newPassword"
                  label="Nova senha"
                  value={form.newPassword}
                  onChange={(event) => setForm({ ...form, newPassword: event.target.value })}
                  placeholder="Informe a nova senha"
                  required
                  showStrengthIndicator={true}
                />
                <PasswordInput
                  id="confirmPassword"
                  label="Confirmar nova senha"
                  value={form.confirmPassword}
                  onChange={(event) => setForm({ ...form, confirmPassword: event.target.value })}
                  placeholder="Repita a nova senha"
                  required
                  showStrengthIndicator={false}
                  showGenerateButton={false}
                  error={form.confirmPassword && form.newPassword !== form.confirmPassword ? 'As senhas não coincidem' : undefined}
                />
              </div>

              <div className="flex justify-end">
                <Button
                  type="submit"
                  disabled={changePasswordMutation.isPending}
                  className="bg-orange-600 hover:bg-orange-700 text-white"
                >
                  {changePasswordMutation.isPending ? 'Salvando...' : 'Salvar nova senha'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
