import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Navigation } from "@/App";
import { DEFAULT_FORM_VALUES } from "@/lib/defaults";
import { Upload, Download, FileText, TrendingUp, Info, Scale, PieChart, DollarSign, Building2, Target } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import * as XLSX from 'xlsx';
import { cn } from "@/lib/utils";

// Constants
const PLATFORM_FEE_KDV_INCL = 10.19;
const GIDER_KDV_ORANI_SABIT = 20;
const STOPAJ_RATE = 0.01;

const solveVAT = (amountKDVIncl: number, vatRate: number) => {
  const rateDecimal = vatRate / 100;
  if (vatRate === 0 || amountKDVIncl === 0) {
    return { net: amountKDVIncl, vat: 0 };
  }
  const net = amountKDVIncl / (1 + rateDecimal);
  const vat = amountKDVIncl - net;
  return { net, vat };
};

const formatCurrency = (value: number) => {
  const absValue = Math.abs(value);
  const formatted = new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(absValue);
  if (value < 0) {
    return `(${formatted})`;
  }
  return formatted;
};

const formatNumber = (value: number) => {
  return new Intl.NumberFormat('tr-TR', {
    maximumFractionDigits: 0,
  }).format(value);
};

interface BulkProduct {
  productName: string;
  totalCost: number;
  totalSalesQuantity: number;
  totalSalesRevenue: number;
  vatRate: number;
}

interface BulkResult {
  productName: string;
  totalSalesRevenue: number;
  totalSalesQuantity: number;
  totalCost: number;
  totalExpenses: number;
  netProfit: number;
  profitMargin: number;
  netSatisHasilatiKDVHariç: number;
  birimKar: number;
}

interface AggregateCalculation {
  brutSatisHasilatiKDVHariç: number;
  iadeTutariNet: number;
  netSatisHasilati: number;
  smToplam: number;
  brutKar: number;
  komisyonToplam: number;
  kargoToplam: number;
  platformFeeToplam: number;
  stopajToplam: number;
  personelNet: number;
  depoNet: number;
  muhasebeNet: number;
  pazarlamaNet: number;
  digerGiderlerNet: number;
  sabitGiderlerToplamNet: number;
  faaliyetGiderleriToplam: number;
  faaliyetKar: number;
  vergi: number;
  netKar: number;
  marginNet: number;
  totalQuantity: number;
  satisKDVTutari: number;
  alisKDV: number;
  komisyonKDV: number;
  kargoKDVTutari: number;
  platformFeeKDV: number;
  sabitGiderlerKDVToplam: number;
  indirilebilirKDVToplam: number;
  odenecekKDV: number;
  devredenKDV: number;
  birimSatisFiyatiNet: number;
  birimAlisMaliyet: number;
  birimKomisyonNet: number;
  birimKargoNet: number;
  birimPlatformFeeNet: number;
  birimStopajNet: number;
  birimSabitGiderler: number;
  birimMaliyetlerToplam: number;
  birimVergi: number;
  birimNetKar: number;
}

const DEFAULT_VARIABLE_EXPENSES = {
  komisyon: 0,
  kargo: 0,
  iadeOrani: 0,
  gelirVergisi: 15,
};

export default function BulkSimulation() {
  const [bulkProducts, setBulkProducts] = useState<BulkProduct[]>(() => {
    try {
      const saved = localStorage.getItem('bulk_simulation_products');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [results, setResults] = useState<BulkResult[]>(() => {
    try {
      const saved = localStorage.getItem('bulk_simulation_results');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [controlPanelValues, setControlPanelValues] = useState(() => {
    try {
      const saved = localStorage.getItem('bulk_simulation_fixed_expenses');
      return saved ? JSON.parse(saved) : {
        personel: 0,
        depo: 0,
        muhasebe: 0,
        pazarlama: 0,
        digerGiderler: 0,
      };
    } catch {
      return {
        personel: 0,
        depo: 0,
        muhasebe: 0,
        pazarlama: 0,
        digerGiderler: 0,
      };
    }
  });

  const [variableExpenses, setVariableExpenses] = useState(() => {
    try {
      const saved = localStorage.getItem('bulk_simulation_variable_expenses');
      return saved ? JSON.parse(saved) : DEFAULT_VARIABLE_EXPENSES;
    } catch {
      return DEFAULT_VARIABLE_EXPENSES;
    }
  });

  const [showAll, setShowAll] = useState(false);

  // Update gelirVergisi in calculations
  const gelirVergisiYuzde = variableExpenses.gelirVergisi / 100;

  // Persist data whenever state changes
  useEffect(() => {
    localStorage.setItem('bulk_simulation_products', JSON.stringify(bulkProducts));
  }, [bulkProducts]);

  useEffect(() => {
    localStorage.setItem('bulk_simulation_results', JSON.stringify(results));
  }, [results]);

  useEffect(() => {
    localStorage.setItem('bulk_simulation_fixed_expenses', JSON.stringify(controlPanelValues));
  }, [controlPanelValues]);

  useEffect(() => {
    localStorage.setItem('bulk_simulation_variable_expenses', JSON.stringify(variableExpenses));
  }, [variableExpenses]);

  const downloadTemplate = () => {
    const templateData = [
      ['Ürün Adı', 'Toplam Maliyet', 'Toplam Satış Adeti', 'Toplam Satış Tutarı', 'KDV Oranı (%)'],
      ['Örnek Ürün 1', 1000, 100, 15000, 18],
      ['Örnek Ürün 2', 500, 50, 8000, 18],
    ];

    const ws = XLSX.utils.aoa_to_sheet(templateData);
    ws['!cols'] = [{ wch: 20 }, { wch: 18 }, { wch: 22 }, { wch: 20 }, { wch: 15 }];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Ürünler');
    XLSX.writeFile(wb, 'Toplu_Simulasyon_Sablonu.xlsx');
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result as ArrayBuffer;
        const workbook = XLSX.read(data, { type: 'array' });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[];

        const products: BulkProduct[] = [];
        for (let i = 1; i < jsonData.length; i++) {
          const row = jsonData[i];
          if (row[0]) {
            products.push({
              productName: String(row[0]).trim(),
              totalCost: parseFloat(row[1]) || 0,
              totalSalesQuantity: parseFloat(row[2]) || 0,
              totalSalesRevenue: parseFloat(row[3]) || 0,
              vatRate: parseFloat(row[4]) || 18,
            });
          }
        }

        setBulkProducts(products);
        calculateResults(products, controlPanelValues, variableExpenses);
      } catch (error) {
        alert('Dosya okuma hatası. Lütfen geçerli bir Excel dosyası yükleyin.');
        console.error(error);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleControlPanelChange = (key: string, value: string) => {
    const numValue = parseFloat(value) || 0;
    const updated = { ...controlPanelValues, [key]: numValue };
    setControlPanelValues(updated);
    if (bulkProducts.length > 0) {
      calculateResults(bulkProducts, updated, variableExpenses);
    }
  };

  const handleVariableExpenseChange = (key: string, value: string) => {
    const numValue = parseFloat(value) || 0;
    const updated = { ...variableExpenses, [key]: numValue };
    setVariableExpenses(updated);
    if (bulkProducts.length > 0) {
      calculateResults(bulkProducts, controlPanelValues, updated);
    }
  };

  const calculateResults = (
    products: BulkProduct[],
    fixedExpenses: typeof controlPanelValues,
    varExpenses: typeof variableExpenses
  ) => {
    const totalQuantity = products.reduce((sum, p) => sum + p.totalSalesQuantity, 0);
    const gelirVergisiYuzde = varExpenses.gelirVergisi / 100;

    // Calculate total fixed expenses for apportioning
    // Personel has NO VAT - use as-is
    const personelNetAm = fixedExpenses.personel;
    // Other fixed expenses are VAT-inclusive (20%) - extract VAT
    const depoNetAm = fixedExpenses.depo / (1 + GIDER_KDV_ORANI_SABIT / 100);
    const muhasebeNetAm = fixedExpenses.muhasebe / (1 + GIDER_KDV_ORANI_SABIT / 100);
    const pazarlamaNetAm = fixedExpenses.pazarlama / (1 + GIDER_KDV_ORANI_SABIT / 100);
    const digerGiderlerNetAm = fixedExpenses.digerGiderler / (1 + GIDER_KDV_ORANI_SABIT / 100);
    const platformFeeNet = PLATFORM_FEE_KDV_INCL / (1 + GIDER_KDV_ORANI_SABIT / 100);
    
    // Variable expenses - extract VAT from input values (all inputs are VAT-inclusive)
    const kargoNetAm = varExpenses.kargo / (1 + GIDER_KDV_ORANI_SABIT / 100);

    const calculated = products.map((product) => {
      const komisyonYuzde = varExpenses.komisyon / 100;
      const iadeOrani = varExpenses.iadeOrani / 100;

      // Revenue - each product's gross sales (VAT excluded)
      const brutSatisHasilatiKDVHariç = product.totalSalesRevenue / (1 + product.vatRate / 100);
      
      // Returns - apply percentage to this product's revenue
      const iadeTutariNet = brutSatisHasilatiKDVHariç * iadeOrani;
      const netSatisHasilati = brutSatisHasilatiKDVHariç - iadeTutariNet;

      // COGS
      const smToplam = product.totalCost;
      const brutKar = netSatisHasilati - smToplam;

      // Variable expenses (all VAT-exclusive)
      // Commission: extract VAT from the percentage input (VAT-INCLUSIVE rate becomes VAT-EXCLUSIVE)
      const komisyonYuzdeNet = komisyonYuzde / (1 + GIDER_KDV_ORANI_SABIT / 100);
      const komisyonToplam = netSatisHasilati * komisyonYuzdeNet;
      const kargoToplam = kargoNetAm * product.totalSalesQuantity;
      const platformFeeToplam = platformFeeNet * product.totalSalesQuantity;
      const stopajToplam = brutSatisHasilatiKDVHariç * STOPAJ_RATE;

      // Fixed expenses - apportion by quantity share (use net amounts)
      const quantityShare = totalQuantity > 0 ? product.totalSalesQuantity / totalQuantity : 0;
      const apportionedPersonel = personelNetAm * quantityShare;
      const apportionedDepo = depoNetAm * quantityShare;
      const apportionedMuhasebe = muhasebeNetAm * quantityShare;
      const apportionedPazarlama = pazarlamaNetAm * quantityShare;
      const apportionedDigerGiderler = digerGiderlerNetAm * quantityShare;

      const sabitGiderlerToplamNet =
        apportionedPersonel + apportionedDepo + apportionedMuhasebe + apportionedPazarlama + apportionedDigerGiderler;

      // Total operating expenses (net)
      const faaliyetGiderleriToplam =
        komisyonToplam + kargoToplam + platformFeeToplam + stopajToplam + sabitGiderlerToplamNet;

      // Profit before tax
      const faaliyetKar = brutKar - faaliyetGiderleriToplam;

      // Tax
      const vergi = faaliyetKar > 0 ? faaliyetKar * gelirVergisiYuzde : 0;

      // Net profit = Gross Profit - Operating Expenses - Tax
      const netKar = faaliyetKar - vergi;
      
      // Revenue after returns minus all expenses
      const totalExpensesNet = smToplam + faaliyetGiderleriToplam + vergi;
      
      // Ensure equation: Net Kâr/Zarar = Net Revenue - Total Expenses
      const netKarCheck = netSatisHasilati - totalExpensesNet;
      const profitMargin = netSatisHasilati > 0 ? netKarCheck / netSatisHasilati : 0;

      const birimKar = product.totalSalesQuantity > 0 ? netKarCheck / product.totalSalesQuantity : 0;
      
      return {
        productName: product.productName,
        totalSalesRevenue: product.totalSalesRevenue,
        totalSalesQuantity: product.totalSalesQuantity,
        totalCost: product.totalCost,
        totalExpenses: totalExpensesNet,
        netProfit: netKarCheck,
        profitMargin: profitMargin,
        netSatisHasilatiKDVHariç: netSatisHasilati,
        birimKar: birimKar,
      };
    });

    setResults(calculated);
  };

  // Calculate aggregate P&L
  const aggregateCalc = useMemo((): AggregateCalculation | null => {
    if (bulkProducts.length === 0) return null;

    const totalQuantity = bulkProducts.reduce((sum, p) => sum + p.totalSalesQuantity, 0);
    const gelirVergisiYuzde = variableExpenses.gelirVergisi / 100;
    const komisyonYuzde = variableExpenses.komisyon / 100;
    const iadeOrani = variableExpenses.iadeOrani / 100;

    // VAT extraction for all expenses - all input values are VAT-inclusive (except Personel)
    // Personel has NO VAT - use as-is
    const personelNetAm = controlPanelValues.personel;
    // Other fixed expenses are VAT-inclusive (20%) - extract VAT
    const depoNetAm = controlPanelValues.depo / (1 + GIDER_KDV_ORANI_SABIT / 100);
    const muhasebeNetAm = controlPanelValues.muhasebe / (1 + GIDER_KDV_ORANI_SABIT / 100);
    const pazarlamaNetAm = controlPanelValues.pazarlama / (1 + GIDER_KDV_ORANI_SABIT / 100);
    const digerGiderlerNetAm = controlPanelValues.digerGiderler / (1 + GIDER_KDV_ORANI_SABIT / 100);
    const platformFeeNet = PLATFORM_FEE_KDV_INCL / (1 + GIDER_KDV_ORANI_SABIT / 100);
    const kargoNetAm = variableExpenses.kargo / (1 + GIDER_KDV_ORANI_SABIT / 100);

    // Step 1: Calculate aggregate gross revenue (VAT excluded)
    let brutSatisHasilatiKDVHariç = 0;
    let smToplam = 0;

    bulkProducts.forEach((product) => {
      const brutBirim = product.totalSalesRevenue / (1 + product.vatRate / 100);
      brutSatisHasilatiKDVHariç += brutBirim;
      smToplam += product.totalCost;
    });

    // Step 2: Apply percentage rates to aggregate revenue
    const iadeTutariNet = brutSatisHasilatiKDVHariç * iadeOrani;
    const netSatisHasilati = brutSatisHasilatiKDVHariç - iadeTutariNet;
    const brutKar = netSatisHasilati - smToplam;

    // Step 3: Calculate variable expenses (all VAT-exclusive after extraction)
    // Commission: extract VAT from the percentage input (VAT-INCLUSIVE rate becomes VAT-EXCLUSIVE)
    const komisyonYuzdeNet = komisyonYuzde / (1 + GIDER_KDV_ORANI_SABIT / 100);
    const komisyonToplam = netSatisHasilati * komisyonYuzdeNet;
    const kargoToplam = kargoNetAm * totalQuantity;
    const platformFeeToplam = platformFeeNet * totalQuantity;
    const stopajToplam = brutSatisHasilatiKDVHariç * STOPAJ_RATE;

    // Step 4: Fixed expenses - sum all net amounts (after VAT extraction)
    const sabitGiderlerToplamNet = personelNetAm + depoNetAm + muhasebeNetAm + pazarlamaNetAm + digerGiderlerNetAm;
    
    // Step 5: Calculate totals
    const faaliyetGiderleriToplam = komisyonToplam + kargoToplam + platformFeeToplam + stopajToplam + sabitGiderlerToplamNet;
    const faaliyetKar = brutKar - faaliyetGiderleriToplam;
    const vergi = faaliyetKar > 0 ? faaliyetKar * gelirVergisiYuzde : 0;
    const netKar = faaliyetKar - vergi;
    const marginNet = netSatisHasilati > 0 ? netKar / netSatisHasilati : 0;

    // KDV Analizi Calculations
    let satisKDVTutari = 0;
    bulkProducts.forEach((product) => {
      const brutBirim = product.totalSalesRevenue / (1 + product.vatRate / 100);
      const kdvBirim = product.totalSalesRevenue - brutBirim;
      satisKDVTutari += kdvBirim;
    });

    const alisKDV = smToplam > 0 ? (smToplam - smToplam / (1 + GIDER_KDV_ORANI_SABIT / 100)) : 0;
    const komisyonKDV = komisyonToplam * (GIDER_KDV_ORANI_SABIT / 100);
    const kargoKDVTutari = kargoToplam * (GIDER_KDV_ORANI_SABIT / 100);
    const platformFeeKDV = platformFeeToplam * (GIDER_KDV_ORANI_SABIT / 100);
    const sabitGiderlerKDVToplam = sabitGiderlerToplamNet * (GIDER_KDV_ORANI_SABIT / 100);
    const indirilebilirKDVToplam = alisKDV + komisyonKDV + kargoKDVTutari + platformFeeKDV + sabitGiderlerKDVToplam;
    const odenecekKDVBrut = satisKDVTutari - indirilebilirKDVToplam;
    const odenecekKDV = odenecekKDVBrut > 0 ? odenecekKDVBrut : 0;
    const devredenKDV = odenecekKDVBrut < 0 ? Math.abs(odenecekKDVBrut) : 0;

    // Birim Ekonomisi Calculations
    const birimSatisFiyatiNet = totalQuantity > 0 ? netSatisHasilati / totalQuantity : 0;
    const birimAlisMaliyet = totalQuantity > 0 ? smToplam / totalQuantity : 0;
    const birimKomisyonNet = totalQuantity > 0 ? komisyonToplam / totalQuantity : 0;
    const birimKargoNet = totalQuantity > 0 ? kargoToplam / totalQuantity : 0;
    const birimPlatformFeeNet = totalQuantity > 0 ? platformFeeToplam / totalQuantity : 0;
    const birimStopajNet = totalQuantity > 0 ? stopajToplam / totalQuantity : 0;
    const birimSabitGiderler = totalQuantity > 0 ? sabitGiderlerToplamNet / totalQuantity : 0;
    const birimMaliyetlerToplam = birimAlisMaliyet + birimKomisyonNet + birimKargoNet + birimPlatformFeeNet + birimStopajNet + birimSabitGiderler;
    const birimVergi = totalQuantity > 0 ? vergi / totalQuantity : 0;
    // Calculate birim net kâr directly from total net profit for accuracy
    const birimNetKar = totalQuantity > 0 ? netKar / totalQuantity : 0;

    return {
      brutSatisHasilatiKDVHariç,
      iadeTutariNet,
      netSatisHasilati,
      smToplam,
      brutKar,
      komisyonToplam,
      kargoToplam,
      platformFeeToplam,
      stopajToplam,
      personelNet: personelNetAm,
      depoNet: depoNetAm,
      muhasebeNet: muhasebeNetAm,
      pazarlamaNet: pazarlamaNetAm,
      digerGiderlerNet: digerGiderlerNetAm,
      sabitGiderlerToplamNet,
      faaliyetGiderleriToplam,
      faaliyetKar,
      vergi,
      netKar,
      marginNet,
      totalQuantity,
      satisKDVTutari,
      alisKDV,
      komisyonKDV,
      kargoKDVTutari,
      platformFeeKDV,
      sabitGiderlerKDVToplam,
      indirilebilirKDVToplam,
      odenecekKDV,
      devredenKDV,
      birimSatisFiyatiNet,
      birimAlisMaliyet,
      birimKomisyonNet,
      birimKargoNet,
      birimPlatformFeeNet,
      birimStopajNet,
      birimSabitGiderler,
      birimMaliyetlerToplam,
      birimVergi,
      birimNetKar,
    };
  }, [bulkProducts, controlPanelValues, variableExpenses]);

  const excelTotals = useMemo(() => {
    return {
      totalQuantity: bulkProducts.reduce((sum, p) => sum + p.totalSalesQuantity, 0),
      totalRevenue: bulkProducts.reduce((sum, p) => sum + p.totalSalesRevenue, 0),
      totalCost: bulkProducts.reduce((sum, p) => sum + p.totalCost, 0),
    };
  }, [bulkProducts]);

  const resultsTotals = useMemo(() => {
    return {
      totalRevenue: results.reduce((sum, r) => sum + r.totalSalesRevenue, 0),
      totalExpenses: results.reduce((sum, r) => sum + r.totalExpenses, 0),
      totalNetProfit: results.reduce((sum, r) => sum + r.netProfit, 0),
      netSatisHasilatiKDVHariç: results.reduce((sum, r) => sum + (r.netSatisHasilatiKDVHariç || 0), 0),
    };
  }, [results]);

  return (
    <div className="min-h-screen bg-white p-4 md:p-6 font-sans text-slate-900">
      {/* Navigation */}
      <div className="flex justify-center mb-6">
        <Navigation />
      </div>

      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3 mb-2">
            <FileText className="w-8 h-8 text-blue-600" />
            Toplu Simülasyon (Excel)
          </h1>
          <p className="text-slate-600">Excel dosyasından toplu ürün simülasyonu yapın ve kâr/zarar analizini görüntüleyin.</p>
        </div>

        {/* Upload Section */}
        <Card className="border-0 shadow-[0_8px_24px_rgba(0,0,0,0.15)]">
          <CardHeader className="pb-3 pt-5">
            <CardTitle className="text-lg font-semibold text-slate-800">Excel Dosyası Yükle</CardTitle>
            <CardDescription className="text-sm mt-2">
              Aşağıdaki şablonu indirin, ürün verilerinizi doldurun ve yükleyin.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4 flex-wrap">
              <Button onClick={downloadTemplate} variant="outline" className="gap-2">
                <Download className="w-4 h-4" />
                Şablonu İndir
              </Button>

              <div className="flex-1 min-w-[200px]">
                <Input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileUpload}
                  className="cursor-pointer"
                  id="excel-upload"
                />
              </div>
            </div>

            {bulkProducts.length > 0 && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-900 font-medium">
                  ✓ {bulkProducts.length} ürün yüklendi ve simüle edildi
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Control Panel & P&L */}
        {bulkProducts.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-6">
            {/* Left: Control Panel */}
            <div className="space-y-4">
              {/* Variable Expenses */}
              <Card className="border-0 shadow-[0_8px_24px_rgba(0,0,0,0.15)]">
                <CardHeader className="pb-3 pt-5 px-5 border-b border-slate-100">
                  <CardTitle className="text-[1.1em] font-semibold text-blue-600">Değişken Giderler</CardTitle>
                </CardHeader>
                <CardContent className="p-5 space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-slate-600">Komisyon (%)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={variableExpenses.komisyon}
                      onChange={(e) => handleVariableExpenseChange('komisyon', e.target.value)}
                      className="h-9 text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-slate-600">Kargo Gideri (₺)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={variableExpenses.kargo}
                      onChange={(e) => handleVariableExpenseChange('kargo', e.target.value)}
                      className="h-9 text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-slate-600">İade (%)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={variableExpenses.iadeOrani}
                      onChange={(e) => handleVariableExpenseChange('iadeOrani', e.target.value)}
                      className="h-9 text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-slate-600">Gelir/Kurumlar Vergisi (%)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={variableExpenses.gelirVergisi}
                      onChange={(e) => handleVariableExpenseChange('gelirVergisi', e.target.value)}
                      className="h-9 text-sm"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Fixed Expenses */}
              <Card className="border-0 shadow-[0_8px_24px_rgba(0,0,0,0.15)]">
                <CardHeader className="pb-3 pt-5 px-5 border-b border-slate-100">
                  <CardTitle className="text-[1.1em] font-semibold text-blue-600">Sabit Giderler (Aylık)</CardTitle>
                  <p className="text-xs text-slate-500 mt-2 font-normal">KDV Dahil Fiyat girileceği (Personel hariç)</p>
                </CardHeader>
                <CardContent className="p-5 space-y-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1">
                      <Label className="text-xs font-medium text-slate-600">Personel (₺)</Label>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="w-3.5 h-3.5 text-slate-400 cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent side="right" className="max-w-xs bg-white text-slate-900">
                          <p className="text-xs">KDV Uygulanmaz</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <Input
                      type="number"
                      step="0.01"
                      value={controlPanelValues.personel}
                      onChange={(e) => handleControlPanelChange('personel', e.target.value)}
                      className="h-9 text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1">
                      <Label className="text-xs font-medium text-slate-600">Kira / Depo (₺)</Label>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="w-3.5 h-3.5 text-slate-400 cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent side="right" className="max-w-xs bg-white text-slate-900">
                          <p className="text-xs">KDV Dahil (KDV Oranı %20)</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <Input
                      type="number"
                      step="0.01"
                      value={controlPanelValues.depo}
                      onChange={(e) => handleControlPanelChange('depo', e.target.value)}
                      className="h-9 text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1">
                      <Label className="text-xs font-medium text-slate-600">Muhasebe (₺)</Label>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="w-3.5 h-3.5 text-slate-400 cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent side="right" className="max-w-xs bg-white text-slate-900">
                          <p className="text-xs">KDV Dahil (KDV Oranı %20)</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <Input
                      type="number"
                      step="0.01"
                      value={controlPanelValues.muhasebe}
                      onChange={(e) => handleControlPanelChange('muhasebe', e.target.value)}
                      className="h-9 text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1">
                      <Label className="text-xs font-medium text-slate-600">Pazarlama (₺)</Label>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="w-3.5 h-3.5 text-slate-400 cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent side="right" className="max-w-xs bg-white text-slate-900">
                          <p className="text-xs">KDV Dahil (KDV Oranı %20)</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <Input
                      type="number"
                      step="0.01"
                      value={controlPanelValues.pazarlama}
                      onChange={(e) => handleControlPanelChange('pazarlama', e.target.value)}
                      className="h-9 text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1">
                      <Label className="text-xs font-medium text-slate-600">Diğer Giderler (₺)</Label>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="w-3.5 h-3.5 text-slate-400 cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent side="right" className="max-w-xs bg-white text-slate-900">
                          <p className="text-xs">KDV Dahil (KDV Oranı %20)</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <Input
                      type="number"
                      step="0.01"
                      value={controlPanelValues.digerGiderler}
                      onChange={(e) => handleControlPanelChange('digerGiderler', e.target.value)}
                      className="h-9 text-sm"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Summary */}
              <Card className="border-0 shadow-[0_8px_24px_rgba(0,0,0,0.15)]">
                <CardHeader className="pb-3 pt-5 px-5 border-b border-slate-100">
                  <CardTitle className="text-[1.1em] font-semibold text-blue-600">Satış ve Birim Verileri (Özet)</CardTitle>
                </CardHeader>
                <CardContent className="p-5 space-y-3">
                  <div>
                    <p className="text-xs font-medium text-slate-600 mb-1">Toplam Satış Adedi</p>
                    <p className="text-lg font-bold text-blue-600">{formatNumber(excelTotals.totalQuantity)} Adet</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-600 mb-1">Toplam Satış Tutarı</p>
                    <p className="text-lg font-bold text-blue-600">{formatCurrency(excelTotals.totalRevenue)}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-600 mb-1">Toplam Maliyet (Excel)</p>
                    <p className="text-lg font-bold text-blue-600">{formatCurrency(excelTotals.totalCost)}</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right Column: P&L Only */}
            {aggregateCalc && (
              <div>
                <Card className="border-0 shadow-[0_8px_24px_rgba(0,0,0,0.15)] overflow-hidden">
                  <CardHeader className="bg-white border-b border-slate-100 pb-3 pt-5">
                    <CardTitle className="text-[1.1em] font-semibold text-blue-600 flex items-center gap-2">
                      <TrendingUp className="w-5 h-5" />
                      Aylık Kâr/Zarar Tablosu (Agregat)
                    </CardTitle>
                    <p className="text-xs text-slate-500 mt-2 font-normal">Tüm rakamlar KDV Hariç (Net) olup, bu şekilde hesaplanmıştır.</p>
                  </CardHeader>
                  <CardContent className="p-0">
                    <Table>
                      <TableBody className="text-[0.9em]">
                        <TableRow className="border-b border-slate-50">
                          <TableCell className="py-2 pl-6 font-medium text-slate-700">Brüt Satış Hasılatı</TableCell>
                          <TableCell className="py-2 pr-6 text-right font-medium text-emerald-600">
                            {formatCurrency(aggregateCalc.brutSatisHasilatiKDVHariç)}
                          </TableCell>
                        </TableRow>
                        <TableRow className="border-b border-slate-50">
                          <TableCell className="py-2 pl-6 font-medium text-red-500">(-) İade Tutarı</TableCell>
                          <TableCell className="py-2 pr-6 text-right text-red-500">
                            {formatCurrency(aggregateCalc.iadeTutariNet)}
                          </TableCell>
                        </TableRow>
                        <TableRow className="bg-slate-100">
                          <TableCell className="py-2 pl-6 font-bold text-slate-800">= Net Satış Hasılatı</TableCell>
                          <TableCell className="py-2 pr-6 text-right font-bold text-slate-800">
                            {formatCurrency(aggregateCalc.netSatisHasilati)}
                          </TableCell>
                        </TableRow>
                        <TableRow className="border-b border-slate-50">
                          <TableCell className="py-2 pl-6 font-medium text-red-500">(-) Satılan Malın Maliyeti (SM)</TableCell>
                          <TableCell className="py-2 pr-6 text-right text-red-500">
                            {formatCurrency(aggregateCalc.smToplam)}
                          </TableCell>
                        </TableRow>
                        <TableRow className="bg-slate-100">
                          <TableCell className="py-2 pl-6 font-bold text-slate-900">= Brüt Kâr</TableCell>
                          <TableCell className="py-2 pr-6 text-right font-bold text-slate-900">
                            {formatCurrency(aggregateCalc.brutKar)}
                          </TableCell>
                        </TableRow>

                        <TableRow>
                          <TableCell colSpan={2} className="bg-[#f1f1f1] text-xs font-bold text-slate-600 text-center py-1.5 uppercase tracking-wider">
                            Faaliyet Giderleri Detayı (KDV Hariç)
                          </TableCell>
                        </TableRow>
                        <TableRow className="border-b border-slate-50">
                          <TableCell className="py-2 pl-6 text-slate-600">(-) Pazaryeri Komisyonu (Değişken)</TableCell>
                          <TableCell className="py-2 pr-6 text-right text-slate-600">
                            {formatCurrency(aggregateCalc.komisyonToplam)}
                          </TableCell>
                        </TableRow>
                        <TableRow className="border-b border-slate-50">
                          <TableCell className="py-2 pl-6 text-slate-600">(-) Kargo Gideri (Değişken)</TableCell>
                          <TableCell className="py-2 pr-6 text-right text-slate-600">
                            {formatCurrency(aggregateCalc.kargoToplam)}
                          </TableCell>
                        </TableRow>
                        <TableRow className="border-b border-slate-50">
                          <TableCell className="py-2 pl-6 text-slate-600">(-) Platform Hizmet Bedeli (Değişken)</TableCell>
                          <TableCell className="py-2 pr-6 text-right text-slate-600">
                            {formatCurrency(aggregateCalc.platformFeeToplam)}
                          </TableCell>
                        </TableRow>
                        <TableRow className="border-b border-slate-50">
                          <TableCell className="py-2 pl-6 text-slate-600">(-) Stopaj Gideri (Değişken)</TableCell>
                          <TableCell className="py-2 pr-6 text-right text-slate-600">
                            {formatCurrency(aggregateCalc.stopajToplam)}
                          </TableCell>
                        </TableRow>

                        {/* Fixed Expenses Breakdown */}
                        <TableRow className="border-b border-slate-50">
                          <TableCell className="py-2 pl-9 text-slate-500 text-[0.85em]">    (-) Personel</TableCell>
                          <TableCell className="py-2 pr-6 text-right text-slate-500 text-[0.85em]">
                            {formatCurrency(aggregateCalc.personelNet)}
                          </TableCell>
                        </TableRow>
                        <TableRow className="border-b border-slate-50">
                          <TableCell className="py-2 pl-9 text-slate-500 text-[0.85em]">    (-) Depo / Kira</TableCell>
                          <TableCell className="py-2 pr-6 text-right text-slate-500 text-[0.85em]">
                            {formatCurrency(aggregateCalc.depoNet)}
                          </TableCell>
                        </TableRow>
                        <TableRow className="border-b border-slate-50">
                          <TableCell className="py-2 pl-9 text-slate-500 text-[0.85em]">    (-) Muhasebe</TableCell>
                          <TableCell className="py-2 pr-6 text-right text-slate-500 text-[0.85em]">
                            {formatCurrency(aggregateCalc.muhasebeNet)}
                          </TableCell>
                        </TableRow>
                        <TableRow className="border-b border-slate-50">
                          <TableCell className="py-2 pl-9 text-slate-500 text-[0.85em]">    (-) Pazarlama</TableCell>
                          <TableCell className="py-2 pr-6 text-right text-slate-500 text-[0.85em]">
                            {formatCurrency(aggregateCalc.pazarlamaNet)}
                          </TableCell>
                        </TableRow>
                        <TableRow className="border-b border-slate-50">
                          <TableCell className="py-2 pl-9 text-slate-500 text-[0.85em]">    (-) Diğer Giderler</TableCell>
                          <TableCell className="py-2 pr-6 text-right text-slate-500 text-[0.85em]">
                            {formatCurrency(aggregateCalc.digerGiderlerNet)}
                          </TableCell>
                        </TableRow>
                        <TableRow className="border-b border-slate-50">
                          <TableCell className="py-2 pl-6 text-slate-600">(-) Toplam Sabit Giderler</TableCell>
                          <TableCell className="py-2 pr-6 text-right text-slate-600">
                            {formatCurrency(aggregateCalc.sabitGiderlerToplamNet)}
                          </TableCell>
                        </TableRow>

                        <TableRow className="bg-slate-100">
                          <TableCell className="py-2 pl-6 font-bold text-slate-700">(-) Toplam Faaliyet Giderleri</TableCell>
                          <TableCell className="py-2 pr-6 text-right font-bold text-slate-700">
                            {formatCurrency(aggregateCalc.faaliyetGiderleriToplam)}
                          </TableCell>
                        </TableRow>

                        <TableRow className="bg-slate-100 border-t border-slate-200">
                          <TableCell className="py-2 pl-6 font-bold text-slate-800">= Faaliyet Kârı (EBIT)</TableCell>
                          <TableCell className="py-2 pr-6 text-right font-bold text-slate-800">
                            {formatCurrency(aggregateCalc.faaliyetKar)}
                          </TableCell>
                        </TableRow>
                        <TableRow className="border-b border-slate-50">
                          <TableCell className="py-2 pl-6 font-medium text-red-500">(-) Gelir/Kurumlar Vergisi</TableCell>
                          <TableCell className="py-2 pr-6 text-right text-red-500">
                            {formatCurrency(aggregateCalc.vergi)}
                          </TableCell>
                        </TableRow>
                        <TableRow
                          className={cn(
                            'border-t',
                            aggregateCalc.netKar < 0
                              ? 'bg-[#ffe6e6] border-red-200'
                              : 'bg-[#d1e7dd] border-green-200'
                          )}
                        >
                          <TableCell
                            className={cn(
                              'py-3 pl-6 text-[1.1em] font-bold',
                              aggregateCalc.netKar < 0 ? 'text-red-900' : 'text-green-900'
                            )}
                          >
                            NET KÂR / ZARAR
                          </TableCell>
                          <TableCell
                            className={cn(
                              'py-3 pr-6 text-[1.1em] font-bold text-right',
                              aggregateCalc.netKar < 0 ? 'text-red-900' : 'text-green-900'
                            )}
                          >
                            {formatCurrency(aggregateCalc.netKar)} ({(aggregateCalc.marginNet * 100).toFixed(2)}%)
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        )}

        {/* Analysis Tables - KDV & Birim Ekonomisi */}
        {aggregateCalc && (
          <div className="grid grid-cols-1 lg:grid-cols-[1.3fr_1fr] gap-6">
            {/* Tax Analysis */}
            <Card className="border-0 shadow-[0_6px_16px_rgba(0,0,0,0.1)] overflow-hidden h-fit">
              <CardHeader className="pb-3 pt-5 px-5 border-b border-slate-100">
                <CardTitle className="text-[1.1em] font-semibold text-blue-600 flex items-center gap-2">
                  <Scale className="w-5 h-5" />
                  KDV Analizi (Detaylı)
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableBody className="text-[0.9em]">
                    <TableRow className="hover:bg-transparent border-b border-slate-50">
                      <TableCell className="py-2 pl-5 font-medium">Satış KDV'si (Hesaplanan)</TableCell>
                      <TableCell className="py-2 pr-5 text-right font-medium">{formatCurrency(aggregateCalc.satisKDVTutari)}</TableCell>
                    </TableRow>
                    <TableRow className="hover:bg-transparent">
                      <TableCell colSpan={2} className="bg-slate-100 text-center py-1.5 font-bold text-slate-700">İndirilebilir KDV Detayı</TableCell>
                    </TableRow>
                    <TableRow className="hover:bg-transparent border-b border-slate-50">
                      <TableCell className="py-1.5 pl-5 text-slate-600">(+) Alış KDV (SM)</TableCell>
                      <TableCell className="py-1.5 pr-5 text-right text-slate-600">{formatCurrency(aggregateCalc.alisKDV)}</TableCell>
                    </TableRow>
                    <TableRow className="hover:bg-transparent border-b border-slate-50">
                      <TableCell className="py-1.5 pl-5 text-slate-600">(+) Komisyon KDV</TableCell>
                      <TableCell className="py-1.5 pr-5 text-right text-slate-600">{formatCurrency(aggregateCalc.komisyonKDV)}</TableCell>
                    </TableRow>
                    <TableRow className="hover:bg-transparent border-b border-slate-50">
                      <TableCell className="py-1.5 pl-5 text-slate-600">(+) Kargo KDV</TableCell>
                      <TableCell className="py-1.5 pr-5 text-right text-slate-600">{formatCurrency(aggregateCalc.kargoKDVTutari)}</TableCell>
                    </TableRow>
                    <TableRow className="hover:bg-transparent border-b border-slate-50">
                      <TableCell className="py-1.5 pl-5 text-slate-600">(+) Platform Hizmet KDV</TableCell>
                      <TableCell className="py-1.5 pr-5 text-right text-slate-600">{formatCurrency(aggregateCalc.platformFeeKDV)}</TableCell>
                    </TableRow>
                    <TableRow className="hover:bg-transparent border-b border-slate-50">
                      <TableCell className="py-1.5 pl-5 text-slate-600">(+) Sabit Giderler KDV</TableCell>
                      <TableCell className="py-1.5 pr-5 text-right text-slate-600">{formatCurrency(aggregateCalc.sabitGiderlerKDVToplam)}</TableCell>
                    </TableRow>
                    <TableRow className="bg-slate-100 hover:bg-slate-100">
                      <TableCell className="py-1.5 pl-5 font-bold">Toplam İndirilebilir KDV</TableCell>
                      <TableCell className="py-1.5 pr-5 text-right font-bold">{formatCurrency(aggregateCalc.indirilebilirKDVToplam)}</TableCell>
                    </TableRow>
                    <TableRow className={cn("hover:bg-transparent", aggregateCalc.odenecekKDV > 0 ? "bg-red-50 border-b border-red-100" : "bg-blue-50 border-b border-blue-100")}>
                      <TableCell className={cn("py-2 pl-5 font-bold", aggregateCalc.odenecekKDV > 0 ? "text-red-900" : "text-blue-900")}>Ödenecek KDV</TableCell>
                      <TableCell className={cn("py-2 pr-5 text-right font-bold", aggregateCalc.odenecekKDV > 0 ? "text-red-900" : "text-blue-900")}>{formatCurrency(aggregateCalc.odenecekKDV)}</TableCell>
                    </TableRow>
                    <TableRow className={cn("hover:bg-transparent", aggregateCalc.devredenKDV > 0 ? "bg-blue-50" : "")}>
                      <TableCell className="py-2 pl-5 font-bold text-blue-900">Biriken (Devreden) KDV</TableCell>
                      <TableCell className="py-2 pr-5 text-right font-bold text-blue-900">{formatCurrency(aggregateCalc.devredenKDV)}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Unit Economics */}
            <Card className="border-0 shadow-[0_6px_16px_rgba(0,0,0,0.1)] overflow-hidden h-fit">
              <CardHeader className="pb-3 pt-5 px-5 border-b border-slate-100">
                <CardTitle className="text-[1.1em] font-semibold text-blue-600 flex items-center gap-2">
                  <PieChart className="w-5 h-5" />
                  Birim Ekonomisi
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableBody className="text-[0.9em]">
                    <TableRow className="border-b border-slate-50 hover:bg-transparent">
                      <TableCell className="py-2 pl-5 font-medium flex items-center gap-2">
                        Birim Satış Fiyatı (Net)
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="w-3.5 h-3.5 text-slate-400 cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent side="left" className="max-w-xs bg-white text-slate-900">
                            <p className="text-xs">Satış fiyatından KDV çıkartılan net tutarı</p>
                          </TooltipContent>
                        </Tooltip>
                      </TableCell>
                      <TableCell className="py-2 pr-5 text-right">{formatCurrency(aggregateCalc.birimSatisFiyatiNet)}</TableCell>
                    </TableRow>
                    <TableRow className="border-b border-slate-50 hover:bg-transparent">
                      <TableCell className="py-2 pl-5 font-medium flex items-center gap-2">
                        Birim Alış Maliyeti (Net)
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="w-3.5 h-3.5 text-slate-400 cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent side="left" className="max-w-xs bg-white text-slate-900">
                            <p className="text-xs">Ürün maliyetinden KDV çıkartılan net tutarı</p>
                          </TooltipContent>
                        </Tooltip>
                      </TableCell>
                      <TableCell className="py-2 pr-5 text-right">{formatCurrency(aggregateCalc.birimAlisMaliyet)}</TableCell>
                    </TableRow>
                    <TableRow className="border-b border-slate-50 hover:bg-transparent">
                      <TableCell className="py-2 pl-5 font-medium flex items-center gap-2">
                        Birim Komisyon (Net)
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="w-3.5 h-3.5 text-slate-400 cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent side="left" className="max-w-xs bg-white text-slate-900">
                            <p className="text-xs">Toplam komisyon ÷ satış adedi</p>
                          </TooltipContent>
                        </Tooltip>
                      </TableCell>
                      <TableCell className="py-2 pr-5 text-right">{formatCurrency(aggregateCalc.birimKomisyonNet)}</TableCell>
                    </TableRow>
                    <TableRow className="border-b border-slate-50 hover:bg-transparent">
                      <TableCell className="py-2 pl-5 font-medium flex items-center gap-2">
                        Birim Kargo (Net)
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="w-3.5 h-3.5 text-slate-400 cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent side="left" className="max-w-xs bg-white text-slate-900">
                            <p className="text-xs">Toplam kargo gideri ÷ satış adedi</p>
                          </TooltipContent>
                        </Tooltip>
                      </TableCell>
                      <TableCell className="py-2 pr-5 text-right">{formatCurrency(aggregateCalc.birimKargoNet)}</TableCell>
                    </TableRow>
                    <TableRow className="border-b border-slate-50 hover:bg-transparent">
                      <TableCell className="py-2 pl-5 font-medium flex items-center gap-2">
                        Birim Platform Bedeli (Net)
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="w-3.5 h-3.5 text-slate-400 cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent side="left" className="max-w-xs bg-white text-slate-900">
                            <p className="text-xs">Platform hizmet bedeli ÷ satış adedi</p>
                          </TooltipContent>
                        </Tooltip>
                      </TableCell>
                      <TableCell className="py-2 pr-5 text-right">{formatCurrency(aggregateCalc.birimPlatformFeeNet)}</TableCell>
                    </TableRow>
                    <TableRow className="border-b border-slate-50 hover:bg-transparent">
                      <TableCell className="py-2 pl-5 font-medium flex items-center gap-2">
                        Birim Stopaj (Net)
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="w-3.5 h-3.5 text-slate-400 cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent side="left" className="max-w-xs bg-white text-slate-900">
                            <p className="text-xs">Satış fiyatı × %1 stopaj oranı</p>
                          </TooltipContent>
                        </Tooltip>
                      </TableCell>
                      <TableCell className="py-2 pr-5 text-right">{formatCurrency(aggregateCalc.birimStopajNet)}</TableCell>
                    </TableRow>
                    <TableRow className="border-b border-slate-50 hover:bg-transparent">
                      <TableCell className="py-2 pl-5 font-medium flex items-center gap-2">
                        Birim Sabit Gider Payı
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="w-3.5 h-3.5 text-slate-400 cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent side="left" className="max-w-xs bg-white text-slate-900">
                            <p className="text-xs">Toplam sabit giderler ÷ satış adedi</p>
                          </TooltipContent>
                        </Tooltip>
                      </TableCell>
                      <TableCell className="py-2 pr-5 text-right">{formatCurrency(aggregateCalc.birimSabitGiderler)}</TableCell>
                    </TableRow>
                    <TableRow className="bg-slate-100 hover:bg-slate-100 border-b border-slate-200">
                      <TableCell className="py-2 pl-5 font-bold flex items-center gap-2">
                        Birim Maliyetler Toplamı
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="w-3.5 h-3.5 text-slate-400 cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent side="left" className="max-w-xs bg-white text-slate-900">
                            <p className="text-xs">Birim alış + birim komisyon + birim kargo + birim platform + birim stopaj + birim sabit gider</p>
                          </TooltipContent>
                        </Tooltip>
                      </TableCell>
                      <TableCell className="py-2 pr-5 text-right font-bold">{formatCurrency(aggregateCalc.birimMaliyetlerToplam)}</TableCell>
                    </TableRow>
                    <TableRow className="hover:bg-transparent">
                      <TableCell className="py-2 pl-5 font-medium flex items-center gap-2">
                        Birim Vergi
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="w-3.5 h-3.5 text-slate-400 cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent side="left" className="max-w-xs bg-white text-slate-900">
                            <p className="text-xs">Toplam vergi ÷ satış adedi</p>
                          </TooltipContent>
                        </Tooltip>
                      </TableCell>
                      <TableCell className="py-2 pr-5 text-right">{formatCurrency(aggregateCalc.birimVergi)}</TableCell>
                    </TableRow>
                    <TableRow className={cn("border-t hover:bg-transparent", aggregateCalc.birimNetKar >= 0 ? "bg-[#d1e7dd] border-green-200" : "bg-[#ffe6e6] border-red-200")}>
                      <TableCell className={cn("py-2 pl-5 font-bold flex items-center gap-2", aggregateCalc.birimNetKar >= 0 ? "text-green-900" : "text-red-900")}>
                        Birim Net Kâr
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="w-3.5 h-3.5 cursor-help" style={{ color: aggregateCalc.birimNetKar >= 0 ? '#065f46' : '#7f1d1d' }} />
                          </TooltipTrigger>
                          <TooltipContent side="left" className="max-w-xs bg-white text-slate-900">
                            <p className="text-xs">Birim satış - birim toplam maliyet - birim vergi</p>
                          </TooltipContent>
                        </Tooltip>
                      </TableCell>
                      <TableCell className={cn("py-2 pr-5 text-right font-bold", aggregateCalc.birimNetKar >= 0 ? "text-green-900" : "text-red-900")}>{formatCurrency(aggregateCalc.birimNetKar)}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Results Table */}
        {results.length > 0 && (
          <Card className="border-0 shadow-[0_8px_24px_rgba(0,0,0,0.15)] overflow-hidden">
            <CardHeader className="bg-white border-b border-slate-100 pb-3 pt-5">
              <CardTitle className="text-[1.1em] font-semibold text-blue-600">Simülasyon Sonuçları (Ürün Detayı)</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50 hover:bg-slate-50">
                      <TableHead className="text-left py-3 pl-6 font-semibold text-slate-700">Ürün Adı</TableHead>
                      <TableHead className="text-right py-3 pr-6 font-semibold text-slate-700">Satış Tutarı (₺, KDV Dahil)</TableHead>
                      <TableHead className="text-right py-3 pr-6 font-semibold text-slate-700">Satış Tutarı (₺, KDV Hariç)</TableHead>
                      <TableHead className="text-right py-3 pr-6 font-semibold text-slate-700">Satış Adedi</TableHead>
                      <TableHead className="text-right py-3 pr-6 font-semibold text-slate-700">Ürün Maliyeti (₺, KDV Dahil)</TableHead>
                      <TableHead className="text-right py-3 pr-6 font-semibold text-slate-700">KDV Oranı (%)</TableHead>
                      <TableHead className="text-right py-3 pr-6 font-semibold text-slate-700">
                        <div className="flex items-center justify-end gap-1">
                          <span>Toplam Giderler (₺)</span>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info className="w-4 h-4 text-slate-500 cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent side="right" className="max-w-xs bg-white text-slate-900">
                              <p>Satılan Malın Maliyeti + Pazaryeri Komisyonu + Kargo + Platform Bedeli + Stopaj + Sabit Giderler (oranlanmış) + Vergi</p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      </TableHead>
                      <TableHead className="text-right py-3 pr-6 font-semibold text-slate-700">Net Kâr/Zarar (₺)</TableHead>
                      <TableHead className="text-right py-3 pr-6 font-semibold text-slate-700">Birim Kâr (₺)</TableHead>
                      <TableHead className="text-right py-3 pr-6 font-semibold text-slate-700">Kâr Marjı (%)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {results.slice(0, showAll ? results.length : 5).map((result, idx) => {
                      const product = bulkProducts[idx];
                      return (
                        <TableRow key={idx} className="border-b border-slate-50 hover:bg-slate-50">
                          <TableCell className="py-3 pl-6 font-medium text-slate-700">{result.productName}</TableCell>
                          <TableCell className="py-3 pr-6 text-right">{formatCurrency(result.totalSalesRevenue)}</TableCell>
                          <TableCell className="py-3 pr-6 text-right">{formatCurrency(result.netSatisHasilatiKDVHariç)}</TableCell>
                          <TableCell className="py-3 pr-6 text-right">{formatNumber(result.totalSalesQuantity)}</TableCell>
                          <TableCell className="py-3 pr-6 text-right">{formatCurrency(result.totalCost)}</TableCell>
                          <TableCell className="py-3 pr-6 text-right">{product?.vatRate}%</TableCell>
                          <TableCell className="py-3 pr-6 text-right">{formatCurrency(result.totalExpenses)}</TableCell>
                          <TableCell
                            className={`py-3 pr-6 text-right font-semibold ${
                              result.netProfit >= 0 ? 'text-emerald-600' : 'text-red-600'
                            }`}
                          >
                            {formatCurrency(result.netProfit)}
                          </TableCell>
                          <TableCell
                            className={`py-3 pr-6 text-right font-semibold ${
                              result.birimKar >= 0 ? 'text-emerald-600' : 'text-red-600'
                            }`}
                          >
                            {formatCurrency(result.birimKar)}
                          </TableCell>
                          <TableCell className="py-3 pr-6 text-right text-blue-600 font-medium">
                            {(result.profitMargin * 100).toFixed(2)}%
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    <TableRow className="bg-slate-100 hover:bg-slate-100 font-bold">
                      <TableCell className="py-3 pl-6 text-slate-800">TOPLAM</TableCell>
                      <TableCell className="py-3 pr-6 text-right text-slate-800">
                        {formatCurrency(excelTotals.totalRevenue)}
                      </TableCell>
                      <TableCell className="py-3 pr-6 text-right text-slate-800">
                        {formatCurrency(aggregateCalc?.netSatisHasilati || 0)}
                      </TableCell>
                      <TableCell className="py-3 pr-6 text-right text-slate-800">
                        {formatNumber(excelTotals.totalQuantity)}
                      </TableCell>
                      <TableCell className="py-3 pr-6 text-right text-slate-800">
                        {formatCurrency(aggregateCalc?.smToplam || 0)}
                      </TableCell>
                      <TableCell className="py-3 pr-6 text-right text-slate-800">-</TableCell>
                      <TableCell className="py-3 pr-6 text-right text-slate-800">
                        {formatCurrency(aggregateCalc ? (aggregateCalc.smToplam + aggregateCalc.faaliyetGiderleriToplam + aggregateCalc.vergi) : 0)}
                      </TableCell>
                      <TableCell
                        className={`py-3 pr-6 text-right ${
                          aggregateCalc && aggregateCalc.netKar >= 0 ? 'text-emerald-600' : 'text-red-600'
                        }`}
                      >
                        {formatCurrency(aggregateCalc?.netKar || 0)}
                      </TableCell>
                      <TableCell
                        className={`py-3 pr-6 text-right font-semibold ${
                          aggregateCalc && aggregateCalc.birimNetKar >= 0 ? 'text-emerald-600' : 'text-red-600'
                        }`}
                      >
                        {formatCurrency(aggregateCalc?.birimNetKar || 0)}
                      </TableCell>
                      <TableCell className="py-3 pr-6 text-right text-blue-600">
                        {aggregateCalc
                          ? ((aggregateCalc.marginNet * 100).toFixed(2))
                          : '0'}
                        %
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
              {results.length > 5 && (
                <div className="border-t border-slate-100 px-6 py-4 bg-slate-50 flex justify-center">
                  <Button
                    onClick={() => setShowAll(!showAll)}
                    variant="outline"
                    className="text-blue-600 border-blue-200 hover:bg-blue-50"
                  >
                    {showAll ? 'Daha Azını Göster' : 'Daha Fazlasını Göster'}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Financial Analysis & Recommendations - Full Width */}
        {aggregateCalc && (
          <Card className="border-0 shadow-[0_8px_24px_rgba(0,0,0,0.15)]">
            <CardHeader className="pb-3 pt-5 px-5 border-b border-slate-100">
              <CardTitle className="text-[1.1em] font-semibold text-blue-600 flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Finansal Analiz & Öneriler
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-6">
                {/* Mevcut Durum - Expanded */}
                <div className={cn(
                  "p-4 rounded-lg border-2 space-y-4",
                  aggregateCalc.netKar > 0
                    ? "bg-emerald-50 border-emerald-200"
                    : aggregateCalc.netKar === 0
                    ? "bg-amber-50 border-amber-200"
                    : "bg-red-50 border-red-200"
                )}>
                  <div className="flex items-start gap-3 pb-4 border-b border-current border-opacity-10">
                    <div className={cn(
                      "rounded-full p-2 mt-0.5",
                      aggregateCalc.netKar > 0
                        ? "bg-emerald-100"
                        : aggregateCalc.netKar === 0
                        ? "bg-amber-100"
                        : "bg-red-100"
                    )}>
                      {aggregateCalc.netKar > 0 && <TrendingUp className="w-5 h-5 text-emerald-600" />}
                      {aggregateCalc.netKar === 0 && <DollarSign className="w-5 h-5 text-amber-600" />}
                      {aggregateCalc.netKar < 0 && <TrendingUp className="w-5 h-5 text-red-600 rotate-180" />}
                    </div>
                    <div className="flex-1">
                      <p className={cn(
                        "font-bold text-lg",
                        aggregateCalc.netKar > 0
                          ? "text-emerald-900"
                          : aggregateCalc.netKar === 0
                          ? "text-amber-900"
                          : "text-red-900"
                      )}>
                        {aggregateCalc.netKar > 0
                          ? "✓ İşletme Kârlı"
                          : aggregateCalc.netKar === 0
                          ? "◐ Başa Baş Noktası"
                          : "✗ İşletme Zararlı"}
                      </p>
                      <p className={cn(
                        "text-xs mt-2",
                        aggregateCalc.netKar > 0
                          ? "text-emerald-800"
                          : aggregateCalc.netKar === 0
                          ? "text-amber-800"
                          : "text-red-800"
                      )}>
                        {aggregateCalc.netKar > 0
                          ? `Aylık net kâr ${formatCurrency(aggregateCalc.netKar)} olup marjınız ${(aggregateCalc.marginNet * 100).toFixed(2)}%. Bu sağlıklı bir düzeydir.`
                          : aggregateCalc.netKar === 0
                          ? "Gelirler giderlere tam olarak eşit. Çok hafif bir kar baskısı veya büyüme yatırımı yapılabilir."
                          : `Aylık kayıp ${formatCurrency(Math.abs(aggregateCalc.netKar))}. Acil iyileştirme gereklidir.`}
                      </p>
                    </div>
                  </div>
                  
                  {/* KPI Metrics Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                    <div className="bg-white/50 p-2 rounded">
                      <p className="text-slate-600 font-medium">Brüt Marj</p>
                      <p className="text-base font-bold text-slate-900">{((aggregateCalc.brutKar / aggregateCalc.netSatisHasilati) * 100).toFixed(1)}%</p>
                    </div>
                    <div className="bg-white/50 p-2 rounded">
                      <p className="text-slate-600 font-medium">Net Marj</p>
                      <p className="text-base font-bold text-slate-900">{(aggregateCalc.marginNet * 100).toFixed(2)}%</p>
                    </div>
                    <div className="bg-white/50 p-2 rounded">
                      <p className="text-slate-600 font-medium">Faaliyet Kar Oranı</p>
                      <p className="text-base font-bold text-slate-900">{((aggregateCalc.faaliyetKar / aggregateCalc.netSatisHasilati) * 100).toFixed(2)}%</p>
                    </div>
                    <div className="bg-white/50 p-2 rounded">
                      <p className="text-slate-600 font-medium">Toplam Satış Adedi</p>
                      <p className="text-base font-bold text-slate-900">{formatNumber(excelTotals.totalQuantity)}</p>
                    </div>
                  </div>
                </div>

                {/* Gider Yapısı Analizi - Detailed */}
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-4">
                  <p className="font-semibold text-slate-700 flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-blue-600" />
                    Gider Yapısı Analizi (Detaylı)
                  </p>
                  
                  {/* SMM Analysis */}
                  <div className="bg-white p-3 rounded border border-slate-100">
                    <div className="flex justify-between items-center mb-2">
                      <div>
                        <p className="text-xs font-medium text-slate-600">Satılan Malın Maliyeti (SMM)</p>
                        <p className="text-xs text-slate-500 mt-0.5">{formatCurrency(aggregateCalc.smToplam)}</p>
                      </div>
                      <span className="font-bold text-lg text-orange-600">
                        {((aggregateCalc.smToplam / aggregateCalc.netSatisHasilati) * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-orange-500 h-2 rounded-full" style={{ width: `${Math.min(((aggregateCalc.smToplam / aggregateCalc.netSatisHasilati) * 100), 100)}%` }}></div>
                    </div>
                    <p className="text-xs text-slate-500 mt-2">
                      {((aggregateCalc.smToplam / aggregateCalc.netSatisHasilati) * 100) > 55 
                        ? "⚠ Yüksek: Ürün maliyetini azaltma veya fiyat artırma düşünün" 
                        : ((aggregateCalc.smToplam / aggregateCalc.netSatisHasilati) * 100) > 45
                        ? "→ Orta-Yüksek: Tedarikçi müzakereleri önerilir"
                        : "✓ Sağlıklı: Maliyetler kontrol altında"}
                    </p>
                  </div>

                  {/* Variable Expenses Breakdown */}
                  <div className="bg-white p-3 rounded border border-slate-100">
                    <div className="flex justify-between items-center mb-2">
                      <div>
                        <p className="text-xs font-medium text-slate-600">Değişken Giderler (Toplam)</p>
                        <p className="text-xs text-slate-500 mt-0.5">Komisyon + Kargo + Platform + Stopaj</p>
                      </div>
                      <span className="font-bold text-lg text-blue-600">
                        {(((aggregateCalc.komisyonToplam + aggregateCalc.kargoToplam + aggregateCalc.platformFeeToplam + aggregateCalc.stopajToplam) / aggregateCalc.netSatisHasilati) * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${Math.min((((aggregateCalc.komisyonToplam + aggregateCalc.kargoToplam + aggregateCalc.platformFeeToplam + aggregateCalc.stopajToplam) / aggregateCalc.netSatisHasilati) * 100), 100)}%` }}></div>
                    </div>
                    <div className="text-xs mt-3 space-y-1 text-slate-600">
                      <div className="flex justify-between">
                        <span>  • Komisyon</span>
                        <span>{((aggregateCalc.komisyonToplam / aggregateCalc.netSatisHasilati) * 100).toFixed(1)}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span>  • Kargo</span>
                        <span>{((aggregateCalc.kargoToplam / aggregateCalc.netSatisHasilati) * 100).toFixed(1)}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span>  • Platform</span>
                        <span>{((aggregateCalc.platformFeeToplam / aggregateCalc.netSatisHasilati) * 100).toFixed(1)}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span>  • Stopaj</span>
                        <span>{((aggregateCalc.stopajToplam / aggregateCalc.netSatisHasilati) * 100).toFixed(1)}%</span>
                      </div>
                    </div>
                  </div>

                  {/* Fixed Expenses Breakdown */}
                  <div className="bg-white p-3 rounded border border-slate-100">
                    <div className="flex justify-between items-center mb-2">
                      <div>
                        <p className="text-xs font-medium text-slate-600">Sabit Giderler (Toplam)</p>
                        <p className="text-xs text-slate-500 mt-0.5">{formatCurrency(aggregateCalc.sabitGiderlerToplamNet)}</p>
                      </div>
                      <span className="font-bold text-lg text-purple-600">
                        {((aggregateCalc.sabitGiderlerToplamNet / aggregateCalc.netSatisHasilati) * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-purple-500 h-2 rounded-full" style={{ width: `${Math.min(((aggregateCalc.sabitGiderlerToplamNet / aggregateCalc.netSatisHasilati) * 100), 100)}%` }}></div>
                    </div>
                    <div className="text-xs mt-3 space-y-1 text-slate-600">
                      <div className="flex justify-between">
                        <span>  • Personel</span>
                        <span>{((aggregateCalc.personelNet / aggregateCalc.netSatisHasilati) * 100).toFixed(1)}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span>  • Depo/Kira</span>
                        <span>{((aggregateCalc.depoNet / aggregateCalc.netSatisHasilati) * 100).toFixed(1)}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span>  • Muhasebe</span>
                        <span>{((aggregateCalc.muhasebeNet / aggregateCalc.netSatisHasilati) * 100).toFixed(1)}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span>  • Pazarlama</span>
                        <span>{((aggregateCalc.pazarlamaNet / aggregateCalc.netSatisHasilati) * 100).toFixed(1)}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span>  • Diğer</span>
                        <span>{((aggregateCalc.digerGiderlerNet / aggregateCalc.netSatisHasilati) * 100).toFixed(1)}%</span>
                      </div>
                    </div>
                  </div>

                  {/* Gider Yapısı Özeti */}
                  <div className="bg-gradient-to-r from-blue-50 to-slate-50 p-3 rounded border border-blue-100">
                    <p className="text-xs font-semibold text-slate-700 mb-2">Gider Dağılımı Özeti:</p>
                    <div className="text-xs text-slate-600 space-y-1">
                      <div className="flex justify-between">
                        <span>SMM + Değişken + Sabit</span>
                        <span className="font-medium">= {(((aggregateCalc.smToplam + aggregateCalc.komisyonToplam + aggregateCalc.kargoToplam + aggregateCalc.platformFeeToplam + aggregateCalc.stopajToplam + aggregateCalc.sabitGiderlerToplamNet) / aggregateCalc.netSatisHasilati) * 100).toFixed(1)}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Net Marj + Vergi</span>
                        <span className="font-medium">= {(((aggregateCalc.netKar + aggregateCalc.vergi) / aggregateCalc.netSatisHasilati) * 100).toFixed(1)}%</span>
                      </div>
                      <div className="flex justify-between font-semibold border-t border-blue-200 pt-1 mt-1">
                        <span>Toplam</span>
                        <span>= 100%</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Dynamic Recommendations - Comprehensive & Quantitative */}
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 space-y-4">
                  <p className="font-semibold text-blue-900 flex items-center gap-2">
                    <Target className="w-4 h-4" />
                    Kapsamlı Öneriler & Nicel Eylem Planı
                  </p>

                  {/* LOSS SCENARIO */}
                  {aggregateCalc.netKar < 0 && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3 space-y-2">
                      <p className="font-bold text-red-900">🚨 ZARARLANAN İŞLETME - ACİL MÜDAHALE GEREKLI</p>
                      
                      <div className="text-xs text-red-800 space-y-2 bg-white/50 p-2 rounded">
                        <p><strong>Mevcut Durum:</strong> Aylık kayıp = {formatCurrency(Math.abs(aggregateCalc.netKar))}</p>
                        
                        <p className="font-semibold mt-2">Başa Baş Yapması İçin Gereken Senaryolar:</p>
                        <div className="pl-2 space-y-1.5 text-red-700">
                          <p>
                            1️⃣ <strong>Satış Hacmi Artırımı:</strong> Toplam satışları {formatCurrency(aggregateCalc.netSatisHasilati + Math.abs(aggregateCalc.netKar))} seviyesine çıkarmalı 
                            ({Math.round(Math.abs(aggregateCalc.netKar / aggregateCalc.netSatisHasilati) * 100)}% artış gerekli)
                          </p>
                          <p>
                            2️⃣ <strong>Fiyat Artırımı:</strong> Ürün fiyatlarını {(Math.abs(aggregateCalc.netKar / aggregateCalc.netSatisHasilati) * 100).toFixed(1)}% yükseltmeli
                          </p>
                          <p>
                            3️⃣ <strong>SMM Azaltma:</strong> Satılan malın maliyetini {formatCurrency(aggregateCalc.smToplam - Math.abs(aggregateCalc.netKar))} seviyesine indir ({(Math.abs(aggregateCalc.netKar / aggregateCalc.smToplam) * 100).toFixed(1)}% azaltma)
                          </p>
                          <p>
                            4️⃣ <strong>Sabit Gider Azaltma:</strong> Sabit giderleri {formatCurrency(aggregateCalc.sabitGiderlerToplamNet - Math.abs(aggregateCalc.netKar))} seviyesine düşür ({(Math.abs(aggregateCalc.netKar / aggregateCalc.sabitGiderlerToplamNet) * 100).toFixed(1)}% kesinti)
                          </p>
                        </div>

                        <p className="font-semibold mt-2">Optimal Strateji (Birleşik Yaklaşım):</p>
                        <div className="pl-2 space-y-1 text-red-700">
                          <p>• SMM'yi %3 düşür → Kar +{formatCurrency(aggregateCalc.smToplam * 0.03)}</p>
                          <p>• Fiyatı %2 arttır → Kar +{formatCurrency(aggregateCalc.netSatisHasilati * 0.02)}</p>
                          <p>• Sabit giderleri %8 kes → Kar +{formatCurrency(aggregateCalc.sabitGiderlerToplamNet * 0.08)}</p>
                          <p className="font-bold">= Toplamda +{formatCurrency((aggregateCalc.smToplam * 0.03) + (aggregateCalc.netSatisHasilati * 0.02) + (aggregateCalc.sabitGiderlerToplamNet * 0.08))} Kar</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* PROFITABILITY ANALYSIS */}
                  {aggregateCalc.netKar > 0 && (
                    <div className="space-y-2">
                      {/* Runway Analysis */}
                      <div className={cn(
                        "border rounded-lg p-3 text-xs",
                        aggregateCalc.marginNet >= 0.15
                          ? "bg-green-50 border-green-200 text-green-800"
                          : aggregateCalc.marginNet >= 0.08
                          ? "bg-sky-50 border-sky-200 text-sky-800"
                          : "bg-amber-50 border-amber-200 text-amber-800"
                      )}>
                        <p className="font-semibold mb-2">
                          {aggregateCalc.marginNet >= 0.15 
                            ? "✓ GÜÇLÜ PERFORMANS - Ekspansiyon Fırsatları"
                            : aggregateCalc.marginNet >= 0.08
                            ? "✓ SAĞLIKLI PERFORMANS - Optimizasyon Alanları"
                            : "▲ SINIR DURUMU - Acil İyileştirme"}
                        </p>
                        
                        <div className="space-y-1.5">
                          <p><strong>Net Marj:</strong> {(aggregateCalc.marginNet * 100).toFixed(2)}% | Aylık Kar: {formatCurrency(aggregateCalc.netKar)}</p>
                          <p><strong>Operasyonel Runway:</strong> Mevcut karla {aggregateCalc.netKar > 0 ? Math.round(aggregateCalc.netKar / (aggregateCalc.sabitGiderlerToplamNet / 30)) : 0} gün boyunca sabit giderleri karşılayabilir</p>
                          <p><strong>Yıllık Tahmin:</strong> {formatCurrency(aggregateCalc.netKar * 12)} net kar | {formatCurrency(aggregateCalc.vergi * 12)} vergi ödemesi</p>
                        </div>
                      </div>

                      {/* Optimization Opportunities */}
                      <div className="bg-white border border-slate-200 rounded-lg p-3 text-xs space-y-2">
                        <p className="font-semibold text-slate-800">💡 Marj İyileştirme Fırsatları (Nicel Etkiler):</p>
                        
                        <div className="space-y-1.5 text-slate-700 bg-slate-50 p-2 rounded">
                          <p>
                            <strong>1. SMM Optimizasyonu:</strong><br/>
                            • Tedarikçi müzakeresi ile %2 azaltma → Aylık kar +{formatCurrency(aggregateCalc.smToplam * 0.02)} ({((aggregateCalc.smToplam * 0.02) / aggregateCalc.netKar * 100).toFixed(0)}% artış)
                          </p>

                          <p>
                            <strong>2. Komisyon/Kargo Azaltma:</strong><br/>
                            • Pazaryeri değişimi veya doğrudan satış %1-2 azaltma → Aylık kar +{formatCurrency((aggregateCalc.komisyonToplam + aggregateCalc.kargoToplam) * 0.015)}
                          </p>

                          <p>
                            <strong>3. Sabit Gider Verimlilik:</strong><br/>
                            • Operasyon verimlilik %10 artırma → Sabit gider azalma = {formatCurrency(aggregateCalc.sabitGiderlerToplamNet * 0.10)}/ay
                          </p>

                          <p>
                            <strong>4. Satış Hacmi Artırımı (Ölçek Fırsatı):</strong><br/>
                            • Satışları %20 arttırıp giderleri sabit tutuluşu → Yeni net kar = {formatCurrency(aggregateCalc.netKar + (aggregateCalc.netSatisHasilati * 0.20 * aggregateCalc.marginNet))} ({((aggregateCalc.netKar + (aggregateCalc.netSatisHasilati * 0.20 * aggregateCalc.marginNet)) / aggregateCalc.netKar * 100).toFixed(0)}% artış)
                          </p>
                        </div>

                        <p className="font-semibold text-slate-800 mt-2">🎯 Önerilen Hedef Marj:</p>
                        <div className="space-y-1 text-slate-700">
                          <p>
                            {aggregateCalc.marginNet < 0.10 
                              ? `• Hedef Marj: 12% (Şu anda: ${(aggregateCalc.marginNet * 100).toFixed(2)}%)` 
                              : `• Hedef Marj: 18% (Şu anda: ${(aggregateCalc.marginNet * 100).toFixed(2)}%)`}
                          </p>
                          <p>
                            • Hedef ulaşabilmek için: {formatCurrency(aggregateCalc.netSatisHasilati * 0.12 - aggregateCalc.netKar)} aylık ek kar gerekli
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* HIGH COMMISSION WARNING */}
                  {(aggregateCalc.komisyonToplam / aggregateCalc.netSatisHasilati) > 0.18 && (
                    <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3 text-xs text-indigo-800">
                      <p className="font-semibold mb-1">⚠️ YÜKSEK KOMİSYON YÜKÜ</p>
                      <p><strong>Mevcut:</strong> {((aggregateCalc.komisyonToplam / aggregateCalc.netSatisHasilati) * 100).toFixed(1)}% ({formatCurrency(aggregateCalc.komisyonToplam)}/ay)</p>
                      <p><strong>Etkileri:</strong></p>
                      <ul className="pl-4 space-y-0.5 mt-1">
                        <li>• %1 komisyon azaltma → Aylık kar +{formatCurrency(aggregateCalc.netSatisHasilati * 0.01)}</li>
                        <li>• Platformu %15 azalan komisyona geçişi → Aylık kar +{formatCurrency(aggregateCalc.komisyonToplam * 0.15)}</li>
                        <li>• Aksiyonel: Doğrudan satış kanalına geçiş %20 kadar komisyon azaltabilir</li>
                      </ul>
                    </div>
                  )}

                  {/* TAX OPTIMIZATION */}
                  {aggregateCalc.netKar > 0 && (aggregateCalc.vergi / aggregateCalc.netKar) > 0.35 && (
                    <div className="bg-rose-50 border border-rose-200 rounded-lg p-3 text-xs text-rose-800">
                      <p className="font-semibold mb-1">💼 VERGİ OPTİMİZASYON FURSATI</p>
                      <p><strong>Vergi Oranı:</strong> {((aggregateCalc.vergi / aggregateCalc.netKar) * 100).toFixed(0)}% (Karınızın)</p>
                      <p><strong>Muhasebe ile İncelenebilir:</strong></p>
                      <ul className="pl-4 space-y-0.5 mt-1">
                        <li>• Engelli işletme tarafından ürün satışı avantajları</li>
                        <li>• Ar-Ge ve eğitim gider indirimleri</li>
                        <li>• Vergi planlaması ve dönem yatırımları</li>
                        <li>• Potansiyel tasarruf: {formatCurrency(aggregateCalc.vergi * 0.15)} - {formatCurrency(aggregateCalc.vergi * 0.25)}/ay</li>
                      </ul>
                    </div>
                  )}

                  {/* SCALING OPPORTUNITY */}
                  {aggregateCalc.netKar > 0 && (aggregateCalc.sabitGiderlerToplamNet / aggregateCalc.netSatisHasilati) > 0.12 && (
                    <div className="bg-teal-50 border border-teal-200 rounded-lg p-3 text-xs text-teal-800">
                      <p className="font-semibold mb-1">📈 ÖLÇEK FIRSATı - SABIT GİDERLERİ YAYMA</p>
                      <p><strong>Sabit Giderler:</strong> {formatCurrency(aggregateCalc.sabitGiderlerToplamNet)}/ay ({((aggregateCalc.sabitGiderlerToplamNet / aggregateCalc.netSatisHasilati) * 100).toFixed(1)}% satışların)</p>
                      <p className="mt-2"><strong>Satış Hacmi Senaryoları:</strong></p>
                      <ul className="pl-4 space-y-1 mt-1">
                        <li>• +%20 satış → Yeni net kar = {formatCurrency(aggregateCalc.netKar + (aggregateCalc.netSatisHasilati * 0.20 * aggregateCalc.marginNet))}</li>
                        <li>• +%50 satış → Yeni net kar = {formatCurrency(aggregateCalc.netKar + (aggregateCalc.netSatisHasilati * 0.50 * aggregateCalc.marginNet))}</li>
                        <li>• +%100 satış → Yeni net kar = {formatCurrency(aggregateCalc.netKar + (aggregateCalc.netSatisHasilati * 1.0 * aggregateCalc.marginNet))}</li>
                      </ul>
                      <p className="mt-2 font-semibold">Aksiyonlar: Pazarlama artırımı, ürün yelpazesi genişlemesi, yeni pazaryerleri test etme</p>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
