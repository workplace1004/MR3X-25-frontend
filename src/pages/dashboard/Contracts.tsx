import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { contractsAPI, propertiesAPI, usersAPI, contractTemplatesAPI } from '../../api';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { useAuth } from '../../contexts/AuthContext';
import { QRCodeSVG } from 'qrcode.react';
import Barcode from 'react-barcode';
import {
  FileText,
  Plus,
  Download,
  Calendar,
  DollarSign,
  Edit,
  Trash2,
  Eye,
  MoreHorizontal,
  User,
  Clock,
  List,
  Grid3X3
} from 'lucide-react';
import { formatCurrency, formatDate } from '../../lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../../components/ui/dialog';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Card, CardContent } from '../../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../../components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../../components/ui/tooltip';

export function Contracts() {
  const { user, hasPermission } = useAuth();
  const queryClient = useQueryClient();

  const isCEO = user?.role === 'CEO';
  const isProprietario = user?.role === 'PROPRIETARIO';
  const canViewContracts = hasPermission('contracts:read') || ['CEO', 'AGENCY_ADMIN', 'AGENCY_MANAGER', 'BROKER', 'INDEPENDENT_OWNER', 'PROPRIETARIO'].includes(user?.role || '');
  const canCreateContracts = hasPermission('contracts:create') && !isCEO && !isProprietario;
  const canUpdateContracts = hasPermission('contracts:update') && !isCEO && !isProprietario;
  const canDeleteContracts = hasPermission('contracts:delete') && !isCEO && !isProprietario;

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const [newContract, setNewContract] = useState({
    propertyId: '',
    tenantId: '',
    startDate: '',
    endDate: '',
    monthlyRent: '',
    deposit: '',
    dueDay: '',
    description: '',
    templateId: '',
    templateType: 'CTR' as 'CTR' | 'ACD' | 'VST',
    creci: '',
  });

  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [editPdfFile, setEditPdfFile] = useState<File | null>(null);

  const [editForm, setEditForm] = useState({
    propertyId: '',
    tenantId: '',
    startDate: '',
    endDate: '',
    monthlyRent: '',
    deposit: '',
    dueDay: '',
    description: '',
  });

  const [selectedContract, setSelectedContract] = useState<any>(null);
  const [contractToDelete, setContractToDelete] = useState<any>(null);
  const [contractDetail, setContractDetail] = useState<any>(null);
  const [properties, setProperties] = useState<any[]>([]);
  const [tenants, setTenants] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [deleting] = useState(false);
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [previewContent, setPreviewContent] = useState<string>('');

  if (!canViewContracts) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-muted-foreground">Access Denied</h2>
          <p className="text-muted-foreground">You do not have permission to view contracts.</p>
        </div>
      </div>
    );
  }

  const { data: contracts, isLoading } = useQuery({
    queryKey: ['contracts', user?.id ?? 'anonymous', user?.role ?? 'unknown', user?.agencyId ?? 'none', user?.brokerId ?? 'none'],
    queryFn: () => contractsAPI.getContracts(),
    enabled: canViewContracts,
  });

  const { data: templates = [], isLoading: templatesLoading } = useQuery({
    queryKey: ['contract-templates'],
    queryFn: () => contractTemplatesAPI.getTemplates(),
    enabled: canCreateContracts,
  });

  useEffect(() => {
    const loadData = async () => {
      try {
        const [propertiesData, tenantsData] = await Promise.all([
          propertiesAPI.getProperties(),
          usersAPI.getTenants()
        ]);
        setProperties(propertiesData);
        setTenants(tenantsData);
      } catch (error) {
        console.error('Error loading data:', error);
      }
    };
    
    if (canCreateContracts || canUpdateContracts) {
      loadData();
    }
  }, [canCreateContracts, canUpdateContracts]);

  const closeAllModals = () => {
    setShowCreateModal(false);
    setShowEditModal(false);
    setShowDetailModal(false);
    setSelectedContract(null);
    setContractToDelete(null);
    setPdfFile(null);
    setEditPdfFile(null);
  };

  const updateContractMutation = useMutation({
    mutationFn: ({ id, data }: { id: string, data: any }) => contractsAPI.updateContract(id, data),
    
    onError: () => {
      toast.error('Erro ao atualizar contrato');
    },
  });

  const deleteContractMutation = useMutation({
    mutationFn: (id: string) => contractsAPI.deleteContract(id),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['contracts', user?.id ?? 'anonymous', user?.role ?? 'unknown', user?.agencyId ?? 'none', user?.brokerId ?? 'none']
      });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['audit-logs'] });
      closeAllModals();
      toast.success('Contrato excluído com sucesso');
    },
    onError: () => {
      toast.error('Erro ao excluir contrato');
    },
  });

  const handleCreateContract = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      const contractToSend = {
        ...newContract,
        startDate: new Date(newContract.startDate).toISOString().split('T')[0],
        endDate: new Date(newContract.endDate).toISOString().split('T')[0],
        monthlyRent: Number(newContract.monthlyRent),
        deposit: newContract.deposit ? Number(newContract.deposit) : undefined,
        dueDay: newContract.dueDay ? Number(newContract.dueDay) : undefined,
        status: 'ATIVO',
        templateId: newContract.templateId || undefined,
        templateType: newContract.templateType || undefined,
        creci: newContract.creci || undefined,
      };

      const createdContract = await contractsAPI.createContract(contractToSend);

      if (pdfFile && createdContract?.id) {
        try {
          await contractsAPI.uploadContractPDF(createdContract.id.toString(), pdfFile);
          toast.success('Contrato criado e PDF enviado com sucesso');
        } catch (uploadError: any) {
          console.error('Error uploading PDF:', uploadError);
          toast.error(uploadError?.message || 'Contrato criado, mas falha ao enviar PDF');
        }
      } else {
        toast.success('Contrato criado com sucesso');
      }

      queryClient.invalidateQueries({
        queryKey: ['contracts', user?.id ?? 'anonymous', user?.role ?? 'unknown', user?.agencyId ?? 'none', user?.brokerId ?? 'none']
      });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['audit-logs'] });
      closeAllModals();
      setNewContract({
        propertyId: '', tenantId: '', startDate: '', endDate: '',
        monthlyRent: '', deposit: '', dueDay: '', description: '',
        templateId: '', templateType: 'CTR', creci: ''
      });
      setPdfFile(null);
      setSelectedTemplate(null);
      setPreviewContent('');
    } catch (error: any) {
      toast.error(error.message || 'Erro ao criar contrato');
    } finally {
      setCreating(false);
    }
  };

  const handleUpdateContract = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedContract) return;
    setUpdating(true);
    try {
      const contractToSend = {
        ...editForm,
        startDate: new Date(editForm.startDate),
        endDate: new Date(editForm.endDate),
        monthlyRent: Number(editForm.monthlyRent),
        deposit: Number(editForm.deposit),
        dueDay: Number(editForm.dueDay),
      };

      await updateContractMutation.mutateAsync({ id: selectedContract.id.toString(), data: contractToSend });

      if (editPdfFile) {
        try {
          await contractsAPI.uploadContractPDF(selectedContract.id.toString(), editPdfFile);
          toast.success('Contrato e PDF atualizados com sucesso');
        } catch (uploadError: any) {
          console.error('Error uploading PDF:', uploadError);
          toast.error(uploadError?.message || 'Contrato atualizado, mas falha ao enviar PDF');
        }
      } else {
        toast.success('Contrato atualizado com sucesso');
      }

      queryClient.invalidateQueries({
        queryKey: ['contracts', user?.id ?? 'anonymous', user?.role ?? 'unknown', user?.agencyId ?? 'none', user?.brokerId ?? 'none']
      });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['audit-logs'] });
      closeAllModals();
      setEditPdfFile(null);
    } catch (error: any) {
      toast.error(error.message || 'Erro ao atualizar contrato');
    } finally {
      setUpdating(false);
    }
  };

  const handleViewContract = async (contract: any) => {
    closeAllModals();
    setSelectedContract(contract);
    setContractDetail(contract);
    setShowDetailModal(true);
  };

  const handleEditContract = async (contract: any) => {
    closeAllModals();
    setLoading(true);
    try {
      
      const fullContractDetails = await contractsAPI.getContractById(contract.id.toString());
      console.log('[handleEditContract] Full contract details:', fullContractDetails);

      if (!fullContractDetails) {
        toast.error('Contrato não encontrado');
        return;
      }

      setSelectedContract(fullContractDetails);

      const propertyIdStr = fullContractDetails.propertyId?.toString() || fullContractDetails.property?.id?.toString() || '';
      const tenantIdStr = fullContractDetails.tenantId?.toString() || fullContractDetails.tenantUser?.id?.toString() || '';

      setEditForm({
        propertyId: propertyIdStr,
        tenantId: tenantIdStr,
        startDate: fullContractDetails.startDate ? (typeof fullContractDetails.startDate === 'string' ? fullContractDetails.startDate.split('T')[0] : new Date(fullContractDetails.startDate).toISOString().split('T')[0]) : '',
        endDate: fullContractDetails.endDate ? (typeof fullContractDetails.endDate === 'string' ? fullContractDetails.endDate.split('T')[0] : new Date(fullContractDetails.endDate).toISOString().split('T')[0]) : '',
        monthlyRent: fullContractDetails.monthlyRent ? fullContractDetails.monthlyRent.toString() : '',
        deposit: fullContractDetails.deposit ? fullContractDetails.deposit.toString() : '',
        dueDay: fullContractDetails.dueDay ? fullContractDetails.dueDay.toString() : '',
        description: fullContractDetails.description || '',
      });
      setEditPdfFile(null); 
      setShowEditModal(true);
    } catch (error: any) {
      console.error('Error fetching contract details:', error);
      toast.error(error?.message || 'Erro ao carregar detalhes do contrato');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteContract = (contract: any) => {
    closeAllModals();
    setContractToDelete(contract);
  };

  const confirmDelete = () => {
    if (contractToDelete) {
      deleteContractMutation.mutate(contractToDelete.id);
    }
  };

  const handleDownload = async (id: string) => {
    try {
      const blob = await contractsAPI.downloadContract(id);
      if (!blob || blob.size === 0) {
        toast.error('Arquivo PDF não encontrado ou vazio');
        return;
      }
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `contrato-${id}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Contrato baixado com sucesso');
    } catch (error: any) {
      console.error('Error downloading contract:', error);
      const errorMessage = error?.message || error?.data?.message || 'Erro ao baixar contrato';
      toast.error(errorMessage);
    }
  };

  const generatePreview = (template: any) => {
    if (!template) return;

    const selectedProperty = properties.find((p: any) => {
      const pId = p.id?.toString() || String(p.id);
      return pId === newContract.propertyId;
    });

    const selectedTenant = tenants.find((t: any) => {
      const tId = t.id?.toString() || String(t.id);
      return tId === newContract.tenantId;
    });

    const owner = selectedProperty?.owner || {};

    const calculateMonths = (start: string, end: string) => {
      if (!start || !end) return '';
      const startDate = new Date(start);
      const endDate = new Date(end);
      const months = (endDate.getFullYear() - startDate.getFullYear()) * 12 + (endDate.getMonth() - startDate.getMonth());
      return months.toString();
    };

    let content = template.content;

    const replacements: Record<string, string> = {
      NOME_CORRETOR: user?.name || '',
      CRECI_CORRETOR: newContract.creci || '',
      NOME_LOCADOR: owner?.name || '',
      CPF_LOCADOR: owner?.document || '',
      ENDERECO_LOCADOR: owner?.address || '',
      EMAIL_LOCADOR: owner?.email || '',
      TELEFONE_LOCADOR: owner?.phone || '',
      NOME_LOCATARIO: selectedTenant?.name || '',
      CPF_LOCATARIO: selectedTenant?.document || '',
      ENDERECO_LOCATARIO: selectedTenant?.address || '',
      EMAIL_LOCATARIO: selectedTenant?.email || '',
      TELEFONE_LOCATARIO: selectedTenant?.phone || '',
      ENDERECO_IMOVEL: selectedProperty?.address || '',
      DESCRICAO_IMOVEL: selectedProperty?.name || '',
      PRAZO_MESES: calculateMonths(newContract.startDate, newContract.endDate),
      DATA_INICIO: newContract.startDate ? new Date(newContract.startDate).toLocaleDateString('pt-BR') : '',
      DATA_FIM: newContract.endDate ? new Date(newContract.endDate).toLocaleDateString('pt-BR') : '',
      VALOR_ALUGUEL: newContract.monthlyRent || '0',
      DIA_VENCIMENTO: newContract.dueDay || '',
      INDICE_REAJUSTE: 'IGPM',
      TIPO_GARANTIA: 'Caução',
      COMARCA: selectedProperty?.city || '',
      CIDADE: selectedProperty?.city || '',
      DATA_ASSINATURA: new Date().toLocaleDateString('pt-BR'),
    };

    for (const [key, value] of Object.entries(replacements)) {
      content = content.replace(new RegExp(`\\[${key}\\]`, 'g'), value || '');
    }

    setPreviewContent(content);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setNewContract(prev => {
      const updated = { ...prev, [name]: value };

      if (name === 'propertyId' && value) {
        const selectedProperty = properties.find(p => {
          const pId = p.id?.toString() || String(p.id);
          const vId = value?.toString() || String(value);
          return pId === vId;
        });
        if (selectedProperty) {
          
          if (selectedProperty.monthlyRent) {
            updated.monthlyRent = selectedProperty.monthlyRent.toString();
          }
          
          if (selectedProperty.dueDay) {
            updated.dueDay = selectedProperty.dueDay.toString();
          }
          
          if (selectedProperty.tenantId) {
            const tenantIdStr = selectedProperty.tenantId?.toString() || String(selectedProperty.tenantId);
            updated.tenantId = tenantIdStr;
          }
          
          if (selectedProperty.deposit) {
            updated.deposit = selectedProperty.deposit.toString();
          }
        }
      }

      return updated;
    });
  };

  const handleEditInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setEditForm(prev => {
      const updated = { ...prev, [name]: value };

      if (name === 'propertyId' && value) {
        const selectedProperty = properties.find(p => {
          const pId = p.id?.toString() || String(p.id);
          const vId = value?.toString() || String(value);
          return pId === vId;
        });
        if (selectedProperty) {
          
          if (selectedProperty.monthlyRent) {
            updated.monthlyRent = selectedProperty.monthlyRent.toString();
          }
          
          if (selectedProperty.dueDay) {
            updated.dueDay = selectedProperty.dueDay.toString();
          }
          
          if (selectedProperty.tenantId) {
            const tenantIdStr = selectedProperty.tenantId?.toString() || String(selectedProperty.tenantId);
            updated.tenantId = tenantIdStr;
          }
          
          if (selectedProperty.deposit) {
            updated.deposit = selectedProperty.deposit.toString();
          }
        }
      }

      return updated;
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ATIVO':
        return <Badge className="bg-green-500 text-white">Ativo</Badge>;
      case 'PENDENTE':
        return <Badge className="bg-yellow-500 text-white">Pendente</Badge>;
      case 'FINALIZADO':
        return <Badge className="bg-gray-500 text-white">Finalizado</Badge>;
      default:
        return <Badge className="bg-gray-500 text-white">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Contratos</h1>
            <p className="text-sm sm:text-base text-muted-foreground mt-1">
              Gerencie todos os seus contratos
            </p>
          </div>
          <div className="flex items-center gap-2">
            {}
            <div className="flex border border-border rounded-lg p-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    variant={viewMode === 'table' ? 'default' : 'ghost'}
                    onClick={() => setViewMode('table')}
                    className={viewMode === 'table' ? 'bg-orange-600 hover:bg-orange-700 text-white' : ''}
                  >
                    <List className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Visualização em Tabela</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    variant={viewMode === 'cards' ? 'default' : 'ghost'}
                    onClick={() => setViewMode('cards')}
                    className={viewMode === 'cards' ? 'bg-orange-600 hover:bg-orange-700 text-white' : ''}
                  >
                    <Grid3X3 className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Visualização em Cards</TooltipContent>
              </Tooltip>
            </div>

            {canCreateContracts && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    className="bg-orange-600 hover:bg-orange-700 text-white"
                    onClick={() => {
                      closeAllModals();
                      setShowCreateModal(true);
                    }}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    <span className="hidden sm:inline">Criar Contrato</span>
                    <span className="sm:hidden">Adicionar</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Criar Contrato</TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>

        {}
        {contracts && contracts.length > 0 ? (
          viewMode === 'table' ? (
            
            <div className="bg-card border border-border rounded-lg overflow-hidden">
              {}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left p-4 font-semibold">Imóvel</th>
                      <th className="text-left p-4 font-semibold">Inquilino</th>
                      <th className="text-left p-4 font-semibold">Período</th>
                      <th className="text-left p-4 font-semibold">Valor Mensal</th>
                      <th className="text-left p-4 font-semibold">Status</th>
                      <th className="text-left p-4 font-semibold">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {contracts.map((contract: any) => (
                      <tr key={contract.id} className="border-t border-border hover:bg-muted/30 transition-colors">
                        <td className="p-4">
                          <div className="font-medium">{contract.property?.name || contract.property?.address || 'Sem imóvel'}</div>
                          {contract.contractToken && (
                            <div className="text-[10px] text-muted-foreground font-mono">{contract.contractToken}</div>
                          )}
                          <div className="text-sm text-muted-foreground">{contract.property?.neighborhood || ''}</div>
                        </td>
                        <td className="p-4">
                          <div className="text-muted-foreground">{contract.tenantUser?.name || contract.tenant || 'Sem inquilino'}</div>
                          <div className="text-sm text-muted-foreground">{contract.tenantUser?.phone || ''}</div>
                        </td>
                        <td className="p-4">
                          <div className="text-sm text-muted-foreground">
                            {formatDate(contract.startDate)}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            até {formatDate(contract.endDate)}
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="font-medium">{formatCurrency(Number(contract.monthlyRent))}</div>
                        </td>
                        <td className="p-4">
                          {getStatusBadge(contract.status)}
                        </td>
                        <td className="p-4">
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleViewContract(contract)}
                              className="text-orange-600 border-orange-600 hover:bg-orange-50"
                            >
                              Detalhes
                            </Button>
                            {canUpdateContracts && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleEditContract(contract)}
                                className="text-orange-600 border-orange-600 hover:bg-orange-50"
                              >
                                Editar
                              </Button>
                            )}
                            {contract.pdfPath && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleDownload(contract.id.toString())}
                                className="text-blue-600 border-blue-600 hover:bg-blue-50"
                              >
                                <Download className="w-4 h-4" />
                              </Button>
                            )}
                            {canDeleteContracts && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleDeleteContract(contract)}
                                className="text-red-600 border-red-600 hover:bg-red-50"
                              >
                                Excluir
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {}
              <div className="md:hidden">
                {contracts.map((contract: any) => (
                  <div key={contract.id} className="border-b border-border last:border-b-0 p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg">{contract.property?.name || contract.property?.address || 'Imóvel'}</h3>
                        {contract.contractToken && (
                          <p className="text-[10px] text-muted-foreground font-mono">{contract.contractToken}</p>
                        )}
                        <p className="text-sm text-muted-foreground">{contract.tenantUser?.name || contract.tenant || 'Sem inquilino'}</p>
                      </div>
                      {getStatusBadge(contract.status)}
                    </div>

                    <div className="space-y-2 mb-4">
                      <div className="flex items-center text-sm text-muted-foreground">
                        <span className="font-medium w-24">Período:</span>
                        <span>{formatDate(contract.startDate)} - {formatDate(contract.endDate)}</span>
                      </div>
                      <div className="flex items-center text-sm text-muted-foreground">
                        <span className="font-medium w-24">Valor:</span>
                        <span>{formatCurrency(Number(contract.monthlyRent))}/mês</span>
                      </div>
                    </div>

                    <div className="flex gap-2 flex-wrap">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleViewContract(contract)}
                        className="text-orange-600 border-orange-600 hover:bg-orange-50 flex-1"
                      >
                        Detalhes
                      </Button>
                      {canUpdateContracts && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEditContract(contract)}
                          className="text-orange-600 border-orange-600 hover:bg-orange-50 flex-1"
                        >
                          Editar
                        </Button>
                      )}
                      {contract.pdfPath && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDownload(contract.id.toString())}
                          className="text-blue-600 border-blue-600 hover:bg-blue-50"
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                      )}
                      {canDeleteContracts && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDeleteContract(contract)}
                          className="text-red-600 border-red-600 hover:bg-red-50 flex-1"
                        >
                          Excluir
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            
            <div className="flex justify-center w-full">
              <div className="grid grid-cols-[repeat(auto-fit,minmax(400px,1fr))] gap-6 w-full max-w-7xl px-2 items-stretch justify-center">
                {contracts.map((contract: any) => (
                <Card key={contract.id} className="transition-all hover:shadow-md flex flex-col w-[400px] mx-auto overflow-hidden">
                  <CardContent className="p-0 h-full flex flex-col overflow-hidden">
                    <div className="flex h-full">
                      {}
                      <div className="w-28 min-w-28 h-36 bg-primary/10 flex items-center justify-center rounded-l-md">
                        <FileText className="w-12 h-12 text-primary" />
                      </div>
                      {}
                      <div className="flex-1 flex flex-col justify-between p-4">
                        <div>
                          <h3 className="text-lg font-bold break-words">
                            {contract.property?.name || contract.property?.address || 'Imóvel'}
                          </h3>
                          {contract.contractToken && (
                            <p className="text-[10px] text-muted-foreground font-mono">{contract.contractToken}</p>
                          )}
                          <p className="text-sm text-muted-foreground break-words">
                            <User className="w-3 h-3 inline mr-1" />
                            {contract.tenantUser?.name || contract.tenant || 'Sem inquilino'}
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                            <Calendar className="w-3 h-3 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">
                              {formatDate(contract.startDate)} - {formatDate(contract.endDate)}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <DollarSign className="w-3 h-3 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">
                              {formatCurrency(Number(contract.monthlyRent))}/mês
                            </span>
                          </div>
                          {contract.lastPaymentDate && (
                            <div className="flex items-center gap-2 mt-1">
                              <Clock className="w-3 h-3 text-muted-foreground" />
                              <span className="text-xs text-muted-foreground">
                                Último pagamento: {formatDate(contract.lastPaymentDate)}
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center justify-between mt-2">
                          {getStatusBadge(contract.status)}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button size="icon" variant="outline">
                                <MoreHorizontal className="w-5 h-5" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleViewContract(contract)}>
                                <Eye className="w-4 h-4 mr-2" />
                                Visualizar
                              </DropdownMenuItem>
                              {canUpdateContracts && (
                                <DropdownMenuItem onClick={() => handleEditContract(contract)}>
                                  <Edit className="w-4 h-4 mr-2" />
                                  Editar contrato
                                </DropdownMenuItem>
                              )}
                              {contract.pdfPath && (
                                <DropdownMenuItem onClick={() => handleDownload(contract.id.toString())}>
                                  <Download className="w-4 h-4 mr-2" />
                                  Baixar PDF
                                </DropdownMenuItem>
                              )}
                              {canDeleteContracts && (
                                <DropdownMenuItem onClick={() => handleDeleteContract(contract)} className="text-red-600 focus:text-red-700">
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  Excluir contrato
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                ))}
              </div>
            </div>
          )
        ) : (
          
          <div className="text-center py-12 sm:py-16 bg-card border border-border rounded-lg px-4">
            <FileText className="w-12 h-12 sm:w-16 sm:h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-base sm:text-lg font-semibold mb-2">Nenhum contrato cadastrado</h3>
            <p className="text-sm sm:text-base text-muted-foreground mb-4">
              Comece criando seu primeiro contrato
            </p>
            {canCreateContracts && (
              <Button
                onClick={() => {
                  closeAllModals();
                  setShowCreateModal(true);
                }}
                className="bg-orange-600 hover:bg-orange-700 text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                Criar Contrato
              </Button>
            )}
          </div>
        )}

        {}
        <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Criar novo contrato</DialogTitle>
              <DialogDescription>Preencha os dados abaixo para criar um novo contrato de aluguel.</DialogDescription>
            </DialogHeader>
            <form className="space-y-4" onSubmit={handleCreateContract}>
              {}
              <div>
                <Label htmlFor="templateId">Modelo de Contrato (Opcional)</Label>
                <Select
                  value={newContract.templateId || 'none'}
                  onValueChange={(value) => {
                    if (value === 'none') {
                      setNewContract(prev => ({
                        ...prev,
                        templateId: '',
                        templateType: 'CTR'
                      }));
                      setSelectedTemplate(null);
                      setPreviewContent('');
                    } else {
                      const template = templates.find((t: any) => t.id === value);
                      setNewContract(prev => ({
                        ...prev,
                        templateId: value,
                        templateType: template?.type || 'CTR'
                      }));
                      setSelectedTemplate(template || null);
                      if (template) {
                        generatePreview(template);
                      }
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={templatesLoading ? 'Carregando modelos...' : 'Selecione um modelo'} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem modelo (padrão)</SelectItem>
                    {templates.map((template: any) => (
                      <SelectItem key={template.id} value={template.id}>
                        {template.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedTemplate && (
                  <p className="text-xs text-muted-foreground mt-1">{selectedTemplate.description}</p>
                )}
              </div>

              {}
              {(user?.role === 'BROKER' || user?.role === 'AGENCY_MANAGER' || user?.role === 'AGENCY_ADMIN') && (
                <div>
                  <Label htmlFor="creci">CRECI (Opcional)</Label>
                  <Input
                    id="creci"
                    name="creci"
                    value={newContract.creci}
                    onChange={handleInputChange}
                    placeholder="123456/SP-F ou 123456/SP-J"
                    pattern="[0-9]{6}/[A-Z]{2}-[FJ]"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Formato: 123456/SP-F (pessoa física) ou 123456/SP-J (pessoa jurídica)
                  </p>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="propertyId">Imóvel</Label>
                  <select
                    id="propertyId"
                    name="propertyId"
                    value={newContract.propertyId}
                    onChange={handleInputChange}
                    className="w-full p-2 border border-input rounded-md"
                    required
                  >
                    <option value="">Selecione um imóvel</option>
                    {properties.map((property) => {
                      const propId = property.id?.toString() || String(property.id);
                      return (
                        <option
                          key={propId}
                          value={propId}
                          disabled={property.isFrozen}
                        >
                          {property.name || property.address}
                          {property.isFrozen ? ' (Congelado - Faça upgrade)' : ''}
                        </option>
                      );
                    })}
                  </select>
                  {properties.some(p => p.isFrozen) && (
                    <p className="text-xs text-amber-600 mt-1">
                      Imóveis congelados não podem ter novos contratos. Faça upgrade do plano para desbloquear.
                    </p>
                  )}
                </div>
                <div>
                  <Label htmlFor="tenantId">Inquilino</Label>
                  <select
                    id="tenantId"
                    name="tenantId"
                    value={newContract.tenantId}
                    onChange={handleInputChange}
                    className="w-full p-2 border border-input rounded-md"
                    required
                  >
                    <option value="">Selecione um inquilino</option>
                    {tenants.map((tenant) => {
                      const tenantId = tenant.id?.toString() || String(tenant.id);
                      return (
                        <option key={tenantId} value={tenantId}>
                          {tenant.name || tenant.email || 'Sem nome'}
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="startDate">Data de início</Label>
                  <Input
                    id="startDate"
                    name="startDate"
                    type="date"
                    value={newContract.startDate}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="endDate">Data de término</Label>
                  <Input
                    id="endDate"
                    name="endDate"
                    type="date"
                    value={newContract.endDate}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="monthlyRent">Valor do aluguel</Label>
                  <Input
                    id="monthlyRent"
                    name="monthlyRent"
                    type="number"
                    step="0.01"
                    value={newContract.monthlyRent}
                    onChange={handleInputChange}
                    placeholder="0.00"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="deposit">Depósito</Label>
                  <Input
                    id="deposit"
                    name="deposit"
                    type="number"
                    step="0.01"
                    value={newContract.deposit}
                    onChange={handleInputChange}
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="dueDay">Dia de vencimento</Label>
                  <Input
                    id="dueDay"
                    name="dueDay"
                    type="number"
                    min="1"
                    max="31"
                    value={newContract.dueDay}
                    onChange={handleInputChange}
                    placeholder="5"
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="description">Descrição</Label>
                <Input
                  id="description"
                  name="description"
                  value={newContract.description}
                  onChange={handleInputChange}
                  placeholder="Descrição do contrato"
                />
              </div>

              <div>
                <Label htmlFor="pdf">Upload PDF do Contrato (opcional)</Label>
                <Input
                  id="pdf"
                  type="file"
                  accept=".pdf"
                  onChange={(e) => setPdfFile(e.target.files?.[0] || null)}
                  className="cursor-pointer"
                />
                {pdfFile && (
                  <p className="text-sm text-green-600 mt-1">✓ {pdfFile.name}</p>
                )}
              </div>

              <div className="flex justify-between gap-2">
                {selectedTemplate && previewContent && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowPreviewModal(true)}
                    disabled={creating}
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    Visualizar Prévia
                  </Button>
                )}
                <div className="flex gap-2 ml-auto">
                  <Button type="button" variant="outline" onClick={() => setShowCreateModal(false)} disabled={creating}>
                    Cancelar
                  </Button>
                  <Button type="submit" className="bg-primary hover:bg-primary/90" disabled={creating}>
                    {creating ? 'Criando...' : 'Criar'}
                  </Button>
                </div>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {}
        <Dialog open={showPreviewModal} onOpenChange={setShowPreviewModal}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Prévia do Contrato</DialogTitle>
              <DialogDescription>Visualize como ficará o contrato com as informações preenchidas.</DialogDescription>
            </DialogHeader>
            {previewContent ? (
              <div className="space-y-4">
                {}
                <div className="bg-muted p-4 rounded-lg border">
                  <h3 className="font-semibold mb-2">Informações de Segurança</h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="font-medium">Token:</span>{' '}
                      <span className="font-mono text-xs">MR3X-{newContract.templateType}-{new Date().getFullYear()}-XXXXX-XXXXX</span>
                    </div>
                    <div>
                      <span className="font-medium">CRECI:</span> {newContract.creci || 'Não informado'}
                    </div>
                  </div>
                </div>

                {}
                <div className="flex items-center justify-between p-4 bg-white border rounded-lg">
                  <div className="flex items-center gap-4">
                    {newContract.creci && (
                      <div>
                        <QRCodeSVG
                          value={`https://mr3x.com.br/verify/MR3X-${newContract.templateType}-${new Date().getFullYear()}-XXXXX`}
                          size={80}
                          level="H"
                        />
                      </div>
                    )}
                    {newContract.templateId && (
                      <div>
                        <Barcode
                          value={`MR3X-${newContract.templateType}-${new Date().getFullYear()}-XXXXX`}
                          format="CODE128"
                          width={2}
                          height={40}
                          displayValue={true}
                        />
                      </div>
                    )}
                  </div>
                </div>

                {}
                <div className="prose prose-sm max-w-none bg-white p-6 border rounded-lg">
                  <div className="whitespace-pre-wrap text-sm leading-relaxed">
                    {previewContent.split('\n').map((line, index) => {
                      const isBold = line.startsWith('**') || line.includes('CLÁUSULA') || line.includes('CONTRATO');
                      return (
                        <p key={index} className={isBold ? 'font-bold my-2' : 'my-1'}>
                          {line.replace(/\*\*/g, '')}
                        </p>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8">
                Selecione um modelo de contrato e preencha os dados para visualizar a prévia
              </p>
            )}
            <div className="flex justify-end">
              <Button variant="outline" onClick={() => setShowPreviewModal(false)}>
                Fechar
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {}
        <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Editar contrato</DialogTitle>
            </DialogHeader>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                <span className="ml-3 text-muted-foreground">Carregando dados do contrato...</span>
              </div>
            ) : (
            <form className="space-y-4" onSubmit={handleUpdateContract}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-propertyId">Imóvel</Label>
                  <select
                    id="edit-propertyId"
                    name="propertyId"
                    value={editForm.propertyId}
                    onChange={handleEditInputChange}
                    className="w-full p-2 border border-input rounded-md"
                    required
                  >
                    <option value="">Selecione um imóvel</option>
                    {properties.map((property) => {
                      const propId = property.id?.toString() || String(property.id);
                      return (
                        <option key={propId} value={propId}>
                          {property.name || property.address}
                        </option>
                      );
                    })}
                  </select>
                </div>
                <div>
                  <Label htmlFor="edit-tenantId">Inquilino</Label>
                  <select
                    id="edit-tenantId"
                    name="tenantId"
                    value={editForm.tenantId}
                    onChange={handleEditInputChange}
                    className="w-full p-2 border border-input rounded-md"
                    required
                  >
                    <option value="">Selecione um inquilino</option>
                    {tenants.map((tenant) => {
                      const tenantId = tenant.id?.toString() || String(tenant.id);
                      return (
                        <option key={tenantId} value={tenantId}>
                          {tenant.name || tenant.email || 'Sem nome'}
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-startDate">Data de início</Label>
                  <Input
                    id="edit-startDate"
                    name="startDate"
                    type="date"
                    value={editForm.startDate}
                    onChange={handleEditInputChange}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="edit-endDate">Data de término</Label>
                  <Input
                    id="edit-endDate"
                    name="endDate"
                    type="date"
                    value={editForm.endDate}
                    onChange={handleEditInputChange}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-monthlyRent">Valor do aluguel</Label>
                  <Input
                    id="edit-monthlyRent"
                    name="monthlyRent"
                    type="number"
                    step="0.01"
                    value={editForm.monthlyRent}
                    onChange={handleEditInputChange}
                    placeholder="0.00"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="edit-deposit">Depósito</Label>
                  <Input
                    id="edit-deposit"
                    name="deposit"
                    type="number"
                    step="0.01"
                    value={editForm.deposit}
                    onChange={handleEditInputChange}
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-dueDay">Dia de vencimento</Label>
                  <Input
                    id="edit-dueDay"
                    name="dueDay"
                    type="number"
                    min="1"
                    max="31"
                    value={editForm.dueDay}
                    onChange={handleEditInputChange}
                    placeholder="5"
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="edit-description">Descrição</Label>
                <Input
                  id="edit-description"
                  name="description"
                  value={editForm.description}
                  onChange={handleEditInputChange}
                  placeholder="Descrição do contrato"
                />
              </div>

              {}
              <div className="space-y-2">
                {selectedContract?.pdfPath && (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-blue-600" />
                        <span className="text-sm text-blue-700">PDF atual disponível</span>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => handleDownload(selectedContract.id.toString())}
                        className="text-blue-600 border-blue-600 hover:bg-blue-50"
                      >
                        <Download className="w-3 h-3 mr-1" />
                        Baixar
                      </Button>
                    </div>
                  </div>
                )}

                <div>
                  <Label htmlFor="edit-pdf">
                    {selectedContract?.pdfPath ? 'Substituir PDF do Contrato (opcional)' : 'Upload PDF do Contrato (opcional)'}
                  </Label>
                  <Input
                    id="edit-pdf"
                    type="file"
                    accept=".pdf"
                    onChange={(e) => setEditPdfFile(e.target.files?.[0] || null)}
                    className="cursor-pointer"
                  />
                  {editPdfFile && (
                    <p className="text-sm text-green-600 mt-1">✓ Novo PDF: {editPdfFile.name}</p>
                  )}
                  {selectedContract?.pdfPath && editPdfFile && (
                    <p className="text-sm text-orange-600 mt-1">⚠️ O PDF atual será substituído pelo novo arquivo</p>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setShowEditModal(false)} disabled={updating}>
                  Cancelar
                </Button>
                <Button type="submit" className="bg-primary hover:bg-primary/90" disabled={updating}>
                  {updating ? 'Salvando...' : 'Salvar'}
                </Button>
              </div>
            </form>
            )}
          </DialogContent>
        </Dialog>

        {}
        <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Detalhes do Contrato</DialogTitle>
            </DialogHeader>
            {contractDetail ? (
              <div className="space-y-2">
                <div><b>Imóvel:</b> {contractDetail.property?.name || contractDetail.property?.address || '-'}</div>
                <div><b>Inquilino:</b> {contractDetail.tenantUser?.name || contractDetail.tenant || '-'}</div>
                <div><b>Data de início:</b> {formatDate(contractDetail.startDate)}</div>
                <div><b>Data de término:</b> {formatDate(contractDetail.endDate)}</div>
                <div><b>Valor do aluguel:</b> {formatCurrency(Number(contractDetail.monthlyRent))}</div>
                <div><b>Depósito:</b> {formatCurrency(Number(contractDetail.deposit))}</div>
                <div><b>Dia de vencimento:</b> {contractDetail.dueDay}</div>
                <div><b>Descrição:</b> {contractDetail.description || '-'}</div>
                <div><b>Status:</b> {getStatusBadge(contractDetail.status)}</div>
                {contractDetail.lastPaymentDate && (
                  <div><b>Último pagamento:</b> {formatDate(contractDetail.lastPaymentDate)}</div>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Não foi possível carregar os detalhes do contrato.
              </div>
            )}
          </DialogContent>
        </Dialog>

        {}
        <AlertDialog open={!!contractToDelete} onOpenChange={() => setContractToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir contrato</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir este contrato? Esta ação não poderá ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDelete}
                disabled={deleting}
                className="bg-destructive hover:bg-destructive/90"
              >
                {deleting ? 'Excluindo...' : 'Excluir'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </TooltipProvider>
  );
}
