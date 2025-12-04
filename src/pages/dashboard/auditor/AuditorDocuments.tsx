import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Input } from '../../../components/ui/input';
import { Button } from '../../../components/ui/button';
import {
  FileText, Search, Eye, FileSignature, ClipboardCheck, Bell, Upload, Download, Loader2, CheckCircle, Clock
} from 'lucide-react';
import { auditorAPI } from '../../../api';

type DocumentType = 'contract' | 'agreement' | 'notification' | 'inspection';

interface Document {
  id: string;
  type: DocumentType;
  name: string;
  description: string;
  agency: string;
  createdBy: string;
  createdAt: string;
  status: 'draft' | 'active' | 'signed' | 'archived';
  fileSize: string;
  version: number;
}

// Map API response to component format
const mapApiDocToDocument = (doc: any): Document => {
  return {
    id: doc.id,
    type: doc.type?.toLowerCase() === 'contract' ? 'contract' : 'contract',
    name: doc.name || `Documento #${doc.id}`,
    description: doc.tenant ? `Inquilino: ${doc.tenant}` : 'Documento do sistema',
    agency: 'N/A', // Not returned by API
    createdBy: 'sistema',
    createdAt: doc.createdAt ? new Date(doc.createdAt).toISOString().split('T')[0] : '',
    status: doc.status?.toLowerCase() === 'signed' ? 'signed' :
            doc.status?.toLowerCase() === 'pending' ? 'draft' : 'active',
    fileSize: 'N/A',
    version: 1,
  };
};

export function AuditorDocuments() {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'documents' | 'uploads'>('documents');
  const [typeFilter, setTypeFilter] = useState<'all' | DocumentType>('all');

  // Fetch documents from API
  const { data: apiDocs = [], isLoading } = useQuery({
    queryKey: ['auditor-documents'],
    queryFn: () => auditorAPI.getDocuments(),
  });

  // Map API docs to component format
  const documents: Document[] = Array.isArray(apiDocs) ? apiDocs.map(mapApiDocToDocument) : [];

  const filteredDocuments = documents.filter(doc => {
    if (typeFilter !== 'all' && doc.type !== typeFilter) return false;
    return doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.agency.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const getTypeIcon = (type: DocumentType) => {
    switch (type) {
      case 'contract': return <FileText className="w-4 h-4" />;
      case 'agreement': return <FileSignature className="w-4 h-4" />;
      case 'notification': return <Bell className="w-4 h-4" />;
      case 'inspection': return <ClipboardCheck className="w-4 h-4" />;
    }
  };

  const getTypeStyle = (type: DocumentType) => {
    switch (type) {
      case 'contract': return 'bg-blue-100 text-blue-700';
      case 'agreement': return 'bg-purple-100 text-purple-700';
      case 'notification': return 'bg-yellow-100 text-yellow-700';
      case 'inspection': return 'bg-green-100 text-green-700';
    }
  };

  const getTypeLabel = (type: DocumentType) => {
    switch (type) {
      case 'contract': return 'Contrato';
      case 'agreement': return 'Acordo';
      case 'notification': return 'Notificação';
      case 'inspection': return 'Vistoria';
    }
  };

  const getStatusStyle = (status: Document['status']) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-700';
      case 'active': return 'bg-blue-100 text-blue-700';
      case 'signed': return 'bg-green-100 text-green-700';
      case 'archived': return 'bg-orange-100 text-orange-700';
    }
  };

  const getStatusLabel = (status: Document['status']) => {
    switch (status) {
      case 'draft': return 'Rascunho';
      case 'active': return 'Ativo';
      case 'signed': return 'Assinado';
      case 'archived': return 'Arquivado';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-3 bg-amber-100 rounded-lg">
          <FileText className="w-6 h-6 text-amber-700" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Documentos</h1>
          <p className="text-muted-foreground">Visualização de documentos e logs de upload (somente leitura)</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Documentos</p>
              <p className="text-xl font-bold">{isLoading ? '...' : documents.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Assinados</p>
              <p className="text-xl font-bold">{isLoading ? '...' : documents.filter(d => d.status === 'signed').length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Clock className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Pendentes</p>
              <p className="text-xl font-bold">{isLoading ? '...' : documents.filter(d => d.status === 'draft').length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Ativos</p>
              <p className="text-xl font-bold">{isLoading ? '...' : documents.filter(d => d.status === 'active').length}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <button
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'documents' ? 'bg-primary text-white' : 'bg-gray-100 hover:bg-gray-200'
          }`}
          onClick={() => setActiveTab('documents')}
        >
          <FileText className="w-4 h-4 inline mr-2" />
          Documentos
        </button>
        <button
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'uploads' ? 'bg-primary text-white' : 'bg-gray-100 hover:bg-gray-200'
          }`}
          onClick={() => setActiveTab('uploads')}
        >
          <Upload className="w-4 h-4 inline mr-2" />
          Logs de Upload
        </button>
      </div>

      {/* Type Filter (for documents tab) */}
      {activeTab === 'documents' && (
        <div className="flex flex-wrap gap-2">
          <Button
            variant={typeFilter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTypeFilter('all')}
          >
            Todos
          </Button>
          {(['contract', 'agreement', 'notification', 'inspection'] as DocumentType[]).map(type => (
            <Button
              key={type}
              variant={typeFilter === type ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTypeFilter(type)}
              className="flex items-center gap-1"
            >
              {getTypeIcon(type)}
              {getTypeLabel(type)}
            </Button>
          ))}
        </div>
      )}

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder={activeTab === 'documents' ? 'Buscar documentos...' : 'Buscar uploads...'}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Documents Tab */}
      {activeTab === 'documents' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Eye className="w-4 h-4" />
              Lista de Documentos ({filteredDocuments.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left p-4 text-sm font-medium">Documento</th>
                    <th className="text-left p-4 text-sm font-medium">Tipo</th>
                    <th className="text-left p-4 text-sm font-medium">Agência</th>
                    <th className="text-left p-4 text-sm font-medium">Status</th>
                    <th className="text-left p-4 text-sm font-medium">Data</th>
                    <th className="text-left p-4 text-sm font-medium">Versão</th>
                    <th className="text-left p-4 text-sm font-medium">Tamanho</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredDocuments.map((doc) => (
                    <tr key={doc.id} className="hover:bg-gray-50">
                      <td className="p-4">
                        <p className="font-medium text-sm">{doc.name}</p>
                        <p className="text-xs text-muted-foreground">{doc.description}</p>
                      </td>
                      <td className="p-4">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs ${getTypeStyle(doc.type)}`}>
                          {getTypeIcon(doc.type)}
                          {getTypeLabel(doc.type)}
                        </span>
                      </td>
                      <td className="p-4 text-sm">{doc.agency}</td>
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded text-xs ${getStatusStyle(doc.status)}`}>
                          {getStatusLabel(doc.status)}
                        </span>
                      </td>
                      <td className="p-4 text-sm text-muted-foreground">
                        {new Date(doc.createdAt).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="p-4 text-sm">v{doc.version}</td>
                      <td className="p-4 text-sm text-muted-foreground">{doc.fileSize}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Uploads Tab */}
      {activeTab === 'uploads' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Upload className="w-4 h-4" />
              Logs de Upload
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Upload className="w-12 h-12 mb-4 opacity-50" />
              <p className="text-lg font-medium">Nenhum log de upload</p>
              <p className="text-sm">Os logs de upload estarão disponíveis em breve.</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
