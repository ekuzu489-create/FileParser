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

  // Persist to localStorage
  useEffect(() => {
    localStorage.setItem('simulator_form_data', JSON.stringify(values));
  }, [values]);

  const handleInputChange = (key: string, value: string) => {
    const numValue = parseFloat(value) || 0;
    setValues((prev: any) => ({ ...prev, [key]: numValue }));
  };

  const results = useMemo(() => {
    const {
      adet, satisFiyat, birimMaliyet, kargo: kargoVal, komisyon, kdvOrani,
      iadeOrani: iadeOraniVal, gelirVergisi, personel, depo: depoVal,
      muhasebe: muhasebeVal, pazarlama: pazarlamaVal, digerGiderler: digerVal, hedefKarTL
    } = values;

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

    const sabitGiderlerToplamNet = personelNet + depo.net + muhasebe.net + pazarlama.net + digerGiderler.net;

    // Handle adet = 0 case: all variable expenses are 0, net profit is -fixed costs
    if (adet === 0) {
      return {
        brutSatisHasilatiKDVHariç: 0,
        iadeTutariNet: 0,
        netSatisHasilati: 0,
        smToplam: 0,
        brutKar: 0,
        komisyonToplam: 0,
        kargoToplam: 0,
        platformFeeToplam: 0,
        stopajToplam: 0,
        sabitGiderlerToplamNet,
        faaliyetGiderleriToplam: sabitGiderlerToplamNet,
        faaliyetKar: -sabitGiderlerToplamNet,
        vergi: 0,
        netKar: -sabitGiderlerToplamNet,
        marginBrut: 0,
        marginFaaliyet: 0,
        marginNet: 0,
        marginIade: 0,
        satisKDVTutari: 0,
        alisKDV: 0,
        kargoKDVTutari: 0,
        platformFeeKDV: 0,
        komisyonKDV: 0,
        sabitGiderlerKDVToplam: depo.vat + muhasebe.vat + pazarlama.vat + digerGiderler.vat,
        indirilebilirKDVToplam: 0,
        odenecekKDV: 0,
        devredenKDV: 0,
        netKarBirim: 0,
        katkiPayiBirim: 0,
        bepAdet: 0,
        hedefAdet: 0,
        hedefFiyatKDVIncl: 0,
        birimAlisMaliyet: 0,
        birimKomisyonNet: 0,
        birimKargoNet: 0,
        birimPlatformFeeNet: 0,
        birimStopajNet: 0,
        birimSabitGiderler: 0,
        birimVergi: 0,
        personelNet: 0,
        depoNet: 0,
        muhasebeNet: 0,
        pazarlamaNet: 0,
        digerGiderlerNet: 0,
      };
    }

    // Revenue & Gross Profit
    const brutSatisHasilatiKDVHariç = satis.net * adet;
    const iadeKaybiAdet = adet * iadeOrani;
    const iadeTutariNet = iadeKaybiAdet * satis.net;
    
    const netSatisHasilati = brutSatisHasilatiKDVHariç - iadeTutariNet;
    const smToplam = maliyet.net * adet;
    const brutKar = netSatisHasilati - smToplam;

    // Operating Expenses
    // Commission: extract VAT from the percentage input (VAT-INCLUSIVE rate becomes VAT-EXCLUSIVE)
    const komisyonYuzdeNet = komisyonYuzde / (1 + GIDER_KDV_ORANI_SABIT / 100);
    const komisyonToplam = netSatisHasilati * komisyonYuzdeNet;
    const kargoToplam = kargo.net * adet;
    const platformFeeToplam = platformFee.net * adet;
    const stopajBirim = satis.net * STOPAJ_RATE;
    const stopajToplam = stopajBirim * adet;

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
      
      const testKomisyonToplam = testNetSatisHasilati * komisyonYuzdeNet;
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
    const payda = (1 - komisyonYuzdeNet) * (1 - iadeOrani);
    
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
      personelNet,
      depoNet: depo.net,
      muhasebeNet: muhasebe.net,
      pazarlamaNet: pazarlama.net,
      digerGiderlerNet: digerGiderler.net,
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
      kargoKDVTutari,
      platformFeeKDV,
      komisyonKDV,
      sabitGiderlerKDVToplam,
      indirilebilirKDVToplam,
      odenecekKDV,
      devredenKDV,
      netKarBirim: adet > 0 ? netKar / adet : 0,
      katkiPayiBirim,
      bepAdet,
      hedefAdet,
      hedefFiyatKDVIncl,
      birimAlisMaliyet,
      birimKomisyonNet,
      birimKargoNet,
      birimPlatformFeeNet,
      birimStopajNet,
      birimSabitGiderler,
      birimVergi,
    };
  }, [values]);

  return (
    <div className="min-h-screen bg-white p-4 md:p-6 font-sans text-slate-900">
      {/* Navigation Tabs - Top Center */}
      <div className="flex justify-center mb-6">
        <Navigation />
      </div>

      {/* Header */}
      <div className="max-w-[1400px] mx-auto mb-6">
        <div className="flex items-center gap-2 mb-1">
          <Calculator className="w-6 h-6 text-blue-600" />
          <h1 className="text-2xl font-bold text-blue-600">Finansal Simülatör</h1>
        </div>
        <p className="text-xs text-slate-500 ml-8">*Parasal Girdiler KDV Dahil</p>
      </div>

      <div className="max-w-[1400px] mx-auto grid grid-cols-1 lg:grid-cols-[350px_1fr] gap-6 h-full">
        {/* Left Column: Input Form */}
        <div className="space-y-4 h-full overflow-y-auto pr-2 custom-scrollbar">
          <Card className="border border-slate-200 shadow-[0_8px_24px_rgba(0,0,0,0.15)] p-5">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-slate-600">Satış Adedi (Ay)</Label>
                  <Input className="h-9 text-sm" type="number" step="1" value={values.adet} onChange={(e) => handleInputChange('adet', e.target.value)} data-testid="input-adet" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-slate-600">Birim Satış (₺)</Label>
                  <div className="relative">
                    <Input className="h-9 text-sm pr-6" type="number" step="0.01" value={values.satisFiyat} onChange={(e) => handleInputChange('satisFiyat', e.target.value)} data-testid="input-satisFiyat" />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">₺</span>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-slate-600">Birim Maliyet (₺)</Label>
                  <div className="relative">
                    <Input className="h-9 text-sm pr-6" type="number" step="0.01" value={values.birimMaliyet} onChange={(e) => handleInputChange('birimMaliyet', e.target.value)} data-testid="input-birimMaliyet" />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">₺</span>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-slate-600">Ort. Kargo (₺)</Label>
                  <div className="relative">
                    <Input className="h-9 text-sm pr-6" type="number" step="0.01" value={values.kargo} onChange={(e) => handleInputChange('kargo', e.target.value)} data-testid="input-kargo" />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">₺</span>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-slate-600">Komisyon %</Label>
                  <div className="relative">
                    <Input className="h-9 text-sm pr-6" type="number" step="0.1" value={values.komisyon} onChange={(e) => handleInputChange('komisyon', e.target.value)} data-testid="input-komisyon" />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">%</span>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-slate-600">KDV %</Label>
                  <div className="relative">
                    <Input className="h-9 text-sm pr-6" type="number" step="1" value={values.kdvOrani} onChange={(e) => handleInputChange('kdvOrani', e.target.value)} data-testid="input-kdvOrani" />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">%</span>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-slate-600">İade %</Label>
                  <div className="relative">
                    <Input className="h-9 text-sm pr-6" type="number" step="0.1" value={values.iadeOrani} onChange={(e) => handleInputChange('iadeOrani', e.target.value)} data-testid="input-iadeOrani" />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">%</span>
                  </div>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-600">Gelir/Kurumlar Vergisi (%)</Label>
                <div className="relative">
                  <Input className="h-9 text-sm pr-6" type="number" step="1" value={values.gelirVergisi} onChange={(e) => handleInputChange('gelirVergisi', e.target.value)} data-testid="input-gelirVergisi" />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">%</span>
                </div>
              </div>

              <Card className="border-0 shadow-none p-0 mt-6">
                <CardHeader className="pb-3 pt-0 px-0 border-b border-slate-100 mb-4">
                  <CardTitle className="text-[1.1em] font-semibold text-blue-600 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" />
                    Sabit Giderler (Aylık)
                  </CardTitle>
                  <p className="text-xs text-slate-500 mt-2 font-normal">KDV Dahil Fiyat girileceği (Personel hariç)</p>
                </CardHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
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
                      <div className="relative">
                        <Input className="h-9 text-sm pr-6" type="number" step="0.01" value={values.personel} onChange={(e) => handleInputChange('personel', e.target.value)} data-testid="input-personel" />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">₺</span>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-1">
                        <Label className="text-xs font-medium text-slate-600">Depo / Kira (₺)</Label>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="w-3.5 h-3.5 text-slate-400 cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent side="right" className="max-w-xs bg-white text-slate-900">
                            <p className="text-xs">KDV Dahil (KDV Oranı %20)</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <div className="relative">
                        <Input className="h-9 text-sm pr-6" type="number" step="0.01" value={values.depo} onChange={(e) => handleInputChange('depo', e.target.value)} data-testid="input-depo" />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">₺</span>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
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
                      <div className="relative">
                        <Input className="h-9 text-sm pr-6" type="number" step="0.01" value={values.muhasebe} onChange={(e) => handleInputChange('muhasebe', e.target.value)} data-testid="input-muhasebe" />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">₺</span>
                      </div>
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
                      <div className="relative">
                        <Input className="h-9 text-sm pr-6" type="number" step="0.01" value={values.pazarlama} onChange={(e) => handleInputChange('pazarlama', e.target.value)} data-testid="input-pazarlama" />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">₺</span>
                      </div>
                    </div>
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
                    <div className="relative">
                      <Input className="h-9 text-sm pr-6" type="number" step="0.01" value={values.digerGiderler} onChange={(e) => handleInputChange('digerGiderler', e.target.value)} data-testid="input-digerGiderler" />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">₺</span>
                    </div>
                  </div>
                </div>
              </Card>

              <Card className="border-0 shadow-none p-0 mt-6">
                <CardHeader className="pb-3 pt-0 px-0 border-b border-slate-100 mb-4">
                  <CardTitle className="text-[1.1em] font-semibold text-blue-600 flex items-center gap-2">
                    <Target className="w-4 h-4" />
                    Hedef Kâr
                  </CardTitle>
                </CardHeader>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-slate-600">Hedef Net Kâr (₺)</Label>
                  <div className="relative">
                    <Input className="h-9 text-sm pr-6" type="number" step="0.01" value={values.hedefKarTL} onChange={(e) => handleInputChange('hedefKarTL', e.target.value)} data-testid="input-hedefKarTL" />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">₺</span>
                  </div>
                </div>
              </Card>
            </div>
          </Card>
        </div>

        {/* Right Column: Outputs */}
        <div className="grid grid-rows-[auto_auto_1fr] gap-6 h-full">
          {results ? (
            <>
              {/* KPI Block - Top */}
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <div className="bg-[#f8f9fa] border border-slate-200 rounded-lg p-3 text-center shadow-[0_2px_8px_rgba(0,0,0,0.08)]">
                    <h4 className="text-[0.9em] text-slate-600 font-medium m-0">Başabaş Noktası (Adet)</h4>
                    <p className="text-[1.5em] font-bold text-blue-600 m-1" data-testid="kpi-bepAdet">{formatNumber(Math.ceil(results.bepAdet))} Adet</p>
                  </div>
                  <p className="text-xs text-slate-500 text-center">Bu adet, mevcut fiyat (₺{(values.satisFiyat || 0).toFixed(2).replace('.', ',')}) ve tüm giderler dikkate alındığında, ne kâr ne de zarar elde etmek için gereken minimum satışı gösterir.</p>
                </div>
                <div className="space-y-2">
                  <div className="bg-[#f8f9fa] border border-slate-200 rounded-lg p-3 text-center shadow-[0_2px_8px_rgba(0,0,0,0.08)]">
                    <h4 className="text-[0.9em] text-slate-600 font-medium m-0">Hedef Kâr Adedi</h4>
                    <p className="text-[1.5em] font-bold text-blue-600 m-1" data-testid="kpi-hedefAdet">{formatNumber(Math.ceil(results.hedefAdet))} Adet</p>
                  </div>
                  <p className="text-xs text-slate-500 text-center">₺{(values.hedefKarTL || 0).toFixed(2).replace('.', ',')} net kâr hedefine ulaşmak için, mevcut birim satış fiyatı olan ₺{(values.satisFiyat || 0).toFixed(2).replace('.', ',')} ile gereken minimum satışı gösterir.</p>
                </div>
                <div className="space-y-2">
                  <div className="bg-[#f8f9fa] border border-slate-200 rounded-lg p-3 text-center shadow-[0_2px_8px_rgba(0,0,0,0.08)]">
                    <h4 className="text-[0.9em] text-slate-600 font-medium m-0">Hedef Birim Fiyat</h4>
                    <p className="text-[1.5em] font-bold text-blue-600 m-1" data-testid="kpi-hedefFiyat">₺{(results.hedefFiyatKDVIncl).toFixed(2).replace('.', ',')}</p>
                  </div>
                  <p className="text-xs text-slate-500 text-center">₺{(values.hedefKarTL || 0).toFixed(2).replace('.', ',')} net kâr hedefine ulaşmak için, mevcut satış adedi olan {formatNumber(Math.ceil(values.adet || 0))} Adet ile gereken birim fiyatıdır (KDV dahil).</p>
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
                  <p className="text-xs text-slate-500 mt-2 font-normal">Tüm rakamlar KDV Hariç (Net) olup, bu şekilde hesaplanmıştır.</p>
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

                      {/* Fixed Expenses Breakdown */}
                      <TableRow className="border-b border-slate-50 hover:bg-transparent">
                        <TableCell className="py-2 pl-9 text-slate-500 text-[0.85em]">    (-) Personel</TableCell>
                        <TableCell className="py-2 pr-6 text-right text-slate-500 text-[0.85em]"><MoneyDisplay value={results.personelNet} className="text-slate-500" /></TableCell>
                      </TableRow>
                      <TableRow className="border-b border-slate-50 hover:bg-transparent">
                        <TableCell className="py-2 pl-9 text-slate-500 text-[0.85em]">    (-) Depo / Kira</TableCell>
                        <TableCell className="py-2 pr-6 text-right text-slate-500 text-[0.85em]"><MoneyDisplay value={results.depoNet} className="text-slate-500" /></TableCell>
                      </TableRow>
                      <TableRow className="border-b border-slate-50 hover:bg-transparent">
                        <TableCell className="py-2 pl-9 text-slate-500 text-[0.85em]">    (-) Muhasebe</TableCell>
                        <TableCell className="py-2 pr-6 text-right text-slate-500 text-[0.85em]"><MoneyDisplay value={results.muhasebeNet} className="text-slate-500" /></TableCell>
                      </TableRow>
                      <TableRow className="border-b border-slate-50 hover:bg-transparent">
                        <TableCell className="py-2 pl-9 text-slate-500 text-[0.85em]">    (-) Pazarlama</TableCell>
                        <TableCell className="py-2 pr-6 text-right text-slate-500 text-[0.85em]"><MoneyDisplay value={results.pazarlamaNet} className="text-slate-500" /></TableCell>
                      </TableRow>
                      <TableRow className="border-b border-slate-50 hover:bg-transparent">
                        <TableCell className="py-2 pl-9 text-slate-500 text-[0.85em]">    (-) Diğer Giderler</TableCell>
                        <TableCell className="py-2 pr-6 text-right text-slate-500 text-[0.85em]"><MoneyDisplay value={results.digerGiderlerNet} className="text-slate-500" /></TableCell>
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
                        <TableCell className={cn("py-3 pr-6 text-[1.1em] font-bold text-right", results.netKar < 0 ? "text-red-900" : "text-green-900")} data-testid="pnl-netKar"><MoneyDisplay value={results.netKar} className={results.netKar < 0 ? "text-red-900" : "text-green-900"} /></TableCell>
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
                      KDV Analizi (Detaylı)
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
                          <TableCell className="py-1.5 pl-5 text-slate-600">(+) Platform Hizmet KDV</TableCell>
                          <TableCell className="py-1.5 pr-5 text-right text-slate-600"><MoneyDisplay value={results.platformFeeKDV} className="text-slate-600" /></TableCell>
                        </TableRow>
                        <TableRow className="hover:bg-transparent border-b border-slate-50">
                          <TableCell className="py-1.5 pl-5 text-slate-600">(+) Sabit Giderler KDV</TableCell>
                          <TableCell className="py-1.5 pr-5 text-right text-slate-600"><MoneyDisplay value={results.sabitGiderlerKDVToplam} className="text-slate-600" /></TableCell>
                        </TableRow>
                        <TableRow className="bg-slate-100 hover:bg-slate-100">
                          <TableCell className="py-1.5 pl-5 font-bold">Toplam İndirilebilir KDV</TableCell>
                          <TableCell className="py-1.5 pr-5 text-right font-bold"><MoneyDisplay value={results.indirilebilirKDVToplam} className="text-slate-700" /></TableCell>
                        </TableRow>
                        <TableRow className={cn("hover:bg-transparent", results.odenecekKDV > 0 ? "bg-red-50 border-b border-red-100" : "bg-blue-50 border-b border-blue-100")}>
                          <TableCell className={cn("py-2 pl-5 font-bold", results.odenecekKDV > 0 ? "text-red-900" : "text-blue-900")}>Ödenecek KDV</TableCell>
                          <TableCell className={cn("py-2 pr-5 text-right font-bold", results.odenecekKDV > 0 ? "text-red-900" : "text-blue-900")}><MoneyDisplay value={results.odenecekKDV} className={results.odenecekKDV > 0 ? "text-red-900" : "text-blue-900"} /></TableCell>
                        </TableRow>
                        <TableRow className={cn("hover:bg-transparent", results.devredenKDV > 0 ? "bg-blue-50" : "")}>
                          <TableCell className="py-2 pl-5 font-bold text-blue-900">Biriken (Devreden) KDV</TableCell>
                          <TableCell className="py-2 pr-5 text-right font-bold text-blue-900"><MoneyDisplay value={results.devredenKDV} className="text-blue-900" /></TableCell>
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
                          <TableCell className="py-2 pr-5 text-right"><MoneyDisplay value={values.satisFiyat / (1 + values.kdvOrani / 100)} className="text-slate-700" /></TableCell>
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
                          <TableCell className="py-2 pr-5 text-right"><MoneyDisplay value={results.birimAlisMaliyet} className="text-slate-700" /></TableCell>
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
                          <TableCell className="py-2 pr-5 text-right"><MoneyDisplay value={results.birimKomisyonNet} className="text-slate-700" /></TableCell>
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
                          <TableCell className="py-2 pr-5 text-right"><MoneyDisplay value={results.birimKargoNet} className="text-slate-700" /></TableCell>
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
                          <TableCell className="py-2 pr-5 text-right"><MoneyDisplay value={results.birimPlatformFeeNet} className="text-slate-700" /></TableCell>
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
                          <TableCell className="py-2 pr-5 text-right"><MoneyDisplay value={results.birimStopajNet} className="text-slate-700" /></TableCell>
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
                          <TableCell className="py-2 pr-5 text-right"><MoneyDisplay value={results.birimSabitGiderler} className="text-slate-700" /></TableCell>
                        </TableRow>
                        <TableRow className="bg-slate-100 hover:bg-slate-100 border-b border-slate-200">
                          <TableCell className="py-2 pl-5 font-bold flex items-center gap-2">
                            Birim Katkı Payı
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Info className="w-3.5 h-3.5 text-slate-400 cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent side="left" className="max-w-xs bg-white text-slate-900">
                                <p className="text-xs">Birim satış - birim değişken maliyetler</p>
                              </TooltipContent>
                            </Tooltip>
                          </TableCell>
                          <TableCell className="py-2 pr-5 text-right font-bold"><MoneyDisplay value={results.katkiPayiBirim} className="text-slate-700" /></TableCell>
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
                          <TableCell className="py-2 pr-5 text-right"><MoneyDisplay value={results.birimVergi} className="text-slate-700" /></TableCell>
                        </TableRow>
                        <TableRow className={cn("border-t", results.netKarBirim < 0 ? "bg-[#ffe6e6] border-red-200" : "bg-[#d1e7dd] border-green-200")}>
                          <TableCell className={cn("py-2 pl-5 font-bold flex items-center gap-2", results.netKarBirim < 0 ? "text-red-900" : "text-green-900")}>
                            Birim Net Kâr
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Info className="w-3.5 h-3.5 cursor-help" style={{ color: results.netKarBirim < 0 ? '#7f1d1d' : '#065f46' }} />
                              </TooltipTrigger>
                              <TooltipContent side="left" className="max-w-xs bg-white text-slate-900">
                                <p className="text-xs">Birim satış - birim toplam maliyet - birim vergi</p>
                              </TooltipContent>
                            </Tooltip>
                          </TableCell>
                          <TableCell className={cn("py-2 pr-5 text-right font-bold", results.netKarBirim < 0 ? "text-red-900" : "text-green-900")}><MoneyDisplay value={results.netKarBirim} className={results.netKarBirim < 0 ? "text-red-900" : "text-green-900"} /></TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
