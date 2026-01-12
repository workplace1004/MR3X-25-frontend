import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { dashboardAPI, contractsAPI, contractTemplatesAPI } from '../../api';
import { formatCurrency, formatDate } from '../../lib/utils';
import { useState, useMemo, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import {
  FileText, Calendar, DollarSign, Download, CheckCircle,
  User,
  PenLine, Lock, Eye, Printer, Loader2,
  List, Grid3X3, Search, MoreHorizontal
} from 'lucide-react';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
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
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../../components/ui/dialog';
import { SignatureCapture } from '../../components/contracts/SignatureCapture';
import { safeGetCurrentPosition, isSecureOrigin } from '../../hooks/use-geolocation';
import { QRCodeSVG } from 'qrcode.react';
import Barcode from 'react-barcode';
import html2canvas from 'html2canvas-pro';
import { jsPDF } from 'jspdf';

const formatCreci = (creci?: string | null): string => {
  if (!creci) return '';
  const cleaned = creci.replace(/\D/g, '');
  if (cleaned.length >= 5) {
    return cleaned.replace(/(\d{5})(\d{2})(\d{2})/, '$1-$2/$3');
  }
  return creci;
};


export function TenantContract() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [signature, setSignature] = useState<string | null>(null);
  const [geoConsent, setGeoConsent] = useState(false);
  const [geoLocation, setGeoLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [signing, setSigning] = useState(false);
  const [_viewingContract, setViewingContract] = useState(false);
  const [contractPreview, setContractPreview] = useState<string>('');
  const [previewToken, setPreviewToken] = useState<string>('');
  const [fullContractData, setFullContractData] = useState<any>(null);
  const [printing, setPrinting] = useState(false);
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingDetailId, setLoadingDetailId] = useState<string | null>(null);
  const [signingContractId, setSigningContractId] = useState<string | null>(null);
  const [signContractData, setSignContractData] = useState<{ contract: any; type: 'tenant' | 'owner' | 'agency' | null }>({ contract: null, type: null });

  const { data: contracts, isLoading: contractsLoading } = useQuery({
    queryKey: ['contracts', user?.id ?? 'anonymous', user?.role ?? 'unknown', user?.agencyId ?? 'none', user?.brokerId ?? 'none', searchQuery],
    queryFn: () => contractsAPI.getContracts(searchQuery ? { search: searchQuery } : undefined),
  });

  const { isLoading: dashboardLoading } = useQuery({
    queryKey: ['tenant-dashboard', user?.id],
    queryFn: () => dashboardAPI.getDashboard(),
    enabled: !!contracts, // Only fetch dashboard if we have contracts
  });

  const isLoading = contractsLoading || dashboardLoading;

  const handleSearch = useCallback(() => {
    setSearchQuery(searchTerm.trim());
  }, [searchTerm]);

  const handleClearSearch = useCallback(() => {
    setSearchTerm('');
    setSearchQuery('');
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ATIVO':
        return <Badge className="bg-green-500 text-white">Ativo</Badge>;
      case 'PENDENTE':
        return <Badge className="bg-yellow-500 text-white">Pendente</Badge>;
      case 'AGUARDANDO_ASSINATURAS':
        return <Badge className="bg-yellow-500 text-white">Aguardando Assinaturas</Badge>;
      case 'ASSINADO':
        return <Badge className="bg-blue-500 text-white">Assinado</Badge>;
      case 'ENCERRADO':
        return <Badge className="bg-gray-500 text-white">Encerrado</Badge>;
      default:
        return <Badge className="bg-gray-500 text-white">{status}</Badge>;
    }
  };

  // Filter contracts based on search
  const visibleContracts = useMemo(() => {
    if (!contracts || contracts.length === 0) return [];
    if (!searchQuery) return contracts;
    
    const query = searchQuery.toLowerCase();
    return contracts.filter((c: any) => {
      const propertyName = (c.property?.name || c.property?.address || '').toLowerCase();
      const tenantName = (c.tenantUser?.name || '').toLowerCase();
      const token = (c.contractToken || '').toLowerCase();
      return propertyName.includes(query) || tenantName.includes(query) || token.includes(query);
    });
  }, [contracts, searchQuery]);

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

  const signContractMutation = useMutation({
    mutationFn: async (contractId: string) => {
      if (!signature) throw new Error('Assinatura necessaria');
      return contractsAPI.signContractWithGeo(contractId, {
        signature,
        signatureType: 'tenant',
        geoLat: geoLocation?.lat,
        geoLng: geoLocation?.lng,
        geoConsent: geoConsent,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      queryClient.invalidateQueries({ queryKey: ['tenant-dashboard'] });
      setShowSignatureModal(false);
      setSignature(null);
      setGeoConsent(false);
      setGeoLocation(null);
      toast.success('Contrato assinado com sucesso!');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || error?.message || 'Erro ao assinar contrato');
    },
  });

  const handleDownloadContract = async () => {
    // If preview is not loaded, load it first
    if (!contractPreview || !fullContractData) {
      // Get contract from fullContractData or first contract
      const contractToDownload = fullContractData || (contracts && contracts.length > 0 ? contracts[0] : null);
      if (!contractToDownload?.id) {
        toast.error('Contrato não encontrado');
        return;
      }
      
      // Load contract preview first
      try {
        setViewingContract(true);
        const fullContract = await contractsAPI.getContractById(contractToDownload.id);
        setFullContractData(fullContract);
        
        if (fullContract?.contentSnapshot) {
          setContractPreview(fullContract.contentSnapshot);
          setPreviewToken(fullContract.contractToken || '');
        } else if (fullContract?.templateId) {
          try {
            const template = await contractTemplatesAPI.getTemplateById(fullContract.templateId.toString());
            if (template) {
              let content = template.content || '';
              const replacements: Record<string, string> = {
                NOME_LOCATARIO: fullContract.tenantUser?.name || '',
                CPF_LOCATARIO: fullContract.tenantUser?.document?.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4') || '',
                ENDERECO_LOCATARIO: [
                  fullContract.tenantUser?.address,
                  fullContract.tenantUser?.number,
                  fullContract.tenantUser?.complement,
                  fullContract.tenantUser?.neighborhood,
                  fullContract.tenantUser?.city,
                  fullContract.tenantUser?.state,
                  fullContract.tenantUser?.cep
                ].filter(Boolean).join(', ') || '',
                NOME_LOCADOR: fullContract.ownerUser?.name || fullContract.property?.owner?.name || '',
                CPF_LOCADOR: fullContract.ownerUser?.document?.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4') || '',
                VALOR_ALUGUEL: formatCurrency(Number(fullContract.monthlyRent) || 0),
                DATA_INICIO: fullContract.startDate ? new Date(fullContract.startDate).toLocaleDateString('pt-BR') : '',
                DATA_TERMINO: fullContract.endDate ? new Date(fullContract.endDate).toLocaleDateString('pt-BR') : '',
              };
              
              Object.keys(replacements).forEach(key => {
                content = content.replace(new RegExp(key, 'g'), replacements[key]);
              });
              
              setContractPreview(content);
              setPreviewToken(fullContract.contractToken || '');
            }
          } catch (templateError) {
            console.warn('Could not fetch template:', templateError);
            toast.error('Preview do contrato não disponível');
            setViewingContract(false);
            return;
          }
        } else {
          toast.error('Preview do contrato não disponível');
          setViewingContract(false);
          return;
        }
      } catch (error: any) {
        console.error('Error loading contract:', error);
        toast.error(error?.message || 'Erro ao carregar contrato');
        setViewingContract(false);
        return;
      } finally {
        setViewingContract(false);
      }
    }

    // Wait a bit for the DOM to update if we just loaded the preview
    await new Promise(resolve => setTimeout(resolve, 100));

    let element = document.getElementById('contract-preview-content');
    
    // If element doesn't exist in modal, create a hidden element to render the preview
    if (!element) {
      // Create a hidden container to render the preview content
      const hiddenContainer = document.createElement('div');
      hiddenContainer.id = 'contract-preview-content-hidden';
      hiddenContainer.style.position = 'absolute';
      hiddenContainer.style.left = '-9999px';
      hiddenContainer.style.top = '0';
      hiddenContainer.style.width = '800px';
      hiddenContainer.style.visibility = 'hidden';
      hiddenContainer.style.pointerEvents = 'none';
      document.body.appendChild(hiddenContainer);

      // Render the preview content in the hidden container
      const contractToRender = fullContractData;
      const resolvedCreci = contractToRender?.creci ||
        formatCreci(contractToRender?.agency?.creci) ||
        contractToRender?.agency?.creci ||
        formatCreci(contractToRender?.property?.agency?.creci) ||
        contractToRender?.property?.agency?.creci ||
        user?.creci ||
        '';

      const securityInfo = `
        <div class="bg-muted p-3 sm:p-4 rounded-lg border">
          <h3 class="font-semibold mb-3">Informações de Segurança</h3>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 text-sm">
            <div class="break-all sm:break-normal">
              <span class="font-medium">Token:</span>
              <span class="font-mono text-xs">${previewToken || contractToRender?.contractToken || '-'}</span>
            </div>
            <div>
              <span class="font-medium">CRECI:</span>
              <span>${resolvedCreci || '⚠️ OBRIGATÓRIO'}</span>
            </div>
            <div>
              <span class="font-medium">Data/Hora:</span>
              <span class="font-mono text-xs">${new Date().toLocaleString('pt-BR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
              })}</span>
            </div>
            <div class="sm:col-span-2 break-all">
              <span class="font-medium">Hash:</span>
              <span class="font-mono text-xs">${contractToRender?.contentHash || `SHA256:${previewToken ? btoa(previewToken) : '---'}`}</span>
            </div>
          </div>
        </div>
      `;

      // Generate QR Code and Barcode HTML (simplified - will be captured by html2canvas)
      const token = previewToken || contractToRender?.contractToken || 'DRAFT';
      
      const contractContentHtml = contractPreview.split('\n').map((line) => {
        const isSeparator = line.trim().match(/^[─═\-]{20,}$/);
        if (isSeparator) {
          return '<hr class="border-t border-gray-400 w-full my-4" />';
        }
        const isContractTitle = line.startsWith('CONTRATO') && line.includes('–');
        if (isContractTitle) {
          return `<p class="font-bold my-4" style="font-size: 17px;">${line}</p>`;
        }
        const isSectionTitle = line.startsWith('**') && line.endsWith('**');
        const isBold = isSectionTitle || line.includes('CLÁUSULA');
        const cleanLine = line.replace(/\*\*/g, '');
        if (isSectionTitle) {
          return `<p class="font-bold my-3 text-base" style="font-size: 15px;">${cleanLine}</p>`;
        }
        return `<p class="${isBold ? 'font-bold my-2' : 'my-1'}">${cleanLine}</p>`;
      }).join('');

      hiddenContainer.innerHTML = `
        <div id="contract-preview-content" class="space-y-4">
          ${securityInfo}
          <div class="flex flex-col sm:flex-row items-center justify-center p-3 sm:p-4 bg-white border rounded-lg gap-4 sm:gap-6">
            <div class="flex-shrink-0" id="qr-code-container-hidden"></div>
            <div class="flex-shrink-0 w-full sm:w-auto overflow-x-auto flex justify-center" id="barcode-container-hidden"></div>
          </div>
          <div class="prose prose-sm max-w-none bg-white p-4 sm:p-6 border rounded-lg">
            <div class="text-sm leading-relaxed">
              ${contractContentHtml}
            </div>
          </div>
        </div>
      `;

      // Render QR Code and Barcode using React components
      const qrCodeContainer = hiddenContainer.querySelector('#qr-code-container-hidden');
      const barcodeContainer = hiddenContainer.querySelector('#barcode-container-hidden');
      
      let qrRoot: any = null;
      let barcodeRoot: any = null;
      
      if (qrCodeContainer) {
        qrRoot = createRoot(qrCodeContainer);
        qrRoot.render(
          <QRCodeSVG
            value={`https://mr3x.com.br/verify/${token}`}
            size={80}
            level="H"
          />
        );
      }
      
      if (barcodeContainer && token) {
        barcodeRoot = createRoot(barcodeContainer);
        barcodeRoot.render(
          <Barcode
            value={token}
            format="CODE128"
            width={2}
            height={50}
            displayValue={true}
            fontSize={14}
            textMargin={4}
          />
        );
      }

      // Wait for React components to render
      await new Promise(resolve => setTimeout(resolve, 500));
      
      element = hiddenContainer;
      
      // Store roots for cleanup
      (element as any).__reactRoots = { qrRoot, barcodeRoot };
    }

    const barcodeData = await captureBarcodeAsRotatedImage();
    const filename = `contrato-${previewToken || fullContractData?.id || 'draft'}.pdf`;
    const token = previewToken || fullContractData?.contractToken || 'DRAFT';

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
      
      // Remove hidden container if we created it
      const hiddenContainer = document.getElementById('contract-preview-content-hidden');
      if (hiddenContainer) {
        // Clean up React roots
        const roots = (hiddenContainer as any).__reactRoots;
        if (roots) {
          if (roots.qrRoot) roots.qrRoot.unmount();
          if (roots.barcodeRoot) roots.barcodeRoot.unmount();
        }
        document.body.removeChild(hiddenContainer);
      }
    } catch (error) {
      console.error('PDF generation error:', error);
      toast.error('Erro ao gerar PDF. Tente novamente.');
      
      // Remove hidden container if we created it
      const hiddenContainer = document.getElementById('contract-preview-content-hidden');
      if (hiddenContainer) {
        // Clean up React roots
        const roots = (hiddenContainer as any).__reactRoots;
        if (roots) {
          if (roots.qrRoot) roots.qrRoot.unmount();
          if (roots.barcodeRoot) roots.barcodeRoot.unmount();
        }
        document.body.removeChild(hiddenContainer);
      }
    }
  };

  const handleViewContract = async (contract?: any) => {
    const contractToView = contract;
    if (!contractToView?.id) {
      toast.error('Contrato não encontrado');
      return;
    }

    const contractId = contractToView.id.toString();
    setLoadingDetailId(contractId);
    setViewingContract(true);
    try {
      const fullContract = await contractsAPI.getContractById(contractId);
      setFullContractData(fullContract);
      
      if (fullContract?.contentSnapshot) {
        setContractPreview(fullContract.contentSnapshot);
        setPreviewToken(fullContract.contractToken || '');
        setShowViewModal(true);
      } else if (fullContract?.templateId) {
        // Try to generate preview from template
        try {
          const template = await contractTemplatesAPI.getTemplateById(fullContract.templateId.toString());
          if (template) {
            // Generate preview content (simplified version)
            let content = template.content || '';
            // Basic replacements
            const replacements: Record<string, string> = {
              NOME_LOCATARIO: fullContract.tenantUser?.name || '',
              CPF_LOCATARIO: fullContract.tenantUser?.document?.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4') || '',
              ENDERECO_LOCATARIO: [
                fullContract.tenantUser?.address,
                fullContract.tenantUser?.number,
                fullContract.tenantUser?.complement,
                fullContract.tenantUser?.neighborhood,
                fullContract.tenantUser?.city,
                fullContract.tenantUser?.state,
                fullContract.tenantUser?.cep
              ].filter(Boolean).join(', ') || '',
              NOME_LOCADOR: fullContract.ownerUser?.name || fullContract.property?.owner?.name || '',
              CPF_LOCADOR: fullContract.ownerUser?.document?.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4') || '',
              VALOR_ALUGUEL: formatCurrency(Number(fullContract.monthlyRent) || 0),
              DATA_INICIO: fullContract.startDate ? new Date(fullContract.startDate).toLocaleDateString('pt-BR') : '',
              DATA_TERMINO: fullContract.endDate ? new Date(fullContract.endDate).toLocaleDateString('pt-BR') : '',
            };
            
            Object.keys(replacements).forEach(key => {
              content = content.replace(new RegExp(key, 'g'), replacements[key]);
            });
            
            setContractPreview(content);
            setPreviewToken(fullContract.contractToken || '');
            setShowViewModal(true);
          } else {
            toast.error('Template do contrato nao encontrado');
          }
        } catch (templateError) {
          console.warn('Could not fetch template:', templateError);
          toast.error('Preview do contrato nao disponivel');
        }
      } else {
        toast.error('Preview do contrato nao disponivel');
      }
    } catch (error: any) {
      console.error('Error loading contract:', error);
      toast.error(error?.message || 'Erro ao carregar contrato');
    } finally {
      setViewingContract(false);
      setLoadingDetailId(null);
    }
  };

  const handleSignContractFromList = (contract: any) => {
    if (!contract || !user) {
      toast.error('Contrato não carregado');
      return;
    }

    setSigningContractId(contract.id.toString());
    openSignatureModal(contract);
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

    const token = previewToken || fullContractData?.contractToken || 'DRAFT';

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
          console.error('Error getting geolocation:', error);
          toast.error('Erro ao obter localização.');
          setGeoConsent(false);
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
      );
    } else {
      setGeoLocation(null);
    }
  };

  const handleSignContract = async () => {
    // Get the contract from signContractData if available, otherwise use first contract
    const contractToSign = signContractData?.contract || (contracts && contracts.length > 0 ? contracts[0] : null);
    if (!contractToSign?.id) return;
    if (!signature) {
      toast.error('Por favor, desenhe sua assinatura');
      return;
    }

    // Allow signing without geolocation on HTTP
    if (!geoConsent && isSecureOrigin()) {
      toast.error('É necessário autorizar o compartilhamento de localização');
      return;
    }

    setSigning(true);
    setSigningContractId(contractToSign.id.toString());
    try {
      await signContractMutation.mutateAsync(contractToSign.id);
      // Refresh contract data after signing
      await new Promise(resolve => setTimeout(resolve, 500));
      await handleViewContract(contractToSign);
    } finally {
      setSigning(false);
      setSigningContractId(null);
    }
  };

  const openSignatureModal = (contract?: any) => {
    const contractToSign = contract || (contracts && contracts.length > 0 ? contracts[0] : null);
    setSignContractData({ contract: contractToSign, type: 'tenant' });
    setSignature(null);
    setGeoConsent(false);
    setGeoLocation(null);
    setShowSignatureModal(true);
  };

  const closeSignatureModal = () => {
    setShowSignatureModal(false);
    setSignContractData({ contract: null, type: null });
    setSignature(null);
    setGeoConsent(false);
    setGeoLocation(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }


  // Helper function to check if a contract can be signed
  const canContractSign = (contract: any) => {
    return (contract?.status === 'PENDENTE' || contract?.status === 'AGUARDANDO_ASSINATURAS') && !contract?.tenantSignature;
  };

  return (
    <TooltipProvider>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-100 rounded-lg">
              <FileText className="w-6 h-6 text-emerald-700" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold">Contratos</h1>
              <p className="text-sm sm:text-base text-muted-foreground mt-1">
                Gerencie todos os seus contratos
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
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

        {visibleContracts && visibleContracts.length > 0 ? (
          viewMode === 'table' ? (
            <div className="bg-card border border-border rounded-lg overflow-hidden">
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
                            {canContractSign(contract) && (
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
                            {contract.pdfPath && (
                              <Button
                                size="icon"
                                variant="outline"
                                onClick={() => handleDownloadContract()}
                                className="text-blue-600 border-blue-600 hover:bg-blue-50"
                              >
                                <Download className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

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
                      {canContractSign(contract) && (
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
                      {contract.pdfPath && (
                        <Button
                          size="icon"
                          variant="outline"
                          onClick={() => handleDownloadContract()}
                          className="text-blue-600 border-blue-600 hover:bg-blue-50"
                        >
                          <Download className="w-4 h-4" />
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
                {visibleContracts.map((contract: any) => (
                  <Card key={contract.id} className="transition-all hover:shadow-md flex flex-col w-[400px] mx-auto overflow-hidden">
                    <CardContent className="p-0 h-full flex flex-col overflow-hidden">
                      <div className="flex h-full">
                        <div className="w-28 min-w-28 h-36 bg-primary/10 flex items-center justify-center rounded-l-md">
                          <FileText className="w-12 h-12 text-primary" />
                        </div>
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
                                {canContractSign(contract) && (
                                  <DropdownMenuItem onClick={() => handleSignContractFromList(contract)} disabled={signingContractId === contract.id.toString()}>
                                    {signingContractId === contract.id.toString() ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <PenLine className="w-4 h-4 mr-2" />}
                                    {signingContractId === contract.id.toString() ? 'Assinando...' : 'Assinar contrato'}
                                  </DropdownMenuItem>
                                )}
                                {contract.pdfPath && (
                                  <DropdownMenuItem onClick={() => handleDownloadContract()}>
                                    <Download className="w-4 h-4 mr-2" />
                                    Baixar PDF
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
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-semibold text-xl mb-2">Nenhum contrato encontrado</h3>
            <p className="text-muted-foreground mb-4">
              Voce ainda nao possui um contrato ativo vinculado a sua conta.
            </p>
          </CardContent>
        </Card>
      )}

      {}
      <Dialog open={showSignatureModal} onOpenChange={(open) => !open && closeSignatureModal()}>
        <DialogContent className="w-[calc(100%-2rem)] sm:max-w-lg rounded-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PenLine className="w-5 h-5 text-green-600" />
              Assinar Contrato
            </DialogTitle>
            <DialogDescription>
              Assinatura como: <strong>Locatário</strong>
            </DialogDescription>
          </DialogHeader>
          {signContractData?.contract && (
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
                disabled={signing}
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
                  onClick={closeSignatureModal}
                  disabled={signing}
                >
                  Cancelar
                </Button>
                <Button
                  className="flex-1 bg-green-600 hover:bg-green-700"
                  onClick={handleSignContract}
                  disabled={signing || !signature || (isSecureOrigin() && (!geoConsent || !geoLocation))}
                >
                  {signing ? 'Assinando...' : 'Confirmar Assinatura'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* View Contract Modal */}
      <Dialog open={showViewModal} onOpenChange={setShowViewModal}>
        <DialogContent className="w-[95vw] sm:w-auto max-w-4xl max-h-[90vh] overflow-y-auto p-3 sm:p-6">
          <DialogHeader className="flex flex-row items-center justify-between">
            <div>
              <DialogTitle className="flex items-center gap-2">
                <Eye className="w-5 h-5 text-blue-500" />
                Prévia do Contrato
              </DialogTitle>
              <DialogDescription className="hidden sm:block">
                Visualize o conteúdo completo do seu contrato de locação
              </DialogDescription>
            </div>
            {contractPreview && (
              <div className="flex gap-2">
                <Button variant="ghost" size="icon" onClick={handleDownloadContract} title="Baixar PDF">
                  <Download className="w-5 h-5" />
                </Button>
                <Button variant="ghost" size="icon" onClick={handlePrintPreview} disabled={printing} title="Imprimir">
                  {printing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Printer className="w-5 h-5" />}
                </Button>
              </div>
            )}
          </DialogHeader>
          {contractPreview ? (
            <div id="contract-preview-content" className="space-y-4">
              {/* Security Information */}
              <div className="bg-muted p-3 sm:p-4 rounded-lg border">
                <h3 className="font-semibold mb-3">Informações de Segurança</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 text-sm">
                  <div className="break-all sm:break-normal">
                    <span className="font-medium">Token:</span>{' '}
                    <span className="font-mono text-xs">{previewToken || '-'}</span>
                  </div>
                  <div>
                    <span className="font-medium">CRECI:</span>{' '}
                    {(() => {
                      // Try to get CRECI from multiple sources, in order of priority
                      const resolvedCreci = fullContractData
                        ? (
                            // 1. CRECI directly on contract (immutable snapshot)
                            fullContractData.creci ||
                            // 2. CRECI from agency in contract
                            formatCreci(fullContractData.agency?.creci) ||
                            fullContractData.agency?.creci ||
                            // 3. CRECI from property's agency if available
                            formatCreci(fullContractData?.property?.agency?.creci) ||
                            fullContractData?.property?.agency?.creci ||
                            // 4. CRECI from user (broker)
                            user?.creci ||
                            ''
                          )
                        : (
                            // Fallback to first contract if fullContractData not loaded yet
                            (contracts && contracts.length > 0 ? contracts[0]?.creci : null) ||
                            formatCreci((contracts && contracts.length > 0 ? contracts[0]?.agency?.creci : null)) ||
                            (contracts && contracts.length > 0 ? contracts[0]?.agency?.creci : null) ||
                            formatCreci((contracts && contracts.length > 0 ? contracts[0]?.property?.agency?.creci : null)) ||
                            (contracts && contracts.length > 0 ? contracts[0]?.property?.agency?.creci : null) ||
                            user?.creci ||
                            ''
                          );
                      const isMissing = !resolvedCreci;
                      return (
                        <span className={isMissing ? 'text-red-500 font-semibold' : ''}>
                          {resolvedCreci || '⚠️ OBRIGATÓRIO'}
                        </span>
                      );
                    })()}
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
                      {fullContractData?.contentHash || `SHA256:${previewToken ? btoa(previewToken) : '---'}`}
                    </span>
                  </div>
                </div>
              </div>

              {/* Signatures Card */}
              <div className="bg-muted p-3 sm:p-4 rounded-lg border">
                <h3 className="font-semibold mb-3">Assinaturas</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="flex flex-col items-center p-3 bg-white rounded-lg border">
                    {fullContractData?.tenantSignature ? (
                      <>
                        <img 
                          src={fullContractData.tenantSignature} 
                          alt="Assinatura do Inquilino" 
                          className="w-32 h-16 object-contain mb-2 border rounded"
                        />
                        <p className="font-medium text-sm mb-1">Inquilino</p>
                        <Badge variant="default" className="text-xs mb-1">
                          Assinado
                        </Badge>
                        {fullContractData?.tenantSignedAt && (
                          <p className="text-xs text-muted-foreground">
                            {new Date(fullContractData.tenantSignedAt).toLocaleDateString('pt-BR')}
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
                    {fullContractData?.ownerSignature ? (
                      <>
                        <img 
                          src={fullContractData.ownerSignature} 
                          alt="Assinatura do Proprietário" 
                          className="w-32 h-16 object-contain mb-2 border rounded"
                        />
                        <p className="font-medium text-sm mb-1">Proprietário</p>
                        <Badge variant="default" className="text-xs mb-1">
                          Assinado
                        </Badge>
                        {fullContractData?.ownerSignedAt && (
                          <p className="text-xs text-muted-foreground">
                            {new Date(fullContractData.ownerSignedAt).toLocaleDateString('pt-BR')}
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
                    {fullContractData?.agencySignature ? (
                      <>
                        <img 
                          src={fullContractData.agencySignature} 
                          alt="Assinatura da Agência" 
                          className="w-32 h-16 object-contain mb-2 border rounded"
                        />
                        <p className="font-medium text-sm mb-1">Agência</p>
                        <Badge variant="default" className="text-xs mb-1">
                          Assinado
                        </Badge>
                        {fullContractData?.agencySignedAt && (
                          <p className="text-xs text-muted-foreground">
                            {new Date(fullContractData.agencySignedAt).toLocaleDateString('pt-BR')}
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

              {/* QR Code and Barcode */}
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

              {/* Contract Content */}
              <div className="prose prose-sm max-w-none bg-white p-4 sm:p-6 border rounded-lg">
                <div className="text-sm leading-relaxed" style={{ wordBreak: 'normal', overflowWrap: 'normal', hyphens: 'none' }}>
                  {contractPreview.split('\n').map((line, index) => {
                    const isSeparator = line.trim().match(/^[─═\-]{20,}$/);
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
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <FileText className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Carregando preview do contrato...</p>
              </div>
            </div>
          )}
          <div className="flex justify-end pt-4 border-t">
            <Button variant="outline" onClick={() => setShowViewModal(false)}>
              Fechar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      </div>
    </TooltipProvider>
  );
}
