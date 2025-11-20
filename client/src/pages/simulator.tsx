import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Calculator, TrendingUp, DollarSign, Percent, Package, Building2, PieChart } from "lucide-react";

// Constants
const PLATFORM_FEE_KDV_INCL = 10.19;
const GIDER_KDV_ORANI_SABIT = 20;
const STOPAJ_RATE = 0.01;

// Utility Functions
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
  // State
  const [values, setValues] = useState({
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
    hedefKarYuzde: 20
  });

  const handleChange = (key: keyof typeof values, value: string) => {
    const numValue = parseFloat(value) || 0;
    setValues(prev => ({ ...prev, [key]: numValue }));
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
      hedefFiyatKDVIncl
    };
  }, [values]);

  return (
    <div className="min-h-screen bg-slate-50 p-6 font-sans text-slate-900">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Inputs */}
        <div className="lg:col-span-4 space-y-6">
          <div className="flex items-center space-x-2 mb-2">
            <Calculator className="w-6 h-6 text-blue-600" />
            <h1 className="text-xl font-bold text-slate-800">E-Ticaret Simülatörü</h1>
          </div>

          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-blue-500" />
                Satış ve Birim Verileri
              </CardTitle>
              <CardDescription>KDV dahil tutarları giriniz.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="adet">Satış Adedi (Ay)</Label>
                  <Input id="adet" type="number" step="1" value={values.adet} onChange={(e) => handleChange('adet', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="satisFiyat">Satış Fiyatı (₺)</Label>
                  <Input id="satisFiyat" type="number" step="0.01" value={values.satisFiyat} onChange={(e) => handleChange('satisFiyat', e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="birimMaliyet">Birim Maliyet (₺)</Label>
                  <Input id="birimMaliyet" type="number" step="0.01" value={values.birimMaliyet} onChange={(e) => handleChange('birimMaliyet', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="kargo">Ort. Kargo (₺)</Label>
                  <Input id="kargo" type="number" step="0.01" value={values.kargo} onChange={(e) => handleChange('kargo', e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-2">
                  <Label htmlFor="komisyon" className="text-xs">Komisyon %</Label>
                  <Input id="komisyon" type="number" step="0.1" value={values.komisyon} onChange={(e) => handleChange('komisyon', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="kdvOrani" className="text-xs">KDV %</Label>
                  <Input id="kdvOrani" type="number" step="1" value={values.kdvOrani} onChange={(e) => handleChange('kdvOrani', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="iadeOrani" className="text-xs">İade %</Label>
                  <Input id="iadeOrani" type="number" step="0.1" value={values.iadeOrani} onChange={(e) => handleChange('iadeOrani', e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="gelirVergisi">Gelir/Kurumlar Vergisi Oranı (%)</Label>
                <Input id="gelirVergisi" type="number" step="1" value={values.gelirVergisi} onChange={(e) => handleChange('gelirVergisi', e.target.value)} />
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <Building2 className="w-4 h-4 text-amber-500" />
                Sabit Giderler (Aylık)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="personel">Personel (₺)</Label>
                  <Input id="personel" type="number" step="0.01" value={values.personel} onChange={(e) => handleChange('personel', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="depo">Depo / Kira (₺)</Label>
                  <Input id="depo" type="number" step="0.01" value={values.depo} onChange={(e) => handleChange('depo', e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="muhasebe">Muhasebe (₺)</Label>
                  <Input id="muhasebe" type="number" step="0.01" value={values.muhasebe} onChange={(e) => handleChange('muhasebe', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pazarlama">Pazarlama (₺)</Label>
                  <Input id="pazarlama" type="number" step="0.01" value={values.pazarlama} onChange={(e) => handleChange('pazarlama', e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="digerGiderler">Diğer Giderler (₺)</Label>
                <Input id="digerGiderler" type="number" step="0.01" value={values.digerGiderler} onChange={(e) => handleChange('digerGiderler', e.target.value)} />
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-green-600" />
                Hedefler
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="hedefKarTL">Hedef Net Kâr (₺)</Label>
                  <Input id="hedefKarTL" type="number" step="0.01" value={values.hedefKarTL} onChange={(e) => handleChange('hedefKarTL', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="hedefKarYuzde">Hedef Kâr %</Label>
                  <Input id="hedefKarYuzde" type="number" step="0.1" value={values.hedefKarYuzde} onChange={(e) => handleChange('hedefKarYuzde', e.target.value)} />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Outputs */}
        <div className="lg:col-span-8 space-y-6">
          {results ? (
            <>
              {/* P&L Table */}
              <Card className="border-slate-200 shadow-md overflow-hidden">
                <CardHeader className="bg-white border-b border-slate-100 pb-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <PieChart className="w-5 h-5 text-indigo-600" />
                      Aylık Kâr/Zarar Tablosu
                    </CardTitle>
                    <span className="text-sm text-slate-500 bg-slate-100 px-2 py-1 rounded">KDV Hariç Net Tutarlar</span>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableBody>
                      <TableRow>
                        <TableCell className="font-medium text-slate-600">Brüt Satış Hasılatı</TableCell>
                        <TableCell className="text-right font-medium">{formatCurrency(results.brutSatisHasilatiKDVHariç)}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium text-red-500">(-) İade Tutarı</TableCell>
                        <TableCell className="text-right text-red-500">{formatCurrency(results.iadeTutariNet)}</TableCell>
                      </TableRow>
                      <TableRow className="bg-slate-50">
                        <TableCell className="font-bold text-slate-800">= Net Satış Hasılatı</TableCell>
                        <TableCell className="text-right font-bold text-slate-800">{formatCurrency(results.netSatisHasilati)}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium text-red-500">(-) Satılan Malın Maliyeti</TableCell>
                        <TableCell className="text-right text-red-500">{formatCurrency(results.smToplam)}</TableCell>
                      </TableRow>
                      <TableRow className="bg-slate-100">
                        <TableCell className="font-bold text-slate-900">= Brüt Kâr</TableCell>
                        <TableCell className="text-right font-bold text-slate-900">{formatCurrency(results.brutKar)}</TableCell>
                      </TableRow>
                      
                      {/* Expenses Breakdown */}
                      <TableRow>
                        <TableCell colSpan={2} className="bg-slate-50 text-xs font-semibold text-slate-500 text-center py-1 uppercase tracking-wider">Faaliyet Giderleri Detayı</TableCell>
                      </TableRow>
                      <TableRow className="text-sm">
                        <TableCell className="pl-8 text-slate-600">Pazaryeri Komisyonu</TableCell>
                        <TableCell className="text-right text-slate-600">{formatCurrency(results.komisyonToplam)}</TableCell>
                      </TableRow>
                      <TableRow className="text-sm">
                        <TableCell className="pl-8 text-slate-600">Kargo Gideri</TableCell>
                        <TableCell className="text-right text-slate-600">{formatCurrency(results.kargoToplam)}</TableCell>
                      </TableRow>
                      <TableRow className="text-sm">
                        <TableCell className="pl-8 text-slate-600">Platform Hizmet Bedeli</TableCell>
                        <TableCell className="text-right text-slate-600">{formatCurrency(results.platformFeeToplam)}</TableCell>
                      </TableRow>
                      <TableRow className="text-sm">
                        <TableCell className="pl-8 text-slate-600">Stopaj Gideri</TableCell>
                        <TableCell className="text-right text-slate-600">{formatCurrency(results.stopajToplam)}</TableCell>
                      </TableRow>
                      <TableRow className="text-sm border-b-2 border-slate-100">
                        <TableCell className="pl-8 text-slate-600">Toplam Sabit Giderler</TableCell>
                        <TableCell className="text-right text-slate-600">{formatCurrency(results.sabitGiderlerToplamNet)}</TableCell>
                      </TableRow>

                      <TableRow className="bg-slate-50">
                        <TableCell className="font-bold text-red-600">(-) Toplam Faaliyet Giderleri</TableCell>
                        <TableCell className="text-right font-bold text-red-600">{formatCurrency(results.faaliyetGiderleriToplam)}</TableCell>
                      </TableRow>

                      <TableRow className="bg-slate-100">
                        <TableCell className="font-bold text-slate-800">= Faaliyet Kârı (EBIT)</TableCell>
                        <TableCell className="text-right font-bold text-slate-800">{formatCurrency(results.faaliyetKar)}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium text-red-500">(-) Gelir/Kurumlar Vergisi</TableCell>
                        <TableCell className="text-right text-red-500">{formatCurrency(results.vergi)}</TableCell>
                      </TableRow>
                      <TableRow className="bg-green-50 border-t-2 border-green-100">
                        <TableCell className="text-lg font-bold text-green-800">NET KÂR / ZARAR</TableCell>
                        <TableCell className="text-lg font-bold text-right text-green-800">{formatCurrency(results.netKar)}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Tax Analysis */}
                <Card className="border-slate-200 shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Percent className="w-4 h-4 text-orange-500" />
                      Vergi Analizi (KDV)
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <Table>
                      <TableBody>
                        <TableRow>
                          <TableCell className="py-2 font-medium">Satış KDV (Hesaplanan)</TableCell>
                          <TableCell className="py-2 text-right font-medium">{formatCurrency(results.satisKDVTutari)}</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="py-2 text-green-600">(-) İndirilebilir KDV Toplamı</TableCell>
                          <TableCell className="py-2 text-right text-green-600">{formatCurrency(results.indirilebilirKDVToplam)}</TableCell>
                        </TableRow>
                        <TableRow className="bg-orange-50">
                          <TableCell className="py-3 font-bold text-orange-800">Ödenecek KDV</TableCell>
                          <TableCell className="py-3 text-right font-bold text-orange-800">{formatCurrency(results.odenecekKDV)}</TableCell>
                        </TableRow>
                        {results.devredenKDV > 0 && (
                          <TableRow className="bg-yellow-50">
                            <TableCell className="py-2 font-medium text-yellow-800">Devreden KDV</TableCell>
                            <TableCell className="py-2 text-right font-bold text-yellow-800">{formatCurrency(results.devredenKDV)}</TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>

                {/* KPI Cards */}
                <div className="space-y-4">
                  <Card className="bg-blue-50 border-blue-100 shadow-none">
                    <CardContent className="p-4 text-center">
                      <h4 className="text-sm font-medium text-blue-600 uppercase tracking-wide">Başabaş Noktası</h4>
                      <p className="text-3xl font-bold text-blue-900 mt-1">{formatNumber(Math.ceil(results.bepAdet))} <span className="text-base font-normal text-blue-700">Adet</span></p>
                    </CardContent>
                  </Card>
                  
                  <Card className="bg-purple-50 border-purple-100 shadow-none">
                    <CardContent className="p-4 text-center">
                      <h4 className="text-sm font-medium text-purple-600 uppercase tracking-wide">Hedef Kâr İçin Gerekli Satış</h4>
                      <p className="text-3xl font-bold text-purple-900 mt-1">{formatNumber(Math.ceil(results.hedefAdet))} <span className="text-base font-normal text-purple-700">Adet</span></p>
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* Unit Economics */}
              <Card className="border-slate-200 shadow-sm">
                <CardHeader className="pb-4">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Package className="w-4 h-4 text-slate-500" />
                    Birim Ekonomisi
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableBody>
                      <TableRow>
                        <TableCell className="py-2 font-medium">Birim Satış Fiyatı (KDV Hariç)</TableCell>
                        <TableCell className="py-2 text-right">{formatCurrency(results.satisNet)}</TableCell>
                      </TableRow>
                      <TableRow className="bg-purple-50">
                        <TableCell className="py-2 font-bold text-purple-900">Hedef Kâr İçin Gerekli Fiyat (KDV Dahil)</TableCell>
                        <TableCell className="py-2 text-right font-bold text-purple-900">{formatCurrency(results.hedefFiyatKDVIncl)}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="py-2 font-medium text-red-500">Birim Maliyetler Toplamı</TableCell>
                        <TableCell className="py-2 text-right text-red-500">{formatCurrency(results.birimToplamMaliyet)}</TableCell>
                      </TableRow>
                      <TableRow className="bg-slate-50">
                        <TableCell className="py-2 font-bold">Birim Katkı Payı</TableCell>
                        <TableCell className="py-2 text-right font-bold">{formatCurrency(results.katkiPayiBirim)}</TableCell>
                      </TableRow>
                      <TableRow className="bg-green-50">
                        <TableCell className="py-2 font-bold text-green-800">Net Kâr / Birim</TableCell>
                        <TableCell className="py-2 text-right font-bold text-green-800">{formatCurrency(results.netKarBirim)}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
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
