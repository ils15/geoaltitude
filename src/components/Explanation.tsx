import React from 'react';
import { Info, ArrowRight, Satellite, Mountain, BookOpen, ShieldCheck, Zap, Globe } from 'lucide-react';

export function Explanation() {
  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-20">
      {/* Header Section */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-slate-200 dark:border-slate-800 p-10 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-ibge-blue/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
        
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-ibge-blue p-2.5 rounded-2xl">
              <BookOpen className="w-6 h-6 text-white" />
            </div>
            <h2 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">
              Documentação Técnica & Geodésia
            </h2>
          </div>
          
          <p className="text-slate-600 dark:text-slate-300 mb-10 leading-relaxed text-xl max-w-3xl">
            O GeoAlt utiliza o modelo <strong className="text-ibge-blue dark:text-ibge-light-blue">hgeoHNOR2020</strong>, o padrão oficial do Sistema Geodésico Brasileiro (SGB). Esta tecnologia permite a determinação da altitude física (Ortométrica) a partir de coordenadas espaciais.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <div className="space-y-6">
              <h3 className="text-lg font-bold flex items-center gap-2 text-slate-900 dark:text-slate-100">
                <Satellite className="w-5 h-5 text-ibge-blue" />
                Referencial Matemático (SIRGAS2000)
              </h3>
              <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
                As medições efetuadas por GNSS são referenciadas a um elipsoide (modelo matemático), resultando na <strong>Altitude Geométrica (h)</strong>. Este valor não reflete a realidade física da gravidade e não deve ser usado em projetos de engenharia hidráulica ou saneamento.
              </p>
            </div>
            <div className="space-y-6">
              <h3 className="text-lg font-bold flex items-center gap-2 text-slate-900 dark:text-slate-100">
                <Mountain className="w-5 h-5 text-ibge-green" />
                Referencial Físico (Geoide)
              </h3>
              <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
                A <strong>Altitude Ortométrica (H)</strong> é a distância contada ao longo da linha vertical entre o ponto e o geoide (Nível Médio do Mar). No Brasil, o referencial principal é o <strong>Marégrafo de Imbituba (SC)</strong>.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Formula & Calculation Section */}
      <div className="bg-slate-900 dark:bg-black rounded-3xl p-10 border border-slate-800 shadow-2xl">
        <div className="flex flex-col lg:flex-row items-center gap-12">
          <div className="flex-1 text-center lg:text-left">
            <span className="text-ibge-gold font-bold uppercase tracking-[0.2em] text-xs mb-3 block">Equação de Redução Geodética</span>
            <div className="text-5xl md:text-7xl font-mono font-black text-white mb-6 tracking-tighter">
              H = h - N
            </div>
            <p className="text-slate-400 text-sm max-w-md">
              A conversão subtrai a <strong>Ondulação Geoidal (N)</strong> da leitura bruta do GPS. O GeoAlt automatiza este cálculo consultando as grades de alta resolução do IBGE.
            </p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full lg:w-3/5">
            <MetricCard label="H" sub="Ortométrica" color="border-ibge-green" />
            <MetricCard label="h" sub="Geométrica" color="border-ibge-blue" />
            <MetricCard label="N" sub="Ondulação" color="border-ibge-gold" />
          </div>
        </div>
      </div>

      {/* Technical Specs & Privacy */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-200 dark:border-slate-800 shadow-sm">
          <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
            <Globe className="w-5 h-5 text-ibge-blue" />
            Especificações Técnicas
          </h3>
          <div className="space-y-4 text-sm text-slate-600 dark:text-slate-400">
            <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800">
              <span className="font-medium">Modelo Principal</span>
              <span className="font-mono text-ibge-blue">hgeoHNOR2020</span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800">
              <span className="font-medium">Datum de Referência</span>
              <span className="font-mono text-ibge-blue">SIRGAS2000 / WGS84</span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800">
              <span className="font-medium">Vertical Datum</span>
              <span className="font-mono text-ibge-blue">Imbituba (SC) / Santana (AP)</span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800">
              <span className="font-medium">API Provider</span>
              <span className="font-mono text-ibge-blue">IBGE Service v1</span>
            </div>
          </div>
        </div>

        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-3xl p-8 border border-slate-200 dark:border-slate-700 shadow-sm">
          <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-ibge-green" />
            Privacidade
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-6">
            O GeoAlt opera sob uma política de <strong>Retenção Zero</strong>. Suas coordenadas e arquivos CSV são processados de forma efêmera. Nenhuma informação de projeto é armazenada em nossos bancos de dados após o processamento.
          </p>
          <div className="flex items-center gap-2 text-[10px] font-bold text-ibge-blue uppercase tracking-wider">
            <Zap className="w-3 h-3" />
            100% Client-Side Ready
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ label, sub, color }: { label: string, sub: string, color: string }) {
  return (
    <div className={`bg-white/5 dark:bg-white/5 border-2 ${color} p-6 rounded-2xl text-center backdrop-blur-sm`}>
      <span className="text-3xl font-black text-white block mb-1">{label}</span>
      <span className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">{sub}</span>
    </div>
  );
}
