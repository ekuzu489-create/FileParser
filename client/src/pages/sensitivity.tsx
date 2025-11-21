import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Zap, TrendingUp } from "lucide-react";
import { DEFAULT_FORM_VALUES } from "@/lib/defaults";

// Constants
const PLATFORM_FEE_KDV_INCL = 10.19;
const GIDER_KDV_ORANI_SABIT = 20;
const STOPAJ_RATE = 0.01;

const solveVAT = (amountKDVIncl: number, vatRate: number) => {
  const rateDecimal = vatRate / 100;
  const amountWithoutVAT = amountKDVIncl / (1 + rateDecimal);
  return amountWithoutVAT;
};

const solveKDVIncl = (netAmount: number, vatRate: number) => {
  const rateDecimal = vatRate / 100;
  const total = netAmount * (1 + rateDecimal);
  return total;
};

interface ScenarioData {
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
}

interface CalculationResult {
  netKar: number;
  netKarBirim: number;
}

const calculateScenario = (data: ScenarioData): CalculationResult => {
  const {
    adet, satisFiyat, birimMaliyet, kargo, komisyon, kdvOrani,
    iadeOrani, gelirVergisi, personel, depo, muhasebe, pazarlama, digerGiderler
  } = data;

  const satisHasilatiKDVHaric = (satisFiyat / (1 + kdvOrani / 100));
  const netSatisHasilati = satisHasilatiKDVHaric * adet;
  const iadeTutariNet = satisHasilatiKDVHaric * (iadeOrani / 100) * adet;
  const netSatisHasılatiAdjusted = netSatisHasilati - iadeTutariNet;

  const komisyonTutari = (satisHasilatiKDVHaric * (komisyon / 100)) * adet;
  const kargoBedeli = kargo * adet;
  const birimMaliyetToplam = birimMaliyet * adet;

  const platformFeeNet = (PLATFORM_FEE_KDV_INCL / (1 + GIDER_KDV_ORANI_SABIT / 100)) * adet;
  const totalVariable = komisyonTutari + kargoBedeli + birimMaliyetToplam + platformFeeNet;

  const smToplam = totalVariable;
  const brutKar = netSatisHasılatiAdjusted - smToplam;

  const faaliyetGiderleriToplam = personel + depo + muhasebe + pazarlama + digerGiderler;
  const faaliyetKar = brutKar - faaliyetGiderleriToplam;

  const alisKDV = birimMaliyet * adet * (GIDER_KDV_ORANI_SABIT / 100);
  const satisKDV = satisHasilatiKDVHaric * (kdvOrani / 100) * adet;
  const odenecekKDV = satisKDV - alisKDV;

  const devredenKDV = alisKDV - satisKDV;
  const kdvAdjusted = odenecekKDV > 0 ? odenecekKDV : 0;

  const vergilendirilebilirKar = faaliyetKar - kdvAdjusted;
  const gelirVergisiTutari = Math.max(0, vergilendirilebilirKar * (gelirVergisi / 100));
  const stopajTutari = satisHasilatiKDVHaric * STOPAJ_RATE * adet;

  const netKar = vergilendirilebilirKar - gelirVergisiTutari - stopajTutari;

  return {
    netKar,
    netKarBirim: netKar / adet
  };
};

interface SensitivityDataPoint {
  deviation: number;
  deviationPercent: string;
  netKar: number;
}

export default function SensitivityAnalysis() {
  const [baseData, setBaseData] = useState<ScenarioData>(() => {
    try {
      const saved = localStorage.getItem('simulator_form_data');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {
      // fallback
    }
    return {
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
  });

  const [selectedVariable, setSelectedVariable] = useState<keyof ScenarioData>('satisFiyat');
  const [startPercent, setStartPercent] = useState(-20);
  const [endPercent, setEndPercent] = useState(20);
  const [chartData, setChartData] = useState<SensitivityDataPoint[]>([]);
  const [hasRun, setHasRun] = useState(false);

  const variableOptions = [
    { key: 'satisFiyat' as const, label: 'Birim Satış Fiyatı (₺)' },
    { key: 'adet' as const, label: 'Satış Adedi (Ay)' },
    { key: 'birimMaliyet' as const, label: 'Birim Maliyet (₺)' },
    { key: 'kargo' as const, label: 'Ort. Kargo (₺)' },
    { key: 'komisyon' as const, label: 'Komisyon (%)' },
    { key: 'personel' as const, label: 'Personel (₺)' },
    { key: 'pazarlama' as const, label: 'Pazarlama (₺)' },
  ];

  const handleRunAnalysis = () => {
    const baseResult = calculateScenario(baseData);
    const data: SensitivityDataPoint[] = [];

    const step = 5;
    for (let percent = startPercent; percent <= endPercent; percent += step) {
      const modifiedData = { ...baseData };
      const currentValue = baseData[selectedVariable];
      const deviation = (percent / 100) * (currentValue as number);
      (modifiedData[selectedVariable] as number) = (currentValue as number) + deviation;

      const result = calculateScenario(modifiedData);

      data.push({
        deviation: percent,
        deviationPercent: `${percent}%`,
        netKar: result.netKar
      });
    }

    setChartData(data);
    setHasRun(true);
  };

  const variableLabel = variableOptions.find(v => v.key === selectedVariable)?.label || '';
  const currentValue = baseData[selectedVariable];

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 rounded-lg shadow-lg border border-slate-200">
          <p className="text-sm font-semibold text-slate-700">{data.deviationPercent}</p>
          <p className={`text-sm font-semibold ${data.netKar >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
            {formatCurrency(data.netKar)}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-white p-4 md:p-6 font-sans text-slate-900">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3 mb-2">
            <Zap className="w-8 h-8 text-blue-600" />
            Hassasiyet Analizi
          </h1>
          <p className="text-slate-600">Simülatör verilerine dayalı değişkenlerin kâr/zarar üzerine etkisini analiz edin.</p>
        </div>

        {/* Controls */}
        <Card className="border-0 shadow-[0_8px_24px_rgba(0,0,0,0.15)]">
          <CardHeader className="pb-3 pt-5">
            <CardTitle className="text-lg font-semibold text-slate-800">Analiz Parametreleri</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Variable Selection */}
              <div className="space-y-2">
                <Label className="text-xs font-medium text-slate-600">Analiz Edilecek Değişken</Label>
                <Select value={selectedVariable} onValueChange={(value) => setSelectedVariable(value as keyof ScenarioData)}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="z-[9999]" style={{ zIndex: 9999 }}>
                    {variableOptions.map(opt => (
                      <SelectItem key={opt.key} value={opt.key}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-slate-500 mt-2">
                  Şu anki değer: <span className="font-semibold text-slate-700">
                    {typeof currentValue === 'number' ? (currentValue % 1 === 0 ? Math.round(currentValue) : currentValue.toFixed(2)) : currentValue}
                    {selectedVariable.includes('Orani') || selectedVariable === 'komisyon' ? '%' : ' ₺'}
                  </span>
                </p>
              </div>

              {/* Start Percentage */}
              <div className="space-y-2">
                <Label className="text-xs font-medium text-slate-600">Başlangıç Değeri (%)</Label>
                <Input
                  type="number"
                  step="5"
                  value={startPercent}
                  onChange={(e) => setStartPercent(parseFloat(e.target.value) || -20)}
                  className="h-9 text-sm"
                />
                <p className="text-xs text-slate-500">Min: {startPercent}% sapma</p>
              </div>

              {/* End Percentage */}
              <div className="space-y-2">
                <Label className="text-xs font-medium text-slate-600">Bitiş Değeri (%)</Label>
                <Input
                  type="number"
                  step="5"
                  value={endPercent}
                  onChange={(e) => setEndPercent(parseFloat(e.target.value) || 20)}
                  className="h-9 text-sm"
                />
                <p className="text-xs text-slate-500">Max: {endPercent}% sapma</p>
              </div>
            </div>

            <Button
              onClick={handleRunAnalysis}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium h-9"
            >
              <TrendingUp className="w-4 h-4 mr-2" />
              Analizi Çalıştır
            </Button>
          </CardContent>
        </Card>

        {/* Chart Results */}
        {hasRun && (
          <Card className="border-0 shadow-[0_8px_24px_rgba(0,0,0,0.15)]">
            <CardHeader className="pb-3 pt-5">
              <CardTitle className="text-lg font-semibold text-slate-800">Sonuçlar</CardTitle>
              <CardDescription>
                {variableLabel} değişkendeki % sapmalara karşı Net Kâr/Zarar
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="bg-slate-50 rounded-lg p-6">
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={chartData} margin={{ top: 5, right: 30, left: 0, bottom: 60 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis
                      dataKey="deviationPercent"
                      angle={-45}
                      textAnchor="end"
                      height={100}
                      tick={{ fontSize: 12, fill: '#64748b' }}
                      label={{
                        value: `${variableLabel} (% Sapma)`,
                        position: 'bottom',
                        offset: 20,
                        style: { fontSize: 12, fill: '#475569', fontWeight: 600 }
                      }}
                    />
                    <YAxis
                      tick={{ fontSize: 12, fill: '#64748b' }}
                      label={{
                        value: 'Net Kâr / Zarar (₺)',
                        angle: -90,
                        position: 'insideLeft',
                        style: { fontSize: 12, fill: '#475569', fontWeight: 600 }
                      }}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="netKar"
                      stroke="#2563eb"
                      strokeWidth={3}
                      dot={{ fill: '#2563eb', r: 5 }}
                      activeDot={{ r: 7 }}
                      name="Net Kâr / Zarar"
                      isAnimationActive={true}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Data Table */}
              <div className="mt-6">
                <h4 className="text-sm font-semibold text-slate-700 mb-3">Detaylı Sonuçlar</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-blue-600 text-white">
                        <th className="px-3 py-2 text-left font-semibold">Sapma (%)</th>
                        <th className="px-3 py-2 text-right font-semibold">Net Kâr / Zarar (₺)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {chartData.map((row, idx) => (
                        <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                          <td className="px-3 py-2 font-medium text-slate-700">{row.deviationPercent}</td>
                          <td className={`px-3 py-2 text-right font-semibold ${row.netKar >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                            {formatCurrency(row.netKar)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {!hasRun && (
          <Card className="border-0 shadow-[0_8px_24px_rgba(0,0,0,0.15)]">
            <CardContent className="p-12 text-center">
              <div className="text-slate-400 mb-4">
                <TrendingUp className="w-12 h-12 mx-auto opacity-50" />
              </div>
              <p className="text-slate-600">Analizi çalıştırmak için "Analizi Çalıştır" düğmesine tıklayın.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
