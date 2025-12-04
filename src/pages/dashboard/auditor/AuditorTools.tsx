import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Input } from '../../../components/ui/input';
import { Button } from '../../../components/ui/button';
import {
  Wrench, Search, GitCompare, Eye, CheckCircle, AlertTriangle, FileText, ArrowRight, Construction
} from 'lucide-react';

export function AuditorTools() {
  const [activeTab, setActiveTab] = useState<'compare' | 'integrity'>('compare');
  const [searchTerm, setSearchTerm] = useState('');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-3 bg-violet-100 rounded-lg">
          <Wrench className="w-6 h-6 text-violet-700" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Ferramentas de Auditoria</h1>
          <p className="text-muted-foreground">Comparação de versões e verificação de integridade (somente leitura)</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <button
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'compare' ? 'bg-primary text-white' : 'bg-gray-100 hover:bg-gray-200'
          }`}
          onClick={() => setActiveTab('compare')}
        >
          <GitCompare className="w-4 h-4 inline mr-2" />
          Comparar Versões
        </button>
        <button
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'integrity' ? 'bg-primary text-white' : 'bg-gray-100 hover:bg-gray-200'
          }`}
          onClick={() => setActiveTab('integrity')}
        >
          <CheckCircle className="w-4 h-4 inline mr-2" />
          Scanner de Integridade
        </button>
      </div>

      {/* Compare Versions Tab */}
      {activeTab === 'compare' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <GitCompare className="w-4 h-4" />
              Comparar Versões de Documentos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Construction className="w-16 h-16 mb-4 opacity-50" />
              <p className="text-lg font-medium">Funcionalidade em desenvolvimento</p>
              <p className="text-sm text-center max-w-md mt-2">
                A comparação de versões de documentos estará disponível em breve.
                Esta ferramenta permitirá visualizar as diferenças entre versões de contratos e outros documentos.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Integrity Scanner Tab */}
      {activeTab === 'integrity' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              Scanner de Integridade
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Construction className="w-16 h-16 mb-4 opacity-50" />
              <p className="text-lg font-medium">Funcionalidade em desenvolvimento</p>
              <p className="text-sm text-center max-w-md mt-2">
                O scanner de integridade estará disponível em breve.
                Esta ferramenta permitirá verificar a consistência e integridade dos dados do sistema.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
