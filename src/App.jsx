import React, { useState } from 'react';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, ComposedChart
} from 'recharts';
import { 
  LayoutDashboard, FileText, Users, UserCircle, Plus, Upload, 
  Trash2, ChevronRight, BarChart3, ArrowLeft, Download, Filter, Info, X
} from 'lucide-react';

// --- CONFIGURAÇÕES DE OPÇÕES ---
const CONTENT_TYPES = ['Carrossel', 'Enquete', 'Foto', 'Newsletter', 'Texto', 'Vídeo'];
const PILLARS = ['Mercado', 'Pessoal', 'OndaSkim'];
const THEMES = ['Cultura', 'Educacional', 'Inspiração', 'Institucional', 'Produto', 'Tendência'];
const FUNNELS = ['Topo', 'Meio', 'Fundo'];
const PERIOD_TYPES = ['Semana', 'Mês', 'Trimestre', 'Ano'];
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#ffc658'];

// --- BASE DE INFORMAÇÕES DOS GRÁFICOS ---
const CHART_INFO = {
  temporal: {
    title: "Engajamento vs Leads Qualificados",
    calc: "Soma o Engajamento Total (Curtidas + Comentários + Votos) de todas as publicações de um mês específico e compara com o volume de Leads Qualificados registados para aquele mesmo mês (em formato de linha).",
    origin: "Cruza os dados da aba 'Publicações & Dados' (campo Mês e as métricas) com a aba 'Leads Qualificados' (campo Período Referência).",
    insight: "Permite ver o 'lapso temporal' entre as ações de marketing e o resultado comercial. Por exemplo: um pico de viralidade neste mês gerou leads imediatamente ou apenas no mês seguinte?"
  },
  typeBar: {
    title: "Curtidas e Comentários vs Tipo",
    calc: "Soma simples de Curtidas isoladas e Comentários isolados, agrupados pela categoria escolhida no campo 'Tipo de Conteúdo' (Carrossel, Vídeo, etc).",
    origin: "Lido diretamente das publicações inseridas, somando as colunas individuais 'Curtidas' e 'Comentários'.",
    insight: "Revela o comportamento e intenção da audiência. Vídeos podem gerar muitos comentários (discussão), enquanto Carrosséis podem gerar muitas curtidas (salvamentos/absorção rápida de conteúdo)."
  },
  typePie: {
    title: "Participação no Engajamento por Tipo",
    calc: "Calcula o Engajamento Total (Curtidas + Comentários + Votos) gerado por cada Tipo de Conteúdo, dividido pelo Engajamento Absoluto de todo o período, resultando na percentagem (%).",
    origin: "Utiliza o cálculo interno de engajamento de todas as publicações na base de dados ativa.",
    insight: "Mostra a 'fatia do bolo'. Ajuda a entender qual formato de post é o verdadeiro motor de tração da sua conta para focar a produção."
  },
  poll: {
    title: "Volume de Votos em Enquetes",
    calc: "Busca exclusivamentre as publicações marcadas como 'Enquete' e soma o número do campo 'Votos Enquete', organizado mês a mês.",
    origin: "Aba 'Publicações', utilizando apenas as linhas cujo Tipo é 'Enquete' e cruzando com a data.",
    insight: "Como votos costumam ter um volume numérico discrepante (muito maior que likes e fáceis de clicar), isolar essa métrica permite ver se as pesquisas estão a crescer sem distorcer o engajamento base."
  },
  pillar: {
    title: "Engajamento por Pilar Estratégico",
    calc: "Agrupa todo o engajamento gerado (soma de interações) baseado na coluna 'Pilar' (Mercado, Pessoal, OndaSkim). Exibe os totais num ranking horizontal.",
    origin: "Aba 'Publicações & Dados', cruzando o total de interações de cada post com o seu Pilar classificado.",
    insight: "Avalia o sucesso da macro-estratégia. As histórias Pessoais estão a atrair mais a audiência do que as análises de Mercado ou postagens sobre a empresa?"
  },
  theme: {
    title: "Engajamento por Tema Estratégico",
    calc: "Agrupa o engajamento baseado na coluna 'Tema' (Cultura, Educacional, Inspiração, Institucional, Produto, Tendência), criando um ranking.",
    origin: "Aba 'Publicações & Dados', focando estritamente na categoria 'Tema'.",
    insight: "Uma visão micro da linha editorial. Ajuda a definir pautas futuras: se 'Tendência' lidera, a audiência quer ficar atualizada; se 'Inspiração' lidera, buscam motivação."
  }
};

export default function App() {
  // --- ESTADOS DA APLICAÇÃO ---
  const [profiles, setProfiles] = useState([]);
  const [activeProfileId, setActiveProfileId] = useState(null);
  const [currentView, setCurrentView] = useState('dashboard'); // dashboard, posts, leads
  
  // Dados principais
  const [posts, setPosts] = useState([]);
  const [leads, setLeads] = useState([]);

  // Estados de Formulários
  const [newProfileName, setNewProfileName] = useState('');
  const [showPostForm, setShowPostForm] = useState(false);
  const [showLeadForm, setShowLeadForm] = useState(false);

  // Filtros de Data do Dashboard
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');

  // Modal de Detalhamento
  const [infoModal, setInfoModal] = useState(null);

  // --- FUNÇÕES AUXILIARES ---
  const generateId = () => Math.random().toString(36).substr(2, 9);

  const handleCreateProfile = (e) => {
    e.preventDefault();
    if (!newProfileName.trim()) return;
    const newProfile = { id: generateId(), name: newProfileName };
    setProfiles([...profiles, newProfile]);
    setNewProfileName('');
    setActiveProfileId(newProfile.id);
    setCurrentView('dashboard');
  };

  const activeProfile = profiles.find(p => p.id === activeProfileId);
  const profilePosts = posts.filter(p => p.profileId === activeProfileId);
  const profileLeads = leads.filter(l => l.profileId === activeProfileId);

  const calculateEngagement = (post) => {
    return (Number(post.likes) || 0) + (Number(post.comments) || 0) + (Number(post.pollVotes) || 0);
  };

  const downloadCSVTemplate = () => {
    const headers = ['Mês (YYYY-MM)', 'Texto', 'Tipo', 'Pilar', 'Tema', 'Funil', 'Alcance', 'Curtidas', 'Comentarios', 'VotosEnquete', 'Link'];
    const example = ['2023-10', 'Resumo do meu post incrível', 'Carrossel', 'Mercado', 'Tendência', 'Topo', '1500', '50', '10', '0', 'https://linkedin.com/post1'];
    
    // Adiciona o BOM (\uFEFF) para forçar o Excel a ler como UTF-8
    const csvContent = '\uFEFF' + [headers.join(','), example.join(',')].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'modelo_importacao_skimmetrics.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- DADOS DE TESTE MOCKADOS ---
  const loadTestData = () => {
    if (!activeProfileId) return;
    
    const mockPosts = [
      { id: generateId(), profileId: activeProfileId, month: '2023-01', text: 'Tendências de IA: Como a inteligência artificial vai mudar o seu trabalho nos próximos 5 anos. Uma análise profunda sobre o mercado e ferramentas.', type: 'Carrossel', pillar: 'Mercado', theme: 'Tendência', funnel: 'Topo', reach: 5000, likes: 120, comments: 45, pollVotes: 0, link: 'https://linkedin.com/post1' },
      { id: generateId(), profileId: activeProfileId, month: '2023-01', text: 'Nossa cultura Skim: Conheça os bastidores da nossa equipa, os nossos valores e como construímos um ambiente de trabalho inovador todos os dias.', type: 'Foto', pillar: 'OndaSkim', theme: 'Cultura', funnel: 'Meio', reach: 3000, likes: 200, comments: 30, pollVotes: 0, link: 'https://linkedin.com/post2' },
      { id: generateId(), profileId: activeProfileId, month: '2023-02', text: 'Você prefere trabalho remoto, híbrido ou 100% presencial? Deixe a sua opinião nesta enquete sobre o futuro do trabalho e como as empresas estão a adaptar-se!', type: 'Enquete', pillar: 'Mercado', theme: 'Educacional', funnel: 'Topo', reach: 8000, likes: 50, comments: 20, pollVotes: 400, link: 'https://linkedin.com/post3' },
      { id: generateId(), profileId: activeProfileId, month: '2023-02', text: 'Lançamento de Produto: Conheça a nossa nova funcionalidade exclusiva que vai automatizar os seus relatórios e poupar horas da sua semana.', type: 'Vídeo', pillar: 'OndaSkim', theme: 'Produto', funnel: 'Fundo', reach: 4500, likes: 150, comments: 60, pollVotes: 0, link: 'https://linkedin.com/post4' },
      { id: generateId(), profileId: activeProfileId, month: '2023-03', text: 'Minha jornada: Como saí do zero a uma empresa faturando milhões. Os erros, acertos e os mentores que me ajudaram pelo caminho.', type: 'Texto', pillar: 'Pessoal', theme: 'Inspiração', funnel: 'Meio', reach: 6000, likes: 300, comments: 80, pollVotes: 0, link: 'https://linkedin.com/post5' },
    ];
    
    const mockLeads = [
      { id: generateId(), profileId: activeProfileId, periodType: 'Mês', periodValue: '2023-01', count: 15 },
      { id: generateId(), profileId: activeProfileId, periodType: 'Mês', periodValue: '2023-02', count: 42 },
      { id: generateId(), profileId: activeProfileId, periodType: 'Mês', periodValue: '2023-03', count: 28 },
    ];

    setPosts([...posts.filter(p => p.profileId !== activeProfileId), ...mockPosts]);
    setLeads([...leads.filter(l => l.profileId !== activeProfileId), ...mockLeads]);
  };

  // --- TELAS E COMPONENTES ---

  // 1. Tela de Seleção de Perfil
  if (!activeProfileId) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md">
          <div className="flex justify-center mb-6">
            <div className="bg-blue-600 p-3 rounded-full text-white">
              <BarChart3 size={32} />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-center text-slate-800 mb-2">LinkedIn Analytics Pro</h1>
          <p className="text-slate-500 text-center mb-8">Selecione ou crie um perfil para iniciar a análise de dados.</p>
          
          {profiles.length > 0 && (
            <div className="mb-8">
              <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">Perfis Existentes</h3>
              <div className="space-y-2">
                {profiles.map(p => (
                  <button
                    key={p.id}
                    onClick={() => setActiveProfileId(p.id)}
                    className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-blue-50 border border-slate-100 rounded-xl transition-colors text-left"
                  >
                    <span className="font-medium text-slate-700 flex items-center gap-2">
                      <UserCircle className="text-blue-500" /> {p.name}
                    </span>
                    <ChevronRight size={18} className="text-slate-400" />
                  </button>
                ))}
              </div>
            </div>
          )}

          <form onSubmit={handleCreateProfile}>
            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">Criar Novo Perfil</h3>
            <input
              type="text"
              placeholder="Nome da Conta / Empresa"
              className="w-full p-3 border border-slate-200 rounded-lg mb-3 focus:ring-2 focus:ring-blue-500 outline-none"
              value={newProfileName}
              onChange={(e) => setNewProfileName(e.target.value)}
            />
            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
            >
              Criar e Entrar
            </button>
          </form>
        </div>
      </div>
    );
  }

  // --- VIEWS PRINCIPAIS ---

  const renderDashboard = () => {
    // 1. Aplicação dos Filtros de Data
    const filteredPosts = profilePosts.filter(post => {
      if (filterStartDate && post.month < filterStartDate) return false;
      if (filterEndDate && post.month > filterEndDate) return false;
      return true;
    });

    const filteredLeads = profileLeads.filter(lead => {
      if (lead.periodType === 'Mês') {
        if (filterStartDate && lead.periodValue < filterStartDate) return false;
        if (filterEndDate && lead.periodValue > filterEndDate) return false;
      }
      return true;
    });

    // 2. Processamento de dados para os gráficos
    const statsByMonth = filteredPosts.reduce((acc, post) => {
      if (!acc[post.month]) acc[post.month] = { month: post.month, reach: 0, engagement: 0, leads: 0, pollVotes: 0 };
      acc[post.month].reach += Number(post.reach);
      acc[post.month].engagement += calculateEngagement(post);
      if (post.type === 'Enquete') acc[post.month].pollVotes += Number(post.pollVotes);
      return acc;
    }, {});

    filteredLeads.forEach(lead => {
      if (lead.periodType === 'Mês' && statsByMonth[lead.periodValue]) {
        statsByMonth[lead.periodValue].leads += Number(lead.count);
      } else if (lead.periodType === 'Mês' && !statsByMonth[lead.periodValue]) {
         statsByMonth[lead.periodValue] = { month: lead.periodValue, reach: 0, engagement: 0, leads: Number(lead.count), pollVotes: 0 };
      }
    });

    const monthlyData = Object.values(statsByMonth).sort((a, b) => a.month.localeCompare(b.month));

    // 3. Dados por Tipo de Conteúdo
    const typeStats = filteredPosts.reduce((acc, post) => {
      if (!acc[post.type]) acc[post.type] = { type: post.type, engagement: 0, likes: 0, comments: 0, pollVotes: 0 };
      acc[post.type].engagement += calculateEngagement(post);
      acc[post.type].likes += Number(post.likes) || 0;
      acc[post.type].comments += Number(post.comments) || 0;
      acc[post.type].pollVotes += Number(post.pollVotes) || 0;
      return acc;
    }, {});
    
    const typeData = Object.values(typeStats).sort((a,b) => b.engagement - a.engagement);
    const pieData = typeData.map(item => ({ name: item.type, value: item.engagement }));

    // 4. Dados por Pilar e Tema
    const pillarStats = filteredPosts.reduce((acc, post) => {
      acc[post.pillar] = (acc[post.pillar] || 0) + calculateEngagement(post);
      return acc;
    }, {});
    const pillarData = Object.keys(pillarStats).map(key => ({ name: key, engagement: pillarStats[key] })).sort((a,b) => b.engagement - a.engagement);

    const themeStats = filteredPosts.reduce((acc, post) => {
      acc[post.theme] = (acc[post.theme] || 0) + calculateEngagement(post);
      return acc;
    }, {});
    const themeData = Object.keys(themeStats).map(key => ({ name: key, engagement: themeStats[key] })).sort((a,b) => b.engagement - a.engagement);

    // Totais de KPIs
    const totalReach = filteredPosts.reduce((sum, p) => sum + Number(p.reach), 0);
    const totalEngagement = filteredPosts.reduce((sum, p) => sum + calculateEngagement(p), 0);
    const totalLeads = filteredLeads.reduce((sum, l) => sum + Number(l.count), 0);

    return (
      <div className="space-y-6">
        {/* Barra de Filtros */}
        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex flex-wrap items-end gap-4">
          <div className="flex items-center gap-2 text-slate-700 font-semibold w-full md:w-auto mb-2 md:mb-0">
            <Filter size={18} /> Filtros de Período:
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Mês Inicial</label>
            <input 
              type="month" 
              value={filterStartDate} 
              onChange={(e) => setFilterStartDate(e.target.value)}
              className="p-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Mês Final</label>
            <input 
              type="month" 
              value={filterEndDate} 
              onChange={(e) => setFilterEndDate(e.target.value)}
              className="p-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          {(filterStartDate || filterEndDate) && (
            <button 
              onClick={() => { setFilterStartDate(''); setFilterEndDate(''); }}
              className="px-4 py-2 text-sm text-slate-500 hover:text-red-500 transition font-medium"
            >
              Limpar Filtros
            </button>
          )}
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm">
            <h4 className="text-slate-500 text-sm font-medium">Alcance Total</h4>
            <p className="text-3xl font-bold text-slate-800 mt-2">{totalReach.toLocaleString('pt-PT')}</p>
          </div>
          <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm">
            <h4 className="text-slate-500 text-sm font-medium">Engajamento Total</h4>
            <p className="text-3xl font-bold text-slate-800 mt-2">{totalEngagement.toLocaleString('pt-PT')}</p>
          </div>
          <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm">
            <h4 className="text-slate-500 text-sm font-medium">Publicações Analisadas</h4>
            <p className="text-3xl font-bold text-slate-800 mt-2">{filteredPosts.length}</p>
          </div>
          <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm border-l-4 border-l-green-500">
            <h4 className="text-slate-500 text-sm font-medium">Leads Qualificados</h4>
            <p className="text-3xl font-bold text-green-600 mt-2">{totalLeads}</p>
          </div>
        </div>

        {/* Gráficos em Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Gráfico 1: Ações vs Leads (Correlação Temporal) */}
          <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm">
            <div className="flex justify-between items-start mb-4">
              <h3 className="font-bold text-slate-800">Engajamento vs Leads Qualificados (Temporal)</h3>
              <button onClick={() => setInfoModal(CHART_INFO.temporal)} className="text-slate-400 hover:text-blue-600 transition" title="Entender este gráfico">
                <Info size={20} />
              </button>
            </div>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} />
                  <YAxis yAxisId="left" axisLine={false} tickLine={false} />
                  <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} />
                  <Tooltip cursor={{fill: '#f8fafc'}} />
                  <Legend />
                  <Bar yAxisId="left" dataKey="engagement" name="Engajamento Total" fill="#3b82f6" radius={[4,4,0,0]} />
                  <Line yAxisId="right" type="monotone" dataKey="leads" name="Leads Qualificados" stroke="#22c55e" strokeWidth={3} dot={{r: 6}} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Gráfico 2: Curtidas e Comentários por Tipo */}
          <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm">
            <div className="flex justify-between items-start mb-4">
              <h3 className="font-bold text-slate-800">Curtidas e Comentários vs Tipo de Publicação</h3>
              <button onClick={() => setInfoModal(CHART_INFO.typeBar)} className="text-slate-400 hover:text-blue-600 transition" title="Entender este gráfico">
                <Info size={20} />
              </button>
            </div>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={typeData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                  <XAxis dataKey="type" axisLine={false} tickLine={false} />
                  <YAxis axisLine={false} tickLine={false} />
                  <Tooltip cursor={{fill: '#f8fafc'}} />
                  <Legend />
                  <Bar dataKey="likes" name="Curtidas" fill="#3b82f6" radius={[4,4,0,0]} />
                  <Bar dataKey="comments" name="Comentários" fill="#f59e0b" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Gráfico 3: Engajamento por Tipo (Pizza) */}
          <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm">
            <div className="flex justify-between items-start mb-4">
              <h3 className="font-bold text-slate-800">Participação no Engajamento por Tipo</h3>
              <button onClick={() => setInfoModal(CHART_INFO.typePie)} className="text-slate-400 hover:text-blue-600 transition" title="Entender este gráfico">
                <Info size={20} />
              </button>
            </div>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={5}
                    dataKey="value"
                    label={({name, percent}) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Gráfico 4: Enquetes vs Votos Temporal */}
          <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm">
            <div className="flex justify-between items-start mb-4">
              <h3 className="font-bold text-slate-800">Volume de Votos em Enquetes (Temporal)</h3>
              <button onClick={() => setInfoModal(CHART_INFO.poll)} className="text-slate-400 hover:text-blue-600 transition" title="Entender este gráfico">
                <Info size={20} />
              </button>
            </div>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} />
                  <YAxis axisLine={false} tickLine={false} />
                  <Tooltip cursor={{fill: '#f8fafc'}} />
                  <Legend />
                  <Bar dataKey="pollVotes" name="Votos em Enquetes" fill="#8b5cf6" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Gráfico 5: Engajamento por Pilar */}
          <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm">
            <div className="flex justify-between items-start mb-4">
              <h3 className="font-bold text-slate-800">Engajamento por Pilar Estratégico</h3>
              <button onClick={() => setInfoModal(CHART_INFO.pillar)} className="text-slate-400 hover:text-blue-600 transition" title="Entender este gráfico">
                <Info size={20} />
              </button>
            </div>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={pillarData} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#eee" />
                  <XAxis type="number" axisLine={false} tickLine={false} />
                  <YAxis dataKey="name" type="category" width={80} axisLine={false} tickLine={false} />
                  <Tooltip cursor={{fill: '#f8fafc'}} />
                  <Bar dataKey="engagement" name="Engajamento" fill="#10b981" radius={[0,4,4,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Gráfico 6: Engajamento por Tema */}
          <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm">
            <div className="flex justify-between items-start mb-4">
              <h3 className="font-bold text-slate-800">Engajamento por Tema Estratégico</h3>
              <button onClick={() => setInfoModal(CHART_INFO.theme)} className="text-slate-400 hover:text-blue-600 transition" title="Entender este gráfico">
                <Info size={20} />
              </button>
            </div>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={themeData} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#eee" />
                  <XAxis type="number" axisLine={false} tickLine={false} />
                  <YAxis dataKey="name" type="category" width={80} axisLine={false} tickLine={false} />
                  <Tooltip cursor={{fill: '#f8fafc'}} />
                  <Bar dataKey="engagement" name="Engajamento" fill="#f43f5e" radius={[0,4,4,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderPosts = () => {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <h2 className="text-xl font-bold text-slate-800">Publicações e Análise Individual</h2>
          <div className="flex flex-wrap gap-3">
            <button 
              onClick={downloadCSVTemplate}
              className="flex items-center gap-2 px-4 py-2 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 transition"
              title="Baixar modelo de planilha CSV para preenchimento"
            >
              <Download size={18} />
              Baixar Modelo CSV
            </button>
            <button className="flex items-center gap-2 px-4 py-2 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 transition">
              <Upload size={18} />
              Importar Planilha (CSV)
            </button>
            <button 
              onClick={() => setShowPostForm(!showPostForm)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              <Plus size={18} />
              Nova Publicação
            </button>
          </div>
        </div>

        {showPostForm && (
          <PostForm 
            onSave={(post) => {
              setPosts([...posts, { ...post, id: generateId(), profileId: activeProfileId }]);
              setShowPostForm(false);
            }} 
            onCancel={() => setShowPostForm(false)} 
          />
        )}

        <div className="overflow-x-auto mt-6 pb-32">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600 uppercase text-xs font-semibold">
              <tr>
                <th className="p-3 rounded-tl-lg">Mês</th>
                <th className="p-3">Texto/Resumo</th>
                <th className="p-3">Tipo / Pilar / Tema</th>
                <th className="p-3">Alcance</th>
                <th className="p-3 text-blue-600">Engajamento</th>
                <th className="p-3 text-purple-600">Taxa Eng.</th>
                <th className="p-3 rounded-tr-lg">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {profilePosts.length === 0 ? (
                <tr>
                  <td colSpan="7" className="p-8 text-center text-slate-500">
                    Nenhuma publicação encontrada. Adicione manualmente ou importe.
                  </td>
                </tr>
              ) : (
                profilePosts.sort((a,b) => b.month.localeCompare(a.month)).map(post => {
                  const eng = calculateEngagement(post);
                  const tax = post.reach > 0 ? ((eng / post.reach) * 100).toFixed(2) : 0;
                  return (
                    <tr key={post.id} className="hover:bg-slate-50 transition">
                      <td className="p-3 whitespace-nowrap">{post.month}</td>
                      <td className="p-3 max-w-xs relative group">
                        <div className="truncate cursor-help text-slate-700 hover:text-blue-600 border-b border-dashed border-slate-300 w-fit transition-colors">
                          {post.text}
                        </div>
                        {/* Tooltip customizado para mostrar o texto completo */}
                        <div className="opacity-0 invisible group-hover:opacity-100 group-hover:visible absolute z-50 left-3 top-full mt-2 w-72 bg-slate-800 text-white text-xs leading-relaxed p-4 rounded-xl shadow-2xl whitespace-normal break-words transition-all duration-200">
                          <p className="font-semibold mb-1 text-slate-300">Texto completo:</p>
                          {post.text}
                          <div className="absolute bottom-full left-4 border-b-8 border-b-slate-800 border-x-8 border-x-transparent border-t-0"></div>
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="flex flex-col text-xs">
                          <span className="font-medium text-slate-700">{post.type}</span>
                          <span className="text-slate-500">{post.pillar} • {post.theme}</span>
                        </div>
                      </td>
                      <td className="p-3">{Number(post.reach).toLocaleString()}</td>
                      <td className="p-3 font-semibold text-blue-700">{eng.toLocaleString()}</td>
                      <td className="p-3 font-semibold text-purple-700">{tax}%</td>
                      <td className="p-3">
                        <button 
                          onClick={() => setPosts(posts.filter(p => p.id !== post.id))}
                          className="text-red-500 hover:text-red-700 p-1"
                        >
                          <Trash2 size={18} />
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderLeads = () => {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-slate-800">Leads Qualificados</h2>
          <button 
            onClick={() => setShowLeadForm(!showLeadForm)}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
          >
            <Plus size={18} />
            Adicionar Leads
          </button>
        </div>

        {showLeadForm && (
          <LeadForm 
            onSave={(lead) => {
              setLeads([...leads, { ...lead, id: generateId(), profileId: activeProfileId }]);
              setShowLeadForm(false);
            }} 
            onCancel={() => setShowLeadForm(false)} 
          />
        )}

        <div className="overflow-x-auto mt-6">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600 uppercase text-xs font-semibold">
              <tr>
                <th className="p-3 rounded-tl-lg">Tipo de Período</th>
                <th className="p-3">Referência (Ex: 2023-01)</th>
                <th className="p-3 text-green-600">Qtd de Leads Qualificados</th>
                <th className="p-3 rounded-tr-lg">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {profileLeads.length === 0 ? (
                <tr>
                  <td colSpan="4" className="p-8 text-center text-slate-500">
                    Nenhum registo de lead encontrado.
                  </td>
                </tr>
              ) : (
                profileLeads.sort((a,b) => b.periodValue.localeCompare(a.periodValue)).map(lead => (
                  <tr key={lead.id} className="hover:bg-slate-50 transition">
                    <td className="p-3">{lead.periodType}</td>
                    <td className="p-3 font-medium text-slate-700">{lead.periodValue}</td>
                    <td className="p-3 font-bold text-green-700">{lead.count}</td>
                    <td className="p-3">
                      <button 
                        onClick={() => setLeads(leads.filter(l => l.id !== lead.id))}
                        className="text-red-500 hover:text-red-700 p-1"
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // --- LAYOUT PRINCIPAL ---
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-white border-r border-slate-200 flex flex-col shrink-0">
        <div className="p-6 border-b border-slate-100 flex flex-col gap-1">
          <h1 className="font-bold text-xl text-blue-700 flex items-center gap-2">
            <BarChart3 size={24} /> SkimMetrics
          </h1>
          <p className="text-xs text-slate-500 uppercase tracking-wider mt-2 font-semibold">Perfil Atual</p>
          <div className="flex items-center gap-2 text-slate-800 font-medium bg-slate-50 p-2 rounded-lg border border-slate-100">
            <UserCircle size={20} className="text-blue-500" />
            <span className="truncate">{activeProfile?.name}</span>
          </div>
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
          <button 
            onClick={() => setCurrentView('dashboard')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${currentView === 'dashboard' ? 'bg-blue-50 text-blue-700 font-medium' : 'text-slate-600 hover:bg-slate-50'}`}
          >
            <LayoutDashboard size={20} /> Dashboard Geral
          </button>
          <button 
            onClick={() => setCurrentView('posts')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${currentView === 'posts' ? 'bg-blue-50 text-blue-700 font-medium' : 'text-slate-600 hover:bg-slate-50'}`}
          >
            <FileText size={20} /> Publicações & Dados
          </button>
          <button 
            onClick={() => setCurrentView('leads')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${currentView === 'leads' ? 'bg-blue-50 text-blue-700 font-medium' : 'text-slate-600 hover:bg-slate-50'}`}
          >
            <Users size={20} /> Leads Qualificados
          </button>
        </nav>

        <div className="p-4 border-t border-slate-200">
          <button 
            onClick={() => setActiveProfileId(null)}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 text-slate-500 hover:text-slate-800 transition"
          >
            <ArrowLeft size={16} /> Trocar Perfil
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto">
        <header className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">
              {currentView === 'dashboard' ? 'Visão Geral e Correlações' : 
               currentView === 'posts' ? 'Gestão de Conteúdo' : 'Funil e Leads'}
            </h2>
            <p className="text-slate-500">A analisar dados para: {activeProfile?.name}</p>
          </div>
          
          {profilePosts.length === 0 && profileLeads.length === 0 && (
            <button 
              onClick={loadTestData}
              className="bg-amber-100 text-amber-700 px-4 py-2 rounded-lg font-medium hover:bg-amber-200 transition text-sm flex items-center gap-2"
            >
              🪄 Gerar Dados de Teste
            </button>
          )}
        </header>

        {currentView === 'dashboard' && renderDashboard()}
        {currentView === 'posts' && renderPosts()}
        {currentView === 'leads' && renderLeads()}

      </main>

      {/* Modal de Detalhamento do Gráfico */}
      {infoModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 relative">
            <button 
              onClick={() => setInfoModal(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-full p-1 transition"
            >
              <X size={20} />
            </button>
            
            <div className="flex items-center gap-3 mb-5">
              <div className="bg-blue-100 text-blue-700 p-2 rounded-lg">
                <Info size={24} />
              </div>
              <h3 className="text-xl font-bold text-slate-800 pr-8 leading-tight">{infoModal.title}</h3>
            </div>
            
            <div className="space-y-4 text-sm text-slate-600">
              <div>
                <h4 className="font-semibold text-slate-800 mb-1 flex items-center gap-2">Como é calculado</h4>
                <p className="bg-slate-50 p-3 rounded-lg border border-slate-100">{infoModal.calc}</p>
              </div>
              <div>
                <h4 className="font-semibold text-slate-800 mb-1">De onde vêm os dados</h4>
                <p>{infoModal.origin}</p>
              </div>
              <div>
                <h4 className="font-semibold text-slate-800 mb-1">Insight Estratégico</h4>
                <p className="italic text-slate-500">"{infoModal.insight}"</p>
              </div>
            </div>
            
            <div className="mt-6 flex justify-end border-t border-slate-100 pt-4">
              <button 
                onClick={() => setInfoModal(null)}
                className="px-5 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition"
              >
                Entendi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// --- SUB-COMPONENTES DE FORMULÁRIO ---
function PostForm({ onSave, onCancel }) {
  const [formData, setFormData] = useState({
    month: '2023-10',
    text: '',
    type: CONTENT_TYPES[0],
    pillar: PILLARS[0],
    theme: THEMES[0],
    funnel: FUNNELS[0],
    reach: 0,
    likes: 0,
    comments: 0,
    pollVotes: 0,
    link: ''
  });

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="bg-slate-50 p-6 rounded-lg border border-slate-200 grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="md:col-span-3">
        <label className="block text-xs font-semibold text-slate-500 mb-1">Mês da Publicação (Ex: 2023-10)</label>
        <input required type="month" name="month" value={formData.month} onChange={handleChange} className="w-full p-2 border rounded" />
      </div>
      
      <div className="md:col-span-3">
        <label className="block text-xs font-semibold text-slate-500 mb-1">Texto/Resumo do Post</label>
        <textarea required name="text" value={formData.text} onChange={handleChange} className="w-full p-2 border rounded" rows="2"></textarea>
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-500 mb-1">Tipo de Conteúdo</label>
        <select name="type" value={formData.type} onChange={handleChange} className="w-full p-2 border rounded">
          {CONTENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>
      
      <div>
        <label className="block text-xs font-semibold text-slate-500 mb-1">Pilar</label>
        <select name="pillar" value={formData.pillar} onChange={handleChange} className="w-full p-2 border rounded">
          {PILLARS.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-500 mb-1">Tema</label>
        <select name="theme" value={formData.theme} onChange={handleChange} className="w-full p-2 border rounded">
          {THEMES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-500 mb-1">Funil</label>
        <select name="funnel" value={formData.funnel} onChange={handleChange} className="w-full p-2 border rounded">
          {FUNNELS.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-500 mb-1">Alcance (Números)</label>
        <input required type="number" min="0" name="reach" value={formData.reach} onChange={handleChange} className="w-full p-2 border rounded" />
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-500 mb-1">Curtidas</label>
        <input required type="number" min="0" name="likes" value={formData.likes} onChange={handleChange} className="w-full p-2 border rounded" />
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-500 mb-1">Comentários</label>
        <input required type="number" min="0" name="comments" value={formData.comments} onChange={handleChange} className="w-full p-2 border rounded" />
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-500 mb-1">Votos na Enquete (se houver)</label>
        <input type="number" min="0" name="pollVotes" value={formData.pollVotes} onChange={handleChange} className="w-full p-2 border rounded" />
      </div>

      <div className="md:col-span-3">
        <label className="block text-xs font-semibold text-slate-500 mb-1">Link da Publicação</label>
        <input type="url" name="link" value={formData.link} onChange={handleChange} className="w-full p-2 border rounded" placeholder="https://linkedin.com/..." />
      </div>

      <div className="md:col-span-3 flex justify-end gap-3 mt-2">
        <button type="button" onClick={onCancel} className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded">Cancelar</button>
        <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Guardar Publicação</button>
      </div>
    </form>
  );
}

function LeadForm({ onSave, onCancel }) {
  const [formData, setFormData] = useState({
    periodType: PERIOD_TYPES[1], // default Mês
    periodValue: '2023-10',
    count: 0
  });

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="bg-slate-50 p-6 rounded-lg border border-slate-200 grid grid-cols-1 md:grid-cols-3 gap-4">
      <div>
        <label className="block text-xs font-semibold text-slate-500 mb-1">Tipo de Período</label>
        <select name="periodType" value={formData.periodType} onChange={handleChange} className="w-full p-2 border rounded">
          {PERIOD_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>
      
      <div>
        <label className="block text-xs font-semibold text-slate-500 mb-1">Período Referência (Ex: Mês, Ano)</label>
        <input required type={formData.periodType === 'Mês' ? 'month' : 'text'} name="periodValue" value={formData.periodValue} onChange={handleChange} className="w-full p-2 border rounded" placeholder="Ex: Semana 42, 2023-10..." />
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-500 mb-1">Número de Leads Qualificados</label>
        <input required type="number" min="0" name="count" value={formData.count} onChange={handleChange} className="w-full p-2 border rounded" />
      </div>

      <div className="md:col-span-3 flex justify-end gap-3 mt-2">
        <button type="button" onClick={onCancel} className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded">Cancelar</button>
        <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">Registar Leads</button>
      </div>
    </form>
  );
}