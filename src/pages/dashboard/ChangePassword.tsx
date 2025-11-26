import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { authApi } from '@/api/auth'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { AlertCircle } from 'lucide-react'

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

    if (form.newPassword.length < 6) {
      toast.error('A nova senha deve conter pelo menos 6 caracteres.')
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
                <div className="space-y-2">
                  <Label htmlFor="newPassword">Nova senha</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    value={form.newPassword}
                    onChange={(event) => setForm({ ...form, newPassword: event.target.value })}
                    placeholder="Informe a nova senha"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirmar nova senha</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={form.confirmPassword}
                    onChange={(event) => setForm({ ...form, confirmPassword: event.target.value })}
                    placeholder="Repita a nova senha"
                    required
                  />
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-md border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
                <AlertCircle className="mt-0.5 h-4 w-4 text-muted-foreground" />
                <div>
                  Utilize uma senha forte com pelo menos 6 caracteres. Evite reutilizar senhas anteriores ou informacoes faceis de adivinhar.
                </div>
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
