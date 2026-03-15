import React from 'react';
import { Info, ArrowRight, Satellite, Mountain, BookOpen, Lightbulb } from 'lucide-react';

export function Explanation() {
  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-8 transition-colors duration-200">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
          <Info className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
          Entenda a Conversão de Altitude
        </h2>
        <p className="text-slate-600 dark:text-slate-300 mb-8 leading-relaxed text-lg">
          O modelo <strong className="text-slate-900 dark:text-white">hgeoHNOR2020</strong> do IBGE permite converter a altitude obtida por receptores GPS/GNSS (Altitude Geométrica) na altitude física real (Altitude Ortométrica), que é referenciada ao nível médio do mar (Marégrafo de Imbituba).
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-xl border border-slate-100 dark:border-slate-700/50 flex flex-col items-center text-center transition-colors">
            <Satellite className="w-10 h-10 text-blue-500 dark:text-blue-400 mb-4" />
            <h3 className="font-semibold text-slate-900 dark:text-white mb-2">Altitude Geométrica (h)</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">Medida em relação ao elipsoide de referência matemático (como SAD69 ou SIRGAS2000). É a altitude bruta que o seu GPS fornece.</p>
          </div>
          <div className="flex items-center justify-center">
            <ArrowRight className="w-10 h-10 text-slate-300 dark:text-slate-600 hidden md:block" />
            <div className="md:hidden h-10 w-[2px] bg-slate-200 dark:bg-slate-700 my-2"></div>
          </div>
          <div className="bg-indigo-50 dark:bg-indigo-900/20 p-6 rounded-xl border border-indigo-100 dark:border-indigo-800/30 flex flex-col items-center text-center transition-colors">
            <Mountain className="w-10 h-10 text-indigo-600 dark:text-indigo-400 mb-4" />
            <h3 className="font-semibold text-slate-900 dark:text-white mb-2">Altitude Ortométrica (H)</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">Medida em relação ao geoide (nível médio do mar). É a altitude real física utilizada em projetos de engenharia e topografia.</p>
          </div>
        </div>

        <div className="bg-slate-900 dark:bg-slate-950 text-white p-8 rounded-xl relative overflow-hidden mb-10 border border-slate-800">
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500 rounded-full blur-3xl opacity-20 -translate-y-1/2 translate-x-1/3"></div>
          
          <h3 className="font-medium mb-4 text-indigo-300 text-lg">A Fórmula de Conversão</h3>
          <div className="text-4xl md:text-5xl font-mono mb-6 font-bold tracking-tight">H = h - N</div>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
            <div className="bg-white/10 p-4 rounded-lg backdrop-blur-sm border border-white/10">
              <strong className="text-indigo-300 block mb-1 text-lg">H</strong>
              <span className="text-slate-300">Altitude Ortométrica (o que você quer descobrir)</span>
            </div>
            <div className="bg-white/10 p-4 rounded-lg backdrop-blur-sm border border-white/10">
              <strong className="text-blue-300 block mb-1 text-lg">h</strong>
              <span className="text-slate-300">Altitude Geométrica (o que o GPS mediu)</span>
            </div>
            <div className="bg-indigo-600/40 p-4 rounded-lg backdrop-blur-sm border border-indigo-400/30">
              <strong className="text-white block mb-1 text-lg">N</strong>
              <span className="text-indigo-100">Ondulação Geoidal (o fator calculado por este sistema)</span>
            </div>
          </div>
        </div>

        <hr className="border-slate-200 dark:border-slate-800 my-10" />

        <div className="space-y-8">
          <div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              Como Interpretar a Ondulação Geoidal (N)
            </h3>
            <div className="prose prose-slate dark:prose-invert max-w-none text-slate-600 dark:text-slate-300">
              <p>
                A <strong className="text-slate-900 dark:text-white">Ondulação Geoidal (N)</strong> representa a distância vertical entre o geoide (nível do mar) e o elipsoide (modelo matemático da Terra) em um ponto específico.
              </p>
              <ul className="list-disc pl-5 space-y-2 mt-4">
                <li>
                  <strong className="text-slate-900 dark:text-white">Se N for negativo:</strong> Significa que o geoide está <em>abaixo</em> do elipsoide naquele local. Ao aplicar a fórmula <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded text-slate-800 dark:text-slate-200">H = h - (-N)</code>, a altitude ortométrica (H) será <strong className="text-slate-900 dark:text-white">maior</strong> que a altitude geométrica (h).
                </li>
                <li>
                  <strong className="text-slate-900 dark:text-white">Se N for positivo:</strong> Significa que o geoide está <em>acima</em> do elipsoide. Ao aplicar a fórmula <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded text-slate-800 dark:text-slate-200">H = h - (+N)</code>, a altitude ortométrica (H) será <strong className="text-slate-900 dark:text-white">menor</strong> que a altitude geométrica (h).
                </li>
              </ul>
              <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/30 rounded-lg text-blue-800 dark:text-blue-300 text-sm">
                <strong className="text-blue-900 dark:text-blue-200">Dica:</strong> No Brasil, a ondulação geoidal varia aproximadamente entre -10 metros (no Nordeste) e -20 metros (no Sul). Portanto, a altitude ortométrica (H) costuma ser sempre maior que a altitude lida no GPS (h).
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-amber-500" />
              Exemplos Práticos de Uso
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-5 rounded-xl shadow-sm transition-colors">
                <h4 className="font-semibold text-slate-900 dark:text-white mb-2">1. Topografia e Engenharia Civil</h4>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Ao projetar rodovias, canais de irrigação ou redes de esgoto, a água flui de acordo com a gravidade (nível do mar). Usar a altitude do GPS sem conversão pode resultar em cálculos de declividade incorretos, fazendo com que a água não escoe.
                </p>
              </div>
              <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-5 rounded-xl shadow-sm transition-colors">
                <h4 className="font-semibold text-slate-900 dark:text-white mb-2">2. Georreferenciamento de Imóveis (INCRA)</h4>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  A legislação brasileira exige que o georreferenciamento de propriedades rurais utilize altitudes referenciadas ao Marégrafo de Imbituba. O modelo hgeoHNOR2020 é o padrão oficial obrigatório para essa conversão.
                </p>
              </div>
              <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-5 rounded-xl shadow-sm transition-colors">
                <h4 className="font-semibold text-slate-900 dark:text-white mb-2">3. Mapeamento com Drones (VANTs)</h4>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Drones capturam imagens com coordenadas e altitudes geométricas. Para gerar Modelos Digitais de Terreno (MDT) precisos e compatíveis com mapas oficiais, é necessário aplicar a ondulação geoidal aos pontos de controle.
                </p>
              </div>
              <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-5 rounded-xl shadow-sm transition-colors">
                <h4 className="font-semibold text-slate-900 dark:text-white mb-2">4. Agricultura de Precisão</h4>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Sistemas de nivelamento de solo e drenagem agrícola dependem de altitudes ortométricas corretas para otimizar o uso da água e evitar áreas de alagamento nas lavouras.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-10 p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-600 dark:text-slate-400 text-sm text-center transition-colors">
          O modelo hgeoHNOR2020 é o modelo oficial brasileiro para conversão de altitudes, substituindo o antigo MAPGEO2015.
        </div>
      </div>
    </div>
  );
}
