import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { contractsAPI, propertiesAPI, usersAPI, contractTemplatesAPI, agenciesAPI } from '../../api';
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
  Grid3X3,
  Printer
} from 'lucide-react';
import html2pdf from 'html2pdf.js';
import { formatCurrency, formatDate } from '../../lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../../components/ui/dialog';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Card, CardContent } from '../../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
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
    dueDay: '5',
    description: '',
    templateId: '',
    templateType: 'CTR' as 'CTR' | 'ACD' | 'VST',
    creci: '',
    // Legal required fields
    readjustmentIndex: 'IGPM' as 'IGPM' | 'IPCA' | 'INPC' | 'IGP-DI' | 'OUTRO',
    customReadjustmentIndex: '',
    latePaymentPenaltyPercent: '10',
    monthlyInterestPercent: '1',
    earlyTerminationPenaltyMonths: '3',
    earlyTerminationFixedValue: '',
    useFixedTerminationValue: false,
    jurisdiction: '',
    contractDate: new Date().toISOString().split('T')[0],
    propertyCharacteristics: '',
    guaranteeType: 'CAUCAO' as 'CAUCAO' | 'FIADOR' | 'SEGURO' | 'TITULO' | 'NENHUMA',
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
  const [isCreatePreview, setIsCreatePreview] = useState(false); // true = create preview (no download/print), false = details view
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [previewContent, setPreviewContent] = useState<string>('');
  const [previewToken, setPreviewToken] = useState<string>('');
  const [userIp, setUserIp] = useState<string>('');

  // Generate preview token function
  const generatePreviewToken = (templateType: string) => {
    const year = new Date().getFullYear();
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const random1 = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    const random2 = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    return `MR3X-${templateType || 'CTR'}-${year}-${random1}-${random2}`;
  };

  // Helper function to capture barcode SVG as rotated image (-90 degrees)
  const captureBarcodeAsRotatedImage = async (): Promise<{ rotated: string; original: string; width: number; height: number } | null> => {
    try {
      // Find the CODE128 barcode SVG element (NOT the QR code)
      // The barcode is wider than tall, QR code is square
      let svgElement: SVGElement | null = null;

      // Get all SVGs in the preview
      const allSvgs = document.querySelectorAll('#contract-preview-content svg');

      for (const svg of allSvgs) {
        const bbox = svg.getBoundingClientRect();
        const aspectRatio = bbox.width / bbox.height;

        // CODE128 barcode is much wider than tall (aspect ratio > 2)
        // QR code is square (aspect ratio ~1)
        if (aspectRatio > 2 && svg.querySelectorAll('rect').length > 10) {
          svgElement = svg as SVGElement;
          break;
        }
      }

      if (!svgElement) return null;

      // Get SVG dimensions
      const bbox = svgElement.getBoundingClientRect();
      const svgWidth = bbox.width || 300;
      const svgHeight = bbox.height || 80;

      // Clone and convert SVG to image
      const svgData = new XMLSerializer().serializeToString(svgElement);
      const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);

      return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
          // Create original canvas
          const originalCanvas = document.createElement('canvas');
          originalCanvas.width = img.width || svgWidth;
          originalCanvas.height = img.height || svgHeight;
          const origCtx = originalCanvas.getContext('2d');
          if (origCtx) {
            origCtx.fillStyle = 'white';
            origCtx.fillRect(0, 0, originalCanvas.width, originalCanvas.height);
            origCtx.drawImage(img, 0, 0);
          }

          // Create rotated canvas (-90 degrees means width becomes height and vice versa)
          const rotatedCanvas = document.createElement('canvas');
          rotatedCanvas.width = originalCanvas.height; // Swap dimensions
          rotatedCanvas.height = originalCanvas.width;
          const rotCtx = rotatedCanvas.getContext('2d');

          if (rotCtx) {
            rotCtx.fillStyle = 'white';
            rotCtx.fillRect(0, 0, rotatedCanvas.width, rotatedCanvas.height);

            // Rotate +90 degrees (clockwise) - reading from top to bottom
            rotCtx.translate(rotatedCanvas.width, 0);
            rotCtx.rotate(Math.PI / 2);
            rotCtx.drawImage(originalCanvas, 0, 0);
          }

          URL.revokeObjectURL(url);
          resolve({
            rotated: rotatedCanvas.toDataURL('image/png'),
            original: originalCanvas.toDataURL('image/png'),
            width: rotatedCanvas.width,
            height: rotatedCanvas.height
          });
        };
        img.onerror = () => {
          URL.revokeObjectURL(url);
          resolve(null);
        };
        img.src = url;
      });
    } catch (error) {
      console.error('Error capturing barcode:', error);
      return null;
    }
  };

  // Handle contract preview PDF download
  const handleDownloadPreviewPDF = async () => {
    const element = document.getElementById('contract-preview-content');
    if (!element) {
      toast.error('Erro ao gerar PDF');
      return;
    }

    // Capture pre-rotated barcode image before generating PDF
    const barcodeData = await captureBarcodeAsRotatedImage();
    console.log('Barcode data captured:', barcodeData ? 'yes' : 'no');

    const opt = {
      margin: [10, 20, 10, 10] as [number, number, number, number], // Extra right margin for barcode
      filename: `contrato-previa-${previewToken || 'draft'}.pdf`,
      image: { type: 'jpeg' as const, quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, scrollX: 0, scrollY: 0 },
      jsPDF: { unit: 'mm' as const, format: 'a4' as const, orientation: 'portrait' as const },
      pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
    };

    try {
      // Generate PDF and get jsPDF instance to add barcode to each page
      const pdfInstance = await html2pdf().set(opt).from(element).toPdf().get('pdf');

      // Add vertical barcode to each page
      const pageCount = pdfInstance.internal.getNumberOfPages();
      const pageHeight = pdfInstance.internal.pageSize.getHeight();
      const pageWidth = pdfInstance.internal.pageSize.getWidth();
      const token = previewToken || 'DRAFT';

      for (let i = 1; i <= pageCount; i++) {
        pdfInstance.setPage(i);

        // Add the pre-rotated barcode image if available
        if (barcodeData && barcodeData.rotated) {
          // Barcode dimensions - the rotated image (width/height are swapped)
          // Original barcode is wide and short, rotated it's tall and narrow
          const finalWidth = 10; // mm - narrow strip
          const finalHeight = pageHeight * 0.5; // 50% of page height

          // Position on right edge, centered vertically
          const xPos = pageWidth - finalWidth - 3; // 3mm from right edge
          const yPos = (pageHeight - finalHeight) / 2;

          // Draw white background
          pdfInstance.setFillColor(255, 255, 255);
          pdfInstance.rect(xPos - 2, yPos - 2, finalWidth + 4, finalHeight + 4, 'F');

          // Add the pre-rotated barcode image
          pdfInstance.addImage(barcodeData.rotated, 'PNG', xPos, yPos, finalWidth, finalHeight);
        } else {
          // Fallback: draw token text vertically if barcode capture failed
          pdfInstance.setFillColor(255, 255, 255);
          pdfInstance.rect(pageWidth - 15, pageHeight / 2 - 40, 12, 80, 'F');

          pdfInstance.setFontSize(8);
          pdfInstance.setTextColor(0, 0, 0);
          pdfInstance.text(token, pageWidth - 5, pageHeight / 2, { angle: 90 });
        }
      }

      // Save the PDF
      pdfInstance.save(opt.filename);
      toast.success('PDF baixado com sucesso!');
    } catch (error) {
      console.error('PDF generation error:', error);
      // Fallback to simple PDF without barcode
      await html2pdf().set(opt).from(element).save();
      toast.success('PDF baixado com sucesso!');
    }
  };

  // Handle contract preview print
  const handlePrintPreview = async () => {
    const element = document.getElementById('contract-preview-content');
    if (!element) {
      toast.error('Erro ao imprimir');
      return;
    }

    // Capture the pre-rotated barcode image
    const barcodeData = await captureBarcodeAsRotatedImage();

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Erro ao abrir janela de impressão. Verifique se pop-ups estão permitidos.');
      return;
    }

    const token = previewToken || 'DRAFT';

    const styles = `
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; padding-right: 25mm; position: relative; }
        .prose { max-width: 100%; }
        .font-bold { font-weight: bold; }
        .font-semibold { font-weight: 600; }
        .my-1 { margin: 4px 0; }
        .my-2 { margin: 8px 0; }
        .bg-muted { background-color: #f5f5f5; padding: 16px; border-radius: 8px; margin-bottom: 16px; }
        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
        .text-sm { font-size: 14px; }
        .text-xs { font-size: 12px; }
        .font-mono { font-family: monospace; }
        .border { border: 1px solid #e5e5e5; }
        .rounded-lg { border-radius: 8px; }
        .p-4, .p-6 { padding: 16px; }
        .mb-2 { margin-bottom: 8px; }
        .flex { display: flex; }
        .items-center { align-items: center; }
        .gap-4 { gap: 16px; }
        p { page-break-inside: avoid; }
        .barcode-container {
          position: fixed;
          right: 2mm;
          top: 50%;
          transform: translateY(-50%);
          background: white;
          z-index: 9999;
          padding: 2mm;
        }
        .barcode-img {
          max-height: 60%;
          width: auto;
          max-width: 15mm;
        }
        @media print {
          body { margin: 0; padding: 10mm; padding-right: 20mm; }
          .barcode-container { position: fixed; right: 2mm; }
          p { page-break-inside: avoid; }
        }
      </style>
    `;

    // Create barcode HTML - use pre-rotated image (no CSS rotation needed)
    const barcodeHtml = barcodeData && barcodeData.rotated
      ? `<img src="${barcodeData.rotated}" class="barcode-img" alt="barcode" />`
      : `<div style="writing-mode: vertical-rl; transform: rotate(180deg); font-family: monospace; font-size: 8pt;">${token}</div>`;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Prévia do Contrato - ${token}</title>
          ${styles}
        </head>
        <body>
          <div class="barcode-container">
            ${barcodeHtml}
          </div>
          ${element.innerHTML}
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();

    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 500);
  };

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

  // Fetch agency data for CRECI auto-fill
  const { data: agencyData } = useQuery({
    queryKey: ['agency', user?.agencyId],
    queryFn: () => agenciesAPI.getAgencyById(user!.agencyId!),
    enabled: !!user?.agencyId && canCreateContracts,
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

  // Auto-fill CRECI from user's agency when available
  useEffect(() => {
    if (agencyData?.creci && !newContract.creci) {
      setNewContract(prev => ({
        ...prev,
        creci: agencyData.creci,
      }));
    }
  }, [agencyData?.creci]);

  // Fetch user IP address
  useEffect(() => {
    const fetchIp = async () => {
      try {
        const response = await fetch('https://api.ipify.org?format=json');
        const data = await response.json();
        setUserIp(data.ip);
      } catch (error) {
        console.error('Failed to fetch IP:', error);
        setUserIp('');
      }
    };
    fetchIp();
  }, []);

  // Regenerate preview when form fields change and a template is selected
  useEffect(() => {
    if (selectedTemplate) {
      generatePreview(selectedTemplate);
    }
  }, [
    selectedTemplate,
    newContract.propertyId,
    newContract.tenantId,
    newContract.startDate,
    newContract.endDate,
    newContract.monthlyRent,
    newContract.deposit,
    newContract.dueDay,
    newContract.creci,
    newContract.readjustmentIndex,
    newContract.customReadjustmentIndex,
    newContract.guaranteeType,
    newContract.latePaymentPenaltyPercent,
    newContract.monthlyInterestPercent,
    newContract.earlyTerminationPenaltyMonths,
    newContract.earlyTerminationFixedValue,
    newContract.useFixedTerminationValue,
    newContract.propertyCharacteristics,
    newContract.jurisdiction,
    newContract.contractDate,
    properties,
    tenants,
    agencyData
  ]);

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
        monthlyRent: '', deposit: '', dueDay: '5', description: '',
        templateId: '', templateType: 'CTR', creci: '',
        readjustmentIndex: 'IGPM',
        customReadjustmentIndex: '',
        latePaymentPenaltyPercent: '10',
        monthlyInterestPercent: '1',
        earlyTerminationPenaltyMonths: '3',
        earlyTerminationFixedValue: '',
        useFixedTerminationValue: false,
        jurisdiction: '',
        contractDate: new Date().toISOString().split('T')[0],
        propertyCharacteristics: '',
        guaranteeType: 'CAUCAO',
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
    setLoading(true);

    try {
      // Get full contract details
      const fullContract = await contractsAPI.getContractById(contract.id.toString());

      if (!fullContract) {
        toast.error('Contrato não encontrado');
        return;
      }

      setSelectedContract(fullContract);
      setContractDetail(fullContract);

      // Try to generate preview if template exists
      if (fullContract.templateId) {
        // First try to find template in the local list
        let template = templates?.find((t: any) => t.id?.toString() === fullContract.templateId?.toString());

        // If not found in local list, fetch it by ID (for roles like PROPRIETARIO that may not have access to templates list)
        if (!template) {
          try {
            template = await contractTemplatesAPI.getTemplateById(fullContract.templateId.toString());
          } catch (templateError) {
            console.warn('Could not fetch template:', templateError);
          }
        }

        if (template) {
          // Generate preview for existing contract
          generateContractPreview(template, fullContract);
          setIsCreatePreview(false); // Details view - show download/print icons
          setShowPreviewModal(true);
        } else {
          // Template not found, show simple detail modal
          setShowDetailModal(true);
        }
      } else {
        // No template, show simple detail modal
        setShowDetailModal(true);
      }
    } catch (error: any) {
      console.error('Error loading contract:', error);
      toast.error(error?.message || 'Erro ao carregar contrato');
      // Fallback to simple detail modal
      setContractDetail(contract);
      setShowDetailModal(true);
    } finally {
      setLoading(false);
    }
  };

  // Generate preview for an existing contract (different from newContract preview)
  const generateContractPreview = (template: any, contractData: any) => {
    if (!template || !contractData) return;

    // Get related data
    const contractProperty = contractData.property || properties.find((p: any) =>
      p.id?.toString() === contractData.propertyId?.toString()
    );
    const contractTenant = contractData.tenantUser || tenants.find((t: any) =>
      t.id?.toString() === contractData.tenantId?.toString()
    );
    const contractOwner = contractData.ownerUser || contractProperty?.owner || {};

    const calculateMonths = (start: string, end: string) => {
      if (!start || !end) return '';
      const startDate = new Date(start);
      const endDate = new Date(end);
      const months = (endDate.getFullYear() - startDate.getFullYear()) * 12 + (endDate.getMonth() - startDate.getMonth());
      return months.toString();
    };

    let content = template.content;

    // Format address helper
    const formatAddress = (obj: any) => {
      if (!obj) return '';
      const parts = [obj.address, obj.number, obj.complement, obj.neighborhood, obj.city, obj.state, obj.cep, obj.zipCode].filter(Boolean);
      return parts.join(', ');
    };

    // Format CPF/CNPJ helper
    const formatDocument = (doc: string | null | undefined) => {
      if (!doc) return '';
      const cleaned = doc.replace(/\D/g, '');
      if (cleaned.length === 11) {
        return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
      } else if (cleaned.length === 14) {
        return cleaned.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
      }
      return doc;
    };

    // Helper functions for contract data
    const getIndexName = (index: string): string => {
      const names: Record<string, string> = {
        'IGPM': 'IGP-M (Índice Geral de Preços - Mercado)',
        'IPCA': 'IPCA (Índice Nacional de Preços ao Consumidor Amplo)',
        'INPC': 'INPC (Índice Nacional de Preços ao Consumidor)',
        'IGP-DI': 'IGP-DI (Índice Geral de Preços - Disponibilidade Interna)',
      };
      return names[index] || index || 'IGP-M';
    };

    const getGuaranteeTypeName = (type: string): string => {
      const names: Record<string, string> = {
        'CAUCAO': 'Caução em dinheiro',
        'FIADOR': 'Fiador',
        'SEGURO': 'Seguro-fiança',
        'TITULO': 'Título de capitalização',
        'NENHUMA': 'Sem garantia',
      };
      return names[type] || type || '';
    };

    const formatDateExtensive = (dateStr: string): string => {
      const months = [
        'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
        'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'
      ];
      try {
        const date = new Date(dateStr);
        const day = date.getDate();
        const month = months[date.getMonth()];
        const year = date.getFullYear();
        return `${day} de ${month} de ${year}`;
      } catch {
        return '';
      }
    };

    const replacements: Record<string, string> = {
      // Corretor/Broker
      NOME_CORRETOR: agencyData?.name || user?.name || '',
      CRECI_CORRETOR: contractData.creci || agencyData?.creci || '',

      // Locador (Owner) - PF
      NOME_LOCADOR: contractOwner?.name || '',
      CPF_LOCADOR: formatDocument(contractOwner?.document) || '',
      ENDERECO_LOCADOR: formatAddress(contractOwner) || '',
      EMAIL_LOCADOR: contractOwner?.email || '',
      TELEFONE_LOCADOR: contractOwner?.phone || contractOwner?.mobilePhone || '',

      // Locador (Owner) - PJ
      RAZAO_SOCIAL_LOCADOR: contractOwner?.companyName || contractOwner?.name || '',
      CNPJ_LOCADOR: formatDocument(contractOwner?.cnpj || contractOwner?.document) || '',
      REPRESENTANTE_LOCADOR: contractOwner?.representativeName || contractOwner?.name || '',
      CPF_REPRESENTANTE_LOCADOR: formatDocument(contractOwner?.representativeDocument || contractOwner?.document) || '',
      CARGO_LOCADOR: contractOwner?.representativePosition || '',

      // Locatário (Tenant) - PF
      NOME_LOCATARIO: contractTenant?.name || '',
      CPF_LOCATARIO: formatDocument(contractTenant?.document) || '',
      ENDERECO_LOCATARIO: formatAddress(contractTenant) || '',
      EMAIL_LOCATARIO: contractTenant?.email || '',
      TELEFONE_LOCATARIO: contractTenant?.phone || contractTenant?.mobilePhone || '',

      // Locatário (Tenant) - PJ
      RAZAO_SOCIAL_LOCATARIO: contractTenant?.companyName || contractTenant?.name || '',
      CNPJ_LOCATARIO: formatDocument(contractTenant?.cnpj || contractTenant?.document) || '',
      REPRESENTANTE_LOCATARIO: contractTenant?.representativeName || contractTenant?.name || '',
      CPF_REPRESENTANTE_LOCATARIO: formatDocument(contractTenant?.representativeDocument || contractTenant?.document) || '',
      CARGO_LOCATARIO: contractTenant?.representativePosition || '',

      // Imóvel (Property)
      ENDERECO_IMOVEL: formatAddress(contractProperty) || contractProperty?.address || '',
      DESCRICAO_IMOVEL: contractProperty?.description || contractProperty?.name || '',
      MATRICULA: contractProperty?.registrationNumber || '',

      // Imobiliária (Agency)
      RAZAO_SOCIAL_IMOBILIARIA: agencyData?.name || contractData.agency?.name || '',
      CNPJ_IMOBILIARIA: formatDocument(agencyData?.cnpj || contractData.agency?.cnpj) || '',
      NUMERO_CRECI: agencyData?.creci || contractData.creci || '',
      ENDERECO_IMOBILIARIA: formatAddress(agencyData || contractData.agency) || '',
      EMAIL_IMOBILIARIA: agencyData?.email || contractData.agency?.email || '',
      TELEFONE_IMOBILIARIA: agencyData?.phone || contractData.agency?.phone || '',
      REPRESENTANTE_IMOBILIARIA: agencyData?.representativeName || '',
      CPF_REPRESENTANTE_IMOBILIARIA: formatDocument(agencyData?.representativeDocument) || '',

      // Contrato (Contract)
      PRAZO_MESES: calculateMonths(contractData.startDate, contractData.endDate),
      DATA_INICIO: contractData.startDate ? new Date(contractData.startDate).toLocaleDateString('pt-BR') : '',
      DATA_FIM: contractData.endDate ? new Date(contractData.endDate).toLocaleDateString('pt-BR') : '',
      VALOR_ALUGUEL: contractData.monthlyRent ? `R$ ${parseFloat(contractData.monthlyRent).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '',
      DIA_VENCIMENTO: contractData.dueDay?.toString() || '5',
      DEPOSITO_CAUCAO: contractData.deposit ? `R$ ${parseFloat(contractData.deposit).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '',

      // Índice de Reajuste
      INDICE_REAJUSTE: getIndexName(contractData.readjustmentIndex || 'IGPM'),

      // Tipo de Garantia
      TIPO_GARANTIA: getGuaranteeTypeName(contractData.guaranteeType || ''),

      // Multas e Juros
      MULTA_ATRASO: `${contractData.lateFeePercent || '10'}%`,
      JUROS_MORA: `${contractData.interestRatePercent || '1'}%`,
      PERCENTUAL_MULTA_ATRASO: contractData.lateFeePercent?.toString() || '10',
      PERCENTUAL_JUROS_MORA: contractData.interestRatePercent?.toString() || '1',

      // Multa por Rescisão
      MULTA_RESCISAO: contractData.earlyTerminationPenaltyPercent
        ? `${contractData.earlyTerminationPenaltyPercent}% do valor restante`
        : '3 meses de aluguel',
      MESES_MULTA_RESCISAO: '3',

      // Características do Imóvel
      CARACTERISTICAS_IMOVEL: contractData.propertyCharacteristics || '',
      DESCRICAO_VISTORIA: contractData.propertyCharacteristics || '',

      // Localização e Jurisdição
      COMARCA: contractData.jurisdiction || contractProperty?.city || '',
      FORO: contractData.jurisdiction || contractProperty?.city || '',
      CIDADE: contractProperty?.city || '',

      // Datas
      DATA_CONTRATO: contractData.createdAt ? new Date(contractData.createdAt).toLocaleDateString('pt-BR') : new Date().toLocaleDateString('pt-BR'),
      DATA_ASSINATURA: contractData.tenantSignedAt ? new Date(contractData.tenantSignedAt).toLocaleDateString('pt-BR') : new Date().toLocaleDateString('pt-BR'),
      DATA_ACEITE: new Date().toLocaleDateString('pt-BR'),
      DATA_EXTENSO: formatDateExtensive(contractData.createdAt || new Date().toISOString()),

      // Digital Signatures
      ASSINATURA_LOCADOR: contractData.ownerSignature || '________________________________',
      ASSINATURA_LOCATARIO: contractData.tenantSignature || '________________________________',
      ASSINATURA_TESTEMUNHA: contractData.witnessSignature || '________________________________',

    };

    for (const [key, value] of Object.entries(replacements)) {
      content = content.replace(new RegExp(`\\[${key}\\]`, 'g'), value || '');
    }

    // Use the contract's actual token
    setPreviewToken(contractData.contractToken || '');
    setPreviewContent(content);
  };

  const handleEditContract = async (contract: any) => {
    // Check immutability before opening edit modal
    if (!canEditContract(contract)) {
      toast.error(getImmutabilityMessage(contract) || 'Este contrato não pode ser editado');
      return;
    }

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

  // Immutability check: Only PENDENTE contracts can be edited
  // AGUARDANDO_ASSINATURAS, ASSINADO, ATIVO, REVOGADO, ENCERRADO are immutable
  const canEditContract = (contract: any): boolean => {
    const immutableStatuses = ['AGUARDANDO_ASSINATURAS', 'ASSINADO', 'ATIVO', 'REVOGADO', 'ENCERRADO'];
    return !immutableStatuses.includes(contract.status);
  };

  // Check if contract can be deleted (not archived statuses)
  const canDeleteContract = (contract: any): boolean => {
    const nonDeletableStatuses = ['REVOGADO', 'ENCERRADO'];
    return !nonDeletableStatuses.includes(contract.status);
  };

  // Get immutability message for tooltip
  const getImmutabilityMessage = (contract: any): string => {
    switch (contract.status) {
      case 'AGUARDANDO_ASSINATURAS':
        return 'Contrato aguardando assinaturas - cláusulas congeladas';
      case 'ASSINADO':
        return 'Contrato assinado - documento imutável';
      case 'ATIVO':
        return 'Contrato ativo - documento imutável';
      case 'REVOGADO':
        return 'Contrato revogado - documento arquivado';
      case 'ENCERRADO':
        return 'Contrato encerrado - documento arquivado';
      default:
        return '';
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

    // Format address helper
    const formatAddress = (obj: any) => {
      if (!obj) return '';
      const parts = [obj.address, obj.number, obj.complement, obj.neighborhood, obj.city, obj.state, obj.cep].filter(Boolean);
      return parts.join(', ');
    };

    // Format CPF/CNPJ helper
    const formatDocument = (doc: string | null | undefined) => {
      if (!doc) return '';
      const cleaned = doc.replace(/\D/g, '');
      if (cleaned.length === 11) {
        return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
      } else if (cleaned.length === 14) {
        return cleaned.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
      }
      return doc;
    };

    // Get agency data for broker/agency fields (agencyData is from the useQuery hook)

    const replacements: Record<string, string> = {
      // Corretor/Broker
      NOME_CORRETOR: agencyData?.name || user?.name || '',
      CRECI_CORRETOR: newContract.creci || agencyData?.creci || '',

      // Locador (Owner) - PF
      NOME_LOCADOR: owner?.name || '',
      CPF_LOCADOR: formatDocument(owner?.document) || '',
      ENDERECO_LOCADOR: formatAddress(owner) || '',
      EMAIL_LOCADOR: owner?.email || '',
      TELEFONE_LOCADOR: owner?.phone || owner?.mobilePhone || '',

      // Locador (Owner) - PJ
      RAZAO_SOCIAL_LOCADOR: owner?.companyName || owner?.name || '',
      CNPJ_LOCADOR: formatDocument(owner?.cnpj || owner?.document) || '',
      REPRESENTANTE_LOCADOR: owner?.representativeName || owner?.name || '',
      CPF_REPRESENTANTE_LOCADOR: formatDocument(owner?.representativeDocument || owner?.document) || '',
      CARGO_LOCADOR: owner?.representativePosition || '',

      // Locatário (Tenant) - PF
      NOME_LOCATARIO: selectedTenant?.name || '',
      CPF_LOCATARIO: formatDocument(selectedTenant?.document) || '',
      ENDERECO_LOCATARIO: formatAddress(selectedTenant) || '',
      EMAIL_LOCATARIO: selectedTenant?.email || '',
      TELEFONE_LOCATARIO: selectedTenant?.phone || selectedTenant?.mobilePhone || '',

      // Locatário (Tenant) - PJ
      RAZAO_SOCIAL_LOCATARIO: selectedTenant?.companyName || selectedTenant?.name || '',
      CNPJ_LOCATARIO: formatDocument(selectedTenant?.cnpj || selectedTenant?.document) || '',
      REPRESENTANTE_LOCATARIO: selectedTenant?.representativeName || selectedTenant?.name || '',
      CPF_REPRESENTANTE_LOCATARIO: formatDocument(selectedTenant?.representativeDocument || selectedTenant?.document) || '',
      CARGO_LOCATARIO: selectedTenant?.representativePosition || '',

      // Imóvel (Property)
      ENDERECO_IMOVEL: formatAddress(selectedProperty) || selectedProperty?.address || '',
      DESCRICAO_IMOVEL: selectedProperty?.description || selectedProperty?.name || '',
      MATRICULA: selectedProperty?.registrationNumber || '',

      // Imobiliária (Agency)
      RAZAO_SOCIAL_IMOBILIARIA: agencyData?.name || '',
      CNPJ_IMOBILIARIA: formatDocument(agencyData?.cnpj) || '',
      NUMERO_CRECI: agencyData?.creci || newContract.creci || '',
      ENDERECO_IMOBILIARIA: formatAddress(agencyData) || '',
      EMAIL_IMOBILIARIA: agencyData?.email || '',
      TELEFONE_IMOBILIARIA: agencyData?.phone || '',
      REPRESENTANTE_IMOBILIARIA: agencyData?.representativeName || '',
      CPF_REPRESENTANTE_IMOBILIARIA: formatDocument(agencyData?.representativeDocument) || '',

      // Contrato (Contract)
      PRAZO_MESES: calculateMonths(newContract.startDate, newContract.endDate),
      DATA_INICIO: newContract.startDate ? new Date(newContract.startDate).toLocaleDateString('pt-BR') : '',
      DATA_FIM: newContract.endDate ? new Date(newContract.endDate).toLocaleDateString('pt-BR') : '',
      VALOR_ALUGUEL: newContract.monthlyRent ? `R$ ${parseFloat(newContract.monthlyRent).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '',
      DIA_VENCIMENTO: newContract.dueDay || '5',
      DEPOSITO_CAUCAO: newContract.deposit ? `R$ ${parseFloat(newContract.deposit).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '',

      // Índice de Reajuste (Cláusula 3)
      INDICE_REAJUSTE: newContract.readjustmentIndex === 'OUTRO'
        ? newContract.customReadjustmentIndex
        : getIndexName(newContract.readjustmentIndex),

      // Tipo de Garantia
      TIPO_GARANTIA: getGuaranteeTypeName(newContract.guaranteeType),

      // Multas e Juros (editáveis pelas partes)
      MULTA_ATRASO: `${newContract.latePaymentPenaltyPercent || '10'}%`,
      JUROS_MORA: `${newContract.monthlyInterestPercent || '1'}%`,
      PERCENTUAL_MULTA_ATRASO: newContract.latePaymentPenaltyPercent || '10',
      PERCENTUAL_JUROS_MORA: newContract.monthlyInterestPercent || '1',

      // Multa por Rescisão (Cláusula 7)
      MULTA_RESCISAO: calculateTerminationPenalty(),
      MESES_MULTA_RESCISAO: newContract.earlyTerminationPenaltyMonths || '3',

      // Características do Imóvel (Cláusula 3)
      CARACTERISTICAS_IMOVEL: newContract.propertyCharacteristics || '',
      DESCRICAO_VISTORIA: newContract.propertyCharacteristics || '',

      // Localização e Jurisdição
      COMARCA: newContract.jurisdiction || selectedProperty?.city || '',
      FORO: newContract.jurisdiction || selectedProperty?.city || '',
      CIDADE: selectedProperty?.city || '',

      // Datas
      DATA_CONTRATO: newContract.contractDate ? new Date(newContract.contractDate).toLocaleDateString('pt-BR') : new Date().toLocaleDateString('pt-BR'),
      DATA_ASSINATURA: newContract.contractDate ? new Date(newContract.contractDate).toLocaleDateString('pt-BR') : new Date().toLocaleDateString('pt-BR'),
      DATA_ACEITE: new Date().toLocaleDateString('pt-BR'),
      DATA_EXTENSO: formatDateExtensive(newContract.contractDate || new Date().toISOString().split('T')[0]),

      // Digital Signatures (placeholders for preview - will be populated on actual signing)
      ASSINATURA_LOCADOR: '________________________________',
      ASSINATURA_LOCATARIO: '________________________________',
      ASSINATURA_TESTEMUNHA: '________________________________',

    };

    // Helper function to get readable index name
    function getIndexName(index: string): string {
      const names: Record<string, string> = {
        'IGPM': 'IGP-M (Índice Geral de Preços - Mercado)',
        'IPCA': 'IPCA (Índice Nacional de Preços ao Consumidor Amplo)',
        'INPC': 'INPC (Índice Nacional de Preços ao Consumidor)',
        'IGP-DI': 'IGP-DI (Índice Geral de Preços - Disponibilidade Interna)',
      };
      return names[index] || index;
    }

    // Helper function to get readable guarantee type name
    function getGuaranteeTypeName(type: string): string {
      const names: Record<string, string> = {
        'CAUCAO': 'Caução em dinheiro',
        'FIADOR': 'Fiador',
        'SEGURO': 'Seguro-fiança',
        'TITULO': 'Título de capitalização',
        'NENHUMA': 'Sem garantia',
      };
      return names[type] || type;
    }

    // Helper function to calculate termination penalty
    function calculateTerminationPenalty(): string {
      if (newContract.useFixedTerminationValue && newContract.earlyTerminationFixedValue) {
        return `R$ ${parseFloat(newContract.earlyTerminationFixedValue).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
      }
      if (newContract.monthlyRent && newContract.earlyTerminationPenaltyMonths) {
        const value = parseFloat(newContract.monthlyRent) * parseFloat(newContract.earlyTerminationPenaltyMonths);
        return `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
      }
      return '';
    }

    // Helper function to format date in extensive format (por extenso)
    function formatDateExtensive(dateStr: string): string {
      const months = [
        'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
        'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'
      ];
      const date = new Date(dateStr);
      const day = date.getDate();
      const month = months[date.getMonth()];
      const year = date.getFullYear();
      return `${day} de ${month} de ${year}`;
    }

    for (const [key, value] of Object.entries(replacements)) {
      content = content.replace(new RegExp(`\\[${key}\\]`, 'g'), value || '');
    }

    // Generate preview token
    const token = generatePreviewToken(newContract.templateType || 'CTR');
    setPreviewToken(token);
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

          if (selectedProperty.city) {
            updated.jurisdiction = selectedProperty.city;
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
                            {canUpdateContracts && canEditContract(contract) && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleEditContract(contract)}
                                className="text-orange-600 border-orange-600 hover:bg-orange-50"
                                title="Editar contrato"
                              >
                                Editar
                              </Button>
                            )}
                            {canUpdateContracts && !canEditContract(contract) && (
                              <Button
                                size="sm"
                                variant="outline"
                                disabled
                                className="text-gray-400 border-gray-300 cursor-not-allowed"
                                title={getImmutabilityMessage(contract)}
                              >
                                Imutável
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
                            {canDeleteContracts && canDeleteContract(contract) && (
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
                      {canUpdateContracts && canEditContract(contract) && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEditContract(contract)}
                          className="text-orange-600 border-orange-600 hover:bg-orange-50 flex-1"
                          title="Editar contrato"
                        >
                          Editar
                        </Button>
                      )}
                      {canUpdateContracts && !canEditContract(contract) && (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled
                          className="text-gray-400 border-gray-300 cursor-not-allowed flex-1"
                          title={getImmutabilityMessage(contract)}
                        >
                          Imutável
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
                      {canDeleteContracts && canDeleteContract(contract) && (
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
                              {canUpdateContracts && canEditContract(contract) && (
                                <DropdownMenuItem onClick={() => handleEditContract(contract)}>
                                  <Edit className="w-4 h-4 mr-2" />
                                  Editar contrato
                                </DropdownMenuItem>
                              )}
                              {canUpdateContracts && !canEditContract(contract) && (
                                <DropdownMenuItem disabled className="text-gray-400 cursor-not-allowed">
                                  <Edit className="w-4 h-4 mr-2" />
                                  {getImmutabilityMessage(contract)}
                                </DropdownMenuItem>
                              )}
                              {contract.pdfPath && (
                                <DropdownMenuItem onClick={() => handleDownload(contract.id.toString())}>
                                  <Download className="w-4 h-4 mr-2" />
                                  Baixar PDF
                                </DropdownMenuItem>
                              )}
                              {canDeleteContracts && canDeleteContract(contract) && (
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
              <div>
                <Label htmlFor="creci" className="flex items-center gap-1">
                  CRECI do Corretor
                  <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="creci"
                  name="creci"
                  value={newContract.creci}
                  onChange={handleInputChange}
                  placeholder="Ex: 123456/SP ou CRECI/SP 123456"
                  className={!newContract.creci ? 'border-red-300' : ''}
                  required
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Obrigatório por lei (Lei 6.530/78). Formato: 123456/SP ou CRECI/SP 123456
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="propertyId">Imóvel</Label>
                  <Select
                    value={newContract.propertyId}
                    onValueChange={(value) => {
                      const selectedProperty = properties.find(p => {
                        const pId = p.id?.toString() || String(p.id);
                        return pId === value;
                      });
                      setNewContract(prev => ({
                        ...prev,
                        propertyId: value,
                        ...(selectedProperty?.monthlyRent && { monthlyRent: selectedProperty.monthlyRent.toString() }),
                        ...(selectedProperty?.dueDay && { dueDay: selectedProperty.dueDay.toString() }),
                        ...(selectedProperty?.tenantId && { tenantId: selectedProperty.tenantId.toString() }),
                        ...(selectedProperty?.deposit && { deposit: selectedProperty.deposit.toString() }),
                        ...(selectedProperty?.city && { jurisdiction: selectedProperty.city }),
                      }));
                    }}
                  >
                    <SelectTrigger className="[&>span]:text-left [&>span]:truncate">
                      <SelectValue placeholder="Selecione um imóvel" />
                    </SelectTrigger>
                    <SelectContent>
                      {properties.filter(p => !p.isFrozen).map((property) => {
                        const propId = property.id?.toString() || String(property.id);
                        // Check if property already has an active contract
                        const hasActiveContract = contracts?.some((c: any) => {
                          const contractPropId = c.propertyId?.toString() || c.property?.id?.toString();
                          const status = c.status?.toUpperCase();
                          return contractPropId === propId && !['REVOGADO', 'ENCERRADO'].includes(status);
                        });
                        return (
                          <SelectItem
                            key={propId}
                            value={propId}
                            disabled={hasActiveContract}
                            className={hasActiveContract ? 'text-muted-foreground' : ''}
                          >
                            {property.name || property.address}
                            {hasActiveContract && ' (Já possui contrato)'}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                  {properties.some(p => p.isFrozen) && (
                    <p className="text-xs text-amber-600 mt-1">
                      Imóveis congelados não podem ter novos contratos. Faça upgrade do plano para desbloquear.
                    </p>
                  )}
                </div>
                <div>
                  <Label htmlFor="tenantId">Inquilino</Label>
                  <Select
                    value={newContract.tenantId}
                    onValueChange={(value) => setNewContract(prev => ({ ...prev, tenantId: value }))}
                  >
                    <SelectTrigger className="[&>span]:text-left [&>span]:truncate">
                      <SelectValue placeholder="Selecione um inquilino" />
                    </SelectTrigger>
                    <SelectContent>
                      {tenants.map((tenant) => {
                        const tenantId = tenant.id?.toString() || String(tenant.id);
                        return (
                          <SelectItem key={tenantId} value={tenantId}>
                            {tenant.name || tenant.email || 'Sem nome'}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
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
                  <Label htmlFor="dueDay">Dia de Vencimento <span className="text-red-500">*</span></Label>
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
                <div>
                  <Label htmlFor="contractDate">Data do Contrato <span className="text-red-500">*</span></Label>
                  <Input
                    id="contractDate"
                    name="contractDate"
                    type="date"
                    value={newContract.contractDate}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </div>

              {/* Cláusula 3 - Índice de Reajuste */}
              <div className="p-4 border rounded-lg bg-muted/30">
                <h4 className="font-semibold mb-3 text-sm">Cláusula 3 - Índice de Reajuste Anual</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="readjustmentIndex">Índice de Reajuste <span className="text-red-500">*</span></Label>
                    <Select
                      value={newContract.readjustmentIndex}
                      onValueChange={(value) => setNewContract(prev => ({ ...prev, readjustmentIndex: value as any }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o índice" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="IGPM">IGP-M (Índice Geral de Preços - Mercado)</SelectItem>
                        <SelectItem value="IPCA">IPCA (Índice Nacional de Preços ao Consumidor Amplo)</SelectItem>
                        <SelectItem value="INPC">INPC (Índice Nacional de Preços ao Consumidor)</SelectItem>
                        <SelectItem value="IGP-DI">IGP-DI (Índice Geral de Preços - Disponibilidade Interna)</SelectItem>
                        <SelectItem value="OUTRO">Outro (especificar)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {newContract.readjustmentIndex === 'OUTRO' && (
                    <div>
                      <Label htmlFor="customReadjustmentIndex">Especificar Índice</Label>
                      <Input
                        id="customReadjustmentIndex"
                        name="customReadjustmentIndex"
                        value={newContract.customReadjustmentIndex}
                        onChange={handleInputChange}
                        placeholder="Ex: Taxa Referencial"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Multas e Juros */}
              <div className="p-4 border rounded-lg bg-muted/30">
                <h4 className="font-semibold mb-3 text-sm">Multas e Juros por Atraso</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="latePaymentPenaltyPercent">Multa por Atraso (%) <span className="text-red-500">*</span></Label>
                    <Input
                      id="latePaymentPenaltyPercent"
                      name="latePaymentPenaltyPercent"
                      type="number"
                      min="0"
                      max="10"
                      step="0.1"
                      value={newContract.latePaymentPenaltyPercent}
                      onChange={handleInputChange}
                      placeholder="10"
                      required
                    />
                    <p className="text-xs text-muted-foreground mt-1">Máximo legal: 10% (Lei 8.245/91)</p>
                  </div>
                  <div>
                    <Label htmlFor="monthlyInterestPercent">Juros de Mora Mensal (%) <span className="text-red-500">*</span></Label>
                    <Input
                      id="monthlyInterestPercent"
                      name="monthlyInterestPercent"
                      type="number"
                      min="0"
                      max="1"
                      step="0.1"
                      value={newContract.monthlyInterestPercent}
                      onChange={handleInputChange}
                      placeholder="1"
                      required
                    />
                    <p className="text-xs text-muted-foreground mt-1">Máximo legal: 1% ao mês</p>
                  </div>
                </div>
              </div>

              {/* Cláusula 7 - Rescisão Antecipada */}
              <div className="p-4 border rounded-lg bg-muted/30">
                <h4 className="font-semibold mb-3 text-sm">Cláusula 7 - Multa por Rescisão Antecipada</h4>
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="terminationType"
                        checked={!newContract.useFixedTerminationValue}
                        onChange={() => setNewContract(prev => ({ ...prev, useFixedTerminationValue: false }))}
                        className="w-4 h-4"
                      />
                      <span className="text-sm">Baseada em meses de aluguel</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="terminationType"
                        checked={newContract.useFixedTerminationValue}
                        onChange={() => setNewContract(prev => ({ ...prev, useFixedTerminationValue: true }))}
                        className="w-4 h-4"
                      />
                      <span className="text-sm">Valor fixo</span>
                    </label>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {!newContract.useFixedTerminationValue ? (
                      <div>
                        <Label htmlFor="earlyTerminationPenaltyMonths">Quantidade de Meses de Aluguel</Label>
                        <Input
                          id="earlyTerminationPenaltyMonths"
                          name="earlyTerminationPenaltyMonths"
                          type="number"
                          min="1"
                          max="12"
                          value={newContract.earlyTerminationPenaltyMonths}
                          onChange={handleInputChange}
                          placeholder="3"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Valor: R$ {newContract.monthlyRent && newContract.earlyTerminationPenaltyMonths
                            ? (parseFloat(newContract.monthlyRent) * parseFloat(newContract.earlyTerminationPenaltyMonths)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })
                            : '0,00'}
                        </p>
                      </div>
                    ) : (
                      <div>
                        <Label htmlFor="earlyTerminationFixedValue">Valor Fixo da Multa (R$)</Label>
                        <Input
                          id="earlyTerminationFixedValue"
                          name="earlyTerminationFixedValue"
                          type="number"
                          min="0"
                          step="0.01"
                          value={newContract.earlyTerminationFixedValue}
                          onChange={handleInputChange}
                          placeholder="5000.00"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Tipo de Garantia */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="guaranteeType">Tipo de Garantia <span className="text-red-500">*</span></Label>
                  <Select
                    value={newContract.guaranteeType}
                    onValueChange={(value) => setNewContract(prev => ({ ...prev, guaranteeType: value as any }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CAUCAO">Caução em dinheiro</SelectItem>
                      <SelectItem value="FIADOR">Fiador</SelectItem>
                      <SelectItem value="SEGURO">Seguro-fiança</SelectItem>
                      <SelectItem value="TITULO">Título de capitalização</SelectItem>
                      <SelectItem value="NENHUMA">Sem garantia</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="jurisdiction">Foro (Comarca) <span className="text-red-500">*</span></Label>
                  <Input
                    id="jurisdiction"
                    name="jurisdiction"
                    value={newContract.jurisdiction}
                    onChange={handleInputChange}
                    placeholder="Ex: São Paulo - SP"
                    required
                  />
                  <p className="text-xs text-muted-foreground mt-1">Cidade onde serão resolvidas questões legais</p>
                </div>
              </div>

              {/* Características do Imóvel */}
              <div>
                <Label htmlFor="propertyCharacteristics">Características do Imóvel (Cláusula 3)</Label>
                <textarea
                  id="propertyCharacteristics"
                  name="propertyCharacteristics"
                  className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={newContract.propertyCharacteristics}
                  onChange={(e) => setNewContract(prev => ({ ...prev, propertyCharacteristics: e.target.value }))}
                  placeholder="Descreva as condições e características do imóvel conforme vistoria: estado de conservação, instalações, equipamentos, mobília, etc."
                />
                <p className="text-xs text-muted-foreground mt-1">Dados da vistoria do imóvel que serão incluídos no contrato</p>
              </div>

              <div className="flex justify-between gap-2">
                {selectedTemplate && previewContent && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsCreatePreview(true); // Create preview - hide download/print
                      setShowPreviewModal(true);
                    }}
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
          <DialogContent className="w-[95vw] sm:w-auto max-w-4xl max-h-[90vh] overflow-y-auto p-3 sm:p-6">
            <DialogHeader className="flex flex-row items-center justify-between">
              <div>
                <DialogTitle>Prévia do Contrato</DialogTitle>
                <DialogDescription className="hidden sm:block">Visualize como ficará o contrato com as informações preenchidas.</DialogDescription>
              </div>
              {/* Download/Print icons in header - only show for details view */}
              {!isCreatePreview && previewContent && (
                <div className="flex gap-2">
                  <Button variant="ghost" size="icon" onClick={handleDownloadPreviewPDF} title="Baixar PDF">
                    <Download className="w-5 h-5" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={handlePrintPreview} title="Imprimir">
                    <Printer className="w-5 h-5" />
                  </Button>
                </div>
              )}
            </DialogHeader>
            {previewContent ? (
              <div id="contract-preview-content" className="space-y-4">
                {}
                <div className="bg-muted p-3 sm:p-4 rounded-lg border">
                  <h3 className="font-semibold mb-3">Informações de Segurança</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 text-sm">
                    <div className="break-all sm:break-normal">
                      <span className="font-medium">Token:</span>{' '}
                      <span className="font-mono text-xs">{previewToken}</span>
                    </div>
                    <div>
                      <span className="font-medium">CRECI:</span>{' '}
                      <span className={!(selectedContract?.creci || newContract.creci || agencyData?.creci) ? 'text-red-500 font-semibold' : ''}>
                        {selectedContract?.creci || newContract.creci || agencyData?.creci || '⚠️ OBRIGATÓRIO'}
                      </span>
                    </div>
                    <div>
                      <span className="font-medium">IP:</span>{' '}
                      <span className="font-mono text-xs">
                        {selectedContract?.creatorIp || userIp || '[Obtendo IP...]'}
                      </span>
                    </div>
                    <div>
                      <span className="font-medium">Data/Hora:</span>{' '}
                      <span className="font-mono text-xs">
                        {new Date().toLocaleString('pt-BR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit'
                        })}
                      </span>
                    </div>
                    <div className="sm:col-span-2 break-all">
                      <span className="font-medium">Hash:</span>{' '}
                      <span className="font-mono text-xs">
                        {selectedContract?.contentHash || `SHA256:${previewToken ? btoa(previewToken) : '---'}`}
                      </span>
                    </div>
                  </div>
                  {!(selectedContract?.creci || newContract.creci || agencyData?.creci) && (
                    <p className="text-red-500 text-xs mt-2">
                      * O CRECI do corretor é obrigatório por lei para validade do contrato
                    </p>
                  )}
                </div>

                {}
                {previewToken && (
                  <div className="flex flex-col sm:flex-row items-center justify-center p-3 sm:p-4 bg-white border rounded-lg gap-4 sm:gap-6">
                    <div className="flex-shrink-0">
                      <QRCodeSVG
                        value={`https://mr3x.com.br/verify/${previewToken}`}
                        size={80}
                        level="H"
                      />
                    </div>
                    <div className="flex-shrink-0 w-full sm:w-auto overflow-x-auto flex justify-center">
                      <Barcode
                        value={previewToken}
                        format="CODE128"
                        width={2}
                        height={50}
                        displayValue={true}
                        fontSize={14}
                        textMargin={4}
                      />
                    </div>
                  </div>
                )}

                {}
                <div className="prose prose-sm max-w-none bg-white p-4 sm:p-6 border rounded-lg">
                  <div className="text-sm leading-relaxed" style={{ wordBreak: 'normal', overflowWrap: 'normal', hyphens: 'none' }}>
                    {previewContent.split('\n').map((line, index) => {
                      const isBold = line.startsWith('**') || line.includes('CLÁUSULA') || line.includes('CONTRATO');
                      return (
                        <p key={index} className={isBold ? 'font-bold my-2' : 'my-1'} style={{ wordBreak: 'normal', overflowWrap: 'normal', whiteSpace: 'normal' }}>
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
                  <Select
                    value={editForm.propertyId}
                    onValueChange={(value) => setEditForm(prev => ({ ...prev, propertyId: value }))}
                  >
                    <SelectTrigger className="[&>span]:text-left [&>span]:truncate">
                      <SelectValue placeholder="Selecione um imóvel" />
                    </SelectTrigger>
                    <SelectContent>
                      {properties.map((property) => {
                        const propId = property.id?.toString() || String(property.id);
                        return (
                          <SelectItem key={propId} value={propId}>
                            {property.name || property.address}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="edit-tenantId">Inquilino</Label>
                  <Select
                    value={editForm.tenantId}
                    onValueChange={(value) => setEditForm(prev => ({ ...prev, tenantId: value }))}
                  >
                    <SelectTrigger className="[&>span]:text-left [&>span]:truncate">
                      <SelectValue placeholder="Selecione um inquilino" />
                    </SelectTrigger>
                    <SelectContent>
                      {tenants.map((tenant) => {
                        const tenantId = tenant.id?.toString() || String(tenant.id);
                        return (
                          <SelectItem key={tenantId} value={tenantId}>
                            {tenant.name || tenant.email || 'Sem nome'}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
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
        <Dialog open={!!contractToDelete} onOpenChange={() => setContractToDelete(null)}>
          <DialogContent className="w-[calc(100%-2rem)] sm:max-w-lg rounded-xl">
            <DialogHeader>
              <DialogTitle>Excluir contrato</DialogTitle>
              <DialogDescription>
                Tem certeza que deseja excluir este contrato? Esta ação não poderá ser desfeita.
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-row gap-2 mt-4">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setContractToDelete(null)}
                disabled={deleting}
              >
                Cancelar
              </Button>
              <Button
                onClick={confirmDelete}
                disabled={deleting}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white"
              >
                {deleting ? 'Excluindo...' : 'Excluir'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}
