import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Calculator, TrendingUp, DollarSign, Percent, ArrowUpRight, ArrowDownRight, Scale, PieChart, Target, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Navigation } from "@/App";
import { DEFAULT_FORM_VALUES } from "@/lib/defaults";

// Constants
const PLATFORM_FEE_KDV_INCL = 10.19;
const GIDER_KDV_ORANI_SABIT = 20;
const STOPAJ_RATE = 0.01;

// Helper Components
const MoneyDisplay = ({ value, className, showLossAsNegative = false }: { value: number, className?: string, showLossAsNegative?: boolean }) => {
  if (value < 0 && showLossAsNegative) {
    return <span className={cn("text-red-600 font-semibold text-lg", className)}>-</span>;
  }

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

const DiffDisplay = ({ value, type = 'currency' }: { value: number, type?: 'currency' | 'percent' | 'number' }) => {
  const absValue = Math.abs(value);
  let formatted = '';

  if (type === 'currency') {
    formatted = new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(absValue);
  } else if (type === 'percent') {
    formatted = new Intl.NumberFormat('tr-TR', {
      style: 'percent',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(absValue);
  } else {
    formatted = new Intl.NumberFormat('tr-TR').format(Math.ceil(absValue)) + ' Adet';
  }

  if (value > 0) {
    return (
      <span className="text-emerald-600 font-bold flex items-center gap-1 justify-end">
        <ArrowUpRight className="w-4 h-4" /> {formatted}
      </span>
    );
  } else if (value < 0) {
    return (
      <span className="text-red-600 font-bold flex items-center gap-1 justify-end">
        <ArrowDownRight className="w-4 h-4" /> {type === 'currency' ? `(${formatted})` : formatted}
      </span>
    );
  }
  return <span className="text-slate-400 font-medium">{type === 'currency' ? '₺0,00' : (type === 'percent' ? '0,00%' : '0 Adet')}</span>;
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
  // hedefKarTL is handled globally now
};

const DEFAULT_VALUES: ScenarioData = {
  adet: DEFAULT_FORM_VALUES.adet,
  satisFiyat: DEFAULT_FORM_VALUES.satisFiyat,
  birimMaliyet: DEFAULT_FORM_VALUES.birimMaliyet,
  kargo: DEFAULT_FORM_VALUES.kargo,
  komisyon: DEFAULT_FORM_VALUES.komisyon,
  kdvOrani: DEFAULT_FORM_VALUES.kdvOrani,
  iadeOrani: DEFAULT_FORM_VALUES.iadeOrani,
  gelirVergisi: DEFAULT_FORM_VALUES.gelirVergisi,
  personel: DEFAULT_FORM_VALUES.personel,
  depo: DEFAULT_FORM_VALUES.depo,
  muhasebe: DEFAULT_FORM_VALUES.muhasebe,
  pazarlama: DEFAULT_FORM_VALUES.pazarlama,
  digerGiderler: DEFAULT_FORM_VALUES.digerGiderler,
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

const formatKDVIncl = (netAmount: number, vatRate: number) => {
  const rateDecimal = vatRate / 100;
  const total = netAmount * (1 + rateDecimal);
  return total;
};

const calculateScenario = (data: ScenarioData, hedefKarTL: number) => {
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

  // Unit Economics
  const birimToplamMaliyet = faaliyetGiderleriToplam / adet + smToplam / adet;
  const birimKomisyon = komisyonToplam / adet;
  const birimDegiskenMaliyetlerTop = maliyet.net + birimKomisyon + kargo.net + platformFee.net + stopajBirim;
  const katkiPayiBirim = satis.net - birimDegiskenMaliyetlerTop;
  const bepAdet = katkiPayiBirim > 0 ? sabitGiderlerToplamNet / katkiPayiBirim : 0;
  const hedefAdet = katkiPayiBirim > 0 ? (sabitGiderlerToplamNet + hedefKarTL) / katkiPayiBirim : 0;

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


  return {
    netSatisHasilati,
    brutKar,
    faaliyetKar,
    faaliyetGiderleriToplam,
    odenecekKDV,
    netKar,
    devredenKDV,
    iadeTutariNet,
    smToplam,
    alisKDV,
    
    // Unit
    netKarBirim: netKar / adet,
    katkiPayiBirim,
    bepAdet,
    hedefAdet,
    hedefFiyatKDVIncl,

    // Percent
    marginBrut,
    marginFaaliyet,
    marginNet,
    marginIade
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
    </div>
  );
};

export default function ComparisonSimulator() {
  // Senaryo 1: Initialize from localStorage, or copy from Simulator on first load
  const [scenario1, setScenario1] = useState<ScenarioData>(() => {
    try {
      const saved = localStorage.getItem('comparison_scenario1_data');
      if (saved) {
        return JSON.parse(saved);
      }
      // First load: try to copy from Simulator
      const simulatorData = localStorage.getItem('simulator_form_data');
      if (simulatorData) {
        const parsed = JSON.parse(simulatorData);
        return {
          adet: parsed.adet,
          satisFiyat: parsed.satisFiyat,
          birimMaliyet: parsed.birimMaliyet,
          kargo: parsed.kargo,
          komisyon: parsed.komisyon,
          kdvOrani: parsed.kdvOrani,
          iadeOrani: parsed.iadeOrani,
          gelirVergisi: parsed.gelirVergisi,
          personel: parsed.personel,
          depo: parsed.depo,
          muhasebe: parsed.muhasebe,
          pazarlama: parsed.pazarlama,
          digerGiderler: parsed.digerGiderler,
        };
      }
      // Fallback to defaults
      return DEFAULT_VALUES;
    } catch {
      return DEFAULT_VALUES;
    }
  });

  // Senaryo 2: Initialize from localStorage or custom defaults
  const [scenario2, setScenario2] = useState<ScenarioData>(() => {
    try {
      const saved = localStorage.getItem('comparison_scenario2_data');
      return saved ? JSON.parse(saved) : { ...DEFAULT_VALUES, adet: 600, satisFiyat: 1049.99 };
    } catch {
      return { ...DEFAULT_VALUES, adet: 600, satisFiyat: 1049.99 };
    }
  });

  // Global target profit
  const [hedefKarTL, setHedefKarTL] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('comparison_hedefKarTL');
      return saved ? parseFloat(saved) : DEFAULT_FORM_VALUES.hedefKarTL;
    } catch {
      return DEFAULT_FORM_VALUES.hedefKarTL;
    }
  });

  // Persist Senaryo 1, Senaryo 2, and hedefKarTL to localStorage
  useEffect(() => {
    localStorage.setItem('comparison_scenario1_data', JSON.stringify(scenario1));
  }, [scenario1]);

  useEffect(() => {
    localStorage.setItem('comparison_scenario2_data', JSON.stringify(scenario2));
  }, [scenario2]);

  useEffect(() => {
    localStorage.setItem('comparison_hedefKarTL', hedefKarTL.toString());
  }, [hedefKarTL]);

  const handleScenarioChange = (scenario: 1 | 2) => (key: keyof ScenarioData, value: string) => {
    const numValue = parseFloat(value) || 0;
    if (scenario === 1) {
      setScenario1(prev => ({ ...prev, [key]: numValue }));
    } else {
      setScenario2(prev => ({ ...prev, [key]: numValue }));
    }
  };

  const result1 = useMemo(() => calculateScenario(scenario1, hedefKarTL), [scenario1, hedefKarTL]);
  const result2 = useMemo(() => calculateScenario(scenario2, hedefKarTL), [scenario2, hedefKarTL]);

  if (!result1 || !result2) return null;

  const plMetrics = [
    { label: 'Brüt Satış Hasılatı', key: 'netSatisHasilati' as const },
    { label: '(-) İade Tutarı', key: 'iadeTutariNet' as const },
    { label: 'Net Satış Hasılatı', key: 'netSatisHasilati' as const, type: 'subtotal' },
    { label: '(-) Satış Maliyeti (SM)', key: 'smToplam' as const },
    { label: 'Brüt Kâr', key: 'brutKar' as const },
    { label: 'Toplam Faaliyet Giderleri', key: 'faaliyetGiderleriToplam' as const },
    { label: 'Faaliyet Kârı (EBIT)', key: 'faaliyetKar' as const },
    { label: 'Ödenecek KDV', key: 'odenecekKDV' as const },
    { label: 'Biriken (Devreden) KDV', key: 'devredenKDV' as const },
  ];

  const unitMetrics = [
    { label: 'Net Kâr / Birim', key: 'netKarBirim' as const },
    { label: 'Birim Katkı Payı', key: 'katkiPayiBirim' as const },
    { label: 'Başabaş Noktası', key: 'bepAdet' as const, isInt: true },
    { label: 'Hedef Kâr İçin Gerekli Adet', key: 'hedefAdet' as const, isInt: true },
    { label: 'Hedef Kâr İçin Birim Fiyat (KDV Dahil)', key: 'hedefFiyatKDVIncl' as const },
  ];

  const percentMetrics = [
    { label: 'Kâr Marjı (Net)', key: 'marginNet' as const },
    { label: 'Kâr Marjı (Brüt)', key: 'marginBrut' as const },
    { label: 'Kâr Marjı (Faaliyet)', key: 'marginFaaliyet' as const },
    { label: 'İade Oranı (Tutar)', key: 'marginIade' as const },
    { label: 'Alış KDV (İndirilebilir)', key: 'alisKDV' as const, isCurrency: true }, // This was in the sample logic
  ];

  return (
    <div className="min-h-screen bg-white p-4 md:p-6 font-sans text-slate-900">
      {/* Navigation Tabs - Top Center */}
      <div className="flex justify-center mb-6">
        <Navigation />
      </div>

      <div className="max-w-[1400px] mx-auto grid grid-cols-1 lg:grid-cols-[350px_1fr] gap-6 h-full">
        
        {/* Left Column: Tabs and Inputs */}
        <div className="flex flex-col gap-4 h-full">
          <Card className="flex-1 border-0 shadow-[0_8px_24px_rgba(0,0,0,0.15)] p-0 overflow-hidden flex flex-col">
            <Tabs defaultValue="scenario1" className="flex-1 flex flex-col">
              <div className="px-4 pt-4 border-b border-slate-200">
                <TabsList className="bg-slate-100 p-1 w-full grid grid-cols-2">
                  <TabsTrigger value="scenario1" className="data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm text-xs">
                    Senaryo 1 (Mevcut)
                  </TabsTrigger>
                  <TabsTrigger value="scenario2" className="data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm text-xs">
                    Senaryo 2 (Kıyaslama)
                  </TabsTrigger>
                </TabsList>
              </div>
              
              <div className="flex-1 overflow-hidden relative">
                <TabsContent value="scenario1" className="absolute inset-0 p-4 overflow-y-auto m-0 custom-scrollbar">
                  <div className="mb-4 text-xs text-slate-500">Simülatör senaryo parametrelerini değiştirin veya yeni değerler girin.</div>
                  <ScenarioInputForm data={scenario1} onChange={handleScenarioChange(1)} />
                </TabsContent>
                <TabsContent value="scenario2" className="absolute inset-0 p-4 overflow-y-auto m-0 custom-scrollbar">
                  <div className="mb-4 text-xs text-slate-500">Kıyaslamak istediğiniz yeni satış/maliyet varsayımlarını girin.</div>
                  <ScenarioInputForm data={scenario2} onChange={handleScenarioChange(2)} />
                </TabsContent>
              </div>
            </Tabs>
          </Card>
          
          <Card className="border-0 shadow-[0_8px_24px_rgba(0,0,0,0.15)]">
             <CardHeader className="pb-3 pt-4 px-4 border-b border-slate-100">
              <CardTitle className="text-[1.1em] font-semibold text-blue-600 flex items-center gap-2">
                <Target className="w-4 h-4" />
                Hedefler
              </CardTitle>
              <CardDescription className="text-xs mt-1">İki senaryo için ortak hedeftir.</CardDescription>
            </CardHeader>
            <CardContent className="p-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-600">Hedef Net Kâr (₺)</Label>
                <div className="relative">
                  <Input 
                    className="h-9 text-sm pr-6" 
                    type="number" 
                    step="0.01" 
                    value={hedefKarTL} 
                    onChange={(e) => setHedefKarTL(parseFloat(e.target.value) || 0)} 
                  />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">₺</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Comparison Tables */}
        <div className="h-full overflow-y-auto pr-2 custom-scrollbar space-y-6">
          <Card className="border-0 shadow-[0_8px_24px_rgba(0,0,0,0.15)] overflow-hidden">
            <CardHeader className="bg-white border-b border-slate-100 pb-3 pt-5">
              <CardTitle className="text-[1.3em] font-semibold text-slate-800 flex items-center gap-2">
                <Scale className="w-5 h-5 text-blue-600" />
                Senaryo Kıyaslama
              </CardTitle>
              <CardDescription>Fark = Senaryo 2 - Senaryo 1</CardDescription>
            </CardHeader>
            
            <div className="p-6 space-y-8">
              {/* P&L Table */}
              <div>
                 <h3 className="text-[1.1em] font-semibold text-slate-700 mb-3 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" /> Aylık Kâr/Zarar Metrikleri
                 </h3>
                 <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-blue-600 hover:bg-blue-600">
                          <TableHead className="text-white w-[35%] font-semibold">Metrikler</TableHead>
                          <TableHead className="text-white text-right font-semibold">Senaryo 1</TableHead>
                          <TableHead className="text-white text-right font-semibold">Senaryo 2</TableHead>
                          <TableHead className="text-white text-right font-semibold">Fark (S2 - S1)</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {plMetrics.map((metric) => {
                          const val1 = result1[metric.key];
                          const val2 = result2[metric.key];
                          const diff = val2 - val1;
                          const isSubtotal = metric.type === 'subtotal';
                          
                          return (
                            <TableRow key={metric.key} className={cn("border-b border-slate-100 hover:bg-slate-50", isSubtotal && "bg-slate-50 font-semibold")}>
                              <TableCell className={cn("text-slate-700 py-2.5", isSubtotal && "font-bold text-slate-900")}>{metric.label}</TableCell>
                              <TableCell className="text-right py-2.5"><MoneyDisplay value={val1} className="text-slate-700" /></TableCell>
                              <TableCell className="text-right py-2.5"><MoneyDisplay value={val2} className="text-slate-700" /></TableCell>
                              <TableCell className="text-right py-2.5"><DiffDisplay value={diff} /></TableCell>
                            </TableRow>
                          );
                        })}
                        <TableRow className="bg-[#d1e7dd] hover:bg-[#d1e7dd] border-t-2 border-green-200">
                          <TableCell className="font-bold text-green-900 text-[1.1em] py-4">NET KÂR / ZARAR</TableCell>
                          <TableCell className="text-right font-bold text-[1.1em] py-4"><MoneyDisplay value={result1.netKar} showLossAsNegative={true} /></TableCell>
                          <TableCell className="text-right font-bold text-[1.1em] py-4"><MoneyDisplay value={result2.netKar} showLossAsNegative={true} /></TableCell>
                          <TableCell className="text-right font-bold py-4"><DiffDisplay value={result2.netKar - result1.netKar} /></TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                 </div>
              </div>

              {/* Unit Economics Table */}
              <div>
                 <h3 className="text-[1.1em] font-semibold text-slate-700 mb-3 flex items-center gap-2">
                    <PieChart className="w-4 h-4" /> Birim Ekonomisi ve Verimlilik
                 </h3>
                 <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-slate-100 hover:bg-slate-100">
                          <TableHead className="text-slate-700 w-[35%] font-semibold">Birim Metrikler</TableHead>
                          <TableHead className="text-slate-700 text-right font-semibold">Senaryo 1</TableHead>
                          <TableHead className="text-slate-700 text-right font-semibold">Senaryo 2</TableHead>
                          <TableHead className="text-slate-700 text-right font-semibold">Fark (S2 - S1)</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {unitMetrics.map((metric) => {
                          const val1 = result1[metric.key];
                          const val2 = result2[metric.key];
                          const diff = val2 - val1;
                          
                          return (
                            <TableRow key={metric.key} className="border-b border-slate-100 hover:bg-slate-50">
                              <TableCell className="font-medium text-slate-700 py-2.5">{metric.label}</TableCell>
                              <TableCell className="text-right py-2.5">
                                {metric.isInt ? 
                                  `${Math.ceil(val1)} Adet` : 
                                  <MoneyDisplay value={val1} className="text-slate-700" showLossAsNegative={metric.key === 'netKarBirim'} />
                                }
                              </TableCell>
                              <TableCell className="text-right py-2.5">
                                {metric.isInt ? 
                                  `${Math.ceil(val2)} Adet` : 
                                  <MoneyDisplay value={val2} className="text-slate-700" showLossAsNegative={metric.key === 'netKarBirim'} />
                                }
                              </TableCell>
                              <TableCell className="text-right py-2.5">
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
                 </div>
              </div>

              {/* Percentages Table */}
              <div>
                 <h3 className="text-[1.1em] font-semibold text-slate-700 mb-3 flex items-center gap-2">
                    <BarChart3 className="w-4 h-4" /> Vergi ve Verimlilik Yüzdeleri
                 </h3>
                 <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-slate-100 hover:bg-slate-100">
                          <TableHead className="text-slate-700 w-[35%] font-semibold">Yüzdesel Metrikler</TableHead>
                          <TableHead className="text-slate-700 text-right font-semibold">Senaryo 1</TableHead>
                          <TableHead className="text-slate-700 text-right font-semibold">Senaryo 2</TableHead>
                          <TableHead className="text-slate-700 text-right font-semibold">Fark (S2 - S1)</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {percentMetrics.map((metric) => {
                          const val1 = result1[metric.key];
                          const val2 = result2[metric.key];
                          const diff = val2 - val1;
                          
                          return (
                            <TableRow key={metric.key} className="border-b border-slate-100 hover:bg-slate-50">
                              <TableCell className="font-medium text-slate-700 py-2.5">{metric.label}</TableCell>
                              <TableCell className="text-right py-2.5">
                                {metric.isCurrency ? 
                                   <MoneyDisplay value={val1} className="text-slate-700" /> :
                                   <PercentDisplay value={val1} />
                                }
                              </TableCell>
                              <TableCell className="text-right py-2.5">
                                {metric.isCurrency ? 
                                   <MoneyDisplay value={val2} className="text-slate-700" /> :
                                   <PercentDisplay value={val2} />
                                }
                              </TableCell>
                              <TableCell className="text-right py-2.5">
                                <DiffDisplay value={diff} type={metric.isCurrency ? 'currency' : 'percent'} />
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                 </div>
              </div>

            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
