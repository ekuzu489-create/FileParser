import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Navigation } from "@/App";
import { DEFAULT_FORM_VALUES } from "@/lib/defaults";
import { Upload, Download, FileText } from "lucide-react";
import * as XLSX from 'xlsx';

// Constants matching Simulator
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

interface BulkProduct {
  productName: string;
  totalCost: number;
  totalSalesQuantity: number;
  totalSalesRevenue: number;
  vatRate: number;
}

interface BulkResult {
  productName: string;
  totalCost: number;
  totalSalesQuantity: number;
  totalSalesRevenue: number;
  totalExpenses: number;
  netProfit: number;
  profitMargin: number;
}

export default function BulkSimulation() {
  const [globalSettings, setGlobalSettings] = useState(() => {
    try {
      const saved = localStorage.getItem('simulator_form_data');
      return saved ? JSON.parse(saved) : DEFAULT_FORM_VALUES;
    } catch {
      return DEFAULT_FORM_VALUES;
    }
  });

  const [bulkProducts, setBulkProducts] = useState<BulkProduct[]>([]);
  const [results, setResults] = useState<BulkResult[]>([]);

  const downloadTemplate = () => {
    const templateData = [
      ['Product Name', 'Total Cost (₺)', 'Total Sales Quantity (Adet)', 'Total Sales Revenue (₺)', 'VAT Rate (%)'],
      ['Example Product 1', 1000, 100, 15000, 18],
      ['Example Product 2', 500, 50, 8000, 18],
    ];

    const ws = XLSX.utils.aoa_to_sheet(templateData);
    ws['!cols'] = [{ wch: 20 }, { wch: 18 }, { wch: 22 }, { wch: 20 }, { wch: 15 }];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Ürünler');
    XLSX.writeFile(wb, 'Bulk_Simulation_Template.xlsx');
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
        calculateResults(products);
      } catch (error) {
        alert('Dosya okuma hatası. Lütfen geçerli bir Excel dosyası yükleyin.');
        console.error(error);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const calculateResults = (products: BulkProduct[]) => {
    // Calculate total quantities and revenues for apportioning
    const totalQuantity = products.reduce((sum, p) => sum + p.totalSalesQuantity, 0);
    const totalRevenue = products.reduce((sum, p) => sum + (p.totalSalesRevenue / (1 + p.vatRate / 100)), 0);

    const calculated = products.map((product) => {
      const komisyonYuzde = globalSettings.komisyon / 100;
      const iadeOrani = globalSettings.iadeOrani / 100;
      const gelirVergisiYuzde = globalSettings.gelirVergisi / 100;

      // VAT breakdown for costs
      const kargoNetAm = globalSettings.kargo / (1 + GIDER_KDV_ORANI_SABIT / 100);
      const depoNetAm = globalSettings.depo / (1 + GIDER_KDV_ORANI_SABIT / 100);
      const muhasebeNetAm = globalSettings.muhasebe / (1 + GIDER_KDV_ORANI_SABIT / 100);
      const pazarlamaNetAm = globalSettings.pazarlama / (1 + GIDER_KDV_ORANI_SABIT / 100);
      const digerGiderlerNetAm = globalSettings.digerGiderler / (1 + GIDER_KDV_ORANI_SABIT / 100);
      const platformFeeNet = PLATFORM_FEE_KDV_INCL / (1 + GIDER_KDV_ORANI_SABIT / 100);

      // Revenue calculations (exact match with main simulator)
      const brutSatisHasilatiKDVHariç = product.totalSalesRevenue / (1 + product.vatRate / 100);
      const iadeKaybiAdet = product.totalSalesQuantity * iadeOrani;
      const iadeTutariNet = iadeKaybiAdet * (brutSatisHasilatiKDVHariç / product.totalSalesQuantity);
      const netSatisHasilati = brutSatisHasilatiKDVHariç - iadeTutariNet;

      // COGS
      const smToplam = product.totalCost;
      const brutKar = netSatisHasilati - smToplam;

      // Variable expenses
      const komisyonToplam = netSatisHasilati * komisyonYuzde;
      const kargoToplam = kargoNetAm * product.totalSalesQuantity;
      const platformFeeToplam = platformFeeNet * product.totalSalesQuantity;
      const stopajBirim = (brutSatisHasilatiKDVHariç / product.totalSalesQuantity) * STOPAJ_RATE;
      const stopajToplam = stopajBirim * product.totalSalesQuantity;

      // Fixed expenses - apportion based on quantity share
      const quantityShare = totalQuantity > 0 ? product.totalSalesQuantity / totalQuantity : 0;
      const apportionedPersonel = (globalSettings.personel || 0) * quantityShare;
      const apportionedDepo = depoNetAm * quantityShare;
      const apportionedMuhasebe = muhasebeNetAm * quantityShare;
      const apportionedPazarlama = pazarlamaNetAm * quantityShare;
      const apportionedDigerGiderler = digerGiderlerNetAm * quantityShare;

      const sabitGiderlerToplamNet =
        apportionedPersonel + apportionedDepo + apportionedMuhasebe + apportionedPazarlama + apportionedDigerGiderler;

      // Total operating expenses
      const faaliyetGiderleriToplam =
        komisyonToplam + kargoToplam + platformFeeToplam + stopajToplam + sabitGiderlerToplamNet;

      // Profit before tax
      const faaliyetKar = brutKar - faaliyetGiderleriToplam;

      // Tax
      const vergi = faaliyetKar > 0 ? faaliyetKar * gelirVergisiYuzde : 0;

      // Net profit
      const netKar = faaliyetKar - vergi;
      const profitMargin = netSatisHasilati > 0 ? netKar / netSatisHasilati : 0;

      // Total expenses (COGS + Operating expenses)
      const totalExpenses = smToplam + faaliyetGiderleriToplam + vergi;

      return {
        productName: product.productName,
        totalCost: product.totalCost,
        totalSalesQuantity: product.totalSalesQuantity,
        totalSalesRevenue: product.totalSalesRevenue,
        totalExpenses: totalExpenses,
        netProfit: netKar,
        profitMargin: profitMargin,
      };
    });

    setResults(calculated);
  };

  const totals = useMemo(() => {
    return {
      totalCost: results.reduce((sum, r) => sum + r.totalCost, 0),
      totalQuantity: results.reduce((sum, r) => sum + r.totalSalesQuantity, 0),
      totalRevenue: results.reduce((sum, r) => sum + r.totalSalesRevenue, 0),
      totalExpenses: results.reduce((sum, r) => sum + r.totalExpenses, 0),
      totalNetProfit: results.reduce((sum, r) => sum + r.netProfit, 0),
    };
  }, [results]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('tr-TR', {
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="min-h-screen bg-white p-4 md:p-6 font-sans text-slate-900">
      {/* Navigation Tabs - Top Center */}
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
                <div className="relative">
                  <Input
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleFileUpload}
                    className="cursor-pointer"
                    id="excel-upload"
                  />
                  <Label htmlFor="excel-upload" className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer">
                    <Upload className="w-4 h-4 text-slate-400" />
                  </Label>
                </div>
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

        {/* Results Section */}
        {results.length > 0 && (
          <Card className="border-0 shadow-[0_8px_24px_rgba(0,0,0,0.15)] overflow-hidden">
            <CardHeader className="bg-white border-b border-slate-100 pb-3 pt-5">
              <CardTitle className="text-lg font-semibold text-blue-600">Simülasyon Sonuçları</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50 hover:bg-slate-50">
                      <TableHead className="text-left py-3 pl-6 font-semibold text-slate-700">Ürün Adı</TableHead>
                      <TableHead className="text-right py-3 pr-6 font-semibold text-slate-700">Satış Hasılatı (₺)</TableHead>
                      <TableHead className="text-right py-3 pr-6 font-semibold text-slate-700">Satış Adedi</TableHead>
                      <TableHead className="text-right py-3 pr-6 font-semibold text-slate-700">Toplam Giderler (₺)</TableHead>
                      <TableHead className="text-right py-3 pr-6 font-semibold text-slate-700">Net Kâr/Zarar (₺)</TableHead>
                      <TableHead className="text-right py-3 pr-6 font-semibold text-slate-700">Kâr Marjı</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {results.map((result, idx) => (
                      <TableRow key={idx} className="border-b border-slate-50 hover:bg-slate-50">
                        <TableCell className="py-3 pl-6 font-medium text-slate-700">{result.productName}</TableCell>
                        <TableCell className="py-3 pr-6 text-right">{formatCurrency(result.totalSalesRevenue)}</TableCell>
                        <TableCell className="py-3 pr-6 text-right">{formatNumber(result.totalSalesQuantity)}</TableCell>
                        <TableCell className="py-3 pr-6 text-right">{formatCurrency(result.totalExpenses)}</TableCell>
                        <TableCell className={`py-3 pr-6 text-right font-semibold ${result.netProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                          {formatCurrency(result.netProfit)}
                        </TableCell>
                        <TableCell className="py-3 pr-6 text-right text-blue-600 font-medium">
                          {(result.profitMargin * 100).toFixed(2)}%
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="bg-slate-100 hover:bg-slate-100 font-bold">
                      <TableCell className="py-3 pl-6 text-slate-800">TOPLAM</TableCell>
                      <TableCell className="py-3 pr-6 text-right text-slate-800">{formatCurrency(totals.totalRevenue)}</TableCell>
                      <TableCell className="py-3 pr-6 text-right text-slate-800">{formatNumber(totals.totalQuantity)}</TableCell>
                      <TableCell className="py-3 pr-6 text-right text-slate-800">{formatCurrency(totals.totalExpenses)}</TableCell>
                      <TableCell className={`py-3 pr-6 text-right ${totals.totalNetProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                        {formatCurrency(totals.totalNetProfit)}
                      </TableCell>
                      <TableCell className="py-3 pr-6 text-right text-blue-600">
                        {totals.totalRevenue > 0 ? ((totals.totalNetProfit / totals.totalRevenue) * 100).toFixed(2) : '0'}%
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
