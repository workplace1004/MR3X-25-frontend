import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Input } from '../../../components/ui/input';
import { Button } from '../../../components/ui/button';
import {
  Eye, Activity, Shield, Server, AlertTriangle, Search, Download, Filter, Loader2
} from 'lucide-react';
import { auditorAPI } from '../../../api';

type LogType = 'access' | 'activity' | 'system' | 'auth' | 'error';

interface LogEntry {
  id: string;
  timestamp: string;
  type: LogType;
  level: 'info' | 'warning' | 'error' | 'success';
  user?: string;
  ip?: string;
  action: string;
  details: string;
}

// Map API response to component format
const mapApiLogToEntry = (log: any): LogEntry => {
  // Determine log type based on event name
  let type: LogType = 'activity';
  const eventLower = (log.event || '').toLowerCase();
  if (eventLower.includes('login') || eventLower.includes('logout') || eventLower.includes('access')) {
    type = 'access';
  } else if (eventLower.includes('auth') || eventLower.includes('token') || eventLower.includes('password')) {
    type = 'auth';
  } else if (eventLower.includes('error') || eventLower.includes('fail')) {
    type = 'error';
  } else if (eventLower.includes('system') || eventLower.includes('backup') || eventLower.includes('deploy')) {
    type = 'system';
  }

  // Determine level based on event
  let level: 'info' | 'warning' | 'error' | 'success' = 'info';
  if (eventLower.includes('error') || eventLower.includes('fail')) {
    level = 'error';
  } else if (eventLower.includes('warning') || eventLower.includes('alert')) {
    level = 'warning';
  } else if (eventLower.includes('success') || eventLower.includes('create') || eventLower.includes('sign')) {
    level = 'success';
  }

  // Format timestamp
  const timestamp = log.timestamp
    ? new Date(log.timestamp).toLocaleString('pt-BR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }).replace(',', '')
    : '';

  return {
    id: log.id,
    timestamp,
    type,
    level,
    user: log.user || undefined,
    ip: log.ip || undefined,
    action: log.event || 'UNKNOWN',
    details: log.entity ? `${log.entity} #${log.entityId}` : (log.event || 'N/A'),
  };
};

const logTypeConfig: Record<LogType, { label: string; icon: React.ElementType; color: string; bgColor: string }> = {
  access: { label: 'Acesso', icon: Eye, color: 'text-blue-600', bgColor: 'bg-blue-100' },
  activity: { label: 'Atividade', icon: Activity, color: 'text-purple-600', bgColor: 'bg-purple-100' },
  system: { label: 'Sistema', icon: Server, color: 'text-cyan-600', bgColor: 'bg-cyan-100' },
  auth: { label: 'Autenticação', icon: Shield, color: 'text-green-600', bgColor: 'bg-green-100' },
  error: { label: 'Erro', icon: AlertTriangle, color: 'text-red-600', bgColor: 'bg-red-100' },
};

export function AuditorLogs() {
  const [activeTab, setActiveTab] = useState<LogType | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch logs from API
  const { data: apiLogs = [], isLoading, error } = useQuery({
    queryKey: ['auditor-logs'],
    queryFn: () => auditorAPI.getLogs(),
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Map API logs to component format
  const logs: LogEntry[] = Array.isArray(apiLogs) ? apiLogs.map(mapApiLogToEntry) : [];

  const filteredLogs = logs.filter(log => {
    if (activeTab !== 'all' && log.type !== activeTab) return false;
    if (searchTerm && !log.details.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !log.action.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !(log.user?.toLowerCase().includes(searchTerm.toLowerCase()))) return false;
    return true;
  });

  const getLevelStyle = (level: LogEntry['level']) => {
    switch (level) {
      case 'success': return 'bg-green-100 text-green-700';
      case 'warning': return 'bg-yellow-100 text-yellow-700';
      case 'error': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-green-100 rounded-lg">
            <Activity className="w-6 h-6 text-green-700" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Logs do Sistema</h1>
            <p className="text-muted-foreground">Visualização de todos os logs (somente leitura)</p>
          </div>
        </div>
        <Button variant="outline" className="flex items-center gap-2">
          <Download className="w-4 h-4" />
          Exportar CSV
        </Button>
      </div>

      {/* Log Type Tabs */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant={activeTab === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setActiveTab('all')}
        >
          Todos
        </Button>
        {Object.entries(logTypeConfig).map(([type, config]) => (
          <Button
            key={type}
            variant={activeTab === type ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveTab(type as LogType)}
            className="flex items-center gap-2"
          >
            <config.icon className="w-4 h-4" />
            {config.label}
          </Button>
        ))}
      </div>

      {/* Search and Filter */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar nos logs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button variant="outline" className="flex items-center gap-2">
              <Filter className="w-4 h-4" />
              Filtros
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Logs Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Eye className="w-4 h-4" />
            Registros ({filteredLogs.length})
            {isLoading && <Loader2 className="w-4 h-4 animate-spin ml-2" />}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">Carregando logs...</span>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center py-12 text-red-500">
              <AlertTriangle className="w-6 h-6 mr-2" />
              <span>Erro ao carregar logs. Tente novamente.</span>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Activity className="w-12 h-12 mb-4 opacity-50" />
              <p className="text-lg font-medium">Nenhum log encontrado</p>
              <p className="text-sm">Não há registros de auditoria no sistema ainda.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left p-4 text-sm font-medium">Timestamp</th>
                    <th className="text-left p-4 text-sm font-medium">Tipo</th>
                    <th className="text-left p-4 text-sm font-medium">Nível</th>
                    <th className="text-left p-4 text-sm font-medium">Usuário</th>
                    <th className="text-left p-4 text-sm font-medium">IP</th>
                    <th className="text-left p-4 text-sm font-medium">Ação</th>
                    <th className="text-left p-4 text-sm font-medium">Detalhes</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredLogs.map((log) => {
                    const typeConfig = logTypeConfig[log.type];
                    return (
                      <tr key={log.id} className="hover:bg-gray-50">
                        <td className="p-4 text-sm font-mono text-muted-foreground">{log.timestamp}</td>
                        <td className="p-4">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${typeConfig.bgColor} ${typeConfig.color}`}>
                            <typeConfig.icon className="w-3 h-3" />
                            {typeConfig.label}
                          </span>
                        </td>
                        <td className="p-4">
                          <span className={`px-2 py-1 rounded-full text-xs ${getLevelStyle(log.level)}`}>
                            {log.level}
                          </span>
                        </td>
                        <td className="p-4 text-sm">{log.user || '-'}</td>
                        <td className="p-4 text-sm font-mono">{log.ip || '-'}</td>
                        <td className="p-4 text-sm font-medium">{log.action}</td>
                        <td className="p-4 text-sm text-muted-foreground">{log.details}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
