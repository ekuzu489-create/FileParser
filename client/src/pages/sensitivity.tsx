import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Zap, TrendingUp, Plus, Trash2 } from "lucide-react";
import { DEFAULT_FORM_VALUES } from "@/lib/defaults";

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

const formatKDVIncl = (netAmount: number, vatRate: number) => {
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
    adet, satisFiyat, birimMaliyet, kargo: kargoVal, komisyon, kdvOrani,
    iadeOrani: iadeOraniVal, gelirVergisi, personel, depo: depoVal,
    muhasebe: muhasebeVal, pazarlama: pazarlamaVal, digerGiderler: digerVal
  } = data;

  if (adet === 0) return { netKar: 0, netKarBirim: 0 };

  const komisyonYuzde = komisyon / 100;
  const iadeOrani = iadeOraniVal / 100;
  const gelirVergisiYuzde = gelirVergisi / 100;

  // VAT Calculations (EXACT MATCH with Simülatör)
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

  // Profit (EXACT MATCH with Simülatör)
  const faaliyetKar = brutKar - faaliyetGiderleriToplam;
  const vergi = faaliyetKar > 0 ? faaliyetKar * gelirVergisiYuzde : 0;
  const netKar = faaliyetKar - vergi;

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

interface MultiVariableRow {
  id: string;
  variable: keyof ScenarioData;
  deviationPercent: number;
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

  // Multi-Variable Scenario Analysis State
  const [multiVariableRows, setMultiVariableRows] = useState<MultiVariableRow[]>([
    { id: '1', variable: 'satisFiyat', deviationPercent: 10 },
  ]);
  const [multiVarResult, setMultiVarResult] = useState<{ netKar: number; difference: number } | null>(null);

  const variableOptions = [
    { key: 'satisFiyat' as const, label: 'Birim Satış Fiyatı (₺)' },
    { key: 'adet' as const, label: 'Satış Adedi (Ay)' },
    { key: 'birimMaliyet' as const, label: 'Birim Maliyet (₺)' },
    { key: 'kargo' as const, label: 'Ort. Kargo (₺)' },
    { key: 'komisyon' as const, label: 'Komisyon (%)' },
    { key: 'kdvOrani' as const, label: 'KDV (%)' },
    { key: 'iadeOrani' as const, label: 'İade (%)' },
    { key: 'gelirVergisi' as const, label: 'Gelir/Kurumlar Vergisi (%)' },
    { key: 'personel' as const, label: 'Personel (₺)' },
    { key: 'depo' as const, label: 'Depo / Kira (₺)' },
    { key: 'muhasebe' as const, label: 'Muhasebe (₺)' },
    { key: 'pazarlama' as const, label: 'Pazarlama (₺)' },
    { key: 'digerGiderler' as const, label: 'Diğer Giderler (₺)' },
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

  const handleMultiVarAnalysis = () => {
    const modifiedData = { ...baseData };

    // Apply all deviations simultaneously
    multiVariableRows.forEach(row => {
      const currentValue = baseData[row.variable];
      const deviation = (row.deviationPercent / 100) * (currentValue as number);
      (modifiedData[row.variable] as number) = (currentValue as number) + deviation;
    });

    const baseResult = calculateScenario(baseData);
    const modifiedResult = calculateScenario(modifiedData);

    setMultiVarResult({
      netKar: modifiedResult.netKar,
      difference: modifiedResult.netKar - baseResult.netKar
    });
  };

  const addMultiVarRow = () => {
    const newId = Date.now().toString();
    setMultiVariableRows([...multiVariableRows, { id: newId, variable: 'satisFiyat', deviationPercent: 0 }]);
  };

  const removeMultiVarRow = (id: string) => {
    setMultiVariableRows(multiVariableRows.filter(row => row.id !== id));
  };

  const updateMultiVarRow = (id: string, field: 'variable' | 'deviationPercent', value: any) => {
    setMultiVariableRows(multiVariableRows.map(row =>
      row.id === id ? { ...row, [field]: value } : row
    ));
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

  // Helper: Get unit type for selected variable
  const getUnitType = () => {
    return variableLabel.includes('(%)') ? '%' : '₺';
  };

  // Helper: Get display format (integer or decimal)
  const getFormattedValue = (value: number) => {
    const unit = getUnitType();
    if (unit === '%') {
      // Percentages are typically shown as integers
      return value % 1 === 0 ? Math.round(value).toString() : value.toFixed(2);
    } else {
      // Currency: show decimal if needed
      return value % 1 === 0 ? Math.round(value).toString() : value.toFixed(2);
    }
  };

  // Determine if variable is revenue or cost impacting
  const isRevenueVariable = ['satisFiyat', 'adet'].includes(selectedVariable);
  const isCostVariable = ['birimMaliyet', 'kargo', 'komisyon', 'personel', 'pazarlama'].includes(selectedVariable);

  // Generate dynamic commentary
  const getCommentary = () => {
    if (chartData.length === 0) return null;

    const baselineData = chartData.find(d => d.deviation === 0);
    const baseline = baselineData?.netKar || 0;

    let worstData, bestData, worstLabel, bestLabel;

    if (isRevenueVariable) {
      // For revenue: higher values are better
      bestData = chartData[chartData.length - 1]; // +20%
      worstData = chartData[0]; // -20%
      bestLabel = 'En İyi Senaryo';
      worstLabel = 'En Kötü Senaryo';
    } else if (isCostVariable) {
      // For costs: lower values are better
      worstData = chartData[chartData.length - 1]; // +20%
      bestData = chartData[0]; // -20%
      worstLabel = 'En Kötü Senaryo';
      bestLabel = 'En İyi Senaryo';
    } else {
      return null;
    }

    const bestDifference = bestData.netKar - baseline;
    const worstDifference = worstData.netKar - baseline;

    const bestChangeText = bestDifference >= 0
      ? `₺${Math.abs(bestDifference).toLocaleString('tr-TR', { maximumFractionDigits: 0 })} kadar artar`
      : `₺${Math.abs(bestDifference).toLocaleString('tr-TR', { maximumFractionDigits: 0 })} kadar azalır`;

    const worstChangeText = worstDifference >= 0
      ? `₺${Math.abs(worstDifference).toLocaleString('tr-TR', { maximumFractionDigits: 0 })} kadar artar`
      : `₺${Math.abs(worstDifference).toLocaleString('tr-TR', { maximumFractionDigits: 0 })} kadar azalır`;

    return {
      baseline,
      bestData,
      worstData,
      bestLabel,
      worstLabel,
      bestDifference,
      worstDifference,
      bestChangeText,
      worstChangeText,
      variableLabel: variableLabel.toLowerCase(),
      impactType: isRevenueVariable ? 'revenue' : 'cost'
    };
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
                  <SelectContent className="z-[9999]">
                    {variableOptions.map(opt => (
                      <SelectItem key={opt.key} value={opt.key}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-slate-500 mt-2">
                  Şu anki değer: <span className="font-semibold text-slate-700">
                    {getFormattedValue(currentValue as number)} {getUnitType()}
                  </span>
                </p>
                <p className="text-xs text-slate-400 mt-1 italic">
                  Bu değer, Simülatör sekmesindeki <span className="font-semibold text-slate-600">{variableLabel}</span>'den alınmıştır.
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

              {/* Analysis Commentary */}
              {(() => {
                const commentary = getCommentary();
                if (!commentary) return null;

                return (
                  <div className="mt-8 space-y-4">
                    <h4 className="text-sm font-semibold text-slate-700">Analiz Yorumu ve Öneriler</h4>
                    
                    {/* Summary Box */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
                      <p className="text-sm text-slate-700">
                        <span className="font-semibold">{commentary.variableLabel}</span> değişkenindeki sapmalar, Net Kâr/Zarar üzerinde önemli bir etkiye sahiptir.
                      </p>

                      {/* Best Scenario */}
                      <div className="bg-white rounded-lg p-3 border-l-4 border-emerald-600">
                        <p className="text-xs font-semibold text-emerald-700 mb-1">{commentary.bestLabel} ({commentary.bestData.deviationPercent})</p>
                        <p className="text-xs text-slate-700">
                          {commentary.variableLabel} <span className="font-semibold">{commentary.bestData.deviationPercent}</span> sapma gösterdiğinde, net kâr {commentary.bestChangeText}.
                        </p>
                        <p className="text-xs text-slate-600 mt-1">
                          Tahmini Net Kâr: <span className="font-semibold text-emerald-600">{formatCurrency(commentary.bestData.netKar)}</span>
                        </p>
                      </div>

                      {/* Worst Scenario */}
                      <div className="bg-white rounded-lg p-3 border-l-4 border-red-600">
                        <p className="text-xs font-semibold text-red-700 mb-1">{commentary.worstLabel} ({commentary.worstData.deviationPercent})</p>
                        <p className="text-xs text-slate-700">
                          {commentary.variableLabel} <span className="font-semibold">{commentary.worstData.deviationPercent}</span> sapma gösterdiğinde, net kâr {commentary.worstChangeText}.
                        </p>
                        <p className="text-xs text-slate-600 mt-1">
                          Tahmini Net Kâr: <span className={`font-semibold ${commentary.worstData.netKar >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{formatCurrency(commentary.worstData.netKar)}</span>
                        </p>
                      </div>

                      {/* Recommendations */}
                      <div className="bg-slate-50 rounded-lg p-3 mt-3 border-t border-slate-200">
                        <p className="text-xs font-semibold text-slate-700 mb-2">💡 Tavsiyeler:</p>
                        <ul className="text-xs text-slate-700 space-y-1">
                          {commentary.impactType === 'revenue' ? (
                            <>
                              <li>• <span className="font-semibold">{commentary.variableLabel}</span> artışını destekleyen stratejiler geliştirin.</li>
                              <li>• Fiyatlandırma ve satış miktarı optimizasyonuna odaklanın.</li>
                              <li>• Düşüş riskine karşı kontingency planları hazırlayın.</li>
                            </>
                          ) : (
                            <>
                              <li>• <span className="font-semibold">{commentary.variableLabel}</span> maliyetlerini azaltmaya odaklanın.</li>
                              <li>• Tedarikçi müzakereleri ve maliyet optimizasyonunu gözden geçirin.</li>
                              <li>• Artış riskine karşı kontrol mekanizmaları kurguluyor.</li>
                            </>
                          )}
                        </ul>
                      </div>
                    </div>
                  </div>
                );
              })()}
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

        {/* Multi-Variable Scenario Analysis */}
        <Card className="border-0 shadow-[0_8px_24px_rgba(0,0,0,0.15)]">
          <CardHeader className="pb-3 pt-5">
            <CardTitle className="text-lg font-semibold text-slate-800 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-600" />
              Çoklu Değişken Senaryo Analizi
            </CardTitle>
            <CardDescription>Birden fazla değişkeni aynı anda değiştirerek senaryo analizi yapın.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Input Table */}
            <div className="overflow-x-auto border rounded-lg">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-blue-600 text-white">
                    <th className="px-3 py-2 text-left font-semibold">Değişken</th>
                    <th className="px-3 py-2 text-left font-semibold">Sapma (%)</th>
                    <th className="px-3 py-2 text-center font-semibold w-12">İşlem</th>
                  </tr>
                </thead>
                <tbody>
                  {multiVariableRows.map((row, idx) => (
                    <tr key={row.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                      <td className="px-3 py-2">
                        <Select value={row.variable} onValueChange={(value) => updateMultiVarRow(row.id, 'variable', value as keyof ScenarioData)}>
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="z-[9999]">
                            {variableOptions.map(opt => (
                              <SelectItem key={opt.key} value={opt.key}>
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="px-3 py-2">
                        <Input
                          type="number"
                          step="1"
                          value={row.deviationPercent}
                          onChange={(e) => updateMultiVarRow(row.id, 'deviationPercent', parseFloat(e.target.value) || 0)}
                          className="h-8 text-xs"
                        />
                      </td>
                      <td className="px-3 py-2 text-center">
                        <button
                          onClick={() => removeMultiVarRow(row.id)}
                          className="p-1 hover:bg-red-100 rounded text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Add Row Button */}
            <Button
              onClick={addMultiVarRow}
              variant="outline"
              className="w-full h-9 text-sm"
            >
              <Plus className="w-4 h-4 mr-2" />
              Satır Ekle
            </Button>

            {/* Calculate Button */}
            <Button
              onClick={handleMultiVarAnalysis}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium h-9"
            >
              <TrendingUp className="w-4 h-4 mr-2" />
              Senaryo Hesapla
            </Button>

            {/* Results */}
            {multiVarResult && (
              <div className="mt-6 p-4 bg-gradient-to-br from-blue-50 to-slate-50 rounded-lg border border-blue-200">
                <h4 className="text-sm font-semibold text-slate-700 mb-3">Senaryo Sonuçları</h4>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white rounded-lg p-3 border border-slate-200">
                    <p className="text-xs text-slate-500 mb-1">Senaryo Net Kâr</p>
                    <p className={`text-sm font-bold ${multiVarResult.netKar >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {formatCurrency(multiVarResult.netKar)}
                    </p>
                  </div>

                  <div className={`rounded-lg p-3 border ${multiVarResult.difference >= 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
                    <p className="text-xs text-slate-500 mb-1">Fark</p>
                    <p className={`text-sm font-bold ${multiVarResult.difference >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {multiVarResult.difference >= 0 ? '+' : ''}{formatCurrency(multiVarResult.difference)}
                    </p>
                  </div>
                </div>

                <div className="mt-3 p-3 bg-white rounded-lg border border-slate-200">
                  <p className="text-xs text-slate-700">
                    <span className="font-semibold">Özet:</span> Seçilen {multiVariableRows.length} değişken{multiVariableRows.length > 1 ? 'de' : 'de'} yapılan değişiklikler, net kârı <span className={`font-bold ${multiVarResult.difference >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{multiVarResult.difference >= 0 ? '+' : ''}{formatCurrency(multiVarResult.difference)}</span> oranında etkileyecektir.
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
