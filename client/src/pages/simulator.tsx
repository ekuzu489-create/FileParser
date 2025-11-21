import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Calculator, TrendingUp, DollarSign, Percent, Package, Building2, PieChart, Scale, Target, Info, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Navigation } from "@/App";
import { DEFAULT_FORM_VALUES } from "@/lib/defaults";

// Constants
const PLATFORM_FEE_KDV_INCL = 10.19;
const GIDER_KDV_ORANI_SABIT = 20;
const STOPAJ_RATE = 0.01;

// Utility Components & Functions
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

const PercentDisplay = ({ value }: { value: number }) => {
  const formatted = new Intl.NumberFormat('tr-TR', {
    style: 'percent',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
  return <span className="text-blue-600 font-medium">{formatted}</span>;
};

const AnalysisBox = ({ label, value }: { label: string, value: number }) => (
  <div className="text-xs text-center py-1 px-2 rounded border border-slate-100 bg-slate-50">
    <p className="font-semibold text-slate-600 m-0">{label}</p>
    <PercentDisplay value={value} />
  </div>
);

const formatNumber = (value: number) => {
  return new Intl.NumberFormat('tr-TR', {
    maximumFractionDigits: 0,
  }).format(value);
};

const solveVAT = (amountKDVIncl: number, vatRate: number) => {
  const rateDecimal = vatRate / 100;
  if (vatRate === 0 || amountKDVIncl === 0) {
    return { net: amountKDVIncl, vat: 0 };
  }
  const net = amountKDVIncl / (1 + rateDecimal);
  const vat = amountKDVIncl - net;
  return { net, vat };
};

const formatKDVIncl = (netAmount: number, vatRate: number) => {
  const rateDecimal = vatRate / 100;
  const total = netAmount * (1 + rateDecimal);
  return total;
};

export default function Simulator() {
  // State - Initialize from localStorage, persist on changes
  const [values, setValues] = useState(() => {
    try {
      const saved = localStorage.getItem('simulator_form_data');
      return saved ? JSON.parse(saved) : DEFAULT_FORM_VALUES;
    } catch {
      return DEFAULT_FORM_VALUES;
    }
  });

  // Persist to localStorage whenever values change
  useEffect(() => {
    localStorage.setItem('simulator_form_data', JSON.stringify(values));
  }, [values]);

  const handleChange = (key: keyof typeof values, value: string) => {
    const numValue = parseFloat(value) || 0;
    setValues(prev => ({ ...prev, [key]: numValue }));
  };

  const handleReset = () => {
    setValues(DEFAULT_FORM_VALUES);
  };

  // Calculations
  const results = useMemo(() => {
    const {
      adet, satisFiyat, birimMaliyet, kargo: kargoVal, komisyon, kdvOrani,
      iadeOrani: iadeOraniVal, gelirVergisi, personel, depo: depoVal,
      muhasebe: muhasebeVal, pazarlama: pazarlamaVal, digerGiderler: digerVal,
      hedefKarTL
    } = values;

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

    // Margins
    const marginBrut = netSatisHasilati !== 0 ? brutKar / netSatisHasilati : 0;
    const marginFaaliyet = netSatisHasilati !== 0 ? faaliyetKar / netSatisHasilati : 0;
    const marginNet = netSatisHasilati !== 0 ? netKar / netSatisHasilati : 0;
    const marginIade = brutSatisHasilatiKDVHariç !== 0 ? iadeTutariNet / brutSatisHasilatiKDVHariç : 0;

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
    const devredenKDV = odenecekKDVBrut < 0 ? Math.abs(odenecekKDVBrut) : 0;

    // Unit Economics & Break-even
    const birimToplamMaliyet = faaliyetGiderleriToplam / adet + smToplam / adet;
    const birimKomisyon = komisyonToplam / adet;
    const birimDegiskenMaliyetlerTop = maliyet.net + birimKomisyon + kargo.net + platformFee.net + stopajBirim;
    const katkiPayiBirim = satis.net - birimDegiskenMaliyetlerTop;

    // Helper function to calculate net profit for a given quantity
    const calculateNetKarForQuantity = (testAdet: number): number => {
      if (testAdet <= 0) return -sabitGiderlerToplamNet;
      
      const testBrutSatisHasilati = satis.net * testAdet;
      const testIadeKaybi = testAdet * iadeOrani;
      const testIadeTutari = testIadeKaybi * satis.net;
      const testNetSatisHasilati = testBrutSatisHasilati - testIadeTutari;
      const testSmToplam = maliyet.net * testAdet;
      const testBrutKar = testNetSatisHasilati - testSmToplam;
      
      const testKomisyonToplam = testNetSatisHasilati * komisyonYuzde;
      const testKargoToplam = kargo.net * testAdet;
      const testPlatformFeeToplam = platformFee.net * testAdet;
      const testStopajToplam = satis.net * STOPAJ_RATE * testAdet;
      
      const testFaaliyetGiderleriToplam = testKomisyonToplam + testKargoToplam + testPlatformFeeToplam + testStopajToplam + sabitGiderlerToplamNet;
      const testFaaliyetKar = testBrutKar - testFaaliyetGiderleriToplam;
      const testVergi = testFaaliyetKar > 0 ? testFaaliyetKar * gelirVergisiYuzde : 0;
      const testNetKar = testFaaliyetKar - testVergi;
      
      return testNetKar;
    };

    // Binary search to find actual break-even point (where netKar = 0)
    let bepAdet = 0;
    if (katkiPayiBirim > 0) {
      let low = 0;
      let high = sabitGiderlerToplamNet / katkiPayiBirim * 3; // Start search with upper bound
      
      for (let i = 0; i < 50; i++) {
        const mid = (low + high) / 2;
        const netKarAtMid = calculateNetKarForQuantity(mid);
        
        if (Math.abs(netKarAtMid) < 0.01) {
          bepAdet = mid;
          break;
        }
        
        if (netKarAtMid < 0) {
          low = mid;
        } else {
          high = mid;
        }
      }
      
      bepAdet = (low + high) / 2;
    }

    // Binary search to find target quantity (where netKar = hedefKarTL)
    let hedefAdet = 0;
    if (katkiPayiBirim > 0) {
      let low = 0;
      let high = (sabitGiderlerToplamNet + hedefKarTL) / katkiPayiBirim * 2; // Upper bound estimate
      
      for (let i = 0; i < 50; i++) {
        const mid = (low + high) / 2;
        const netKarAtMid = calculateNetKarForQuantity(mid);
        
        if (Math.abs(netKarAtMid - hedefKarTL) < 0.01) {
          hedefAdet = mid;
          break;
        }
        
        if (netKarAtMid < hedefKarTL) {
          low = mid;
        } else {
          high = mid;
        }
      }
      
      hedefAdet = (low + high) / 2;
    }

    // Target Price Calculation
    const hedefKarNet = hedefKarTL / (1 - gelirVergisiYuzde);
    const birimHedefKarNet = hedefKarNet / adet;
    const birimSabitGider = sabitGiderlerToplamNet / adet;
    const birimDegiskenMaliyetlerHariçKomisyon = maliyet.net + kargo.net + platformFee.net + stopajBirim;
    
    let hedefBirimSatisNetKomisyonOncesi = 0;
    const payda = (1 - komisyonYuzde) * (1 - iadeOrani);
    
    if (payda !== 0) {
      hedefBirimSatisNetKomisyonOncesi = (birimDegiskenMaliyetlerHariçKomisyon + birimSabitGider + birimHedefKarNet) / payda;
    }

    const hedefBirimSatisNet = hedefBirimSatisNetKomisyonOncesi;
    const hedefFiyatKDVIncl = hedefBirimSatisNet > 0 ? formatKDVIncl(hedefBirimSatisNet, kdvOrani) : 0;

    // Unit cost breakdown
    const birimAlisMaliyet = maliyet.net;
    const birimKomisyonNet = birimKomisyon;
    const birimKargoNet = kargo.net;
    const birimPlatformFeeNet = platformFee.net;
    const birimStopajNet = stopajBirim;
    const birimSabitGiderler = sabitGiderlerToplamNet / adet;
    const birimVergi = vergi / adet;

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
      marginBrut,
      marginFaaliyet,
      marginNet,
      marginIade,
      satisKDVTutari,
      alisKDV,
      komisyonKDV,
      kargoKDVTutari,
      platformFeeKDV,
      sabitGiderlerKDVToplam,
      indirilebilirKDVToplam,
      odenecekKDV,
      devredenKDV,
      satisNet: satis.net,
      birimToplamMaliyet,
      katkiPayiBirim,
      netKarBirim: netKar / adet,
      bepAdet,
      hedefAdet,
      hedefFiyatKDVIncl,
      birimAlisMaliyet,
      birimKomisyonNet,
      birimKargoNet,
      birimPlatformFeeNet,
      birimStopajNet,
      birimSabitGiderler,
      birimVergi
    };
  }, [values]);

  return (
    <div className="min-h-screen bg-white p-4 md:p-6 font-sans text-slate-900">
      {/* Navigation Tabs - Top Center */}
      <div className="flex justify-center mb-6">
        <Navigation />
      </div>

      <div className="max-w-[1400px] mx-auto grid grid-cols-1 lg:grid-cols-[350px_1fr] gap-6 h-full">
        
        {/* Left Column: Inputs */}
        <div className="space-y-4 h-full overflow-y-auto pr-2 custom-scrollbar">
          <div className="flex items-center space-x-2 mb-1">
            <Calculator className="w-6 h-6 text-blue-600" />
            <h1 className="text-xl font-bold text-slate-800">Finansal Simülatör</h1>
          </div>

          <Card className="border-0 shadow-[0_8px_24px_rgba(0,0,0,0.15)]">
            <CardHeader className="pb-3 pt-5 px-5 border-b border-slate-100">
              <CardTitle className="text-[1.1em] font-semibold text-blue-600 flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                Satış ve Birim Verileri
              </CardTitle>
              <CardDescription className="text-xs mt-1">*Parasal Girdiler KDV Dahil.</CardDescription>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="adet" className="text-xs font-medium text-slate-600">Satış Adedi (Ay)</Label>
                  <div className="relative">
                    <Input id="adet" className="h-9 text-sm" type="number" step="1" value={values.adet} onChange={(e) => handleChange('adet', e.target.value)} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="satisFiyat" className="text-xs font-medium text-slate-600">Birim Satış (₺)</Label>
                  <div className="relative">
                    <Input id="satisFiyat" className="h-9 text-sm pr-6" type="number" step="0.01" value={values.satisFiyat} onChange={(e) => handleChange('satisFiyat', e.target.value)} />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">₺</span>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="birimMaliyet" className="text-xs font-medium text-slate-600">Birim Maliyet (₺)</Label>
                  <div className="relative">
                    <Input id="birimMaliyet" className="h-9 text-sm pr-6" type="number" step="0.01" value={values.birimMaliyet} onChange={(e) => handleChange('birimMaliyet', e.target.value)} />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">₺</span>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="kargo" className="text-xs font-medium text-slate-600">Ort. Kargo (₺)</Label>
                  <div className="relative">
                    <Input id="kargo" className="h-9 text-sm pr-6" type="number" step="0.01" value={values.kargo} onChange={(e) => handleChange('kargo', e.target.value)} />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">₺</span>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1.5">
                  <Label htmlFor="komisyon" className="text-xs font-medium text-slate-600">Komisyon %</Label>
                  <div className="relative">
                    <Input id="komisyon" className="h-9 text-sm pr-6" type="number" step="0.1" value={values.komisyon} onChange={(e) => handleChange('komisyon', e.target.value)} />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">%</span>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="kdvOrani" className="text-xs font-medium text-slate-600">KDV %</Label>
                  <div className="relative">
                    <Input id="kdvOrani" className="h-9 text-sm pr-6" type="number" step="1" value={values.kdvOrani} onChange={(e) => handleChange('kdvOrani', e.target.value)} />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">%</span>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="iadeOrani" className="text-xs font-medium text-slate-600">İade %</Label>
                  <div className="relative">
                    <Input id="iadeOrani" className="h-9 text-sm pr-6" type="number" step="0.1" value={values.iadeOrani} onChange={(e) => handleChange('iadeOrani', e.target.value)} />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">%</span>
                  </div>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="gelirVergisi" className="text-xs font-medium text-slate-600">Gelir/Kurumlar Vergisi (%)</Label>
                <div className="relative">
                  <Input id="gelirVergisi" className="h-9 text-sm pr-6" type="number" step="1" value={values.gelirVergisi} onChange={(e) => handleChange('gelirVergisi', e.target.value)} />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">%</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-[0_8px_24px_rgba(0,0,0,0.15)]">
            <CardHeader className="pb-3 pt-5 px-5 border-b border-slate-100">
              <CardTitle className="text-[1.1em] font-semibold text-blue-600 flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                Sabit Giderler (Aylık)
              </CardTitle>
              <CardDescription className="text-xs mt-1">(KDV %20 Oranından Düşülecektir)</CardDescription>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="personel" className="text-xs font-medium text-slate-600">Personel (₺)</Label>
                  <div className="relative">
                    <Input id="personel" className="h-9 text-sm pr-6" type="number" step="0.01" value={values.personel} onChange={(e) => handleChange('personel', e.target.value)} />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">₺</span>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="depo" className="text-xs font-medium text-slate-600">Depo / Kira (₺)</Label>
                  <div className="relative">
                    <Input id="depo" className="h-9 text-sm pr-6" type="number" step="0.01" value={values.depo} onChange={(e) => handleChange('depo', e.target.value)} />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">₺</span>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="muhasebe" className="text-xs font-medium text-slate-600">Muhasebe (₺)</Label>
                  <div className="relative">
                    <Input id="muhasebe" className="h-9 text-sm pr-6" type="number" step="0.01" value={values.muhasebe} onChange={(e) => handleChange('muhasebe', e.target.value)} />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">₺</span>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="pazarlama" className="text-xs font-medium text-slate-600">Pazarlama (₺)</Label>
                  <div className="relative">
                    <Input id="pazarlama" className="h-9 text-sm pr-6" type="number" step="0.01" value={values.pazarlama} onChange={(e) => handleChange('pazarlama', e.target.value)} />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">₺</span>
                  </div>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="digerGiderler" className="text-xs font-medium text-slate-600">Diğer Giderler (₺)</Label>
                <div className="relative">
                  <Input id="digerGiderler" className="h-9 text-sm pr-6" type="number" step="0.01" value={values.digerGiderler} onChange={(e) => handleChange('digerGiderler', e.target.value)} />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">₺</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-[0_8px_24px_rgba(0,0,0,0.15)]">
            <CardHeader className="pb-3 pt-5 px-5 border-b border-slate-100">
              <CardTitle className="text-[1.1em] font-semibold text-blue-600 flex items-center gap-2">
                <Target className="w-4 h-4" />
                Hedefler
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="hedefKarTL" className="text-xs font-medium text-slate-600">Hedef Net Kâr (₺)</Label>
                <div className="relative">
                  <Input id="hedefKarTL" className="h-9 text-sm pr-6" type="number" step="0.01" value={values.hedefKarTL} onChange={(e) => handleChange('hedefKarTL', e.target.value)} />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">₺</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Outputs */}
        <div className="grid grid-rows-[auto_auto_1fr] gap-6 h-full">
          {results ? (
            <>
              {/* KPI Block - Top */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-[#f8f9fa] border border-slate-200 rounded-lg p-3 text-center shadow-[0_2px_8px_rgba(0,0,0,0.08)]">
                  <h4 className="text-[0.9em] text-slate-600 font-medium m-0">Başabaş Noktası (Adet)</h4>
                  <p className="text-[1.5em] font-bold text-blue-600 m-1">{formatNumber(Math.ceil(results.bepAdet))} Adet</p>
                </div>
                <div className="bg-[#f8f9fa] border border-slate-200 rounded-lg p-3 text-center shadow-[0_2px_8px_rgba(0,0,0,0.08)]">
                  <h4 className="text-[0.9em] text-slate-600 font-medium m-0">Hedef Kâr Adedi</h4>
                  <p className="text-[1.5em] font-bold text-blue-600 m-1">{formatNumber(Math.ceil(results.hedefAdet))} Adet</p>
                </div>
                <div className="bg-[#f8f9fa] border border-slate-200 rounded-lg p-3 text-center shadow-[0_2px_8px_rgba(0,0,0,0.08)]">
                  <h4 className="text-[0.9em] text-slate-600 font-medium m-0">Hedef Birim Fiyat</h4>
                  <p className="text-[1.5em] font-bold text-blue-600 m-1">₺{(results.hedefFiyatKDVIncl).toFixed(2).replace('.', ',')}</p>
                </div>
              </div>

              {/* P&L Table - Below KPIs */}
              <Card className="border-0 shadow-[0_8px_24px_rgba(0,0,0,0.15)] overflow-hidden">
                <CardHeader className="bg-white border-b border-slate-100 pb-3 pt-5">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-[1.3em] font-semibold text-blue-600 flex items-center gap-2">
                      <TrendingUp className="w-5 h-5" />
                      Aylık Kâr/Zarar Tablosu
                    </CardTitle>
                    <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded">(₺, KDV Hariç Net Tutarlar)</span>
                  </div>
                  {/* Margin Analysis Grid */}
                  <div className="grid grid-cols-4 gap-2 mt-3">
                    <AnalysisBox label="Kâr Marjı (Brüt)" value={results.marginBrut} />
                    <AnalysisBox label="Kâr Marjı (Faaliyet)" value={results.marginFaaliyet} />
                    <AnalysisBox label="Kâr Marjı (Net)" value={results.marginNet} />
                    <AnalysisBox label="İade Oranı (Tutar)" value={results.marginIade} />
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableBody className="text-[0.9em]">
                      <TableRow className="border-b border-slate-50 hover:bg-transparent">
                        <TableCell className="py-2 pl-6 font-medium text-slate-700">Brüt Satış Hasılatı</TableCell>
                        <TableCell className="py-2 pr-6 text-right font-medium"><MoneyDisplay value={results.brutSatisHasilatiKDVHariç} className="text-emerald-600" /></TableCell>
                      </TableRow>
                      <TableRow className="border-b border-slate-50 hover:bg-transparent">
                        <TableCell className="py-2 pl-6 font-medium text-red-500">(-) İade Tutarı</TableCell>
                        <TableCell className="py-2 pr-6 text-right"><MoneyDisplay value={results.iadeTutariNet} className="text-red-500" /></TableCell>
                      </TableRow>
                      <TableRow className="bg-slate-100 hover:bg-slate-100">
                        <TableCell className="py-2 pl-6 font-bold text-slate-800">= Net Satış Hasılatı</TableCell>
                        <TableCell className="py-2 pr-6 text-right font-bold text-slate-800"><MoneyDisplay value={results.netSatisHasilati} className="text-slate-800" /></TableCell>
                      </TableRow>
                      <TableRow className="border-b border-slate-50 hover:bg-transparent">
                        <TableCell className="py-2 pl-6 font-medium text-red-500">(-) Satılan Malın Maliyeti (SM)</TableCell>
                        <TableCell className="py-2 pr-6 text-right"><MoneyDisplay value={results.smToplam} className="text-red-500" /></TableCell>
                      </TableRow>
                      <TableRow className="bg-slate-100 hover:bg-slate-100">
                        <TableCell className="py-2 pl-6 font-bold text-slate-900">= Brüt Kâr</TableCell>
                        <TableCell className="py-2 pr-6 text-right font-bold text-slate-900"><MoneyDisplay value={results.brutKar} className="text-slate-900" /></TableCell>
                      </TableRow>
                      
                      {/* Expenses Breakdown */}
                      <TableRow className="hover:bg-transparent">
                        <TableCell colSpan={2} className="bg-[#f1f1f1] text-xs font-bold text-slate-600 text-center py-1.5 uppercase tracking-wider">Faaliyet Giderleri Detayı (KDV Hariç)</TableCell>
                      </TableRow>
                      <TableRow className="border-b border-slate-50 hover:bg-transparent">
                        <TableCell className="py-2 pl-6 text-slate-600">(-) Pazaryeri Komisyonu (Değişken)</TableCell>
                        <TableCell className="py-2 pr-6 text-right text-slate-600"><MoneyDisplay value={results.komisyonToplam} className="text-slate-600" /></TableCell>
                      </TableRow>
                      <TableRow className="border-b border-slate-50 hover:bg-transparent">
                        <TableCell className="py-2 pl-6 text-slate-600">(-) Kargo Gideri (Değişken)</TableCell>
                        <TableCell className="py-2 pr-6 text-right text-slate-600"><MoneyDisplay value={results.kargoToplam} className="text-slate-600" /></TableCell>
                      </TableRow>
                      <TableRow className="border-b border-slate-50 hover:bg-transparent">
                        <TableCell className="py-2 pl-6 text-slate-600">(-) Platform Hizmet Bedeli (Değişken)</TableCell>
                        <TableCell className="py-2 pr-6 text-right text-slate-600"><MoneyDisplay value={results.platformFeeToplam} className="text-slate-600" /></TableCell>
                      </TableRow>
                      <TableRow className="border-b border-slate-50 hover:bg-transparent">
                        <TableCell className="py-2 pl-6 text-slate-600">(-) Stopaj Gideri (Değişken)</TableCell>
                        <TableCell className="py-2 pr-6 text-right text-slate-600"><MoneyDisplay value={results.stopajToplam} className="text-slate-600" /></TableCell>
                      </TableRow>
                      <TableRow className="border-b border-slate-50 hover:bg-transparent">
                        <TableCell className="py-2 pl-6 text-slate-600">(-) Toplam Sabit Giderler</TableCell>
                        <TableCell className="py-2 pr-6 text-right text-slate-600"><MoneyDisplay value={results.sabitGiderlerToplamNet} className="text-slate-600" /></TableCell>
                      </TableRow>

                      <TableRow className="bg-slate-100 hover:bg-slate-100">
                        <TableCell className="py-2 pl-6 font-bold text-slate-700">(-) Toplam Faaliyet Giderleri</TableCell>
                        <TableCell className="py-2 pr-6 text-right font-bold text-slate-700"><MoneyDisplay value={results.faaliyetGiderleriToplam} className="text-slate-700" /></TableCell>
                      </TableRow>

                      <TableRow className="bg-slate-100 hover:bg-slate-100 border-t border-slate-200">
                        <TableCell className="py-2 pl-6 font-bold text-slate-800">= Faaliyet Kârı (EBIT)</TableCell>
                        <TableCell className="py-2 pr-6 text-right font-bold text-slate-800"><MoneyDisplay value={results.faaliyetKar} className="text-slate-800" /></TableCell>
                      </TableRow>
                      <TableRow className="hover:bg-transparent">
                        <TableCell className="py-2 pl-6 font-medium text-red-500">(-) Gelir/Kurumlar Vergisi</TableCell>
                        <TableCell className="py-2 pr-6 text-right"><MoneyDisplay value={results.vergi} className="text-red-500" /></TableCell>
                      </TableRow>
                      <TableRow className={cn("border-t hover:opacity-90", results.netKar < 0 ? "bg-[#ffe6e6] border-red-200" : "bg-[#d1e7dd] border-green-200")}>
                        <TableCell className={cn("py-3 pl-6 text-[1.1em] font-bold", results.netKar < 0 ? "text-red-900" : "text-green-900")}>NET KÂR / ZARAR</TableCell>
                        <TableCell className={cn("py-3 pr-6 text-[1.1em] font-bold text-right", results.netKar < 0 ? "text-red-900" : "text-green-900")}><MoneyDisplay value={results.netKar} className={results.netKar < 0 ? "text-red-900" : "text-green-900"} /></TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {/* Bottom Row: Split Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-[1.3fr_1fr] gap-6">
                {/* Tax Analysis */}
                <Card className="border-0 shadow-[0_6px_16px_rgba(0,0,0,0.1)] overflow-hidden h-fit">
                  <CardHeader className="pb-3 pt-5 px-5 border-b border-slate-100">
                    <CardTitle className="text-[1.1em] font-semibold text-blue-600 flex items-center gap-2">
                      <Scale className="w-5 h-5" />
                      Vergi Analizi (Detaylı)
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <Table>
                      <TableBody className="text-[0.9em]">
                        <TableRow className="hover:bg-transparent border-b border-slate-50">
                          <TableCell className="py-2 pl-5 font-medium">Satış KDV&apos;si (Hesaplanan)</TableCell>
                          <TableCell className="py-2 pr-5 text-right font-medium"><MoneyDisplay value={results.satisKDVTutari} className="text-slate-700" /></TableCell>
                        </TableRow>
                        <TableRow className="hover:bg-transparent">
                          <TableCell colSpan={2} className="bg-slate-100 text-center py-1.5 font-bold text-slate-700">İndirilebilir KDV Detayı</TableCell>
                        </TableRow>
                        <TableRow className="hover:bg-transparent border-b border-slate-50">
                          <TableCell className="py-1.5 pl-5 text-slate-600">(+) Alış KDV (SM)</TableCell>
                          <TableCell className="py-1.5 pr-5 text-right text-slate-600"><MoneyDisplay value={results.alisKDV} className="text-slate-600" /></TableCell>
                        </TableRow>
                        <TableRow className="hover:bg-transparent border-b border-slate-50">
                          <TableCell className="py-1.5 pl-5 text-slate-600">(+) Komisyon KDV</TableCell>
                          <TableCell className="py-1.5 pr-5 text-right text-slate-600"><MoneyDisplay value={results.komisyonKDV} className="text-slate-600" /></TableCell>
                        </TableRow>
                        <TableRow className="hover:bg-transparent border-b border-slate-50">
                          <TableCell className="py-1.5 pl-5 text-slate-600">(+) Kargo KDV</TableCell>
                          <TableCell className="py-1.5 pr-5 text-right text-slate-600"><MoneyDisplay value={results.kargoKDVTutari} className="text-slate-600" /></TableCell>
                        </TableRow>
                        <TableRow className="hover:bg-transparent border-b border-slate-50">
                          <TableCell className="py-1.5 pl-5 text-slate-600">(+) Platform Hiz. KDV</TableCell>
                          <TableCell className="py-1.5 pr-5 text-right text-slate-600"><MoneyDisplay value={results.platformFeeKDV} className="text-slate-600" /></TableCell>
                        </TableRow>
                        <TableRow className="hover:bg-transparent border-b border-slate-50">
                          <TableCell className="py-1.5 pl-5 text-slate-600">(+) Sabit Giderler KDV</TableCell>
                          <TableCell className="py-1.5 pr-5 text-right text-slate-600"><MoneyDisplay value={results.sabitGiderlerKDVToplam} className="text-slate-600" /></TableCell>
                        </TableRow>
                        
                        <TableRow className="bg-slate-100 hover:bg-slate-100 border-t border-slate-200">
                          <TableCell className="py-2 pl-5 font-bold text-slate-800">Toplam İndirilebilir KDV</TableCell>
                          <TableCell className="py-2 pr-5 text-right font-bold text-slate-800"><MoneyDisplay value={results.indirilebilirKDVToplam} className="text-slate-800" /></TableCell>
                        </TableRow>
                        <TableRow className="bg-[#d1e7dd] hover:bg-[#d1e7dd] border-t border-green-200">
                          <TableCell className="py-3 pl-5 font-bold text-green-900">Ödenecek KDV Tutarı</TableCell>
                          <TableCell className="py-3 pr-5 text-right font-bold text-green-900"><MoneyDisplay value={results.odenecekKDV} className="text-green-900" /></TableCell>
                        </TableRow>
                        <TableRow className="bg-[#fff3cd] hover:bg-[#fff3cd] border-t border-yellow-200">
                          <TableCell className="py-3 pl-5 font-bold text-[#856404]">Biriken (Devreden) KDV</TableCell>
                          <TableCell className="py-3 pr-5 text-right font-bold text-[#856404]"><MoneyDisplay value={results.devredenKDV} className="text-[#856404]" /></TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>

                {/* Birim Ekonomisi - Unit Economics Card */}
                <Card className="border-0 shadow-[0_6px_16px_rgba(0,0,0,0.1)] overflow-hidden h-fit">
                  <CardHeader className="pb-3 pt-5 px-5 border-b border-slate-100">
                    <CardTitle className="text-[1.1em] font-semibold text-blue-600 flex items-center gap-2">
                      <PieChart className="w-5 h-5" />
                      Birim Ekonomisi
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    {/* Summary Table */}
                    <Table>
                      <TableBody className="text-[0.9em]">
                        <TableRow className="hover:bg-transparent border-b border-slate-100">
                          <TableCell className="py-2 pl-5 font-medium text-slate-700">Birim Satış Fiyatı (KDV Hariç)</TableCell>
                          <TableCell className="py-2 pr-5 text-right"><MoneyDisplay value={results.satisNet} className="text-slate-700" /></TableCell>
                        </TableRow>
                        <TableRow className="hover:bg-transparent border-b border-slate-100">
                          <TableCell className="py-2 pl-5 font-medium text-red-500">Birim Maliyetler Toplamı (KDV Hariç)</TableCell>
                          <TableCell className="py-2 pr-5 text-right"><MoneyDisplay value={results.birimToplamMaliyet} className="text-red-500" /></TableCell>
                        </TableRow>
                        <TableRow className="bg-slate-100 hover:bg-slate-100">
                          <TableCell className="py-2 pl-5 font-bold text-slate-800">Birim Katkı Payı</TableCell>
                          <TableCell className="py-2 pr-5 text-right font-bold text-slate-800"><MoneyDisplay value={results.katkiPayiBirim} className="text-slate-800" /></TableCell>
                        </TableRow>
                        <TableRow className="bg-[#d1e7dd] hover:bg-[#d1e7dd] border-t border-green-200">
                          <TableCell className="py-2 pl-5 font-bold text-green-900">Net Kâr / Birim</TableCell>
                          <TableCell className="py-2 pr-5 text-right font-bold text-green-900"><MoneyDisplay value={results.netKarBirim} className="text-green-900" /></TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>

                    {/* Birim Maliyet Detayı Subsection */}
                    <div className="border-t border-slate-200 p-5">
                      <div className="text-[0.9em] space-y-2">
                        <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-3">Maliyet Detayı</h3>
                        
                        <div className="grid grid-cols-2 gap-2 border-b border-slate-100 pb-2 text-[0.85em]">
                          <div className="font-medium text-slate-600">Birim Satış (KDV Hariç)</div>
                          <div className="text-right font-bold text-blue-600"><MoneyDisplay value={results.satisNet} className="text-blue-600" /></div>
                        </div>

                        <div className="space-y-1.5 text-[0.85em]">
                          <div className="font-medium text-slate-600 mb-1.5">Değişken Maliyetler:</div>
                          
                          <div className="grid grid-cols-2 gap-1 ml-2">
                            <div className="flex items-center gap-1">
                              <span className="text-slate-600">- Satın Alma (SM)</span>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Info className="w-3 h-3 text-slate-400 cursor-help" />
                                </TooltipTrigger>
                                <TooltipContent className="text-xs max-w-xs">
                                  Birim başına ürün satın alma maliyeti
                                </TooltipContent>
                              </Tooltip>
                            </div>
                            <div className="text-right text-red-600 text-[0.95em]"><MoneyDisplay value={results.birimAlisMaliyet} className="text-red-600" /></div>
                          </div>

                          <div className="grid grid-cols-2 gap-1 ml-2">
                            <div className="flex items-center gap-1">
                              <span className="text-slate-600">- Komisyon</span>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Info className="w-3 h-3 text-slate-400 cursor-help" />
                                </TooltipTrigger>
                                <TooltipContent className="text-xs max-w-xs">
                                  Pazaryeri komisyon oranı
                                </TooltipContent>
                              </Tooltip>
                            </div>
                            <div className="text-right text-red-600 text-[0.95em]"><MoneyDisplay value={results.birimKomisyonNet} className="text-red-600" /></div>
                          </div>

                          <div className="grid grid-cols-2 gap-1 ml-2">
                            <div className="flex items-center gap-1">
                              <span className="text-slate-600">- Kargo</span>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Info className="w-3 h-3 text-slate-400 cursor-help" />
                                </TooltipTrigger>
                                <TooltipContent className="text-xs max-w-xs">
                                  Taşıma ve kargo maliyeti
                                </TooltipContent>
                              </Tooltip>
                            </div>
                            <div className="text-right text-red-600 text-[0.95em]"><MoneyDisplay value={results.birimKargoNet} className="text-red-600" /></div>
                          </div>

                          <div className="grid grid-cols-2 gap-1 ml-2">
                            <div className="flex items-center gap-1">
                              <span className="text-slate-600">- Platform Hiz.</span>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Info className="w-3 h-3 text-slate-400 cursor-help" />
                                </TooltipTrigger>
                                <TooltipContent className="text-xs max-w-xs">
                                  Platform kullanım ücreti
                                </TooltipContent>
                              </Tooltip>
                            </div>
                            <div className="text-right text-red-600 text-[0.95em]"><MoneyDisplay value={results.birimPlatformFeeNet} className="text-red-600" /></div>
                          </div>

                          <div className="grid grid-cols-2 gap-1 ml-2">
                            <div className="flex items-center gap-1">
                              <span className="text-slate-600">- Stopaj</span>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Info className="w-3 h-3 text-slate-400 cursor-help" />
                                </TooltipTrigger>
                                <TooltipContent className="text-xs max-w-xs">
                                  Stopaj vergisi (%{STOPAJ_RATE * 100})
                                </TooltipContent>
                              </Tooltip>
                            </div>
                            <div className="text-right text-red-600 text-[0.95em]"><MoneyDisplay value={results.birimStopajNet} className="text-red-600" /></div>
                          </div>
                        </div>

                        <div className="space-y-1 border-t border-slate-100 pt-1.5 text-[0.85em]">
                          <div className="font-medium text-slate-600 mb-1">Sabit Giderler & Vergiler:</div>
                          
                          <div className="grid grid-cols-2 gap-1 ml-2">
                            <span className="text-slate-600">- Sabit Giderler</span>
                            <div className="text-right text-red-600 text-[0.95em]"><MoneyDisplay value={results.birimSabitGiderler} className="text-red-600" /></div>
                          </div>

                          <div className="grid grid-cols-2 gap-1 ml-2">
                            <span className="text-slate-600">- Vergiler</span>
                            <div className="text-right text-red-600 text-[0.95em]"><MoneyDisplay value={results.birimVergi} className="text-red-600" /></div>
                          </div>
                        </div>

                        <div className="bg-[#d1e7dd] rounded p-1.5 mt-2 text-[0.9em]">
                          <div className="grid grid-cols-2 gap-1 font-bold text-green-900">
                            <span>= Net Kâr / Birim</span>
                            <div className="text-right"><MoneyDisplay value={results.netKarBirim} className="text-green-900" /></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          ) : (
            <div className="h-full flex items-center justify-center text-slate-400">
              Lütfen satış adedini giriniz.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
