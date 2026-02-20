import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { contractsAPI, propertiesAPI, usersAPI, contractTemplatesAPI, agenciesAPI, profileAPI, plansAPI } from '../../api';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '../../contexts/AuthContext';
import { PageHeader } from '../../components/PageHeader';
import { QRCodeSVG } from 'qrcode.react';
import Barcode from 'react-barcode';
import {
  FileText,
  Plus,
  Download,
  Calendar,
  DollarSign,
  Trash2,
  Eye,
  MoreHorizontal,
  User,
  Clock,
  List,
  Grid3X3,
  Printer,
  Search,
  Send,
  Lock,
  PenLine,
  CheckCircle,
  Loader2,
  AlertTriangle,
  Crown,
  Edit
} from 'lucide-react';
import html2canvas from 'html2canvas-pro';
import { jsPDF } from 'jspdf';
import { formatCurrency, formatDate } from '../../lib/utils';
import { safeGetCurrentPosition, isSecureOrigin } from '../../hooks/use-geolocation';
import { SignatureCapture } from '../../components/contracts/SignatureCapture';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../../components/ui/dialog';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { DocumentInput } from '../../components/ui/document-input';
import { CEPInput } from '../../components/ui/cep-input';
import { RGInput } from '../../components/ui/rg-input';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Card, CardContent } from '../../components/ui/card';
import { Skeleton } from '../../components/ui/skeleton';
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

type ContractUserType = 'AGENCY' | 'INDEPENDENT_OWNER' | 'PLATFORM';

const getUserTypeFromRole = (role: string): ContractUserType[] => {
  switch (role) {
    case 'AGENCY_ADMIN':
    case 'AGENCY_MANAGER':
    case 'BROKER':
    case 'INDEPENDENT_OWNER':
      return ['AGENCY', 'INDEPENDENT_OWNER'];
    case 'PROPRIETARIO':
      return ['INDEPENDENT_OWNER'];
    case 'CEO':
      return ['PLATFORM', 'AGENCY', 'INDEPENDENT_OWNER'];
    default:
      return ['INDEPENDENT_OWNER'];
  }
};

// CRECI is always stored as full string (e.g. "123456/SP") in a single field
const formatCreci = (creci?: string | null): string => {
  return creci || '';
};

export function Contracts() {
  const { user, hasPermission } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // Plan limit states
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgradeErrorMessage, setUpgradeErrorMessage] = useState('');
  const [checkingPlanLimit, setCheckingPlanLimit] = useState(false);

  const isCEO = user?.role === 'CEO';
  const isIndependentOwner = user?.role === 'INDEPENDENT_OWNER';
  const isAgencyUser = ['AGENCY_ADMIN', 'AGENCY_MANAGER'].includes(user?.role || '');
  const isProprietario = user?.role === 'PROPRIETARIO';
  const canViewContracts = hasPermission('contracts:read') || ['CEO', 'AGENCY_ADMIN', 'AGENCY_MANAGER', 'BROKER', 'INDEPENDENT_OWNER', 'PROPRIETARIO'].includes(user?.role || '');
  const canCreateContracts = (hasPermission('contracts:create') || ['AGENCY_ADMIN', 'AGENCY_MANAGER', 'BROKER', 'INDEPENDENT_OWNER'].includes(user?.role || '')) && !isCEO && !isProprietario;
  const canUpdateContracts = (hasPermission('contracts:update') || ['AGENCY_ADMIN', 'AGENCY_MANAGER', 'BROKER', 'INDEPENDENT_OWNER'].includes(user?.role || '')) && !isCEO && !isProprietario;
  const canDeleteContracts = (hasPermission('contracts:delete') || ['AGENCY_ADMIN', 'AGENCY_MANAGER', 'INDEPENDENT_OWNER'].includes(user?.role || '')) && !isCEO && !isProprietario;

  const allowedUserTypes = getUserTypeFromRole(user?.role || '');

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
    guarantorName: '',
    guarantorDocument: '',
    guarantorRg: '',
    guarantorCep: '',
    guarantorAddress: '',
    guarantorProfession: '',
  });

  const [pdfFile, setPdfFile] = useState<File | null>(null);

  const [selectedContract, setSelectedContract] = useState<any>(null);
  const [contractToEdit, setContractToEdit] = useState<any>(null);
  const [contractToDelete, setContractToDelete] = useState<any>(null);
  const [contractDetail, setContractDetail] = useState<any>(null);
  const [properties, setProperties] = useState<any[]>([]);
  const [tenants, setTenants] = useState<any[]>([]);
  // Removed unused setLoading state
  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [loadingEditContract, setLoadingEditContract] = useState(false);
  // Removed unused deleting state - using deleteContractMutation.isPending instead
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [isCreatePreview, setIsCreatePreview] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [previewContent, setPreviewContent] = useState<string>('');
  const [previewToken, setPreviewToken] = useState<string>('');
  const [userIp, setUserIp] = useState<string>('');
  const [showSignModal, setShowSignModal] = useState(false);
  const [signContractData, setSignContractData] = useState<{ contract: any; type: 'tenant' | 'owner' | 'agency' | null }>({ contract: null, type: null });
  const [signature, setSignature] = useState<string | null>(null);
  const [geoConsent, setGeoConsent] = useState(false);
  const [geoLocation, setGeoLocation] = useState<{ lat: number; lng: number } | null>(null);

  // Loading states for better UX - track by contract ID to avoid showing loading on all buttons
  const [loadingDetailId, setLoadingDetailId] = useState<string | null>(null);
  const [downloadingPdfId, setDownloadingPdfId] = useState<string | null>(null);
  const [signingContractId, setSigningContractId] = useState<string | null>(null);
  const [preparingContractId, setPreparingContractId] = useState<string | null>(null);
  const [printing, setPrinting] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = useCallback(() => {
    setSearchQuery(searchTerm.trim());
  }, [searchTerm]);

  const handleClearSearch = useCallback(() => {
    setSearchTerm('');
    setSearchQuery('');
  }, []);

  const isCreateFormValid = useMemo(() => {
    const monthlyRentValue = parseFloat(newContract.monthlyRent) || 0;
    const depositValue = parseFloat(newContract.deposit) || 0;
    
    return !!(
      newContract.propertyId &&
      newContract.tenantId &&
      newContract.startDate &&
      newContract.endDate &&
      newContract.monthlyRent &&
      monthlyRentValue > 0 &&
      newContract.deposit &&
      depositValue > 0 &&
      depositValue > monthlyRentValue && // Depth must be greater than monthly rent
      newContract.templateId && // Contrast Model (template) is required
      newContract.dueDay &&
      newContract.contractDate &&
      newContract.readjustmentIndex &&
      newContract.latePaymentPenaltyPercent &&
      newContract.monthlyInterestPercent &&
      newContract.guaranteeType &&
      newContract.jurisdiction
    );
  }, [newContract]);

  const generatePreviewToken = (templateType: string) => {
    const year = new Date().getFullYear();
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const random1 = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    const random2 = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    return `MR3X-${templateType || 'CTR'}-${year}-${random1}-${random2}`;
  };

  const handleGuarantorCEPData = useCallback((data: any) => {
    const address = [
      data.logradouro || data.street,
      data.bairro || data.neighborhood,
      data.cidade || data.city,
      data.estado || data.state
    ].filter(Boolean).join(', ');
    setNewContract(prev => ({
      ...prev,
      guarantorAddress: address || prev.guarantorAddress,
    }));
  }, []);

  const captureBarcodeAsRotatedImage = async (): Promise<{ rotated: string; original: string; width: number; height: number } | null> => {
    try {
      let svgElement: SVGElement | null = null;

      const allSvgs = document.querySelectorAll('#contract-preview-content svg');

      for (const svg of allSvgs) {
        const bbox = svg.getBoundingClientRect();
        const aspectRatio = bbox.width / bbox.height;

        if (aspectRatio > 2 && svg.querySelectorAll('rect').length > 10) {
          svgElement = svg as SVGElement;
          break;
        }
      }

      if (!svgElement) return null;

      const bbox = svgElement.getBoundingClientRect();
      const svgWidth = bbox.width || 300;
      const svgHeight = bbox.height || 80;

      const svgData = new XMLSerializer().serializeToString(svgElement);
      const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);

      return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
          const originalCanvas = document.createElement('canvas');
          originalCanvas.width = img.width || svgWidth;
          originalCanvas.height = img.height || svgHeight;
          const origCtx = originalCanvas.getContext('2d');
          if (origCtx) {
            origCtx.fillStyle = 'white';
            origCtx.fillRect(0, 0, originalCanvas.width, originalCanvas.height);
            origCtx.drawImage(img, 0, 0);
          }

          const rotatedCanvas = document.createElement('canvas');
          rotatedCanvas.width = originalCanvas.height;
          rotatedCanvas.height = originalCanvas.width;
          const rotCtx = rotatedCanvas.getContext('2d');

          if (rotCtx) {
            rotCtx.fillStyle = 'white';
            rotCtx.fillRect(0, 0, rotatedCanvas.width, rotatedCanvas.height);

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

  const handleDownloadPreviewPDF = async () => {
    setDownloadingPdfId('preview');

    const element = document.getElementById('contract-preview-content');
    if (!element) {
      toast.error('Erro ao gerar PDF');
      setDownloadingPdfId(null);
      return;
    }

    const barcodeData = await captureBarcodeAsRotatedImage();
    console.log('Barcode data captured:', barcodeData ? 'yes' : 'no');

    const filename = `contrato-previa-${previewToken || 'draft'}.pdf`;
    const token = previewToken || 'DRAFT';

    try {
      // Clone the element to capture at fixed width for consistent layout
      const clone = element.cloneNode(true) as HTMLElement;
      clone.style.width = '800px';
      clone.style.position = 'absolute';
      clone.style.left = '-9999px';
      clone.style.top = '0';
      clone.style.background = 'white';
      document.body.appendChild(clone);

      // Use html2canvas-pro which supports OKLCH colors
      const canvas = await html2canvas(clone, {
        scale: 2,
        useCORS: true,
        scrollX: 0,
        scrollY: 0,
        width: 800,
        windowWidth: 800,
        backgroundColor: '#ffffff',
      });

      document.body.removeChild(clone);

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      // Margins - proper padding for top/bottom/left/right
      const marginLeft = 10;
      const marginTop = 15; // More top margin
      const marginBottom = 15; // More bottom margin
      const marginRight = 20; // Extra margin for barcode

      const usableWidth = pageWidth - marginLeft - marginRight;
      const usableHeight = pageHeight - marginTop - marginBottom;

      // Calculate the scale to fit width
      const imgScale = usableWidth / canvas.width;
      const pxPerPage = usableHeight / imgScale;

      // Find smart break points between content rows (avoid cutting text)
      const findBreakPoints = (): number[] => {
        const breaks: number[] = [0];
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          // Fallback to simple pagination
          let y = pxPerPage;
          while (y < canvas.height) {
            breaks.push(Math.floor(y));
            y += pxPerPage;
          }
          breaks.push(canvas.height);
          return breaks;
        }

        let currentY = 0;

        while (currentY < canvas.height) {
          const targetY = currentY + pxPerPage;

          if (targetY >= canvas.height) {
            breaks.push(canvas.height);
            break;
          }

          // Search backwards from targetY to find a good break point (white row)
          let bestBreakY = Math.floor(targetY);
          const searchStart = Math.floor(targetY);
          const searchEnd = Math.floor(currentY + pxPerPage * 0.6);

          for (let y = searchStart; y > searchEnd; y -= 2) {
            try {
              const imageData = ctx.getImageData(0, y, canvas.width, 2);
              const pixels = imageData.data;

              let whitePixels = 0;
              const totalPixels = (canvas.width * 2);

              for (let i = 0; i < pixels.length; i += 4) {
                const r = pixels[i];
                const g = pixels[i + 1];
                const b = pixels[i + 2];
                if (r > 245 && g > 245 && b > 245) {
                  whitePixels++;
                }
              }

              // If this row is mostly white (gap between content), use it as break
              if (whitePixels / totalPixels > 0.85) {
                bestBreakY = y;
                break;
              }
            } catch {
              // If getImageData fails, use default position
              break;
            }
          }

          breaks.push(bestBreakY);
          currentY = bestBreakY;
        }

        return breaks;
      };

      const breakPoints = findBreakPoints();

      for (let i = 0; i < breakPoints.length - 1; i++) {
        if (i > 0) {
          pdf.addPage();
        }

        const srcY = breakPoints[i];
        const srcHeight = breakPoints[i + 1] - srcY;

        if (srcHeight <= 0) continue;

        const destHeight = srcHeight * imgScale;

        // Create a temporary canvas for this page's portion
        const pageCanvas = document.createElement('canvas');
        pageCanvas.width = canvas.width;
        pageCanvas.height = srcHeight;
        const ctx = pageCanvas.getContext('2d');

        if (ctx) {
          ctx.fillStyle = 'white';
          ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);

          ctx.drawImage(
            canvas,
            0, srcY, canvas.width, srcHeight,
            0, 0, canvas.width, srcHeight
          );

          const pageImgData = pageCanvas.toDataURL('image/jpeg', 0.98);
          pdf.addImage(pageImgData, 'JPEG', marginLeft, marginTop, usableWidth, destHeight);
        }

        // Add barcode/token to this page
        if (barcodeData && barcodeData.rotated) {
          const finalWidth = 10;
          const finalHeight = pageHeight * 0.5;

          const xPos = pageWidth - finalWidth - 3;
          const yPos = (pageHeight - finalHeight) / 2;

          pdf.setFillColor(255, 255, 255);
          pdf.rect(xPos - 2, yPos - 2, finalWidth + 4, finalHeight + 4, 'F');

          pdf.addImage(barcodeData.rotated, 'PNG', xPos, yPos, finalWidth, finalHeight);
        } else {
          pdf.setFillColor(255, 255, 255);
          pdf.rect(pageWidth - 15, pageHeight / 2 - 40, 12, 80, 'F');

          pdf.setFontSize(8);
          pdf.setTextColor(0, 0, 0);
          pdf.text(token, pageWidth - 5, pageHeight / 2, { angle: 90 });
        }
      }

      pdf.save(filename);
      toast.success('PDF baixado com sucesso!');
    } catch (error) {
      console.error('PDF generation error:', error);
      toast.error('Erro ao gerar PDF. Tente novamente.');
    } finally {
      setDownloadingPdfId(null);
    }
  };

  const handlePrintPreview = async () => {
    setPrinting(true);

    const element = document.getElementById('contract-preview-content');
    if (!element) {
      toast.error('Erro ao imprimir');
      setPrinting(false);
      return;
    }

    const barcodeData = await captureBarcodeAsRotatedImage();

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Erro ao abrir janela de impressão. Verifique se pop-ups estão permitidos.');
      setPrinting(false);
      return;
    }

    const token = previewToken || 'DRAFT';

    const styles = `
      <style>
        /* Remove browser header/footer (URL, date, page numbers) */
        @page {
          margin: 15mm 10mm 15mm 10mm;
          size: A4;
        }

        body {
          font-family: Arial, sans-serif;
          padding: 0;
          margin: 0;
          padding-right: 15mm;
          position: relative;
        }
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
          /* Hide URL, date, title in header/footer */
          @page {
            margin: 15mm 10mm 15mm 10mm;
          }
          body {
            margin: 0;
            padding: 0;
            padding-right: 15mm;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .barcode-container { position: fixed; right: 2mm; }
          p { page-break-inside: avoid; }
        }
      </style>
    `;

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
      setPrinting(false);
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
    queryKey: ['contracts', user?.id ?? 'anonymous', user?.role ?? 'unknown', user?.agencyId ?? 'none', user?.brokerId ?? 'none', searchQuery],
    queryFn: () => contractsAPI.getContracts(searchQuery ? { search: searchQuery } : undefined),
    enabled: canViewContracts,
  });

  const { data: templates = [], isLoading: templatesLoading } = useQuery({
    queryKey: ['contract-templates'],
    queryFn: () => contractTemplatesAPI.getTemplates(),
    enabled: canCreateContracts,
  });

  const { data: agencyData } = useQuery({
    queryKey: ['agency', user?.agencyId],
    queryFn: () => agenciesAPI.getAgencyById(user!.agencyId!),
    enabled: !!user?.agencyId,
  });

  const { data: profileData } = useQuery({
    queryKey: ['profile-for-contracts'],
    queryFn: profileAPI.getProfile,
    enabled: !!user,
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

  useEffect(() => {
    // Prefer agency CRECI (full string), then user profile CRECI (single field), then auth user.creci
    const agencyCreci = agencyData ? formatCreci(agencyData.creci) : '';
    const profileCreci = profileData?.creci || '';

    const defaultCreci = agencyCreci || profileCreci || user?.creci || '';
    // Set CRECI if we have a default value and the current value is empty
    // This ensures CRECI is set when form is reset or when modal opens
    if (defaultCreci && (!newContract.creci || newContract.creci === '')) {
      setNewContract(prev => ({
        ...prev,
        creci: defaultCreci,
      }));
    }
  }, [agencyData?.creci, profileData?.creci, user?.creci, newContract.creci]);

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
    newContract.guarantorName,
    newContract.guarantorDocument,
    newContract.guarantorRg,
    newContract.guarantorAddress,
    newContract.guarantorProfession,
    properties,
    tenants,
    agencyData
  ]);

  const closeAllModals = () => {
    setShowCreateModal(false);
    setShowEditModal(false);
    setShowDetailModal(false);
    setSelectedContract(null);
    setContractToEdit(null);
    setContractToDelete(null);
    setPdfFile(null);
    setLoadingEditContract(false);
  };

  const handleCreateContractClick = async () => {
    setCheckingPlanLimit(true);
    try {
      let result: { allowed: boolean; message?: string };

      if (isIndependentOwner && user?.id) {
        // INDEPENDENT_OWNER uses userId-based check
        result = await plansAPI.canCreateContractForOwner(user.id.toString());
      } else if (isAgencyUser && user?.agencyId) {
        // Agency users use agencyId-based check
        result = await plansAPI.canCreateContract(user.agencyId.toString());
      } else {
        // For other roles (like BROKER), allow creating
        closeAllModals();
        // Set CRECI when opening create modal
        const agencyCreci = agencyData ? formatCreci(agencyData.creci) : '';
        const profileCreci = profileData?.creci || '';
        const defaultCreci = agencyCreci || profileCreci || user?.creci || '';
        if (defaultCreci) {
          setNewContract(prev => ({
            ...prev,
            creci: defaultCreci,
          }));
        }
        setShowCreateModal(true);
        return;
      }

      if (result.allowed) {
        closeAllModals();
        // Set CRECI when opening create modal
        const agencyCreci = agencyData ? formatCreci(agencyData.creci) : '';
        const profileCreci = profileData?.creci || '';
        const defaultCreci = agencyCreci || profileCreci || user?.creci || '';
        if (defaultCreci) {
          setNewContract(prev => ({
            ...prev,
            creci: defaultCreci,
          }));
        }
        setShowCreateModal(true);
      } else {
        setUpgradeErrorMessage(result.message || 'Você atingiu o limite de contratos do seu plano.');
        setShowUpgradeModal(true);
      }
    } catch (error) {
      console.error('Error checking plan limit:', error);
      // On error, allow creating (fail open)
      closeAllModals();
      setShowCreateModal(true);
    } finally {
      setCheckingPlanLimit(false);
    }
  };

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
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || error?.message || 'Erro ao excluir contrato');
    },
  });

  const handleCreateContract = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      const resolvedCreci = newContract.creci || undefined;

      const contractToSend = {
        ...newContract,
        startDate: new Date(newContract.startDate).toISOString().split('T')[0],
        endDate: new Date(newContract.endDate).toISOString().split('T')[0],
        monthlyRent: Number(newContract.monthlyRent),
        deposit: newContract.deposit ? Number(newContract.deposit) : undefined,
        dueDay: newContract.dueDay ? Number(newContract.dueDay) : undefined,
        status: 'PENDENTE',
        templateId: newContract.templateId || undefined,
        templateType: newContract.templateType || undefined,
        creci: resolvedCreci,
        contentSnapshot: previewContent || undefined,
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
        guarantorName: '',
        guarantorDocument: '',
        guarantorRg: '',
        guarantorCep: '',
        guarantorAddress: '',
        guarantorProfession: '',
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

  // Handle edit contract
  const handleEditContract = async (contract: any) => {
    closeAllModals();
    setLoadingEditContract(true);
    setShowEditModal(true);
    
    try {
      // Fetch full contract details
      const fullContract = await contractsAPI.getContractById(contract.id.toString());
      setContractToEdit(fullContract);
      
      // Populate edit form with contract data
      setNewContract({
        propertyId: fullContract.propertyId?.toString() || '',
        tenantId: fullContract.tenantId?.toString() || '',
        startDate: fullContract.startDate ? new Date(fullContract.startDate).toISOString().split('T')[0] : '',
        endDate: fullContract.endDate ? new Date(fullContract.endDate).toISOString().split('T')[0] : '',
        monthlyRent: fullContract.monthlyRent?.toString() || '',
        deposit: fullContract.deposit?.toString() || '',
        dueDay: fullContract.dueDay?.toString() || '5',
        description: fullContract.description || '',
        templateId: fullContract.templateId?.toString() || '',
        templateType: (fullContract.templateType || 'CTR') as 'CTR' | 'ACD' | 'VST',
        creci: fullContract.creci || '',
        readjustmentIndex: (fullContract.readjustmentIndex || 'IGPM') as 'IGPM' | 'IPCA' | 'INPC' | 'IGP-DI' | 'OUTRO',
        customReadjustmentIndex: fullContract.customReadjustmentIndex || fullContract.clausesSnapshot?.customReadjustmentIndex || '',
        latePaymentPenaltyPercent: fullContract.lateFeePercent?.toString() || fullContract.clausesSnapshot?.latePaymentPenaltyPercent?.toString() || '10',
        monthlyInterestPercent: fullContract.interestRatePercent?.toString() || fullContract.clausesSnapshot?.monthlyInterestPercent?.toString() || '1',
        earlyTerminationPenaltyMonths: fullContract.clausesSnapshot?.earlyTerminationPenaltyMonths?.toString() || fullContract.earlyTerminationPenaltyPercent?.toString() || '3',
        earlyTerminationFixedValue: fullContract.clausesSnapshot?.earlyTerminationFixedValue?.toString() || '',
        useFixedTerminationValue: !!fullContract.clausesSnapshot?.earlyTerminationFixedValue || !!fullContract.earlyTerminationFixedValue,
        jurisdiction: fullContract.jurisdiction || fullContract.clausesSnapshot?.jurisdiction || '',
        contractDate: fullContract.contractDate ? new Date(fullContract.contractDate).toISOString().split('T')[0] : (fullContract.clausesSnapshot?.contractDate ? new Date(fullContract.clausesSnapshot.contractDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]),
        propertyCharacteristics: fullContract.propertyCharacteristics || fullContract.clausesSnapshot?.propertyCharacteristics || '',
        guaranteeType: (fullContract.guaranteeType || fullContract.clausesSnapshot?.guaranteeType || 'CAUCAO') as 'CAUCAO' | 'FIADOR' | 'SEGURO' | 'TITULO' | 'NENHUMA',
        guarantorName: fullContract.guarantorName || '',
        guarantorDocument: fullContract.guarantorDocument || '',
        guarantorRg: fullContract.guarantorRg || '',
        guarantorCep: fullContract.guarantorCep || '',
        guarantorAddress: fullContract.guarantorAddress || '',
        guarantorProfession: fullContract.guarantorProfession || '',
      });
      
      // Load template if exists
      if (fullContract.templateId) {
        try {
          const template = await contractTemplatesAPI.getTemplateById(fullContract.templateId.toString());
          if (template) {
            setSelectedTemplate(template);
            generateContractPreview(template, fullContract);
          }
        } catch (error) {
          console.warn('Could not load template:', error);
        }
      }
    } catch (error: any) {
      toast.error(error?.message || 'Erro ao carregar contrato para edição');
      setShowEditModal(false);
    } finally {
      setLoadingEditContract(false);
    }
  };

  const handleUpdateContract = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contractToEdit?.id) {
      toast.error('Contrato não encontrado');
      return;
    }

    setUpdating(true);
    try {
      // Resolve CRECI: use newContract.creci if it's not empty, otherwise use existing contract's CRECI
      const resolvedCreci = (newContract.creci && newContract.creci.trim() !== '') 
        ? newContract.creci 
        : (contractToEdit.creci || undefined);

      const contractToSend = {
        ...newContract,
        startDate: new Date(newContract.startDate).toISOString().split('T')[0],
        endDate: new Date(newContract.endDate).toISOString().split('T')[0],
        monthlyRent: Number(newContract.monthlyRent),
        deposit: newContract.deposit ? Number(newContract.deposit) : undefined,
        dueDay: newContract.dueDay ? Number(newContract.dueDay) : undefined,
        templateId: newContract.templateId || undefined,
        templateType: newContract.templateType || undefined,
        creci: resolvedCreci,
        contentSnapshot: previewContent || contractToEdit.contentSnapshot || undefined,
      };

      await contractsAPI.updateContract(contractToEdit.id.toString(), contractToSend);

      toast.success('Contrato atualizado com sucesso');
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
        guarantorName: '',
        guarantorDocument: '',
        guarantorRg: '',
        guarantorCep: '',
        guarantorAddress: '',
        guarantorProfession: '',
      });
      setPdfFile(null);
      setSelectedTemplate(null);
      setPreviewContent('');
    } catch (error: any) {
      toast.error(error?.response?.data?.message || error?.message || 'Erro ao atualizar contrato');
    } finally {
      setUpdating(false);
    }
  };

  const handleViewContract = async (contract: any) => {
    closeAllModals();
    const contractId = contract.id.toString();
    setLoadingDetailId(contractId);

    try {
      const fullContract = await contractsAPI.getContractById(contractId);

      if (!fullContract) {
        toast.error('Contrato não encontrado');
        setLoadingDetailId(null);
        return;
      }

      setSelectedContract(fullContract);
      setContractDetail(fullContract);

      // Always show preview modal - prioritize contentSnapshot, then template
      if (fullContract.contentSnapshot) {
        // Use existing contentSnapshot (most reliable)
        setPreviewContent(fullContract.contentSnapshot);
        setPreviewToken(fullContract.contractToken || '');
        setIsCreatePreview(false);
        setShowPreviewModal(true);
        setShowDetailModal(false);
      } else if (fullContract.templateId) {
        // Try to generate preview from template
        let template = templates?.find((t: any) => t.id?.toString() === fullContract.templateId?.toString());

        if (!template) {
          try {
            template = await contractTemplatesAPI.getTemplateById(fullContract.templateId.toString());
          } catch (templateError) {
            console.warn('Could not fetch template:', templateError);
          }
        }

        if (template) {
          generateContractPreview(template, fullContract);
          setIsCreatePreview(false);
          setShowPreviewModal(true);
          setShowDetailModal(false);
        } else {
          // Template not found - still show preview modal with basic info
          setPreviewContent('Visualização do contrato. Informações básicas disponíveis.');
          setPreviewToken(fullContract.contractToken || '');
          setIsCreatePreview(false);
          setShowPreviewModal(true);
          setShowDetailModal(false);
        }
      } else {
        // No template or contentSnapshot - still show preview modal with available info
        setPreviewContent('Visualização do contrato. Informações básicas disponíveis.');
        setPreviewToken(fullContract.contractToken || '');
        setIsCreatePreview(false);
        setShowPreviewModal(true);
        setShowDetailModal(false);
      }
    } catch (error: any) {
      console.error('Error loading contract:', error);
      toast.error(error?.message || 'Erro ao carregar contrato');
      setSelectedContract(contract);
      setContractDetail(contract);
      // Even on error, try to show preview modal if we have contract data
      if (contract.contentSnapshot) {
        setPreviewContent(contract.contentSnapshot);
        setPreviewToken(contract.contractToken || '');
        setIsCreatePreview(false);
        setShowPreviewModal(true);
        setShowDetailModal(false);
      } else {
        // Last resort: show detail modal
      setShowDetailModal(true);
        setShowPreviewModal(false);
      }
    } finally {
      setLoadingDetailId(null);
    }
  };

  const generateContractPreview = (template: any, contractData: any) => {
    if (!template || !contractData) return;

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

    const formatAddress = (obj: any) => {
      if (!obj) return '';
      const parts = [obj.address, obj.number, obj.complement, obj.neighborhood, obj.city, obj.state, obj.cep, obj.zipCode].filter(Boolean);
      return parts.join(', ');
    };

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
      NOME_CORRETOR: contractData.agency?.name || '',
      // Use ONLY contract snapshot data for CRECI to keep document immutable
      CRECI_CORRETOR: contractData.creci || formatCreci(contractData.agency?.creci) || '',

      NOME_LOCADOR: contractOwner?.name || '',
      LOCADOR_NOME: contractOwner?.name || '',
      CPF_LOCADOR: formatDocument(contractOwner?.document) || '',
      LOCADOR_CPF: formatDocument(contractOwner?.document) || '',
      ENDERECO_LOCADOR: formatAddress(contractOwner) || '',
      LOCADOR_ENDERECO: formatAddress(contractOwner) || '',
      EMAIL_LOCADOR: contractOwner?.email || '',
      LOCADOR_EMAIL: contractOwner?.email || '',
      TELEFONE_LOCADOR: contractOwner?.phone || contractOwner?.mobilePhone || '',
      LOCADOR_TELEFONE: contractOwner?.phone || contractOwner?.mobilePhone || '',
      LOCADOR_NACIONALIDADE: contractOwner?.nationality || 'Brasileira',
      LOCADOR_ESTADO_CIVIL: contractOwner?.maritalStatus || '',
      LOCADOR_PROFISSAO: contractOwner?.profession || '',
      LOCADOR_RG: contractOwner?.rg || '',
      LOCADOR_DATA_NASC: contractOwner?.birthDate ? new Date(contractOwner.birthDate).toLocaleDateString('pt-BR') : '',

      RAZAO_SOCIAL_LOCADOR: contractOwner?.companyName || contractOwner?.company?.name || contractOwner?.name || '',
      LOCADOR_RAZAO_SOCIAL: contractOwner?.companyName || contractOwner?.company?.name || contractOwner?.name || '',
      CNPJ_LOCADOR: formatDocument(contractOwner?.cnpj || contractOwner?.company?.cnpj || contractOwner?.document) || '',
      LOCADOR_CNPJ: formatDocument(contractOwner?.cnpj || contractOwner?.company?.cnpj || contractOwner?.document) || '',
      REPRESENTANTE_LOCADOR: contractOwner?.representativeName || contractOwner?.company?.responsible || contractOwner?.name || '',
      LOCADOR_REPRESENTANTE: contractOwner?.representativeName || contractOwner?.company?.responsible || contractOwner?.name || '',
      CPF_REPRESENTANTE_LOCADOR: formatDocument(contractOwner?.representativeDocument || contractOwner?.document) || '',
      LOCADOR_REP_DOC: formatDocument(contractOwner?.representativeDocument || contractOwner?.document) || '',
      CARGO_LOCADOR: contractOwner?.representativePosition || '',
      LOCADOR_CARGO: contractOwner?.representativePosition || '',

      NOME_LOCATARIO: contractTenant?.name || '',
      LOCATARIO_NOME: contractTenant?.name || '',
      CPF_LOCATARIO: formatDocument(contractTenant?.document) || '',
      LOCATARIO_CPF: formatDocument(contractTenant?.document) || '',
      ENDERECO_LOCATARIO: formatAddress(contractTenant) || '',
      LOCATARIO_ENDERECO: formatAddress(contractTenant) || '',
      LOCATARIO_ENDERECO_ATUAL: formatAddress(contractTenant) || '',
      EMAIL_LOCATARIO: contractTenant?.email || '',
      LOCATARIO_EMAIL: contractTenant?.email || '',
      TELEFONE_LOCATARIO: contractTenant?.phone || contractTenant?.mobilePhone || '',
      LOCATARIO_TELEFONE: contractTenant?.phone || contractTenant?.mobilePhone || '',
      LOCATARIO_NACIONALIDADE: contractTenant?.nationality || 'Brasileira',
      LOCATARIO_ESTADO_CIVIL: contractTenant?.maritalStatus || '',
      LOCATARIO_PROFISSAO: contractTenant?.profession || '',
      LOCATARIO_RG: contractTenant?.rg || '',
      LOCATARIO_DATA_NASC: contractTenant?.birthDate ? new Date(contractTenant.birthDate).toLocaleDateString('pt-BR') : '',

      RAZAO_SOCIAL_LOCATARIO: contractTenant?.companyName || contractTenant?.company?.name || contractTenant?.name || '',
      LOCATARIO_RAZAO_SOCIAL: contractTenant?.companyName || contractTenant?.company?.name || contractTenant?.name || '',
      CNPJ_LOCATARIO: formatDocument(contractTenant?.cnpj || contractTenant?.company?.cnpj || contractTenant?.document) || '',
      LOCATARIO_CNPJ: formatDocument(contractTenant?.cnpj || contractTenant?.company?.cnpj || contractTenant?.document) || '',
      REPRESENTANTE_LOCATARIO: contractTenant?.representativeName || contractTenant?.company?.responsible || contractTenant?.name || '',
      LOCATARIO_REPRESENTANTE: contractTenant?.representativeName || contractTenant?.company?.responsible || contractTenant?.name || '',
      CPF_REPRESENTANTE_LOCATARIO: formatDocument(contractTenant?.representativeDocument || contractTenant?.document) || '',
      LOCATARIO_REP_DOC: formatDocument(contractTenant?.representativeDocument || contractTenant?.document) || '',
      CARGO_LOCATARIO: contractTenant?.representativePosition || '',
      LOCATARIO_CARGO: contractTenant?.representativePosition || '',

      LOCATARIO_EMPREGADOR: contractTenant?.employerName || '',
      CONTATO_EMERGENCIA_NOME: contractTenant?.emergencyContactName || '',
      CONTATO_EMERGENCIA_TELEFONE: contractTenant?.emergencyContactPhone || '',

      ENDERECO_IMOVEL: formatAddress(contractProperty) || contractProperty?.address || '',
      IMOVEL_ENDERECO: formatAddress(contractProperty) || contractProperty?.address || '',
      DESCRICAO_IMOVEL: contractProperty?.description || contractProperty?.name || '',
      IMOVEL_DESCRICAO: contractProperty?.description || contractProperty?.name || '',
      MATRICULA: contractProperty?.registrationNumber || '',
      IMOVEL_MATRICULA: contractProperty?.registrationNumber || '',
      IMOVEL_TIPO: contractProperty?.type || contractProperty?.propertyType || 'Residencial',
      IMOVEL_MOVEIS_LISTA: contractProperty?.furnitureList || 'Conforme vistoria',
      IMOVEL_ENERGIA: contractProperty?.energyPattern || 'Monofásico',
      IMOVEL_CONDOMINIO: contractProperty?.condominiumName || 'N/A',
      IMOVEL_CONDOMINIO_VALOR: contractProperty?.condominiumFee ? `R$ ${parseFloat(contractProperty.condominiumFee).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : 'N/A',
      IMOVEL_IPTU_VALOR: contractProperty?.iptuValue ? `R$ ${parseFloat(contractProperty.iptuValue).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : 'N/A',

      RAZAO_SOCIAL_IMOBILIARIA: agencyData?.name || contractData.agency?.name || '',
      IMOBILIARIA_RAZAO_SOCIAL: agencyData?.name || contractData.agency?.name || '',
      IMOBILIARIA_NOME_FANTASIA: agencyData?.tradeName || agencyData?.name || contractData.agency?.tradeName || contractData.agency?.name || '',
      CNPJ_IMOBILIARIA: formatDocument(agencyData?.cnpj || contractData.agency?.cnpj) || '',
      IMOBILIARIA_CNPJ: formatDocument(agencyData?.cnpj || contractData.agency?.cnpj) || '',
      // Use stored contract/agency CRECI, never live user CRECI
      NUMERO_CRECI: formatCreci(contractData.agency?.creci || contractData.creci),
      IMOBILIARIA_CRECI: formatCreci(contractData.agency?.creci || contractData.creci),
      ENDERECO_IMOBILIARIA: formatAddress(agencyData || contractData.agency) || '',
      IMOBILIARIA_ENDERECO: formatAddress(agencyData || contractData.agency) || '',
      EMAIL_IMOBILIARIA: agencyData?.email || contractData.agency?.email || '',
      IMOBILIARIA_EMAIL: agencyData?.email || contractData.agency?.email || '',
      TELEFONE_IMOBILIARIA: agencyData?.phone || contractData.agency?.phone || '',
      IMOBILIARIA_TELEFONE: agencyData?.phone || contractData.agency?.phone || '',
      REPRESENTANTE_IMOBILIARIA: agencyData?.representativeName || contractData.agency?.representativeName || '',
      IMOBILIARIA_REPRESENTANTE: agencyData?.representativeName || contractData.agency?.representativeName || '',
      CPF_REPRESENTANTE_IMOBILIARIA: formatDocument(agencyData?.representativeDocument || contractData.agency?.representativeDocument) || '',
      IMOBILIARIA_REP_DOC: formatDocument(agencyData?.representativeDocument || contractData.agency?.representativeDocument) || '',

      PRAZO_MESES: calculateMonths(contractData.startDate, contractData.endDate),
      DATA_INICIO: contractData.startDate ? new Date(contractData.startDate).toLocaleDateString('pt-BR') : '',
      DATA_FIM: contractData.endDate ? new Date(contractData.endDate).toLocaleDateString('pt-BR') : '',
      VALOR_ALUGUEL: contractData.monthlyRent ? parseFloat(contractData.monthlyRent).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '',
      DIA_VENCIMENTO: contractData.dueDay?.toString() || '5',
      DEPOSITO_CAUCAO: contractData.deposit ? parseFloat(contractData.deposit).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '',
      VALOR_GARANTIA: contractData.deposit ? parseFloat(contractData.deposit).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '',

      INDICE_REAJUSTE: getIndexName(contractData.readjustmentIndex || 'IGPM'),

      TIPO_GARANTIA: getGuaranteeTypeName(contractData.guaranteeType || ''),

      MULTA_ATRASO: contractData.latePaymentPenaltyPercent?.toString() || contractData.lateFeePercent?.toString() || '10',
      JUROS_MORA: contractData.monthlyInterestPercent?.toString() || contractData.interestRatePercent?.toString() || '1',
      JUROS_ATRASO: contractData.monthlyInterestPercent?.toString() || contractData.interestRatePercent?.toString() || '1',
      PERCENTUAL_MULTA_ATRASO: contractData.latePaymentPenaltyPercent?.toString() || contractData.lateFeePercent?.toString() || '10',
      PERCENTUAL_JUROS_MORA: contractData.monthlyInterestPercent?.toString() || contractData.interestRatePercent?.toString() || '1',

      MULTA_RESCISAO: contractData.earlyTerminationPenaltyMonths || contractData.earlyTerminationPenaltyPercent || '3',
      MESES_MULTA_RESCISAO: contractData.earlyTerminationPenaltyMonths || '3',
      VALOR_MULTA_RESCISAO: contractData.earlyTerminationFixedValue
        ? `R$ ${parseFloat(contractData.earlyTerminationFixedValue).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
        : `${contractData.earlyTerminationPenaltyMonths || '3'} meses de aluguel`,

      CARACTERISTICAS_IMOVEL: contractData.propertyCharacteristics || '',
      DESCRICAO_VISTORIA: contractData.propertyCharacteristics || '',

      COMARCA: contractData.jurisdiction || contractProperty?.city || '',
      FORO: contractData.jurisdiction || contractProperty?.city || '',
      FORO_CIDADE_ESTADO: `${contractProperty?.city || ''} - ${contractProperty?.state || ''}`,
      CIDADE: contractProperty?.city || '',

      AGUA_RESPONSAVEL: 'Locatário',
      GAS_RESPONSAVEL: 'Locatário',
      ENERGIA_RESPONSAVEL: 'Locatário',
      CONDOMINIO_RESPONSAVEL: 'Locatário',
      IPTU_RESPONSAVEL: 'Locatário',
      SEGURO_INCENDIO_VALOR: 'A contratar',

      TAXA_ADMINISTRACAO: agencyData?.agencyFee?.toString() || contractData.agency?.agencyFee?.toString() || '10',
      DIA_REPASSE: '10',
      DIAS_AVISO_PREVIO: '30',

      FIADOR_DADOS: '',
      FIADOR_NOME: contractData.guarantorName || '',
      FIADOR_CPF: formatDocument(contractData.guarantorDocument) || '',
      FIADOR_RG: contractData.guarantorRg || '',
      FIADOR_ENDERECO: contractData.guarantorAddress || '',
      FIADOR_PROFISSAO: contractData.guarantorProfession || '',
      FIADOR_RESPONSABILIDADE_SOLIDARIA: 'SIM',
      IP_FIADOR: contractData.guarantorSignatureIP || '[IP registrado na assinatura]',
      DATA_ASS_FIADOR: contractData.guarantorSignedAt ? new Date(contractData.guarantorSignedAt).toLocaleDateString('pt-BR') : '________________________________',

      FINALIDADE_ESPECIAL: contractData.specialPurpose || 'N/A',

      FORMA_PAGAMENTO: contractData.paymentMethod || 'Depósito bancário / PIX',
      USO_IMOBILIARIA: contractData.useRealEstate ? 'SIM' : 'NÃO',
      DADOS_BANCARIOS: contractOwner?.bankName ? `Banco: ${contractOwner.bankName}, Ag: ${contractOwner.bankBranch || ''}, Conta: ${contractOwner.bankAccount || ''}, PIX: ${contractOwner.pixKey || ''}` : 'A ser informado',

      GARANTIA_DADOS: contractData.guaranteeDetails || '',

      INDICE_CORRECAO: contractData.readjustmentIndex || 'IGP-M',
      MULTA_RESCISAO_MESES: contractData.earlyTerminationPenaltyMonths || '3',

      DATA_VISTORIA_INICIAL: contractData.startDate ? new Date(contractData.startDate).toLocaleDateString('pt-BR') : '',
      RESP_VISTORIA_INICIAL: agencyData?.name || user?.name || '',

      DATA_CONTRATO: contractData.createdAt ? new Date(contractData.createdAt).toLocaleDateString('pt-BR') : new Date().toLocaleDateString('pt-BR'),
      DATA_ASSINATURA: contractData.tenantSignedAt ? new Date(contractData.tenantSignedAt).toLocaleDateString('pt-BR') : new Date().toLocaleDateString('pt-BR'),
      DATA_ACEITE: new Date().toLocaleDateString('pt-BR'),
      DATA_EXTENSO: formatDateExtensive(contractData.createdAt || new Date().toISOString()),
      DATA_ASS_LOCADOR: contractData.ownerSignedAt ? new Date(contractData.ownerSignedAt).toLocaleDateString('pt-BR') : '________________________________',
      DATA_ASS_LOCATARIO: contractData.tenantSignedAt ? new Date(contractData.tenantSignedAt).toLocaleDateString('pt-BR') : '________________________________',
      DATA_ASS_IMOBILIARIA: contractData.agencySignedAt ? new Date(contractData.agencySignedAt).toLocaleDateString('pt-BR') : '________________________________',

      ASSINATURA_LOCADOR: contractData.ownerSignature 
        ? `<img src="${contractData.ownerSignature}" alt="Assinatura do Locador" style="max-width: 200px; max-height: 60px; display: block; margin: 0 auto;" />`
        : '________________________________',
      ASSINATURA_LOCATARIO: contractData.tenantSignature 
        ? `<img src="${contractData.tenantSignature}" alt="Assinatura do Locatário" style="max-width: 200px; max-height: 60px; display: block; margin: 0 auto;" />`
        : '________________________________',
      ASSINATURA_IMOBILIARIA: contractData.agencySignature 
        ? `<img src="${contractData.agencySignature}" alt="Assinatura da Imobiliária" style="max-width: 200px; max-height: 60px; display: block; margin: 0 auto;" />`
        : '________________________________',
      ASSINATURA_TESTEMUNHA: contractData.witnessSignature 
        ? `<img src="${contractData.witnessSignature}" alt="Assinatura da Testemunha" style="max-width: 200px; max-height: 60px; display: block; margin: 0 auto;" />`
        : '________________________________',
      HASH_DOCUMENTO: contractData.documentHash || '[Hash gerado na assinatura]',
      IP_LOCADOR: contractData.ownerSignatureIP || '[IP registrado na assinatura]',
      IP_LOCATARIO: contractData.tenantSignatureIP || '[IP registrado na assinatura]',
      IP_IMOBILIARIA: contractData.agencySignatureIP || '[IP registrado na assinatura]',

      ANEXO_VISTORIA_INICIAL: 'Anexo I - Laudo de Vistoria Inicial',
      ANEXO_VISTORIA_FINAL: 'Anexo II - Laudo de Vistoria Final',
      ANEXO_GARANTIA: 'Anexo III - Comprovante de Garantia',
      ANEXOS_DOCUMENTOS: 'Anexos Digitais do Contrato',

      IMOVEL_AREA_CONSTRUIDA: contractProperty?.builtArea ? `${parseFloat(contractProperty.builtArea).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} m²` : 'N/A',
      IMOVEL_AREA_TOTAL: contractProperty?.totalArea ? `${parseFloat(contractProperty.totalArea).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '',
      IMOVEL_AREA: contractProperty?.builtArea ? `${parseFloat(contractProperty.builtArea).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} m²` : (contractProperty?.totalArea ? `${parseFloat(contractProperty.totalArea).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} m²` : 'N/A'),
      IMOVEL_BAIRRO: contractProperty?.neighborhood || '',
      IMOVEL_MOVEIS: contractProperty?.furnitureList || 'Conforme vistoria',
      AUTORIZA_ASSINATURA_LOCACAO: 'SIM',
      VALOR_LIMITE_MANUTENCAO: '500,00',
      VALOR_TAXA_INTERMEDIACAO: contractData.monthlyRent ? parseFloat(contractData.monthlyRent).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '0,00',
      TAXA_INTERMEDIACAO_PORCENTAGEM: '100',
      PERCENTUAL_INTERMEDIACAO: '100',
      VALOR_2VIA: '15,00',
      VALOR_LAUDO_EXTRA: '150,00',
      PLANO_GARANTIA_ALUGUEL: 'NÃO',
      PLANO_GARANTIA: 'NÃO',
      VALOR_EMERGENCIA: '500,00',
      VALOR_LIMITE_SERVICOS: '300,00',
      MODELO_AUTORIZACAO: 'Sistema digital da imobiliária',

      LOCADOR1_NOME: contractOwner?.name || '',
      LOCADOR1_NACIONALIDADE: contractOwner?.nationality || 'Brasileira',
      LOCADOR1_ESTADO_CIVIL: contractOwner?.maritalStatus || '',
      LOCADOR1_PROFISSAO: contractOwner?.profession || '',
      LOCADOR1_RG: contractOwner?.rg || '',
      LOCADOR1_CPF: formatDocument(contractOwner?.document) || '',
      LOCADOR1_ENDERECO: formatAddress(contractOwner) || '',

      LOCADOR2_NOME: contractOwner?.spouseName || '',
      LOCADOR2_NACIONALIDADE: contractOwner?.spouseNationality || 'Brasileira',
      LOCADOR2_ESTADO_CIVIL: contractOwner?.maritalStatus || '',
      LOCADOR2_PROFISSAO: contractOwner?.spouseProfession || '',
      LOCADOR2_RG: contractOwner?.spouseRg || '',
      LOCADOR2_CPF: formatDocument(contractOwner?.spouseDocument) || '',
      LOCADOR2_ENDERECO: formatAddress(contractOwner) || '',

      LOCATARIO_REP_NOME: contractTenant?.representativeName || contractTenant?.company?.responsible || contractTenant?.name || '',
      LOCATARIO_REP_NACIONALIDADE: contractTenant?.representativeNationality || contractTenant?.nationality || 'Brasileira',
      LOCATARIO_REP_ESTADO_CIVIL: contractTenant?.representativeMaritalStatus || contractTenant?.maritalStatus || '',
      LOCATARIO_REP_CPF: formatDocument(contractTenant?.representativeDocument || contractTenant?.document) || '',
      LOCATARIO_REP_RG: contractTenant?.representativeRg || contractTenant?.rg || '',
      LOCATARIO_REP_ENDERECO: contractTenant?.representativeAddress || formatAddress(contractTenant) || '',

      IMOVEL_LOCALIDADE: contractProperty?.locality || formatAddress(contractProperty) || '',
      IMOVEL_AREA_LOCADA: contractProperty?.rentedArea ? `${parseFloat(contractProperty.rentedArea).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : (contractProperty?.builtArea || ''),
      IMOVEL_COMARCA: contractProperty?.county || contractProperty?.city || '',
      FINALIDADE_USO: contractData.purposeOfUse || 'Exploração agrícola',

      BANCO: contractOwner?.bankName || '[A ser informado]',
      AGENCIA: contractOwner?.bankBranch || '[A ser informado]',
      CONTA: contractOwner?.bankAccount || '[A ser informado]',
      CHAVE_PIX: contractOwner?.pixKey || '[A ser informado]',

      MULTA_RESTITUICAO_MESES: contractData.restitutionPenaltyMonths || '3',
      MULTA_INFRACAO_MESES: contractData.infractionPenaltyMonths || '3',
      DATA_VISTORIA_FINAL: contractData.endDate ? new Date(contractData.endDate).toLocaleDateString('pt-BR') : '',

      DATA_ASS_LOCADOR1: contractData.ownerSignedAt ? new Date(contractData.ownerSignedAt).toLocaleDateString('pt-BR') : '________________________________',
      DATA_ASS_LOCADOR2: contractData.secondOwnerSignedAt ? new Date(contractData.secondOwnerSignedAt).toLocaleDateString('pt-BR') : '________________________________',
      IP_LOCADORES: contractData.ownerSignedIP || '[IP registrado na assinatura]',

    };

    for (const [key, value] of Object.entries(replacements)) {
      const pattern = `[${key}]`;
      content = content.replace(new RegExp(pattern.replace(/[\[\]]/g, '\\$&'), 'g'), value || '');
    }

    setPreviewToken(contractData.contractToken || '');
    setPreviewContent(content);
  };

  // Contract editing is disabled - contracts cannot be edited once created

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

  const prepareForSigningMutation = useMutation({
    mutationFn: (id: string) => contractsAPI.prepareForSigning(id),
    onSuccess: async (_, contractId) => {
      toast.success('Contrato enviado para assinatura');
      queryClient.invalidateQueries({
        queryKey: ['contracts', user?.id ?? 'anonymous', user?.role ?? 'unknown', user?.agencyId ?? 'none', user?.brokerId ?? 'none']
      });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['audit-logs'] });
      
      // Refresh contract data if it's currently being viewed
      const contractIdStr = contractId.toString();
      if (selectedContract && selectedContract.id?.toString() === contractIdStr) {
        try {
          const refreshedContract = await contractsAPI.getContractById(contractId);
          if (refreshedContract) {
            setSelectedContract(refreshedContract);
            setContractDetail(refreshedContract);
            
            // Update preview if modal is open
            if (showPreviewModal || showDetailModal) {
              if (refreshedContract.contentSnapshot) {
                setPreviewContent(refreshedContract.contentSnapshot);
                setPreviewToken(refreshedContract.contractToken || '');
                setIsCreatePreview(false);
                setShowPreviewModal(true);
                setShowDetailModal(false);
              } else if (refreshedContract.templateId) {
                let template = templates?.find((t: any) => t.id?.toString() === refreshedContract.templateId?.toString());
                if (!template) {
                  try {
                    template = await contractTemplatesAPI.getTemplateById(refreshedContract.templateId.toString());
                  } catch (templateError) {
                    console.warn('Could not fetch template:', templateError);
                  }
                }
                if (template) {
                  generateContractPreview(template, refreshedContract);
                  setIsCreatePreview(false);
                  setShowPreviewModal(true);
                  setShowDetailModal(false);
                } else {
                  setShowDetailModal(true);
                  setShowPreviewModal(false);
                }
              } else {
                setShowDetailModal(true);
                setShowPreviewModal(false);
              }
            }
          }
        } catch (error) {
          console.error('Error refreshing contract after prepareForSigning:', error);
        }
      }
      
      setPreparingContractId(null);
    },
    onError: (error: any) => {
      const errorMessage = error?.response?.data?.message || error?.message || 'Erro ao enviar contrato para assinatura';
      console.error('Error preparing contract for signing:', error);
      console.error('Error details:', error?.response?.data);
      toast.error(errorMessage);
      setPreparingContractId(null);
    },
  });

  const handlePrepareForSigning = (contract: any) => {
    const contractId = contract.id.toString();
    setPreparingContractId(contractId);
    prepareForSigningMutation.mutate(contractId);
  };

  const getUserSignatureType = (contract: any): 'tenant' | 'owner' | 'agency' | null => {
    const userId = user?.id?.toString();
    const userRole = user?.role;
    if (!userId) return null;

    // Check if user is the tenant
    if (contract.tenantId?.toString() === userId ||
        (userRole === 'INQUILINO' && contract.tenantUser?.id?.toString() === userId)) {
      return 'tenant';
    }

    // Check if user is from the agency (check this before owner to prioritize agency signature)
    // Only AGENCY_ADMIN and AGENCY_MANAGER can sign as agency
    if ((userRole === 'AGENCY_ADMIN' || userRole === 'AGENCY_MANAGER') && 
        user?.agencyId && contract.agencyId?.toString() === user.agencyId.toString()) {
      return 'agency';
    }

    // Check if user is the owner
    if (contract.ownerId?.toString() === userId ||
        ((userRole === 'PROPRIETARIO' || userRole === 'INDEPENDENT_OWNER') && contract.ownerUser?.id?.toString() === userId)) {
      return 'owner';
    }

    return null;
  };

  const canUserSignContract = (contract: any): boolean => {
    if (!contract || contract.status !== 'AGUARDANDO_ASSINATURAS') return false;
    const type = getUserSignatureType(contract);
    if (!type) return false;

    switch (type) {
      case 'tenant':
        return !contract.tenantSignature;
      case 'owner':
        return !contract.ownerSignature;
      case 'agency':
        // Agency can only sign after tenant and owner have signed
        return !contract.agencySignature && !!contract.tenantSignature && !!contract.ownerSignature;
      default:
        return false;
    }
  };

  // Open sign modal for contract from detail view
  const handleSignContract = () => {
    if (!selectedContract || !user) {
      toast.error('Contrato não carregado');
      return;
    }

    const signatureType = getUserSignatureType(selectedContract);
    if (!signatureType) {
      toast.error('Você não pode assinar este contrato');
      return;
    }

    setSignContractData({ contract: selectedContract, type: signatureType });
    setSignature(null);
    setGeoConsent(false);
    setGeoLocation(null);
    setShowSignModal(true);
  };

  // Open sign modal for contract from list
  const handleSignContractFromList = (contract: any) => {
    if (!contract || !user) {
      toast.error('Contrato não carregado');
      return;
    }

    const signatureType = getUserSignatureType(contract);
    if (!signatureType) {
      toast.error('Você não pode assinar este contrato');
      return;
    }

    setSignContractData({ contract, type: signatureType });
    setSignature(null);
    setGeoConsent(false);
    setGeoLocation(null);
    setShowSignModal(true);
  };

  // Close sign modal
  const closeSignModal = () => {
    setShowSignModal(false);
    setSignContractData({ contract: null, type: null });
    setSignature(null);
    setGeoConsent(false);
    setGeoLocation(null);
    setSigningContractId(null); // Reset loading state when closing modal
  };

  // Handle geolocation consent change
  const handleGeoConsentChange = (consent: boolean) => {
    setGeoConsent(consent);
    if (consent) {
      if (!isSecureOrigin()) {
        toast.warning('Geolocalização requer HTTPS. Continuando sem localização.');
        setGeoLocation(null);
        return;
      }

      toast.info('Obtendo localização...');
      safeGetCurrentPosition(
        (position) => {
          if (position) {
            setGeoLocation({
              lat: position.coords.latitude,
              lng: position.coords.longitude,
            });
            toast.success('Localização obtida com sucesso!');
          } else {
            setGeoLocation(null);
            toast.warning('Continuando sem localização.');
          }
        },
        (error) => {
          // Handle different geolocation error types
          if (error instanceof GeolocationPositionError || ('code' in error && typeof error.code === 'number')) {
            const geoError = error as GeolocationPositionError;
            if (geoError.code === 1) {
              // PERMISSION_DENIED - User denied the request
              console.warn('Geolocation permission denied by user');
              toast.warning('Permissão de localização negada. Você pode continuar sem localização.');
              setGeoLocation(null);
              // Don't reset geoConsent, allow user to try again if they want
            } else if (geoError.code === 2) {
              // POSITION_UNAVAILABLE - Location unavailable
              console.error('Geolocation position unavailable:', error);
              toast.error('Localização indisponível. Verifique se o GPS está habilitado.');
              setGeoConsent(false);
            } else if (geoError.code === 3) {
              // TIMEOUT - Request timeout
              console.error('Geolocation timeout:', error);
              toast.error('Tempo esgotado ao obter localização. Tente novamente.');
              setGeoConsent(false);
            } else {
              // Other errors
          console.error('Error getting geolocation:', error);
          toast.error('Erro ao obter localização.');
          setGeoConsent(false);
            }
          } else {
            // Generic Error type
            console.error('Error getting geolocation:', error);
            toast.error('Erro ao obter localização.');
            setGeoConsent(false);
          }
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
      );
    } else {
      setGeoLocation(null);
    }
  };

  // Get signature type label
  const getSignTypeLabel = (type: 'tenant' | 'owner' | 'agency' | null): string => {
    switch (type) {
      case 'tenant': return 'Locatário';
      case 'owner': return 'Proprietário';
      case 'agency': return 'Imobiliária';
      default: return '';
    }
  };

  // Confirm signature
  const confirmSign = async () => {
    if (!signContractData.contract || !signContractData.type || !signature || !user) {
      toast.error('Dados incompletos para assinatura');
      return;
    }

    // Allow signing without geolocation on HTTP
    if (!geoConsent && isSecureOrigin()) {
      toast.error('É necessário autorizar o compartilhamento de localização');
      return;
    }

    const contractId = signContractData.contract.id.toString();
    setSigningContractId(contractId);

    try {
      await contractsAPI.signContractWithGeo(contractId, {
        signature,
        signatureType: signContractData.type,
        geoLat: geoLocation?.lat,
        geoLng: geoLocation?.lng,
        geoConsent: geoConsent,
      });

      toast.success('Contrato assinado com sucesso', {
        icon: '✅',
        style: {
          background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
          border: '1px solid #16a34a',
          borderRadius: '0.75rem',
        },
      });
      
      // Show additional notification for AGENCY_ADMIN
      if (user?.role === 'AGENCY_ADMIN' && signContractData.type === 'agency') {
        const propertyName = signContractData.contract.property?.name || signContractData.contract.property?.address || 'o imóvel';
        toast.info(`Contrato assinado pela agência para ${propertyName}. Notificação enviada para todas as partes.`, {
          duration: 6000,
          icon: '📋',
          style: {
            background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
            border: '1px solid #3b82f6',
            borderRadius: '0.75rem',
          },
        });
      }
      
      queryClient.invalidateQueries({
        queryKey: ['contracts', user?.id ?? 'anonymous', user?.role ?? 'unknown', user?.agencyId ?? 'none', user?.brokerId ?? 'none']
      });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['audit-logs'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-unread'] });
      queryClient.invalidateQueries({ queryKey: ['contracts-badge'] });

      // Refresh current contract details if viewing
      if (selectedContract && selectedContract.id === signContractData.contract.id) {
        // Wait a bit to ensure backend has updated the contentSnapshot
        await new Promise(resolve => setTimeout(resolve, 500));
        await handleViewContract(signContractData.contract);
      } else {
        // If preview modal is open, refresh the contract data
        if (showPreviewModal && selectedContract) {
          await new Promise(resolve => setTimeout(resolve, 500));
          const refreshedContract = await contractsAPI.getContractById(selectedContract.id.toString());
          if (refreshedContract) {
            setSelectedContract(refreshedContract);
            if (refreshedContract.contentSnapshot) {
              setPreviewContent(refreshedContract.contentSnapshot);
            }
          }
        }
      }

      closeSignModal();
    } catch (error: any) {
      console.error('Error signing contract:', error);
      toast.error(error?.response?.data?.message || error?.message || 'Erro ao assinar contrato');
    } finally {
      setSigningContractId(null);
    }
  };

  const canEditContract = (contract: any): boolean => {
    // Contracts can only be edited when status is PENDENTE (before sending for signing)
    return contract?.status === 'PENDENTE';
  };

  const canDeleteContract = (_contract: any): boolean => {
    // Allow deletion for users with delete permission - backend will handle validation
    return true;
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

    const formatAddress = (obj: any) => {
      if (!obj) return '';
      const parts = [obj.address, obj.number, obj.complement, obj.neighborhood, obj.city, obj.state, obj.cep].filter(Boolean);
      return parts.join(', ');
    };

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


    const replacements: Record<string, string> = {
      NOME_CORRETOR: agencyData?.name || user?.name || '',
      CRECI_CORRETOR: newContract.creci || agencyData?.creci || user?.creci || '',

      NOME_LOCADOR: owner?.name || '',
      LOCADOR_NOME: owner?.name || '',
      CPF_LOCADOR: formatDocument(owner?.document) || '',
      LOCADOR_CPF: formatDocument(owner?.document) || '',
      ENDERECO_LOCADOR: formatAddress(owner) || '',
      LOCADOR_ENDERECO: formatAddress(owner) || '',
      EMAIL_LOCADOR: owner?.email || '',
      LOCADOR_EMAIL: owner?.email || '',
      TELEFONE_LOCADOR: owner?.phone || owner?.mobilePhone || '',
      LOCADOR_TELEFONE: owner?.phone || owner?.mobilePhone || '',
      LOCADOR_NACIONALIDADE: owner?.nationality || 'Brasileira',
      LOCADOR_ESTADO_CIVIL: owner?.maritalStatus || '',
      LOCADOR_PROFISSAO: owner?.profession || '',
      LOCADOR_RG: owner?.rg || '',
      LOCADOR_DATA_NASC: owner?.birthDate ? new Date(owner.birthDate).toLocaleDateString('pt-BR') : '',

      RAZAO_SOCIAL_LOCADOR: owner?.company?.name || owner?.name || '',
      LOCADOR_RAZAO_SOCIAL: owner?.company?.name || owner?.name || '',
      CNPJ_LOCADOR: formatDocument(owner?.company?.cnpj || owner?.document) || '',
      LOCADOR_CNPJ: formatDocument(owner?.company?.cnpj || owner?.document) || '',
      REPRESENTANTE_LOCADOR: owner?.company?.responsible || owner?.name || '',
      LOCADOR_REPRESENTANTE: owner?.company?.responsible || owner?.name || '',
      CPF_REPRESENTANTE_LOCADOR: formatDocument(owner?.document) || '',
      LOCADOR_REP_DOC: formatDocument(owner?.document) || '',
      CARGO_LOCADOR: '',
      LOCADOR_CARGO: '',

      NOME_LOCATARIO: selectedTenant?.name || '',
      LOCATARIO_NOME: selectedTenant?.name || '',
      CPF_LOCATARIO: formatDocument(selectedTenant?.document) || '',
      LOCATARIO_CPF: formatDocument(selectedTenant?.document) || '',
      ENDERECO_LOCATARIO: formatAddress(selectedTenant) || '',
      LOCATARIO_ENDERECO: formatAddress(selectedTenant) || '',
      LOCATARIO_ENDERECO_ATUAL: formatAddress(selectedTenant) || '',
      EMAIL_LOCATARIO: selectedTenant?.email || '',
      LOCATARIO_EMAIL: selectedTenant?.email || '',
      TELEFONE_LOCATARIO: selectedTenant?.phone || selectedTenant?.mobilePhone || '',
      LOCATARIO_TELEFONE: selectedTenant?.phone || selectedTenant?.mobilePhone || '',
      LOCATARIO_NACIONALIDADE: selectedTenant?.nationality || 'Brasileira',
      LOCATARIO_ESTADO_CIVIL: selectedTenant?.maritalStatus || '',
      LOCATARIO_PROFISSAO: selectedTenant?.profession || '',
      LOCATARIO_RG: selectedTenant?.rg || '',
      LOCATARIO_DATA_NASC: selectedTenant?.birthDate ? new Date(selectedTenant.birthDate).toLocaleDateString('pt-BR') : '',

      RAZAO_SOCIAL_LOCATARIO: selectedTenant?.company?.name || selectedTenant?.name || '',
      LOCATARIO_RAZAO_SOCIAL: selectedTenant?.company?.name || selectedTenant?.name || '',
      CNPJ_LOCATARIO: formatDocument(selectedTenant?.company?.cnpj || selectedTenant?.document) || '',
      LOCATARIO_CNPJ: formatDocument(selectedTenant?.company?.cnpj || selectedTenant?.document) || '',
      REPRESENTANTE_LOCATARIO: selectedTenant?.company?.responsible || selectedTenant?.name || '',
      LOCATARIO_REPRESENTANTE: selectedTenant?.company?.responsible || selectedTenant?.name || '',
      CPF_REPRESENTANTE_LOCATARIO: formatDocument(selectedTenant?.document) || '',
      LOCATARIO_REP_DOC: formatDocument(selectedTenant?.document) || '',
      CARGO_LOCATARIO: '',
      LOCATARIO_CARGO: '',

      LOCATARIO_EMPREGADOR: selectedTenant?.employerName || '',
      CONTATO_EMERGENCIA_NOME: selectedTenant?.emergencyContactName || '',
      CONTATO_EMERGENCIA_TELEFONE: selectedTenant?.emergencyContactPhone || '',

      ENDERECO_IMOVEL: formatAddress(selectedProperty) || selectedProperty?.address || '',
      IMOVEL_ENDERECO: formatAddress(selectedProperty) || selectedProperty?.address || '',
      DESCRICAO_IMOVEL: selectedProperty?.description || selectedProperty?.name || '',
      IMOVEL_DESCRICAO: selectedProperty?.description || selectedProperty?.name || '',
      MATRICULA: selectedProperty?.registrationNumber || '',
      IMOVEL_MATRICULA: selectedProperty?.registrationNumber || '',
      IMOVEL_TIPO: selectedProperty?.type || selectedProperty?.propertyType || 'Residencial',
      IMOVEL_MOVEIS_LISTA: selectedProperty?.furnitureList || 'Conforme vistoria',
      IMOVEL_ENERGIA: selectedProperty?.energyPattern || 'Monofásico',
      IMOVEL_CONDOMINIO: selectedProperty?.condominiumName || 'N/A',
      IMOVEL_CONDOMINIO_VALOR: selectedProperty?.condominiumFee ? `R$ ${parseFloat(selectedProperty.condominiumFee).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : 'N/A',
      IMOVEL_IPTU_VALOR: selectedProperty?.iptuValue ? `R$ ${parseFloat(selectedProperty.iptuValue).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : 'N/A',

      RAZAO_SOCIAL_IMOBILIARIA: agencyData?.name || '',
      IMOBILIARIA_RAZAO_SOCIAL: agencyData?.name || '',
      IMOBILIARIA_NOME_FANTASIA: agencyData?.tradeName || agencyData?.name || '',
      CNPJ_IMOBILIARIA: formatDocument(agencyData?.cnpj) || '',
      IMOBILIARIA_CNPJ: formatDocument(agencyData?.cnpj) || '',
      NUMERO_CRECI: agencyData?.creci || user?.creci || newContract.creci || '',
      IMOBILIARIA_CRECI: agencyData?.creci || user?.creci || newContract.creci || '',
      ENDERECO_IMOBILIARIA: formatAddress(agencyData) || '',
      IMOBILIARIA_ENDERECO: formatAddress(agencyData) || '',
      EMAIL_IMOBILIARIA: agencyData?.email || '',
      IMOBILIARIA_EMAIL: agencyData?.email || '',
      TELEFONE_IMOBILIARIA: agencyData?.phone || '',
      IMOBILIARIA_TELEFONE: agencyData?.phone || '',
      REPRESENTANTE_IMOBILIARIA: agencyData?.representativeName || '',
      IMOBILIARIA_REPRESENTANTE: agencyData?.representativeName || '',
      CPF_REPRESENTANTE_IMOBILIARIA: formatDocument(agencyData?.representativeDocument) || '',
      IMOBILIARIA_REP_DOC: formatDocument(agencyData?.representativeDocument) || '',

      PRAZO_MESES: calculateMonths(newContract.startDate, newContract.endDate),
      DATA_INICIO: newContract.startDate ? new Date(newContract.startDate).toLocaleDateString('pt-BR') : '',
      DATA_FIM: newContract.endDate ? new Date(newContract.endDate).toLocaleDateString('pt-BR') : '',
      VALOR_ALUGUEL: newContract.monthlyRent ? parseFloat(newContract.monthlyRent).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '',
      DIA_VENCIMENTO: newContract.dueDay || '5',
      DEPOSITO_CAUCAO: newContract.deposit ? parseFloat(newContract.deposit).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '',
      VALOR_GARANTIA: newContract.deposit ? parseFloat(newContract.deposit).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '',

      INDICE_REAJUSTE: newContract.readjustmentIndex === 'OUTRO'
        ? newContract.customReadjustmentIndex
        : getIndexName(newContract.readjustmentIndex),

      TIPO_GARANTIA: getGuaranteeTypeName(newContract.guaranteeType),

      MULTA_ATRASO: newContract.latePaymentPenaltyPercent || '10',
      JUROS_MORA: newContract.monthlyInterestPercent || '1',
      JUROS_ATRASO: newContract.monthlyInterestPercent || '1',
      PERCENTUAL_MULTA_ATRASO: newContract.latePaymentPenaltyPercent || '10',
      PERCENTUAL_JUROS_MORA: newContract.monthlyInterestPercent || '1',

      MULTA_RESCISAO: newContract.earlyTerminationPenaltyMonths || '3',
      MESES_MULTA_RESCISAO: newContract.earlyTerminationPenaltyMonths || '3',
      VALOR_MULTA_RESCISAO: calculateTerminationPenalty(),

      CARACTERISTICAS_IMOVEL: newContract.propertyCharacteristics || '',
      DESCRICAO_VISTORIA: newContract.propertyCharacteristics || '',

      COMARCA: newContract.jurisdiction || selectedProperty?.city || '',
      FORO: newContract.jurisdiction || selectedProperty?.city || '',
      FORO_CIDADE_ESTADO: `${selectedProperty?.city || ''} - ${selectedProperty?.state || ''}`,
      CIDADE: selectedProperty?.city || '',

      AGUA_RESPONSAVEL: 'Locatário',
      GAS_RESPONSAVEL: 'Locatário',
      ENERGIA_RESPONSAVEL: 'Locatário',
      CONDOMINIO_RESPONSAVEL: 'Locatário',
      IPTU_RESPONSAVEL: 'Locatário',
      SEGURO_INCENDIO_VALOR: 'A contratar',

      TAXA_ADMINISTRACAO: agencyData?.agencyFee?.toString() || '10',
      DIA_REPASSE: '10',
      DIAS_AVISO_PREVIO: '30',

      FIADOR_DADOS: '',
      FIADOR_NOME: newContract.guarantorName || '',
      FIADOR_CPF: formatDocument(newContract.guarantorDocument) || '',
      FIADOR_RG: newContract.guarantorRg || '',
      FIADOR_ENDERECO: newContract.guarantorAddress || '',
      FIADOR_PROFISSAO: newContract.guarantorProfession || '',
      FIADOR_RESPONSABILIDADE_SOLIDARIA: 'SIM',
      IP_FIADOR: '[IP registrado na assinatura]',
      DATA_ASS_FIADOR: '________________________________',

      FINALIDADE_ESPECIAL: (newContract as any).specialPurpose || 'N/A',

      FORMA_PAGAMENTO: (newContract as any).paymentMethod || 'Depósito bancário / PIX',
      USO_IMOBILIARIA: (newContract as any).useRealEstate ? 'SIM' : 'NÃO',
      DADOS_BANCARIOS: owner?.bankName ? `Banco: ${owner.bankName}, Ag: ${owner.bankBranch || ''}, Conta: ${owner.bankAccount || ''}, PIX: ${owner.pixKey || ''}` : 'A ser informado',

      GARANTIA_DADOS: (newContract as any).guaranteeDetails || '',

      INDICE_CORRECAO: newContract.readjustmentIndex || 'IGP-M',
      MULTA_RESCISAO_MESES: newContract.earlyTerminationPenaltyMonths || '3',

      DATA_VISTORIA_INICIAL: newContract.startDate ? new Date(newContract.startDate).toLocaleDateString('pt-BR') : '',
      RESP_VISTORIA_INICIAL: agencyData?.name || user?.name || '',

      DATA_CONTRATO: newContract.contractDate ? new Date(newContract.contractDate).toLocaleDateString('pt-BR') : new Date().toLocaleDateString('pt-BR'),
      DATA_ASSINATURA: newContract.contractDate ? new Date(newContract.contractDate).toLocaleDateString('pt-BR') : new Date().toLocaleDateString('pt-BR'),
      DATA_ACEITE: new Date().toLocaleDateString('pt-BR'),
      DATA_EXTENSO: formatDateExtensive(newContract.contractDate || new Date().toISOString().split('T')[0]),
      DATA_ASS_LOCADOR: '________________________________',
      DATA_ASS_LOCATARIO: '________________________________',
      DATA_ASS_IMOBILIARIA: '________________________________',

      ASSINATURA_LOCADOR: '________________________________',
      ASSINATURA_LOCATARIO: '________________________________',
      ASSINATURA_TESTEMUNHA: '________________________________',
      HASH_DOCUMENTO: '[Será gerado na assinatura]',
      IP_LOCADOR: '[Será registrado na assinatura]',
      IP_LOCATARIO: '[Será registrado na assinatura]',
      IP_IMOBILIARIA: '[Será registrado na assinatura]',

      ANEXO_VISTORIA_INICIAL: 'Anexo I - Laudo de Vistoria Inicial',
      ANEXO_VISTORIA_FINAL: 'Anexo II - Laudo de Vistoria Final',
      ANEXO_GARANTIA: 'Anexo III - Comprovante de Garantia',
      ANEXOS_DOCUMENTOS: 'Anexos Digitais do Contrato',

      IMOVEL_AREA_CONSTRUIDA: selectedProperty?.builtArea ? `${parseFloat(selectedProperty.builtArea).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} m²` : 'N/A',
      IMOVEL_AREA_TOTAL: selectedProperty?.totalArea ? `${parseFloat(selectedProperty.totalArea).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '',
      IMOVEL_AREA: selectedProperty?.builtArea ? `${parseFloat(selectedProperty.builtArea).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} m²` : (selectedProperty?.totalArea ? `${parseFloat(selectedProperty.totalArea).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} m²` : 'N/A'),
      IMOVEL_BAIRRO: selectedProperty?.neighborhood || '',
      IMOVEL_MOVEIS: selectedProperty?.furnitureList || 'Conforme vistoria',
      AUTORIZA_ASSINATURA_LOCACAO: 'SIM',
      VALOR_LIMITE_MANUTENCAO: '500,00',
      VALOR_TAXA_INTERMEDIACAO: newContract.monthlyRent ? parseFloat(newContract.monthlyRent).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '0,00',
      TAXA_INTERMEDIACAO_PORCENTAGEM: '100',
      PERCENTUAL_INTERMEDIACAO: '100',
      VALOR_2VIA: '15,00',
      VALOR_LAUDO_EXTRA: '150,00',
      PLANO_GARANTIA_ALUGUEL: 'NÃO',
      PLANO_GARANTIA: 'NÃO',
      VALOR_EMERGENCIA: '500,00',
      VALOR_LIMITE_SERVICOS: '300,00',
      MODELO_AUTORIZACAO: 'Sistema digital da imobiliária',

      LOCADOR1_NOME: owner?.name || '',
      LOCADOR1_NACIONALIDADE: owner?.nationality || 'Brasileira',
      LOCADOR1_ESTADO_CIVIL: owner?.maritalStatus || '',
      LOCADOR1_PROFISSAO: owner?.profession || '',
      LOCADOR1_RG: owner?.rg || '',
      LOCADOR1_CPF: formatDocument(owner?.document) || '',
      LOCADOR1_ENDERECO: formatAddress(owner) || '',

      LOCADOR2_NOME: owner?.spouseName || '',
      LOCADOR2_NACIONALIDADE: owner?.spouseNationality || 'Brasileira',
      LOCADOR2_ESTADO_CIVIL: owner?.maritalStatus || '',
      LOCADOR2_PROFISSAO: owner?.spouseProfession || '',
      LOCADOR2_RG: owner?.spouseRg || '',
      LOCADOR2_CPF: formatDocument(owner?.spouseDocument) || '',
      LOCADOR2_ENDERECO: formatAddress(owner) || '',

      LOCATARIO_REP_NOME: selectedTenant?.representativeName || selectedTenant?.company?.responsible || selectedTenant?.name || '',
      LOCATARIO_REP_NACIONALIDADE: selectedTenant?.representativeNationality || selectedTenant?.nationality || 'Brasileira',
      LOCATARIO_REP_ESTADO_CIVIL: selectedTenant?.representativeMaritalStatus || selectedTenant?.maritalStatus || '',
      LOCATARIO_REP_CPF: formatDocument(selectedTenant?.representativeDocument || selectedTenant?.document) || '',
      LOCATARIO_REP_RG: selectedTenant?.representativeRg || selectedTenant?.rg || '',
      LOCATARIO_REP_ENDERECO: selectedTenant?.representativeAddress || formatAddress(selectedTenant) || '',

      IMOVEL_LOCALIDADE: selectedProperty?.locality || formatAddress(selectedProperty) || '',
      IMOVEL_AREA_LOCADA: selectedProperty?.rentedArea ? `${parseFloat(selectedProperty.rentedArea).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : (selectedProperty?.builtArea || ''),
      IMOVEL_COMARCA: selectedProperty?.county || selectedProperty?.city || '',
      FINALIDADE_USO: (newContract as any).purposeOfUse || 'Exploração agrícola',

      BANCO: owner?.bankName || '[A ser informado]',
      AGENCIA: owner?.bankBranch || '[A ser informado]',
      CONTA: owner?.bankAccount || '[A ser informado]',
      CHAVE_PIX: owner?.pixKey || '[A ser informado]',

      MULTA_RESTITUICAO_MESES: (newContract as any).restitutionPenaltyMonths || '3',
      MULTA_INFRACAO_MESES: (newContract as any).infractionPenaltyMonths || '3',
      DATA_VISTORIA_FINAL: newContract.endDate ? new Date(newContract.endDate).toLocaleDateString('pt-BR') : '',

      DATA_ASS_LOCADOR1: '________________________________',
      DATA_ASS_LOCADOR2: '________________________________',
      IP_LOCADORES: '[Será registrado na assinatura]',

    };

    function getIndexName(index: string): string {
      const names: Record<string, string> = {
        'IGPM': 'IGP-M (Índice Geral de Preços - Mercado)',
        'IPCA': 'IPCA (Índice Nacional de Preços ao Consumidor Amplo)',
        'INPC': 'INPC (Índice Nacional de Preços ao Consumidor)',
        'IGP-DI': 'IGP-DI (Índice Geral de Preços - Disponibilidade Interna)',
      };
      return names[index] || index;
    }

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

    function calculateTerminationPenalty(): string {
      if (newContract.useFixedTerminationValue && newContract.earlyTerminationFixedValue) {
        return `R$ ${parseFloat(newContract.earlyTerminationFixedValue).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
      }
      const months = newContract.earlyTerminationPenaltyMonths || '3';
      return `${months} meses de aluguel`;
    }

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
      const pattern = `[${key}]`;
      content = content.replace(new RegExp(pattern.replace(/[\[\]]/g, '\\$&'), 'g'), value || '');
    }

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

          // Set tenantId only if property has a tenantId
          if (selectedProperty.tenantId) {
            const tenantIdStr = selectedProperty.tenantId?.toString() || String(selectedProperty.tenantId);
            updated.tenantId = tenantIdStr;
          } else {
            // Clear tenantId if property doesn't have a tenant
            updated.tenantId = '';
          }

          if (selectedProperty.deposit) {
            updated.deposit = selectedProperty.deposit.toString();
          }

          if (selectedProperty.city) {
            updated.jurisdiction = selectedProperty.city;
          }
        } else {
          // Property not found, clear tenantId
          updated.tenantId = '';
        }
      }

      return updated;
    });
  };

  // Edit input change handler removed - contracts cannot be edited

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

  // INQUILINO and PROPRIETARIO should only see contracts after they are sent for signing
  // INDEPENDENT_OWNER manages their own contracts, so they should see all statuses including PENDENTE
  const isPartyRole = ['INQUILINO', 'PROPRIETARIO'].includes(user?.role || '');

  const visibleContracts = useMemo(() => {
    if (!contracts) return [];
    if (!isPartyRole) return contracts;
    // Tenants / agency-managed owners should only see contracts after they are sent for signing
    return contracts.filter((c: any) => c.status !== 'PENDENTE');
  }, [contracts, isPartyRole]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* Header Skeleton */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <Skeleton className="w-12 h-12 rounded-lg" />
            <div>
              <Skeleton className="h-8 w-32 mb-2" />
              <Skeleton className="h-4 w-64" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="w-20 h-10 rounded" />
            <Skeleton className="w-36 h-10 rounded" />
          </div>
        </div>

        {/* Search Skeleton */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex w-full sm:max-w-lg gap-2">
            <Skeleton className="h-10 flex-1 rounded" />
            <Skeleton className="h-10 w-20 rounded" />
          </div>
        </div>

        {/* Contracts Grid Skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="overflow-hidden">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <Skeleton className="w-10 h-10 rounded-full" />
                    <div>
                      <Skeleton className="h-5 w-32 mb-1" />
                      <Skeleton className="h-4 w-24" />
                    </div>
                  </div>
                  <Skeleton className="h-6 w-16 rounded-full" />
                </div>
                <div className="space-y-2 mb-4">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <div className="flex items-center gap-4">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                </div>
                <div className="flex gap-2 justify-end">
                  <Skeleton className="h-9 w-9 rounded" />
                  <Skeleton className="h-9 w-9 rounded" />
                  <Skeleton className="h-9 w-9 rounded" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="space-y-6">
        <PageHeader 
          title="Contratos" 
          subtitle="Gerencie todos os seus contratos"
        />
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-2 w-full sm:w-auto">
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
                    className="bg-orange-600 hover:bg-orange-700 text-white w-full"
                    onClick={handleCreateContractClick}
                    disabled={checkingPlanLimit}
                  >
                    {checkingPlanLimit ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Plus className="w-4 h-4 mr-2" />
                    )}
                    <span className="hidden sm:inline">Criar Contrato</span>
                    <span className="sm:hidden">Adicionar</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Criar Contrato</TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex w-full sm:max-w-lg gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleSearch();
                  }
                }}
                placeholder="Pesquisar por imóvel, inquilino ou token"
                className="pl-10"
              />
            </div>
            <Button onClick={handleSearch} className="self-stretch">
              Buscar
            </Button>
            {(searchTerm || searchQuery) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearSearch}
                className="self-stretch"
              >
                Limpar
              </Button>
            )}
          </div>
        </div>

        {}
        {visibleContracts && visibleContracts.length > 0 ? (
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
                     {visibleContracts.map((contract: any) => (
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
                              size="icon"
                              variant="outline"
                              onClick={() => handleViewContract(contract)}
                              disabled={loadingDetailId === contract.id.toString()}
                              className="text-orange-600 border-orange-600 hover:bg-orange-50"
                            >
                              {loadingDetailId === contract.id.toString() ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
                            </Button>
                             {canUpdateContracts && contract.status === 'PENDENTE' && (
                              <Button
                                size="icon"
                                variant="outline"
                                onClick={() => handlePrepareForSigning(contract)}
                                disabled={preparingContractId === contract.id.toString()}
                                className="text-green-600 border-green-600 hover:bg-green-50"
                                title="Enviar para assinatura"
                              >
                                {preparingContractId === contract.id.toString() ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                              </Button>
                            )}
                            {canUserSignContract(contract) && (
                              <Button
                                size="icon"
                                variant="outline"
                                onClick={() => handleSignContractFromList(contract)}
                                disabled={signingContractId === contract.id.toString()}
                                className="text-purple-600 border-purple-600 hover:bg-purple-50"
                                title="Assinar contrato"
                              >
                                {signingContractId === contract.id.toString() ? <Loader2 className="w-4 h-4 animate-spin" /> : <PenLine className="w-4 h-4" />}
                              </Button>
                            )}
                             {canUpdateContracts && canEditContract(contract) && (
                              <Button
                                size="icon"
                                variant="outline"
                                onClick={() => handleEditContract(contract)}
                                className="text-blue-600 border-blue-600 hover:bg-blue-50"
                                title="Editar contrato"
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                            )}
                             {contract.pdfPath && (
                              <Button
                                size="icon"
                                variant="outline"
                                onClick={() => handleDownload(contract.id.toString())}
                                className="text-blue-600 border-blue-600 hover:bg-blue-50"
                              >
                                <Download className="w-4 h-4" />
                              </Button>
                            )}
                             {canDeleteContracts && canDeleteContract(contract) && (
                              <Button
                                size="icon"
                                variant="outline"
                                onClick={() => handleDeleteContract(contract)}
                                className="text-red-600 border-red-600 hover:bg-red-50"
                              >
                                <Trash2 className="w-4 h-4" />
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
                 {visibleContracts.map((contract: any) => (
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

                     <div className="flex gap-2 flex-wrap w-full justify-end">
                      <Button
                        size="icon"
                        variant="outline"
                        onClick={() => handleViewContract(contract)}
                        disabled={loadingDetailId === contract.id.toString()}
                        className="text-orange-600 border-orange-600 hover:bg-orange-50"
                      >
                        {loadingDetailId === contract.id.toString() ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
                      </Button>
                       {canUpdateContracts && contract.status === 'PENDENTE' && (
                         <Button
                           size="icon"
                           variant="outline"
                           onClick={() => handlePrepareForSigning(contract)}
                           disabled={preparingContractId === contract.id.toString()}
                           className="text-green-600 border-green-600 hover:bg-green-50"
                           title="Enviar para assinatura"
                         >
                           {preparingContractId === contract.id.toString() ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                         </Button>
                       )}
                       {canUserSignContract(contract) && (
                         <Button
                           size="icon"
                           variant="outline"
                           onClick={() => handleSignContractFromList(contract)}
                           disabled={signingContractId === contract.id.toString()}
                           className="text-purple-600 border-purple-600 hover:bg-purple-50"
                           title="Assinar contrato"
                         >
                           {signingContractId === contract.id.toString() ? <Loader2 className="w-4 h-4 animate-spin" /> : <PenLine className="w-4 h-4" />}
                         </Button>
                       )}
                       {canUpdateContracts && canEditContract(contract) && (
                        <Button
                          size="icon"
                          variant="outline"
                          onClick={() => handleEditContract(contract)}
                          className="text-blue-600 border-blue-600 hover:bg-blue-50"
                          title="Editar contrato"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                      )}
                      {contract.pdfPath && (
                        <Button
                          size="icon"
                          variant="outline"
                          onClick={() => handleDownload(contract.id.toString())}
                          className="text-blue-600 border-blue-600 hover:bg-blue-50"
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                      )}
                      {canDeleteContracts && canDeleteContract(contract) && (
                        <Button
                          size="icon"
                          variant="outline"
                          onClick={() => handleDeleteContract(contract)}
                          className="text-red-600 border-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
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
                              <DropdownMenuItem onClick={() => handleViewContract(contract)} disabled={loadingDetailId === contract.id.toString()}>
                                {loadingDetailId === contract.id.toString() ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Eye className="w-4 h-4 mr-2" />}
                                {loadingDetailId === contract.id.toString() ? 'Carregando...' : 'Visualizar'}
                              </DropdownMenuItem>
                              {canUserSignContract(contract) && (
                                <DropdownMenuItem onClick={() => handleSignContractFromList(contract)} disabled={signingContractId === contract.id.toString()}>
                                  {signingContractId === contract.id.toString() ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <PenLine className="w-4 h-4 mr-2" />}
                                  {signingContractId === contract.id.toString() ? 'Assinando...' : 'Assinar contrato'}
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
                onClick={handleCreateContractClick}
                disabled={checkingPlanLimit}
                className="bg-orange-600 hover:bg-orange-700 text-white"
              >
                {checkingPlanLimit ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4 mr-2" />
                )}
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
                <Label htmlFor="templateId">Modelo de Contrato <span className="text-red-500">*</span></Label>
                <Select
                  value={newContract.templateId || ''}
                  onValueChange={(value) => {
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
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={templatesLoading ? 'Carregando modelos...' : 'Selecione um modelo'} />
                  </SelectTrigger>
                  <SelectContent>
                    {templates
                      .filter((template: any) =>
                        !template.allowedUserTypes ||
                        template.allowedUserTypes.some((type: string) => allowedUserTypes.includes(type as ContractUserType))
                      )
                      .filter((template: any, index: number, self: any[]) => 
                        index === self.findIndex((t: any) => t.id === template.id)
                      )
                      .map((template: any) => (
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
                      {properties
                        .filter(p => !p.isFrozen)
                        .filter((property) => {
                          // Only show properties with status DISPONIVEL
                          if (!property || !property.status) return false;
                          const status = String(property.status).toUpperCase().trim();
                          return status === 'DISPONIVEL' || status === 'AVAILABLE';
                        })
                        .map((property) => {
                          const propId = property.id?.toString() || String(property.id);
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
                    disabled={!newContract.propertyId}
                  >
                    <SelectTrigger className="[&>span]:text-left [&>span]:truncate">
                      <SelectValue placeholder={newContract.propertyId ? "Selecione um inquilino" : "Selecione um imóvel primeiro"} />
                    </SelectTrigger>
                    <SelectContent>
                      {(() => {
                        // Filter tenants based on selected property
                        const selectedProperty = properties.find(p => {
                          const pId = p.id?.toString() || String(p.id);
                          const vId = newContract.propertyId?.toString() || String(newContract.propertyId);
                          return pId === vId;
                        });

                        let filteredTenants = tenants;

                        // If property has a tenantId, show only that tenant
                        if (selectedProperty?.tenantId) {
                          const propertyTenantId = selectedProperty.tenantId?.toString() || String(selectedProperty.tenantId);
                          filteredTenants = tenants.filter((tenant: any) => {
                            const tenantId = tenant.id?.toString() || String(tenant.id);
                            return tenantId === propertyTenantId;
                          });
                        }

                        if (filteredTenants.length === 0) {
                          return (
                            <div className="p-4 text-sm text-muted-foreground text-center">
                              {selectedProperty?.tenantId 
                                ? "Nenhum inquilino encontrado para este imóvel"
                                : "Selecione um imóvel primeiro"}
                            </div>
                          );
                        }

                        return filteredTenants.map((tenant: any) => {
                        const tenantId = tenant.id?.toString() || String(tenant.id);
                        return (
                          <SelectItem
                            key={tenantId}
                            value={tenantId}
                            disabled={tenant.isFrozen}
                            className={tenant.isFrozen ? 'opacity-50' : ''}
                          >
                            {tenant.name || tenant.email || 'Sem nome'}
                            {tenant.isFrozen && <span className="ml-2 text-xs text-red-500">(Congelado)</span>}
                          </SelectItem>
                        );
                        });
                      })()}
                    </SelectContent>
                  </Select>
                  {newContract.propertyId && (() => {
                    const selectedProperty = properties.find(p => {
                      const pId = p.id?.toString() || String(p.id);
                      const vId = newContract.propertyId?.toString() || String(newContract.propertyId);
                      return pId === vId;
                    });
                    if (selectedProperty?.tenantId) {
                      return (
                        <p className="text-xs text-muted-foreground mt-1">
                          Mostrando apenas o inquilino vinculado a este imóvel
                        </p>
                      );
                    }
                    return null;
                  })()}
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
                  <Label htmlFor="deposit">Depósito <span className="text-red-500">*</span></Label>
                  <Input
                    id="deposit"
                    name="deposit"
                    type="number"
                    step="0.01"
                    min="0"
                    value={newContract.deposit}
                    onChange={handleInputChange}
                    placeholder="0.00"
                    required
                  />
                  {newContract.deposit && newContract.monthlyRent && (
                    <p className={`text-xs mt-1 ${
                      parseFloat(newContract.deposit) > parseFloat(newContract.monthlyRent || '0')
                        ? 'text-green-600'
                        : 'text-red-600'
                    }`}>
                      {parseFloat(newContract.deposit) > parseFloat(newContract.monthlyRent || '0')
                        ? '✓ Depósito maior que o valor do aluguel'
                        : '⚠ Depósito deve ser maior que o valor do aluguel'}
                    </p>
                  )}
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

              {selectedTemplate?.id === 'contrato-locacao-residencial-padrao' && (
                <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
                  <h4 className="font-semibold text-sm">FIADOR</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="guarantorName">Nome Completo</Label>
                      <Input
                        id="guarantorName"
                        name="guarantorName"
                        value={newContract.guarantorName}
                        onChange={handleInputChange}
                        placeholder="Nome completo do fiador"
                      />
                    </div>
                    <DocumentInput
                      value={newContract.guarantorDocument}
                      onChange={(value) => {
                        setNewContract(prev => ({ ...prev, guarantorDocument: value }));
                        const cpf = value.replace(/\D/g, '');
                        if (cpf.length >= 11) {
                          const foundUser = tenants.find((t: any) =>
                            t.document?.replace(/\D/g, '') === cpf
                          );
                          if (foundUser) {
                            const address = [
                              foundUser.address,
                              foundUser.addressNumber,
                              foundUser.complement,
                              foundUser.neighborhood,
                              foundUser.city,
                              foundUser.state,
                              foundUser.zipCode
                            ].filter(Boolean).join(', ');
                            setNewContract(prev => ({
                              ...prev,
                              guarantorAddress: address || prev.guarantorAddress,
                              guarantorName: foundUser.name || prev.guarantorName,
                              guarantorRg: foundUser.rg || prev.guarantorRg,
                              guarantorProfession: foundUser.profession || prev.guarantorProfession,
                              guarantorCep: foundUser.zipCode || foundUser.cep || prev.guarantorCep,
                            }));
                          }
                        }
                      }}
                      label="CPF"
                      placeholder="000.000.000-00"
                      showValidation={true}
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <RGInput
                      value={newContract.guarantorRg}
                      onChange={(value) => setNewContract(prev => ({ ...prev, guarantorRg: value }))}
                      label="RG *"
                      placeholder="00.000.000-0"
                      showValidation={true}
                    />
                    <div>
                      <Label htmlFor="guarantorProfession">Profissão</Label>
                      <Input
                        id="guarantorProfession"
                        name="guarantorProfession"
                        value={newContract.guarantorProfession}
                        onChange={handleInputChange}
                        placeholder="Profissão do fiador"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <CEPInput
                      value={newContract.guarantorCep}
                      onChange={(v: string) => setNewContract(prev => ({ ...prev, guarantorCep: v }))}
                      onCEPData={handleGuarantorCEPData}
                      placeholder="00000-000"
                    />
                    <div>
                      <Label htmlFor="guarantorAddress">Endereço</Label>
                      <Input
                        id="guarantorAddress"
                        name="guarantorAddress"
                        value={newContract.guarantorAddress}
                        onChange={handleInputChange}
                        placeholder="Endereço completo do fiador"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-between gap-2">
                {selectedTemplate && previewContent && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsCreatePreview(true);
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
                  <Button type="submit" className="bg-primary hover:bg-primary/90" disabled={creating || !isCreateFormValid}>
                    {creating ? 'Criando...' : 'Criar'}
                  </Button>
                </div>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {}
        <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Editar contrato</DialogTitle>
              <DialogDescription>Atualize os dados do contrato abaixo.</DialogDescription>
            </DialogHeader>
            {loadingEditContract ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-10 w-full" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                </div>
                <div className="p-4 border rounded-lg bg-muted/30 space-y-4">
                  <Skeleton className="h-5 w-48" />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-10 w-full" />
                    </div>
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-28" />
                      <Skeleton className="h-10 w-full" />
                    </div>
                  </div>
                </div>
                <div className="p-4 border rounded-lg bg-muted/30 space-y-4">
                  <Skeleton className="h-5 w-40" />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-36" />
                      <Skeleton className="h-10 w-full" />
                    </div>
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-40" />
                      <Skeleton className="h-10 w-full" />
                    </div>
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Skeleton className="h-10 w-24" />
                  <Skeleton className="h-10 w-32" />
                </div>
              </div>
            ) : (
            <form className="space-y-4" onSubmit={handleUpdateContract}>
              {}
              <div>
                <Label htmlFor="edit-templateId">Modelo de Contrato</Label>
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
                    <SelectItem value="none" hidden>Sem modelo (padrão)</SelectItem>
                    {templates
                      .filter((template: any) =>
                        !template.allowedUserTypes ||
                        template.allowedUserTypes.some((type: string) => allowedUserTypes.includes(type as ContractUserType))
                      )
                      .filter((template: any, index: number, self: any[]) => 
                        index === self.findIndex((t: any) => t.id === template.id)
                      )
                      .map((template: any) => (
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-propertyId">Imóvel</Label>
                  <Select
                    value={newContract.propertyId}
                    disabled={true}
                  >
                    <SelectTrigger className="[&>span]:text-left [&>span]:truncate bg-muted">
                      <SelectValue placeholder="Selecione um imóvel" />
                    </SelectTrigger>
                    <SelectContent>
                      {properties
                        .filter(p => {
                          const pId = p.id?.toString() || String(p.id);
                          return pId === newContract.propertyId;
                        })
                        .map((property) => {
                          const propId = property.id?.toString() || String(property.id);
                          return (
                            <SelectItem key={propId} value={propId}>
                              {property.name || property.address || `Imóvel ${propId}`}
                            </SelectItem>
                          );
                        })}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">O imóvel não pode ser alterado após a criação do contrato</p>
                </div>
                <div>
                  <Label htmlFor="edit-tenantId">Locatário</Label>
                  <Select
                    value={newContract.tenantId}
                    onValueChange={(value) => setNewContract(prev => ({ ...prev, tenantId: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um locatário" />
                    </SelectTrigger>
                    <SelectContent>
                      {tenants.map((tenant: any) => {
                        const tenantId = tenant.id?.toString() || String(tenant.id);
                        return (
                          <SelectItem key={tenantId} value={tenantId}>
                            {tenant.name || tenant.email || 'Sem nome'}
                            {tenant.isFrozen && <span className="ml-2 text-xs text-red-500">(Congelado)</span>}
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
                    value={newContract.startDate}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="edit-endDate">Data de término</Label>
                  <Input
                    id="edit-endDate"
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
                  <Label htmlFor="edit-monthlyRent">Valor do aluguel</Label>
                  <Input
                    id="edit-monthlyRent"
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
                  <Label htmlFor="edit-deposit">Depósito</Label>
                  <Input
                    id="edit-deposit"
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
                  <Label htmlFor="edit-dueDay">Dia de Vencimento <span className="text-red-500">*</span></Label>
                  <Input
                    id="edit-dueDay"
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
                  <Label htmlFor="edit-contractDate">Data do Contrato <span className="text-red-500">*</span></Label>
                  <Input
                    id="edit-contractDate"
                    name="contractDate"
                    type="date"
                    value={newContract.contractDate}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </div>

              <div className="p-4 border rounded-lg bg-muted/30">
                <h4 className="font-semibold mb-3 text-sm">Cláusula 3 - Índice de Reajuste Anual</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit-readjustmentIndex">Índice de Reajuste <span className="text-red-500">*</span></Label>
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
                      <Label htmlFor="edit-customReadjustmentIndex">Especificar Índice</Label>
                      <Input
                        id="edit-customReadjustmentIndex"
                        name="customReadjustmentIndex"
                        value={newContract.customReadjustmentIndex}
                        onChange={handleInputChange}
                        placeholder="Ex: Taxa Referencial"
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="p-4 border rounded-lg bg-muted/30">
                <h4 className="font-semibold mb-3 text-sm">Multas e Juros por Atraso</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit-latePaymentPenaltyPercent">Multa por Atraso (%) <span className="text-red-500">*</span></Label>
                    <Input
                      id="edit-latePaymentPenaltyPercent"
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
                    <Label htmlFor="edit-monthlyInterestPercent">Juros de Mora Mensal (%) <span className="text-red-500">*</span></Label>
                    <Input
                      id="edit-monthlyInterestPercent"
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

              <div className="p-4 border rounded-lg bg-muted/30">
                <h4 className="font-semibold mb-3 text-sm">Cláusula 7 - Multa por Rescisão Antecipada</h4>
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="edit-terminationType"
                        checked={!newContract.useFixedTerminationValue}
                        onChange={() => setNewContract(prev => ({ ...prev, useFixedTerminationValue: false }))}
                        className="w-4 h-4"
                      />
                      <span className="text-sm">Baseada em meses de aluguel</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="edit-terminationType"
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
                        <Label htmlFor="edit-earlyTerminationPenaltyMonths">Quantidade de Meses de Aluguel</Label>
                        <Input
                          id="edit-earlyTerminationPenaltyMonths"
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
                        <Label htmlFor="edit-earlyTerminationFixedValue">Valor Fixo</Label>
                        <Input
                          id="edit-earlyTerminationFixedValue"
                          name="earlyTerminationFixedValue"
                          type="number"
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-guaranteeType">Tipo de Garantia <span className="text-red-500">*</span></Label>
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
                  <Label htmlFor="edit-jurisdiction">Foro (Comarca) <span className="text-red-500">*</span></Label>
                  <Input
                    id="edit-jurisdiction"
                    name="jurisdiction"
                    value={newContract.jurisdiction}
                    onChange={handleInputChange}
                    placeholder="Ex: São Paulo - SP"
                    required
                  />
                  <p className="text-xs text-muted-foreground mt-1">Cidade onde serão resolvidas questões legais</p>
                </div>
              </div>


              {selectedTemplate?.id === 'contrato-locacao-residencial-padrao' && (
                <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
                  <h4 className="font-semibold text-sm">FIADOR</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="edit-guarantorName">Nome Completo</Label>
                      <Input
                        id="edit-guarantorName"
                        name="guarantorName"
                        value={newContract.guarantorName}
                        onChange={handleInputChange}
                        placeholder="Nome completo do fiador"
                      />
                    </div>
                    <DocumentInput
                      value={newContract.guarantorDocument}
                      onChange={(value) => {
                        setNewContract(prev => ({ ...prev, guarantorDocument: value }));
                      }}
                      placeholder="CPF do fiador"
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <RGInput
                      value={newContract.guarantorRg}
                      onChange={(v: string) => setNewContract(prev => ({ ...prev, guarantorRg: v }))}
                      placeholder="RG do fiador"
                    />
                    <div>
                      <Label htmlFor="edit-guarantorProfession">Profissão</Label>
                      <Input
                        id="edit-guarantorProfession"
                        name="guarantorProfession"
                        value={newContract.guarantorProfession}
                        onChange={handleInputChange}
                        placeholder="Profissão do fiador"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <CEPInput
                      value={newContract.guarantorCep}
                      onChange={(v: string) => setNewContract(prev => ({ ...prev, guarantorCep: v }))}
                      onCEPData={handleGuarantorCEPData}
                      placeholder="00000-000"
                    />
                    <div>
                      <Label htmlFor="edit-guarantorAddress">Endereço</Label>
                      <Input
                        id="edit-guarantorAddress"
                        name="guarantorAddress"
                        value={newContract.guarantorAddress}
                        onChange={handleInputChange}
                        placeholder="Endereço completo do fiador"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-between gap-2">
                {selectedTemplate && previewContent && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsCreatePreview(true);
                      setShowEditModal(false);
                      setShowPreviewModal(true);
                    }}
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    Visualizar Prévia
                  </Button>
                )}
                <div className="flex gap-2 ml-auto">
                  <Button type="button" variant="outline" onClick={() => setShowEditModal(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={updating}>
                    {updating ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Atualizando...
                      </>
                    ) : (
                      <>
                        <Edit className="w-4 h-4 mr-2" />
                        Atualizar Contrato
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </form>
            )}
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
              {!isCreatePreview && previewContent && (
                <div className="flex gap-2">
                  {selectedContract && canUserSignContract(selectedContract) && (
                    <Button
                      variant="default"
                      size="sm"
                      onClick={handleSignContract}
                      disabled={signingContractId !== null}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                      {signingContractId !== null ? 'Assinando...' : 'Assinar digitalmente'}
                    </Button>
                  )}
                  <Button variant="ghost" size="icon" onClick={handleDownloadPreviewPDF} disabled={downloadingPdfId !== null} title="Baixar PDF">
                    {downloadingPdfId !== null ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
                  </Button>
                  <Button variant="ghost" size="icon" onClick={handlePrintPreview} disabled={printing} title="Imprimir">
                    {printing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Printer className="w-5 h-5" />}
                  </Button>
                </div>
              )}
            </DialogHeader>
            {previewContent ? (
              <div id="contract-preview-content" className="space-y-4">
                {}
                <div className="flex justify-center items-center mb-4">
                  <img 
                    src="/contract.png" 
                    alt="Contrato" 
                    className="max-w-full h-auto max-h-16 object-contain"
                    onError={(e) => {
                      // Hide image if it fails to load
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                </div>
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
                      {(() => {
                        const resolvedCreci = selectedContract
                          ? (
                            selectedContract.creci ||
                            formatCreci(selectedContract.agency?.creci) ||
                            agencyData?.creci ||
                            user?.creci ||
                            ''
                          )
                          : (newContract.creci || formatCreci(agencyData?.creci) || user?.creci || '');
                        const isMissing = !resolvedCreci;
                        return (
                          <span className={isMissing ? 'text-red-500 font-semibold' : ''}>
                            {resolvedCreci || '⚠️ OBRIGATÓRIO'}
                          </span>
                        );
                      })()}
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
                </div>

                {}
                <div className="bg-muted p-3 sm:p-4 rounded-lg border">
                  <h3 className="font-semibold mb-3">Assinaturas</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="flex flex-col items-center p-3 bg-white rounded-lg border">
                      {(selectedContract || contractDetail)?.tenantSignature ? (
                        <>
                          <img 
                            src={(selectedContract || contractDetail).tenantSignature} 
                            alt="Assinatura do Inquilino" 
                            className="w-32 h-16 object-contain mb-2 border rounded"
                          />
                          <p className="font-medium text-sm mb-1">Inquilino</p>
                          <Badge variant="default" className="text-xs mb-1">
                            Assinado
                          </Badge>
                          {(selectedContract || contractDetail)?.tenantSignedAt && (
                            <p className="text-xs text-muted-foreground">
                              {new Date((selectedContract || contractDetail).tenantSignedAt).toLocaleDateString('pt-BR')}
                            </p>
                          )}
                        </>
                      ) : (
                        <>
                          <PenLine className="w-6 h-6 text-muted-foreground mb-2" />
                          <p className="font-medium text-sm mb-1">Inquilino</p>
                          <Badge variant="secondary" className="text-xs">
                            Pendente
                          </Badge>
                        </>
                      )}
                    </div>
                    <div className="flex flex-col items-center p-3 bg-white rounded-lg border">
                      {(selectedContract || contractDetail)?.ownerSignature ? (
                        <>
                          <img 
                            src={(selectedContract || contractDetail).ownerSignature} 
                            alt="Assinatura do Proprietário" 
                            className="w-32 h-16 object-contain mb-2 border rounded"
                          />
                          <p className="font-medium text-sm mb-1">Proprietário</p>
                          <Badge variant="default" className="text-xs mb-1">
                            Assinado
                          </Badge>
                          {(selectedContract || contractDetail)?.ownerSignedAt && (
                            <p className="text-xs text-muted-foreground">
                              {new Date((selectedContract || contractDetail).ownerSignedAt).toLocaleDateString('pt-BR')}
                            </p>
                          )}
                        </>
                      ) : (
                        <>
                          <PenLine className="w-6 h-6 text-muted-foreground mb-2" />
                          <p className="font-medium text-sm mb-1">Proprietário</p>
                          <Badge variant="secondary" className="text-xs">
                            Pendente
                          </Badge>
                        </>
                      )}
                    </div>
                    <div className="flex flex-col items-center p-3 bg-white rounded-lg border">
                      {(selectedContract || contractDetail)?.agencySignature ? (
                        <>
                          <img 
                            src={(selectedContract || contractDetail).agencySignature} 
                            alt="Assinatura da Agência" 
                            className="w-32 h-16 object-contain mb-2 border rounded"
                          />
                          <p className="font-medium text-sm mb-1">Agência</p>
                          <Badge variant="default" className="text-xs mb-1">
                            Assinado
                          </Badge>
                          {(selectedContract || contractDetail)?.agencySignedAt && (
                            <p className="text-xs text-muted-foreground">
                              {new Date((selectedContract || contractDetail).agencySignedAt).toLocaleDateString('pt-BR')}
                            </p>
                          )}
                        </>
                      ) : (
                        <>
                          <PenLine className="w-6 h-6 text-muted-foreground mb-2" />
                          <p className="font-medium text-sm mb-1">Agência</p>
                          <Badge variant="secondary" className="text-xs">
                            Pendente
                          </Badge>
                        </>
                      )}
                    </div>
                  </div>
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
                  {previewContent.includes('<img') || previewContent.includes('<div') || previewContent.includes('<p') ? (
                    <div 
                      className="text-sm leading-relaxed" 
                      style={{ wordBreak: 'normal', overflowWrap: 'normal', hyphens: 'none' }}
                      dangerouslySetInnerHTML={{ 
                        __html: previewContent
                      }}
                    />
                  ) : (
                    <div className="text-sm leading-relaxed" style={{ wordBreak: 'normal', overflowWrap: 'normal', hyphens: 'none' }}>
                      {previewContent.split('\n').map((line, index) => {
                        const isSeparator = line.trim().match(/^[─═-]{20,}$/);
                        if (isSeparator) {
                          return (
                            <div key={index} className="my-4">
                              <hr className="border-t border-gray-400 w-full" />
                            </div>
                          );
                        }

                        const isContractTitle = line.startsWith('CONTRATO') && line.includes('–');
                        if (isContractTitle) {
                          return (
                            <p key={index} className="font-bold my-4" style={{ wordBreak: 'normal', overflowWrap: 'normal', whiteSpace: 'normal', fontSize: '17px' }}>
                              {line}
                            </p>
                          );
                        }

                        const isSectionTitle = line.startsWith('**') && line.endsWith('**');
                        const isBold = isSectionTitle || line.includes('CLÁUSULA');
                        const cleanLine = line.replace(/\*\*/g, '');

                        if (isSectionTitle) {
                          return (
                            <p key={index} className="font-bold my-3 text-base" style={{ wordBreak: 'normal', overflowWrap: 'normal', whiteSpace: 'normal', fontSize: '15px' }}>
                              {cleanLine}
                            </p>
                          );
                        }

                        return (
                          <p key={index} className={isBold ? 'font-bold my-2' : 'my-1'} style={{ wordBreak: 'normal', overflowWrap: 'normal', whiteSpace: 'normal' }}>
                            {cleanLine}
                          </p>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8">
                Selecione um modelo de contrato e preencha os dados para visualizar a prévia
              </p>
            )}
            <div className="flex justify-end mt-5">
              <Button variant="outline" onClick={() => setShowPreviewModal(false)}>
                Fechar
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {}

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
            {contractToDelete && (
              <div className="mt-4 space-y-2">
                {contractToDelete.status && contractToDelete.status !== 'RASCUNHO' && contractToDelete.status !== 'PENDENTE' && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-sm">
                    <p className="font-medium">Atenção: Contrato com status "{contractToDelete.status}"</p>
                    <p className="text-xs mt-1">
                      Este contrato possui histórico importante. Ao excluir, todos os dados relacionados (pagamentos, faturas, vistorias) serão desvinculados.
                    </p>
                  </div>
                )}
                {contractToDelete.token && (
                  <div className="text-sm text-muted-foreground">
                    <strong>Token:</strong> {contractToDelete.token}
                  </div>
                )}
              </div>
            )}
            <div className="flex flex-row gap-2 mt-4">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setContractToDelete(null)}
                disabled={deleteContractMutation.isPending}
              >
                Cancelar
              </Button>
              <Button
                onClick={confirmDelete}
                disabled={deleteContractMutation.isPending}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white"
              >
                {deleteContractMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Excluindo...
                  </>
                ) : (
                  'Excluir'
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Sign Contract Modal */}
        <Dialog open={showSignModal} onOpenChange={(open) => !open && closeSignModal()}>
          <DialogContent className="w-[calc(100%-2rem)] sm:max-w-lg rounded-xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <PenLine className="w-5 h-5 text-green-600" />
                Assinar Contrato
              </DialogTitle>
              <DialogDescription>
                Assinatura como: <strong>{getSignTypeLabel(signContractData.type)}</strong>
              </DialogDescription>
            </DialogHeader>
            {signContractData.contract && (
              <div className="space-y-4">
                <div className="bg-muted p-3 rounded-lg space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Imóvel:</span>
                    <span className="font-medium truncate ml-2">
                      {signContractData.contract.property?.name || signContractData.contract.property?.address || '-'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Aluguel:</span>
                    <span className="font-medium">
                      {signContractData.contract.monthlyRent
                        ? formatCurrency(parseFloat(signContractData.contract.monthlyRent))
                        : '-'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Período:</span>
                    <span className="font-medium">
                      {formatDate(signContractData.contract.startDate)} - {formatDate(signContractData.contract.endDate)}
                    </span>
                  </div>
                </div>

                <SignatureCapture
                  onSignatureChange={setSignature}
                  onGeolocationConsent={handleGeoConsentChange}
                  geolocationRequired={isSecureOrigin()}
                  label="Desenhe sua assinatura"
                  disabled={signingContractId !== null}
                />

                {geoLocation && (
                  <div className="text-xs text-green-600 flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" />
                    Localização capturada: {geoLocation.lat.toFixed(6)}, {geoLocation.lng.toFixed(6)}
                  </div>
                )}

                {!isSecureOrigin() && (
                  <div className="text-xs text-amber-600 flex items-center gap-1">
                    <Lock className="w-3 h-3" />
                    Geolocalização indisponível (requer HTTPS)
                  </div>
                )}

                <div className="flex flex-row gap-2 pt-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={closeSignModal}
                    disabled={signingContractId !== null}
                  >
                    Cancelar
                  </Button>
                  <Button
                    className="flex-1 bg-green-600 hover:bg-green-700"
                    onClick={confirmSign}
                    disabled={signingContractId !== null || !signature || (isSecureOrigin() && !geoConsent)}
                  >
                    {signingContractId !== null ? 'Assinando...' : 'Confirmar Assinatura'}
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Upgrade Plan Modal */}
        <Dialog open={showUpgradeModal} onOpenChange={setShowUpgradeModal}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-amber-600">
                <AlertTriangle className="w-6 h-6" />
                Limite do Plano Atingido
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="flex items-center justify-center py-4">
                <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center">
                  <Crown className="w-8 h-8 text-amber-600" />
                </div>
              </div>

              <div className="text-center space-y-2">
                <p className="text-lg font-semibold text-gray-900">
                  Você atingiu o limite do plano
                </p>
                <p className="text-sm text-muted-foreground">
                  {upgradeErrorMessage || 'Você atingiu o limite de contratos do seu plano atual.'}
                </p>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-2">
                <p className="text-sm font-medium text-green-800">
                  Faça upgrade para desbloquear:
                </p>
                <ul className="text-sm text-green-700 space-y-1">
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                    Mais contratos
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                    Mais imóveis
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                    Mais inquilinos
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                    Recursos avançados
                  </li>
                </ul>
              </div>

              <p className="text-center text-sm text-muted-foreground">
                Deseja fazer upgrade do seu plano agora?
              </p>
            </div>

            <div className="flex justify-end gap-2 mt-4">
              <Button
                variant="outline"
                onClick={() => setShowUpgradeModal(false)}
              >
                Cancelar
              </Button>
              <Button
                className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white"
                onClick={() => {
                  setShowUpgradeModal(false);
                  if (isAgencyUser) {
                    navigate('/dashboard/agency-plan-config');
                  } else if (isIndependentOwner) {
                    navigate('/dashboard/owner-plan-config');
                  } else {
                    navigate('/dashboard/plans');
                  }
                }}
              >
                <Crown className="w-4 h-4 mr-2" />
                Fazer Upgrade
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}
