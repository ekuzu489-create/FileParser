import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Calculator, TrendingUp, DollarSign, Percent, ArrowUpRight, ArrowDownRight, Scale } from "lucide-react";
import { cn } from "@/lib/utils";

// Constants
const PLATFORM_FEE_KDV_INCL = 10.19;
const GIDER_KDV_ORANI_SABIT = 20;
const STOPAJ_RATE = 0.01;

// Helper Components
const MoneyDisplay = ({ value, className }: { value: number, className?: string }) => {
  const absValue = Math.abs(value);
  const formatted = new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(absValue);

  if (value < 0) {
    return <span className={cn("text-red-600 font-semibold", className)}>({formatted})</span>;
  }
  return <span className={cn("text-emerald-600 font-semibold", className)}>{formatted}</span>;
};

const DiffDisplay = ({ value }: { value: number }) => {
  const absValue = Math.abs(value);
  const formatted = new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(absValue);

  if (value > 0) {
    return (
      <span className="text-emerald-600 font-bold flex items-center gap-1 justify-end">
        <ArrowUpRight className="w-4 h-4" /> {formatted}
      </span>
    );
  } else if (value < 0) {
    return (
      <span className="text-red-600 font-bold flex items-center gap-1 justify-end">
        <ArrowDownRight className="w-4 h-4" /> ({formatted})
      </span>
    );
  }
  return <span className="text-slate-400 font-medium">₺0,00</span>;
};

// Types
type ScenarioData = {
  adet: number;
  satisFiyat: number;
  birimMaliyet: number;
  kargo: number;
  komisyon: number;
  kdvOrani: number;
  iadeOrani: number;
  gelirVergisi: number;
  personel: number;
  depo: number;
  muhasebe: number;
  pazarlama: number;
  digerGiderler: number;
  hedefKarTL: number;
};

const DEFAULT_VALUES: ScenarioData = {
  adet: 500,
  satisFiyat: 999.99,
  birimMaliyet: 312.98,
  kargo: 85.44,
  komisyon: 21,
  kdvOrani: 20,
  iadeOrani: 8,
  gelirVergisi: 25,
  personel: 17082,
  depo: 5000,
  muhasebe: 4800,
  pazarlama: 10000,
  digerGiderler: 2000,
  hedefKarTL: 50000,
};

// Calculation Logic
const solveVAT = (amountKDVIncl: number, vatRate: number) => {
  const rateDecimal = vatRate / 100;
  if (vatRate === 0 || amountKDVIncl === 0) {
    return { net: amountKDVIncl, vat: 0 };
  }
  const net = amountKDVIncl / (1 + rateDecimal);
  const vat = amountKDVIncl - net;
  return { net, vat };
};

const calculateScenario = (data: ScenarioData) => {
  const {
    adet, satisFiyat, birimMaliyet, kargo: kargoVal, komisyon, kdvOrani,
    iadeOrani: iadeOraniVal, gelirVergisi, personel, depo: depoVal,
    muhasebe: muhasebeVal, pazarlama: pazarlamaVal, digerGiderler: digerVal
  } = data;

  if (adet === 0) return null;

  const komisyonYuzde = komisyon / 100;
  const iadeOrani = iadeOraniVal / 100;
  const gelirVergisiYuzde = gelirVergisi / 100;

  // VAT Calculations
  const satis = solveVAT(satisFiyat, kdvOrani);
  const maliyet = solveVAT(birimMaliyet, kdvOrani);
  const kargo = solveVAT(kargoVal, GIDER_KDV_ORANI_SABIT);
  const platformFee = solveVAT(PLATFORM_FEE_KDV_INCL, GIDER_KDV_ORANI_SABIT);
  
  const personelNet = personel;
  const depo = solveVAT(depoVal, GIDER_KDV_ORANI_SABIT);
  const muhasebe = solveVAT(muhasebeVal, GIDER_KDV_ORANI_SABIT);
  const pazarlama = solveVAT(pazarlamaVal, GIDER_KDV_ORANI_SABIT);
  const digerGiderler = solveVAT(digerVal, GIDER_KDV_ORANI_SABIT);

  // Revenue & Gross Profit
  const brutSatisHasilatiKDVHariç = satis.net * adet;
  const iadeKaybiAdet = adet * iadeOrani;
  const iadeTutariNet = iadeKaybiAdet * satis.net;
  
  const netSatisHasilati = brutSatisHasilatiKDVHariç - iadeTutariNet;
  const smToplam = maliyet.net * adet;
  const brutKar = netSatisHasilati - smToplam;

  // Operating Expenses
  const komisyonToplam = netSatisHasilati * komisyonYuzde;
  const kargoToplam = kargo.net * adet;
  const platformFeeToplam = platformFee.net * adet;
  const stopajBirim = satis.net * STOPAJ_RATE;
  const stopajToplam = stopajBirim * adet;

  const sabitGiderlerToplamNet = personelNet + depo.net + muhasebe.net + pazarlama.net + digerGiderler.net;
  const faaliyetGiderleriToplam = komisyonToplam + kargoToplam + platformFeeToplam + stopajToplam + sabitGiderlerToplamNet;

  // Profit
  const faaliyetKar = brutKar - faaliyetGiderleriToplam;
  const vergi = faaliyetKar > 0 ? faaliyetKar * gelirVergisiYuzde : 0;
  const netKar = faaliyetKar - vergi;

  // VAT Analysis
  const satisKDVTutari = satis.vat * (adet - iadeKaybiAdet);
  const alisKDV = maliyet.vat * adet;
  const kargoKDVTutari = kargo.vat * adet;
  const platformFeeKDV = platformFee.vat * adet;
  const komisyonKDV = komisyonToplam * (GIDER_KDV_ORANI_SABIT / 100);
  const sabitGiderlerKDVToplam = depo.vat + muhasebe.vat + pazarlama.vat + digerGiderler.vat;

  const indirilebilirKDVToplam = alisKDV + komisyonKDV + kargoKDVTutari + platformFeeKDV + sabitGiderlerKDVToplam;
  const odenecekKDVBrut = satisKDVTutari - indirilebilirKDVToplam;
  const odenecekKDV = odenecekKDVBrut > 0 ? odenecekKDVBrut : 0;

  // Unit Economics
  const birimToplamMaliyet = faaliyetGiderleriToplam / adet + smToplam / adet;
  const birimKomisyon = komisyonToplam / adet;
  const birimDegiskenMaliyetlerTop = maliyet.net + birimKomisyon + kargo.net + platformFee.net + stopajBirim;
  const katkiPayiBirim = satis.net - birimDegiskenMaliyetlerTop;
  const bepAdet = katkiPayiBirim > 0 ? sabitGiderlerToplamNet / katkiPayiBirim : 0;

  return {
    netSatisHasilati,
    brutKar,
    faaliyetKar,
    faaliyetGiderleriToplam,
    odenecekKDV,
    netKar,
    netKarBirim: netKar / adet,
    katkiPayiBirim,
    bepAdet
  };
};

// Input Form Component
const ScenarioInputForm = ({ 
  data, 
  onChange 
}: { 
  data: ScenarioData, 
  onChange: (key: keyof ScenarioData, value: string) => void 
}) => {
  return (
    <div className="space-y-4 h-full overflow-y-auto pr-2 custom-scrollbar">
      <Card className="border-0 shadow-none p-0">
        <CardHeader className="pb-3 pt-0 px-0 border-b border-slate-100 mb-4">
          <CardTitle className="text-[1.1em] font-semibold text-blue-600 flex items-center gap-2">
            <DollarSign className="w-4 h-4" />
            Satış ve Birim Verileri
          </CardTitle>
        </CardHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-600">Satış Adedi (Ay)</Label>
              <Input className="h-9 text-sm" type="number" step="1" value={data.adet} onChange={(e) => onChange('adet', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-600">Birim Satış (₺)</Label>
              <div className="relative">
                <Input className="h-9 text-sm pr-6" type="number" step="0.01" value={data.satisFiyat} onChange={(e) => onChange('satisFiyat', e.target.value)} />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">₺</span>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-600">Birim Maliyet (₺)</Label>
              <div className="relative">
                <Input className="h-9 text-sm pr-6" type="number" step="0.01" value={data.birimMaliyet} onChange={(e) => onChange('birimMaliyet', e.target.value)} />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">₺</span>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-600">Ort. Kargo (₺)</Label>
              <div className="relative">
                <Input className="h-9 text-sm pr-6" type="number" step="0.01" value={data.kargo} onChange={(e) => onChange('kargo', e.target.value)} />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">₺</span>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-600">Komisyon %</Label>
              <div className="relative">
                <Input className="h-9 text-sm pr-6" type="number" step="0.1" value={data.komisyon} onChange={(e) => onChange('komisyon', e.target.value)} />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">%</span>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-600">KDV %</Label>
              <div className="relative">
                <Input className="h-9 text-sm pr-6" type="number" step="1" value={data.kdvOrani} onChange={(e) => onChange('kdvOrani', e.target.value)} />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">%</span>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-600">İade %</Label>
              <div className="relative">
                <Input className="h-9 text-sm pr-6" type="number" step="0.1" value={data.iadeOrani} onChange={(e) => onChange('iadeOrani', e.target.value)} />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">%</span>
              </div>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-slate-600">Gelir/Kurumlar Vergisi (%)</Label>
            <div className="relative">
              <Input className="h-9 text-sm pr-6" type="number" step="1" value={data.gelirVergisi} onChange={(e) => onChange('gelirVergisi', e.target.value)} />
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">%</span>
            </div>
          </div>
        </div>
      </Card>

      <Card className="border-0 shadow-none p-0 mt-6">
        <CardHeader className="pb-3 pt-0 px-0 border-b border-slate-100 mb-4">
          <CardTitle className="text-[1.1em] font-semibold text-blue-600 flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Sabit Giderler (Aylık)
          </CardTitle>
        </CardHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-600">Personel (₺)</Label>
              <div className="relative">
                <Input className="h-9 text-sm pr-6" type="number" step="0.01" value={data.personel} onChange={(e) => onChange('personel', e.target.value)} />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">₺</span>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-600">Depo / Kira (₺)</Label>
              <div className="relative">
                <Input className="h-9 text-sm pr-6" type="number" step="0.01" value={data.depo} onChange={(e) => onChange('depo', e.target.value)} />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">₺</span>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-600">Muhasebe (₺)</Label>
              <div className="relative">
                <Input className="h-9 text-sm pr-6" type="number" step="0.01" value={data.muhasebe} onChange={(e) => onChange('muhasebe', e.target.value)} />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">₺</span>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-600">Pazarlama (₺)</Label>
              <div className="relative">
                <Input className="h-9 text-sm pr-6" type="number" step="0.01" value={data.pazarlama} onChange={(e) => onChange('pazarlama', e.target.value)} />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">₺</span>
              </div>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-slate-600">Diğer Giderler (₺)</Label>
            <div className="relative">
              <Input className="h-9 text-sm pr-6" type="number" step="0.01" value={data.digerGiderler} onChange={(e) => onChange('digerGiderler', e.target.value)} />
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">₺</span>
            </div>
          </div>
        </div>
      </Card>

      <Card className="border-0 shadow-none p-0 mt-6">
        <CardHeader className="pb-3 pt-0 px-0 border-b border-slate-100 mb-4">
          <CardTitle className="text-[1.1em] font-semibold text-blue-600 flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Hedefler
          </CardTitle>
        </CardHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-slate-600">Hedef Net Kâr (₺)</Label>
            <div className="relative">
              <Input className="h-9 text-sm pr-6" type="number" step="0.01" value={data.hedefKarTL} onChange={(e) => onChange('hedefKarTL', e.target.value)} />
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">₺</span>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default function ComparisonSimulator() {
  const [scenario1, setScenario1] = useState<ScenarioData>(DEFAULT_VALUES);
  const [scenario2, setScenario2] = useState<ScenarioData>({
    ...DEFAULT_VALUES,
    adet: 600, // Default slightly different for scenario 2
    satisFiyat: 1049.99
  });

  const handleScenarioChange = (scenario: 1 | 2) => (key: keyof ScenarioData, value: string) => {
    const numValue = parseFloat(value) || 0;
    if (scenario === 1) {
      setScenario1(prev => ({ ...prev, [key]: numValue }));
    } else {
      setScenario2(prev => ({ ...prev, [key]: numValue }));
    }
  };

  const result1 = useMemo(() => calculateScenario(scenario1), [scenario1]);
  const result2 = useMemo(() => calculateScenario(scenario2), [scenario2]);

  if (!result1 || !result2) return null;

  const metrics = [
    { label: 'Net Satış Hasılatı', key: 'netSatisHasilati' as const },
    { label: 'Brüt Kâr', key: 'brutKar' as const },
    { label: 'Faaliyet Kârı (EBIT)', key: 'faaliyetKar' as const },
    { label: 'Toplam Faaliyet Giderleri', key: 'faaliyetGiderleriToplam' as const },
    { label: 'Ödenecek KDV', key: 'odenecekKDV' as const },
  ];

  const unitMetrics = [
    { label: 'Net Kâr / Birim', key: 'netKarBirim' as const },
    { label: 'Birim Katkı Payı', key: 'katkiPayiBirim' as const },
    { label: 'Başabaş Noktası (Adet)', key: 'bepAdet' as const, isInt: true },
  ];

  return (
    <div className="min-h-screen bg-[#eef3f6] p-4 md:p-6 font-sans text-slate-900">
      <div className="max-w-[1400px] mx-auto grid grid-cols-1 lg:grid-cols-[700px_1fr] gap-6 h-full">
        
        {/* Left Column: Tabs and Inputs */}
        <div className="h-full flex flex-col">
          <Card className="flex-1 border-0 shadow-[0_6px_16px_rgba(0,0,0,0.1)] p-0 overflow-hidden flex flex-col">
            <Tabs defaultValue="scenario1" className="flex-1 flex flex-col">
              <div className="px-4 pt-4 border-b border-slate-200">
                <TabsList className="bg-slate-100 p-1 w-full grid grid-cols-2">
                  <TabsTrigger value="scenario1" className="data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm">
                    Senaryo 1 (Mevcut)
                  </TabsTrigger>
                  <TabsTrigger value="scenario2" className="data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm">
                    Senaryo 2 (Kıyaslama)
                  </TabsTrigger>
                </TabsList>
              </div>
              
              <div className="flex-1 overflow-hidden relative">
                <TabsContent value="scenario1" className="absolute inset-0 p-6 overflow-y-auto m-0">
                  <div className="mb-4 text-sm text-slate-500">Mevcut iş modelinizin parametrelerini girin.</div>
                  <ScenarioInputForm data={scenario1} onChange={handleScenarioChange(1)} />
                </TabsContent>
                <TabsContent value="scenario2" className="absolute inset-0 p-6 overflow-y-auto m-0">
                  <div className="mb-4 text-sm text-slate-500">Kıyaslamak istediğiniz yeni satış/maliyet varsayımlarını girin.</div>
                  <ScenarioInputForm data={scenario2} onChange={handleScenarioChange(2)} />
                </TabsContent>
              </div>
            </Tabs>
          </Card>
        </div>

        {/* Right Column: Comparison Tables */}
        <div className="h-full overflow-y-auto">
          <Card className="border-0 shadow-[0_6px_16px_rgba(0,0,0,0.1)] overflow-hidden">
            <CardHeader className="bg-white border-b border-slate-100 pb-3 pt-5">
              <CardTitle className="text-[1.3em] font-semibold text-blue-600 flex items-center gap-2">
                <Scale className="w-5 h-5" />
                Senaryo Kıyaslama
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-blue-500 hover:bg-blue-600">
                    <TableHead className="text-white w-[30%]">Metrikler</TableHead>
                    <TableHead className="text-white text-right">Senaryo 1</TableHead>
                    <TableHead className="text-white text-right">Senaryo 2</TableHead>
                    <TableHead className="text-white text-right">Fark (S2 - S1)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {metrics.map((metric) => {
                    const val1 = result1[metric.key];
                    const val2 = result2[metric.key];
                    const diff = val2 - val1;
                    
                    return (
                      <TableRow key={metric.key} className="border-b border-slate-50 hover:bg-slate-50">
                        <TableCell className="font-medium text-slate-700 py-3">{metric.label}</TableCell>
                        <TableCell className="text-right py-3"><MoneyDisplay value={val1} className="text-slate-700" /></TableCell>
                        <TableCell className="text-right py-3"><MoneyDisplay value={val2} className="text-slate-700" /></TableCell>
                        <TableCell className="text-right py-3"><DiffDisplay value={diff} /></TableCell>
                      </TableRow>
                    );
                  })}
                  <TableRow className="bg-[#d1e7dd] hover:bg-[#d1e7dd] border-t-2 border-green-200">
                    <TableCell className="font-bold text-green-900 text-[1.1em] py-4">NET KÂR / ZARAR</TableCell>
                    <TableCell className="text-right font-bold text-green-900 text-[1.1em] py-4"><MoneyDisplay value={result1.netKar} className="text-green-900" /></TableCell>
                    <TableCell className="text-right font-bold text-green-900 text-[1.1em] py-4"><MoneyDisplay value={result2.netKar} className="text-green-900" /></TableCell>
                    <TableCell className="text-right font-bold py-4"><DiffDisplay value={result2.netKar - result1.netKar} /></TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <div className="mt-6">
            <h2 className="text-[1.3em] font-semibold text-blue-600 flex items-center gap-2 mb-4">
              <TrendingUp className="w-5 h-5" />
              Birim Ekonomisi Kıyaslaması
            </h2>
            <Card className="border-0 shadow-[0_6px_16px_rgba(0,0,0,0.1)] overflow-hidden">
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-100 hover:bg-slate-200">
                      <TableHead className="text-slate-700 w-[30%]">Birim Metrikler</TableHead>
                      <TableHead className="text-slate-700 text-right">Senaryo 1</TableHead>
                      <TableHead className="text-slate-700 text-right">Senaryo 2</TableHead>
                      <TableHead className="text-slate-700 text-right">Fark (S2 - S1)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {unitMetrics.map((metric) => {
                      const val1 = result1[metric.key];
                      const val2 = result2[metric.key];
                      const diff = val2 - val1;
                      
                      return (
                        <TableRow key={metric.key} className="border-b border-slate-50 hover:bg-slate-50">
                          <TableCell className="font-medium text-slate-700 py-3">{metric.label}</TableCell>
                          <TableCell className="text-right py-3">
                            {metric.isInt ? 
                              `${Math.ceil(val1)} Adet` : 
                              <MoneyDisplay value={val1} className="text-slate-700" />
                            }
                          </TableCell>
                          <TableCell className="text-right py-3">
                            {metric.isInt ? 
                              `${Math.ceil(val2)} Adet` : 
                              <MoneyDisplay value={val2} className="text-slate-700" />
                            }
                          </TableCell>
                          <TableCell className="text-right py-3">
                            {metric.isInt ? 
                              <span className={cn("font-bold flex items-center gap-1 justify-end", diff > 0 ? "text-red-600" : "text-emerald-600")}>
                                {diff > 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                                {Math.abs(Math.ceil(val2) - Math.ceil(val1))} Adet
                              </span> : 
                              <DiffDisplay value={diff} />
                            }
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
