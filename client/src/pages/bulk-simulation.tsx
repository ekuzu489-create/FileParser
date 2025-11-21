import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Navigation } from "@/App";
import { DEFAULT_FORM_VALUES } from "@/lib/defaults";
import { Upload, Download, FileText, TrendingUp } from "lucide-react";
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
  sabitGiderlerToplamNet: number;
  faaliyetGiderleriToplam: number;
  faaliyetKar: number;
  vergi: number;
  netKar: number;
  marginNet: number;
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
    const personelNetAm = fixedExpenses.personel / (1 + GIDER_KDV_ORANI_SABIT / 100);
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

      return {
        productName: product.productName,
        totalSalesRevenue: product.totalSalesRevenue,
        totalSalesQuantity: product.totalSalesQuantity,
        totalCost: product.totalCost,
        totalExpenses: totalExpensesNet,
        netProfit: netKarCheck,
        profitMargin: profitMargin,
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

    // VAT extraction for all expenses - all input values are VAT-inclusive
    const personelNetAm = controlPanelValues.personel / (1 + GIDER_KDV_ORANI_SABIT / 100);
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
      sabitGiderlerToplamNet,
      faaliyetGiderleriToplam,
      faaliyetKar,
      vergi,
      netKar,
      marginNet,
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
                </CardHeader>
                <CardContent className="p-5 space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-slate-600">Personel (₺)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={controlPanelValues.personel}
                      onChange={(e) => handleControlPanelChange('personel', e.target.value)}
                      className="h-9 text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-slate-600">Kira / Depo (₺)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={controlPanelValues.depo}
                      onChange={(e) => handleControlPanelChange('depo', e.target.value)}
                      className="h-9 text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-slate-600">Muhasebe (₺)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={controlPanelValues.muhasebe}
                      onChange={(e) => handleControlPanelChange('muhasebe', e.target.value)}
                      className="h-9 text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-slate-600">Pazarlama (₺)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={controlPanelValues.pazarlama}
                      onChange={(e) => handleControlPanelChange('pazarlama', e.target.value)}
                      className="h-9 text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-slate-600">Diğer Giderler (₺)</Label>
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

            {/* Right: Detailed P&L Table */}
            {aggregateCalc && (
              <Card className="border-0 shadow-[0_8px_24px_rgba(0,0,0,0.15)] overflow-hidden">
                <CardHeader className="bg-white border-b border-slate-100 pb-3 pt-5">
                  <CardTitle className="text-[1.1em] font-semibold text-blue-600 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5" />
                    Aylık Kâr/Zarar Tablosu (Agregat)
                  </CardTitle>
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

              {/* Tax Analysis (Detaylı) */}
              {aggregateCalc && (
                <Card className="border-0 shadow-[0_8px_24px_rgba(0,0,0,0.15)] overflow-hidden">
                  <CardHeader className="pb-3 pt-5 px-5 border-b border-slate-100">
                    <CardTitle className="text-[1.1em] font-semibold text-blue-600 flex items-center gap-2">
                      <TrendingUp className="w-5 h-5" />
                      Vergi Analizi (Detaylı)
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <Table>
                      <TableBody className="text-[0.9em]">
                        <TableRow className="border-b border-slate-50">
                          <TableCell className="py-2 pl-6 font-medium text-slate-700">Vergi Öncesi Kâr (EBIT)</TableCell>
                          <TableCell className="py-2 pr-6 text-right font-medium text-slate-700">{formatCurrency(aggregateCalc.faaliyetKar)}</TableCell>
                          <TableCell className="py-2 pr-6 text-right font-medium text-slate-500">
                            {aggregateCalc.netSatisHasilati > 0 
                              ? ((aggregateCalc.faaliyetKar / aggregateCalc.netSatisHasilati) * 100).toFixed(2) 
                              : '0.00'}%
                          </TableCell>
                        </TableRow>
                        <TableRow className="border-b border-slate-50">
                          <TableCell className="py-2 pl-6 font-medium text-red-500">(-) Gelir/Kurumlar Vergisi</TableCell>
                          <TableCell className="py-2 pr-6 text-right text-red-500">{formatCurrency(aggregateCalc.vergi)}</TableCell>
                          <TableCell className="py-2 pr-6 text-right text-red-500">
                            {aggregateCalc.netSatisHasilati > 0 
                              ? ((aggregateCalc.vergi / aggregateCalc.netSatisHasilati) * 100).toFixed(2) 
                              : '0.00'}%
                          </TableCell>
                        </TableRow>
                        <TableRow
                          className={cn(
                            'hover:opacity-90',
                            aggregateCalc.netKar < 0
                              ? 'bg-[#ffe6e6] border-red-200'
                              : 'bg-[#d1e7dd] border-green-200'
                          )}
                        >
                          <TableCell
                            className={cn(
                              'py-3 pl-6 font-bold text-[1em]',
                              aggregateCalc.netKar < 0 ? 'text-red-900' : 'text-green-900'
                            )}
                          >
                            = Net Kâr (Net Profit)
                          </TableCell>
                          <TableCell
                            className={cn(
                              'py-3 pr-6 font-bold text-[1em] text-right',
                              aggregateCalc.netKar < 0 ? 'text-red-900' : 'text-green-900'
                            )}
                          >
                            {formatCurrency(aggregateCalc.netKar)}
                          </TableCell>
                          <TableCell
                            className={cn(
                              'py-3 pr-6 font-bold text-[1em] text-right',
                              aggregateCalc.netKar < 0 ? 'text-red-900' : 'text-green-900'
                            )}
                          >
                            {aggregateCalc.netSatisHasilati > 0 
                              ? ((aggregateCalc.netKar / aggregateCalc.netSatisHasilati) * 100).toFixed(2) 
                              : '0.00'}%
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
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
                      <TableHead className="text-right py-3 pr-6 font-semibold text-slate-700">Satış Tutarı (₺)</TableHead>
                      <TableHead className="text-right py-3 pr-6 font-semibold text-slate-700">Satış Adedi</TableHead>
                      <TableHead className="text-right py-3 pr-6 font-semibold text-slate-700">Ürün Maliyeti (₺)</TableHead>
                      <TableHead className="text-right py-3 pr-6 font-semibold text-slate-700">KDV Oranı (%)</TableHead>
                      <TableHead className="text-right py-3 pr-6 font-semibold text-slate-700">Toplam Giderler (₺)</TableHead>
                      <TableHead className="text-right py-3 pr-6 font-semibold text-slate-700">Net Kâr/Zarar (₺)</TableHead>
                      <TableHead className="text-right py-3 pr-6 font-semibold text-slate-700">Kâr Marjı (%)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {results.map((result, idx) => {
                      const product = bulkProducts[idx];
                      return (
                        <TableRow key={idx} className="border-b border-slate-50 hover:bg-slate-50">
                          <TableCell className="py-3 pl-6 font-medium text-slate-700">{result.productName}</TableCell>
                          <TableCell className="py-3 pr-6 text-right">{formatCurrency(result.totalSalesRevenue)}</TableCell>
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
                          <TableCell className="py-3 pr-6 text-right text-blue-600 font-medium">
                            {(result.profitMargin * 100).toFixed(2)}%
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    <TableRow className="bg-slate-100 hover:bg-slate-100 font-bold">
                      <TableCell className="py-3 pl-6 text-slate-800">TOPLAM</TableCell>
                      <TableCell className="py-3 pr-6 text-right text-slate-800">
                        {formatCurrency(resultsTotals.totalRevenue)}
                      </TableCell>
                      <TableCell className="py-3 pr-6 text-right text-slate-800">
                        {formatNumber(excelTotals.totalQuantity)}
                      </TableCell>
                      <TableCell className="py-3 pr-6 text-right text-slate-800">
                        {formatCurrency(excelTotals.totalCost)}
                      </TableCell>
                      <TableCell className="py-3 pr-6 text-right text-slate-800">-</TableCell>
                      <TableCell className="py-3 pr-6 text-right text-slate-800">
                        {formatCurrency(resultsTotals.totalExpenses)}
                      </TableCell>
                      <TableCell
                        className={`py-3 pr-6 text-right ${
                          resultsTotals.totalNetProfit >= 0 ? 'text-emerald-600' : 'text-red-600'
                        }`}
                      >
                        {formatCurrency(resultsTotals.totalNetProfit)}
                      </TableCell>
                      <TableCell className="py-3 pr-6 text-right text-blue-600">
                        {resultsTotals.totalRevenue > 0
                          ? ((resultsTotals.totalNetProfit / resultsTotals.totalRevenue) * 100).toFixed(2)
                          : '0'}
                        %
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
