import React, { useState, useEffect } from 'react';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, ComposedChart
} from 'recharts';
import { 
  LayoutDashboard, FileText, Users, UserCircle, Plus, Upload, 
  Trash2, ChevronRight, BarChart3, ArrowLeft, Download, Filter, Info, X, RefreshCw, Link as LinkIcon, Database, Sparkles
} from 'lucide-react';

// --- IMPORTS FIREBASE ---
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken } from 'firebase/auth';
import { getFirestore, collection, onSnapshot, doc, setDoc, deleteDoc } from 'firebase/firestore';

// --- FIREBASE SETUP ---
let app, auth, db, appId;
try {
  const firebaseConfig = JSON.parse(__firebase_config);
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
} catch (error) {
  console.warn("Ambiente Firebase não detetado nativamente. Modo de compatibilidade ativado.");
}

// --- CONFIGURAÇÕES DE OPÇÕES E CORES ---
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#ffc658'];

const formatCategory = (str) => {
  if (!str) return '';
  const s = str.trim();
  if (!s) return '';
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
};

const formatMonthYear = (yyyy_mm) => {
  if (!yyyy_mm || typeof yyyy_mm !== 'string') return yyyy_mm;
  const parts = yyyy_mm.split('-');
  if (parts.length < 2) return yyyy_mm;
  const year = parts[0];
  const monthIndex = parseInt(parts[1], 10) - 1;
  if (isNaN(monthIndex) || monthIndex < 0 || monthIndex > 11) return yyyy_mm;
  const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  return `${months[monthIndex]} de ${year}`;
};

const normalizeDateToYYYYMM = (dateStr) => {
  if (!dateStr) return '';
  const s = dateStr.trim();
  
  // Tenta formato DD/MM/YYYY ou DD-MM-YYYY (ex: 01/01/2022 ou 12-01-2022)
  const ptBrRegex = /^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/;
  const matchPtBr = s.match(ptBrRegex);
  if (matchPtBr) {
    const month = matchPtBr[2].padStart(2, '0');
    const year = matchPtBr[3];
    return `${year}-${month}`;
  }
  
  // Tenta formato YYYY-MM-DD ou apenas YYYY-MM (ex: 2022-01-15 ou 2022-01)
  const isoRegex = /^(\d{4})[-/](\d{1,2})/;
  const matchIso = s.match(isoRegex);
  if (matchIso) {
    const year = matchIso[1];
    const month = matchIso[2].padStart(2, '0');
    return `${year}-${month}`;
  }
  
  // Se não bater com nada conhecido, devolve o original
  return s;
};

const transformToCsvUrl = (url) => {
  if (!url) return '';
  let newUrl = url.trim();
  // Converte URLs normais de edição ou pubhtml para formato de exportação CSV
  if (newUrl.includes('/edit')) {
    return newUrl.replace(/\/edit.*$/, '/export?format=csv');
  }
  if (newUrl.includes('/pubhtml')) {
    return newUrl.replace(/\/pubhtml.*$/, '/pub?output=csv');
  }
  return newUrl;
};

// --- BASE DE INFORMAÇÕES DOS GRÁFICOS ---
const CHART_INFO = {
  temporal: {
    title: "Engajamento vs Leads Qualificados",
    calc: "Soma o Engajamento Total de todas as publicações de um mês e compara com o volume de Leads registados na aba Leads para aquele mesmo mês.",
    origin: "Cruza os dados do CSV de Publicações com o registo de Leads (Planilha e Manuais).",
    insight: "Permite ver o 'lapso temporal' entre as ações de marketing e o resultado comercial."
  },
  typeBar: {
    title: "Curtidas e Comentários vs Tipo",
    calc: "Soma simples de Curtidas isoladas e Comentários isolados, agrupados pelo Tipo de Conteúdo.",
    origin: "Lido do CSV de Publicações.",
    insight: "Revela o comportamento da audiência: que formatos geram mais conversa vs mais salvamentos/reações rápidas."
  },
  typePie: {
    title: "Participação no Engajamento por Tipo",
    calc: "O Engajamento gerado por cada Tipo de Conteúdo dividido pelo Engajamento total.",
    origin: "Lido do CSV de Publicações.",
    insight: "Mostra qual formato é o verdadeiro motor de tração da sua conta."
  },
  poll: {
    title: "Volume de Votos em Enquetes",
    calc: "Soma o campo 'Votos Enquete' das publicações do tipo 'Enquete' ao longo do tempo.",
    origin: "Lido do CSV de Publicações.",
    insight: "Monitoriza se as pesquisas interativas estão a ganhar ou a perder força."
  },
  pillar: {
    title: "Engajamento por Pilar Estratégico",
    calc: "Agrupa todo o engajamento gerado baseado na coluna 'Pilar'.",
    origin: "Lido do CSV de Publicações.",
    insight: "Avalia a macro-estratégia. Falar do produto atrai mais do que partilhar bastidores?"
  },
  theme: {
    title: "Engajamento por Tema Estratégico",
    calc: "Agrupa o engajamento baseado na coluna 'Tema', criando um ranking.",
    origin: "Lido do CSV de Publicações.",
    insight: "Visão micro da linha editorial. Ajuda a focar nos assuntos com maior retorno."
  },
  postsTable: {
    title: "Análise Individual de Publicações",
    calc: "Engajamento = Curtidas + Comentários + Votos em Enquete. A Taxa de Engajamento é calculada dividindo este total pelo Alcance da publicação.",
    origin: "Dados lidos e formatados diretamente da sua planilha do Google Sheets.",
    insight: "Esta visão detalhada permite auditar exatamente 'o quê' gerou os picos que vemos nos gráficos. Observe os posts com maior taxa de engajamento para entender a formatação (texto longo/curto) e a temática que a sua audiência mais partilha e interage."
  }
};

export default function App() {
  // --- ESTADOS DA APLICAÇÃO ---
  const [user, setUser] = useState(null);
  const [profiles, setProfiles] = useState([]);
  const [activeProfileId, setActiveProfileId] = useState(null);
  const [currentView, setCurrentView] = useState('dashboard');
  
  // Dados principais
  const [posts, setPosts] = useState([]);
  const [leads, setLeads] = useState([]); // Leads manuais do Firebase
  const [csvLeads, setCsvLeads] = useState([]); // Leads vindos da Planilha
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState(null);

  // Estados de Formulários (Criar Perfil)
  const [newProfileName, setNewProfileName] = useState('');
  const [postsCsvUrl, setPostsCsvUrl] = useState('');
  const [leadsCsvUrl, setLeadsCsvUrl] = useState('');

  // Estados Form Leads Manuais
  const [showLeadForm, setShowLeadForm] = useState(false);
  const [leadName, setLeadName] = useState('');
  const [leadDate, setLeadDate] = useState('');

  // Filtros de Data e IA
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [infoModal, setInfoModal] = useState(null);
  const [useAICorrection, setUseAICorrection] = useState(true);

  // --- AUTENTICAÇÃO E FIREBASE (RULE 3) ---
  useEffect(() => {
    if (!auth) return;
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (err) {
        console.error("Auth error", err);
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  // --- CARREGAR PERFIS E LEADS DO FIRESTORE ---
  useEffect(() => {
    if (!user || !db) return;
    
    const profilesRef = collection(db, 'artifacts', appId, 'users', user.uid, 'profiles');
    const unsubscribeProfiles = onSnapshot(profilesRef, (snapshot) => {
      const loadedProfiles = [];
      snapshot.forEach(doc => loadedProfiles.push({ id: doc.id, ...doc.data() }));
      setProfiles(loadedProfiles);
    }, (error) => {
      console.error("Erro ao ler perfis:", error);
    });

    const leadsRef = collection(db, 'artifacts', appId, 'users', user.uid, 'leads');
    const unsubscribeLeads = onSnapshot(leadsRef, (snapshot) => {
      const loadedLeads = [];
      snapshot.forEach(doc => loadedLeads.push({ id: doc.id, ...doc.data() }));
      setLeads(loadedLeads);
    }, (error) => console.error("Erro ao ler leads:", error));

    return () => {
      unsubscribeProfiles();
      unsubscribeLeads();
    };
  }, [user]);

  // --- FUNÇÕES AUXILIARES ---
  const activeProfile = profiles.find(p => p.id === activeProfileId);
  
  // Unifica Leads do Firebase (Manuais) com os Leads do Google Sheets
  const profileLeads = leads
    .filter(l => l.profileId === activeProfileId)
    .map(l => ({ ...l, source: 'manual', normalizedDate: normalizeDateToYYYYMM(l.date) }));
  
  const allLeads = [...profileLeads, ...csvLeads];

  const calculateEngagement = (post) => {
    return (Number(post.likes) || 0) + (Number(post.comments) || 0) + (Number(post.pollVotes) || 0);
  };

  // Parser robusto de CSV
  const parseCSV = (str) => {
    const arr = [];
    let quote = false;
    let col = 0, row = 0;
    for (let c = 0; c < str.length; c++) {
      let cc = str[c], nc = str[c+1];
      arr[row] = arr[row] || [];
      arr[row][col] = arr[row][col] || '';
      
      if (cc === '"' && quote && nc === '"') { arr[row][col] += cc; ++c; continue; }
      if (cc === '"') { quote = !quote; continue; }
      if (cc === ',' && !quote) { ++col; continue; }
      if (cc === '\r' && nc === '\n' && !quote) { ++row; col = 0; ++c; continue; }
      if (cc === '\n' && !quote) { ++row; col = 0; continue; }
      if (cc === '\r' && !quote) { ++row; col = 0; continue; }
      
      arr[row][col] += cc;
    }
    return arr;
  };

  // Função de Fetch do Google Sheets
  const syncWithGoogleSheets = async () => {
    if (!activeProfile) return;
    setIsSyncing(true);
    setSyncError(null);
    
    try {
      // 1. Fetch de Publicações
      if (activeProfile.postsCsvUrl) {
        const fetchUrl = transformToCsvUrl(activeProfile.postsCsvUrl);
        const res = await fetch(fetchUrl);
        const text = await res.text();
        if(text.toLowerCase().includes('<!doctype html>') || text.toLowerCase().includes('<html')) {
           throw new Error("O link de publicações devolveu uma página HTML em vez de dados. Certifique-se de que escolheu 'Valores separados por vírgula (.csv)' ao Publicar na Web.");
        }
        
        const parsed = parseCSV(text);
        if(parsed.length > 1) {
          let rawRows = parsed.slice(1).filter(r => r.length > 1 && r[0].trim() !== '');
          let correctionMap = {};
          
          if (useAICorrection) {
            try {
              const uniqueValues = new Set();
              rawRows.forEach(row => {
                if(row[2]) uniqueValues.add(row[2].trim()); 
                if(row[3]) uniqueValues.add(row[3].trim()); 
                if(row[4]) uniqueValues.add(row[4].trim()); 
                if(row[5]) uniqueValues.add(row[5].trim()); 
              });
              const valuesArray = Array.from(uniqueValues).filter(Boolean);

              if (valuesArray.length > 0) {
                const prompt = `Você é um assistente de limpeza de dados em português de Portugal. Corrija erros ortográficos destas palavras (ex: 'Carossel' para 'Carrossel', 'Video' para 'Vídeo'). Retorne APENAS um objeto JSON válido onde a chave é a palavra original e o valor é a palavra corrigida. Lista: ${JSON.stringify(valuesArray)}`;
                const apiKey = ""; 
                
                const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: { responseMimeType: "application/json" }
                  })
                });

                if (response.ok) {
                  const result = await response.json();
                  const textResult = result.candidates?.[0]?.content?.parts?.[0]?.text;
                  if (textResult) {
                    correctionMap = JSON.parse(textResult);
                  }
                }
              }
            } catch (aiError) {
              console.error("Aviso: Falha na IA, a continuar com formatação padrão.", aiError);
            }
          }

          const getCorrected = (val) => {
            if (!val) return '';
            const trimmed = val.trim();
            const corrected = correctionMap[trimmed] || trimmed;
            return formatCategory(corrected);
          };

          const data = rawRows.map((row, idx) => ({
            id: `post_${idx}`,
            month: normalizeDateToYYYYMM(row[0]),
            text: row[1]?.trim(),
            type: getCorrected(row[2]),
            pillar: getCorrected(row[3]),
            theme: getCorrected(row[4]),
            funnel: getCorrected(row[5]),
            reach: Number(row[6]) || 0,
            likes: Number(row[7]) || 0,
            comments: Number(row[8]) || 0,
            pollVotes: Number(row[9]) || 0,
            link: row[10]?.trim()
          }));
          setPosts(data);
        } else {
          setPosts([]);
        }
      }

      // 2. Fetch de Leads da Planilha (se configurado)
      if (activeProfile.leadsCsvUrl) {
        const fetchUrl = transformToCsvUrl(activeProfile.leadsCsvUrl);
        const res = await fetch(fetchUrl);
        const text = await res.text();
        if(text.toLowerCase().includes('<!doctype html>') || text.toLowerCase().includes('<html')) {
           throw new Error("O link de Leads devolveu uma página HTML em vez de CSV. Certifique-se de que escolheu 'Valores separados por vírgula (.csv)' ao Publicar na Web.");
        }
        const parsed = parseCSV(text);
        if(parsed.length > 1) {
          let rawRows = parsed.slice(1).filter(r => r.length > 1 && r[0].trim() !== '');
          const sheetLeads = rawRows.map((row, idx) => ({
            id: `csv_lead_${idx}`,
            date: row[0]?.trim(),
            normalizedDate: normalizeDateToYYYYMM(row[0]),
            name: row[1]?.trim() || 'Lead Sem Nome',
            source: 'csv'
          }));
          setCsvLeads(sheetLeads);
        } else {
          setCsvLeads([]);
        }
      } else {
        setCsvLeads([]);
      }

    } catch (err) {
      console.error(err);
      setSyncError(err.message || "Falha ao sincronizar com o Google Sheets. Verifique os links.");
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    if (activeProfileId) {
      setPosts([]);
      setCsvLeads([]);
      syncWithGoogleSheets();
    }
  }, [activeProfileId]);

  // Ações de Perfil (Agora inclui os links de Posts e Leads)
  const handleCreateProfile = async (e) => {
    e.preventDefault();
    if (!newProfileName.trim() || !user || !db) return;
    
    const newId = crypto.randomUUID();
    await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'profiles', newId), {
      name: newProfileName,
      postsCsvUrl: postsCsvUrl,
      leadsCsvUrl: leadsCsvUrl, // Salva o link dos leads no Firebase!
      createdAt: new Date().toISOString()
    });
    
    setNewProfileName('');
    setPostsCsvUrl('');
    setLeadsCsvUrl('');
    setActiveProfileId(newId);
    setCurrentView('dashboard');
  };

  const handleDeleteProfile = async (id, e) => {
    e.stopPropagation();
    if(!user || !db) return;
    await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'profiles', id));
    if(activeProfileId === id) setActiveProfileId(null);
  };

  const downloadCSVTemplate = (type) => {
    let headers, example, filename;
    if (type === 'posts') {
      headers = ['Mês (YYYY-MM)', 'Texto', 'Tipo', 'Pilar', 'Tema', 'Funil', 'Alcance', 'Curtidas', 'Comentarios', 'VotosEnquete', 'Link'];
      example = ['2023-10', 'Resumo do meu post incrível', 'Carrossel', 'Mercado', 'Tendência', 'Topo', '1500', '50', '10', '0', 'https://linkedin.com/post1'];
      filename = 'modelo_publicacoes_skimmetrics.csv';
    } else if (type === 'leads') {
      headers = ['Data (DD/MM/YYYY)', 'Nome do Lead'];
      example = ['15/10/2023', 'Maria Santos'];
      filename = 'modelo_leads_skimmetrics.csv';
    }
    
    const csvContent = '\uFEFF' + [headers.join(','), example.join(',')].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- TELAS E COMPONENTES ---

  if (!activeProfileId) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-2xl flex flex-col md:flex-row gap-8">
          
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-blue-600 p-2 rounded-lg text-white">
                <Database size={24} />
              </div>
              <h1 className="text-2xl font-bold text-slate-800">SkimMetrics DB</h1>
            </div>
            
            <p className="text-sm text-slate-500 mb-6">Selecione um perfil existente para carregar os dados associados. Os dados ficam guardados no seu ambiente de nuvem.</p>
            
            <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
              {profiles.length === 0 ? (
                <div className="text-center p-6 border-2 border-dashed border-slate-200 rounded-xl text-slate-400 text-sm">
                  Nenhum perfil encontrado. Crie o primeiro ao lado!
                </div>
              ) : (
                profiles.map(p => (
                  <div key={p.id} className="group w-full flex items-center justify-between p-3 bg-slate-50 hover:bg-blue-50 border border-slate-100 rounded-xl transition-colors text-left cursor-pointer" onClick={() => setActiveProfileId(p.id)}>
                    <span className="font-medium text-slate-700 flex items-center gap-2 truncate pr-4">
                      <UserCircle className="text-blue-500 shrink-0" /> {p.name}
                    </span>
                    <div className="flex items-center gap-2">
                      <button onClick={(e) => handleDeleteProfile(p.id, e)} className="opacity-0 group-hover:opacity-100 p-2 text-slate-400 hover:text-red-500 transition" title="Apagar Perfil">
                        <Trash2 size={16} />
                      </button>
                      <ChevronRight size={18} className="text-slate-400 shrink-0" />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="flex-1 bg-slate-50 p-6 rounded-xl border border-slate-200">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Plus size={16}/> Novo Perfil
            </h3>
            
            <div className="mb-4 text-xs text-blue-800 bg-blue-100 p-3 rounded-lg border border-blue-200">
              <strong>Integração com Google Sheets:</strong><br/>
              1. Na sua planilha, vá a Arquivo &gt; Compartilhar &gt; <strong>Publicar na Web</strong>.<br/>
              2. Mude de "Página da Web" para <strong>"Valores separados por vírgula (.csv)"</strong>.<br/>
              3. Cole os links das abas correspondentes abaixo.
            </div>

            <form onSubmit={handleCreateProfile} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Nome da Conta / Empresa</label>
                <input required type="text" placeholder="Ex: Skim Insights" className="w-full p-2.5 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" value={newProfileName} onChange={(e) => setNewProfileName(e.target.value)} />
              </div>
              
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Link CSV - Publicações (Obrigatório)</label>
                <div className="relative">
                  <LinkIcon size={16} className="absolute left-3 top-3 text-slate-400" />
                  <input required type="url" placeholder="https://docs.google.com/..." className="w-full pl-9 p-2.5 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" value={postsCsvUrl} onChange={(e) => setPostsCsvUrl(e.target.value)} />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Link CSV - Leads (Opcional)</label>
                <div className="relative">
                  <LinkIcon size={16} className="absolute left-3 top-3 text-slate-400" />
                  <input type="url" placeholder="https://docs.google.com/..." className="w-full pl-9 p-2.5 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" value={leadsCsvUrl} onChange={(e) => setLeadsCsvUrl(e.target.value)} />
                </div>
              </div>

              <button type="submit" disabled={!user} className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold py-3 px-4 rounded-lg transition-colors mt-2">
                Guardar e Analisar
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  const renderDashboard = () => {
    if(isSyncing) return <LoadingView />;

    const filteredPosts = posts.filter(post => {
      if (filterStartDate && post.month < filterStartDate) return false;
      if (filterEndDate && post.month > filterEndDate) return false;
      return true;
    });

    const filteredLeads = allLeads.filter(lead => {
      const leadMonth = lead.normalizedDate;
      if (filterStartDate && leadMonth < filterStartDate) return false;
      if (filterEndDate && leadMonth > filterEndDate) return false;
      return true;
    });

    const statsByMonth = filteredPosts.reduce((acc, post) => {
      if (!acc[post.month]) acc[post.month] = { month: post.month, reach: 0, engagement: 0, leads: 0, pollVotes: 0 };
      acc[post.month].reach += Number(post.reach);
      acc[post.month].engagement += calculateEngagement(post);
      acc[post.month].pollVotes += Number(post.pollVotes);
      return acc;
    }, {});

    filteredLeads.forEach(lead => {
      const monthKey = lead.normalizedDate;
      if (!monthKey) return;
      if (statsByMonth[monthKey]) {
        statsByMonth[monthKey].leads += 1;
      } else {
         statsByMonth[monthKey] = { month: monthKey, reach: 0, engagement: 0, leads: 1, pollVotes: 0 };
      }
    });

    const monthlyData = Object.values(statsByMonth).sort((a, b) => a.month.localeCompare(b.month));
    const formattedMonthlyData = monthlyData.map(item => ({
      ...item,
      displayMonth: formatMonthYear(item.month)
    }));

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

    const pillarStats = filteredPosts.reduce((acc, post) => {
      if(!post.pillar) return acc;
      acc[post.pillar] = (acc[post.pillar] || 0) + calculateEngagement(post);
      return acc;
    }, {});
    const pillarData = Object.keys(pillarStats).map(key => ({ name: key, engagement: pillarStats[key] })).sort((a,b) => b.engagement - a.engagement);

    const themeStats = filteredPosts.reduce((acc, post) => {
      if(!post.theme) return acc;
      acc[post.theme] = (acc[post.theme] || 0) + calculateEngagement(post);
      return acc;
    }, {});
    const themeData = Object.keys(themeStats).map(key => ({ name: key, engagement: themeStats[key] })).sort((a,b) => b.engagement - a.engagement);

    const totalReach = filteredPosts.reduce((sum, p) => sum + Number(p.reach), 0);
    const totalEngagement = filteredPosts.reduce((sum, p) => sum + calculateEngagement(p), 0);
    const totalLeads = filteredLeads.length;

    const totalLikes = filteredPosts.reduce((sum, p) => sum + (Number(p.likes) || 0), 0);
    const totalComments = filteredPosts.reduce((sum, p) => sum + (Number(p.comments) || 0), 0);
    const totalPollVotes = filteredPosts.reduce((sum, p) => sum + (Number(p.pollVotes) || 0), 0);
    const totalPillarEngagement = pillarData.reduce((sum, item) => sum + item.engagement, 0);
    const totalThemeEngagement = themeData.reduce((sum, item) => sum + item.engagement, 0);

    return (
      <div className="space-y-6">
        {syncError && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md">
            <p className="text-red-700 font-medium">Erro de Sincronização</p>
            <p className="text-red-600 text-sm mt-1">{syncError}</p>
          </div>
        )}

        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex flex-wrap items-end gap-4 justify-between">
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex items-center gap-2 text-slate-700 font-semibold w-full md:w-auto mb-2 md:mb-0">
              <Filter size={18} /> Filtros:
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Mês Inicial</label>
              <input type="month" value={filterStartDate} onChange={(e) => setFilterStartDate(e.target.value)} className="p-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Mês Final</label>
              <input type="month" value={filterEndDate} onChange={(e) => setFilterEndDate(e.target.value)} className="p-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            {(filterStartDate || filterEndDate) && (
              <button onClick={() => { setFilterStartDate(''); setFilterEndDate(''); }} className="px-4 py-2 text-sm text-slate-500 hover:text-red-500 transition font-medium">
                Limpar Filtros
              </button>
            )}
          </div>
          
          <div className="flex items-center flex-wrap gap-3">
            <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer border border-slate-200 px-3 py-2 rounded-lg hover:bg-slate-50 transition select-none">
              <input type="checkbox" checked={useAICorrection} onChange={(e) => setUseAICorrection(e.target.checked)} className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer" />
              <Sparkles size={16} className={useAICorrection ? "text-amber-500" : "text-slate-400"} />
              <span className="hidden sm:inline">Correção com IA</span>
            </label>
            <button onClick={syncWithGoogleSheets} className="flex items-center gap-2 bg-slate-800 text-white px-4 py-2 rounded-lg hover:bg-slate-700 transition text-sm">
              <RefreshCw size={16} /> Sincronizar Sheets
            </button>
          </div>
        </div>

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
            <h4 className="text-slate-500 text-sm font-medium">Publicações</h4>
            <p className="text-3xl font-bold text-slate-800 mt-2">{filteredPosts.length}</p>
          </div>
          <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm border-l-4 border-l-green-500">
            <h4 className="text-slate-500 text-sm font-medium">Leads Qualificados</h4>
            <p className="text-3xl font-bold text-green-600 mt-2">{totalLeads}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm">
            <div className="flex justify-between items-start mb-3">
              <h3 className="font-bold text-slate-800">Engajamento vs Leads Qualificados</h3>
              <button onClick={() => setInfoModal(CHART_INFO.temporal)} className="text-slate-400 hover:text-blue-600 transition"><Info size={20} /></button>
            </div>
            <div className="flex flex-wrap gap-2 mb-4">
              <span className="inline-flex items-center px-2.5 py-1 bg-blue-50 border border-blue-100 text-blue-700 text-xs font-semibold rounded-md">
                Engajamento Total: {totalEngagement.toLocaleString('pt-PT')}
              </span>
              <span className="inline-flex items-center px-2.5 py-1 bg-green-50 border border-green-100 text-green-700 text-xs font-semibold rounded-md">
                Leads Qualificados: {totalLeads.toLocaleString('pt-PT')}
              </span>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={formattedMonthlyData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                  <XAxis dataKey="displayMonth" axisLine={false} tickLine={false} />
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

          <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm">
            <div className="flex justify-between items-start mb-3">
              <h3 className="font-bold text-slate-800">Curtidas e Comentários vs Tipo de Publicação</h3>
              <button onClick={() => setInfoModal(CHART_INFO.typeBar)} className="text-slate-400 hover:text-blue-600 transition"><Info size={20} /></button>
            </div>
            <div className="flex flex-wrap gap-2 mb-4">
              <span className="inline-flex items-center px-2.5 py-1 bg-blue-50 border border-blue-100 text-blue-700 text-xs font-semibold rounded-md">
                Total Curtidas: {totalLikes.toLocaleString('pt-PT')}
              </span>
              <span className="inline-flex items-center px-2.5 py-1 bg-amber-50 border border-amber-100 text-amber-700 text-xs font-semibold rounded-md">
                Total Comentários: {totalComments.toLocaleString('pt-PT')}
              </span>
            </div>
            <div className="h-64">
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

          <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm">
            <div className="flex justify-between items-start mb-3">
              <h3 className="font-bold text-slate-800">Participação no Engajamento por Tipo</h3>
              <button onClick={() => setInfoModal(CHART_INFO.typePie)} className="text-slate-400 hover:text-blue-600 transition"><Info size={20} /></button>
            </div>
            <div className="flex flex-wrap gap-2 mb-4">
              <span className="inline-flex items-center px-2.5 py-1 bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold rounded-md">
                Engajamento Total: {totalEngagement.toLocaleString('pt-PT')}
              </span>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={5} dataKey="value" label={({name, percent}) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm">
            <div className="flex justify-between items-start mb-3">
              <h3 className="font-bold text-slate-800">Volume de Votos em Enquetes</h3>
              <button onClick={() => setInfoModal(CHART_INFO.poll)} className="text-slate-400 hover:text-blue-600 transition"><Info size={20} /></button>
            </div>
            <div className="flex flex-wrap gap-2 mb-4">
              <span className="inline-flex items-center px-2.5 py-1 bg-purple-50 border border-purple-100 text-purple-700 text-xs font-semibold rounded-md">
                Total de Votos: {totalPollVotes.toLocaleString('pt-PT')}
              </span>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={formattedMonthlyData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                  <XAxis dataKey="displayMonth" axisLine={false} tickLine={false} />
                  <YAxis axisLine={false} tickLine={false} />
                  <Tooltip cursor={{fill: '#f8fafc'}} />
                  <Legend />
                  <Bar dataKey="pollVotes" name="Votos em Enquetes" fill="#8b5cf6" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm">
            <div className="flex justify-between items-start mb-3">
              <h3 className="font-bold text-slate-800">Engajamento por Pilar Estratégico</h3>
              <button onClick={() => setInfoModal(CHART_INFO.pillar)} className="text-slate-400 hover:text-blue-600 transition"><Info size={20} /></button>
            </div>
            <div className="flex flex-wrap gap-2 mb-4">
              <span className="inline-flex items-center px-2.5 py-1 bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs font-semibold rounded-md">
                Engajamento Classificado: {totalPillarEngagement.toLocaleString('pt-PT')}
              </span>
            </div>
            <div className="h-64">
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

          <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm">
            <div className="flex justify-between items-start mb-3">
              <h3 className="font-bold text-slate-800">Engajamento por Tema Estratégico</h3>
              <button onClick={() => setInfoModal(CHART_INFO.theme)} className="text-slate-400 hover:text-blue-600 transition"><Info size={20} /></button>
            </div>
            <div className="flex flex-wrap gap-2 mb-4">
              <span className="inline-flex items-center px-2.5 py-1 bg-rose-50 border border-rose-100 text-rose-700 text-xs font-semibold rounded-md">
                Engajamento Classificado: {totalThemeEngagement.toLocaleString('pt-PT')}
              </span>
            </div>
            <div className="h-64">
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
    if(isSyncing) return <LoadingView />;

    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-0 overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-50/50">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-slate-800">Publicações e Análise Individual</h2>
              <button onClick={() => setInfoModal(CHART_INFO.postsTable)} className="text-slate-400 hover:text-blue-600 transition" title="Entender os cálculos">
                <Info size={20} />
              </button>
            </div>
            <p className="text-sm text-slate-500 mt-1">Dados espelhados da sua planilha do Google Sheets.</p>
          </div>
          <div className="flex flex-wrap gap-3 items-center">
            <button onClick={() => downloadCSVTemplate('posts')} className="flex items-center gap-2 px-4 py-2 border border-slate-200 bg-white text-slate-600 rounded-lg hover:bg-slate-50 transition shadow-sm text-sm font-medium" title="Baixar modelo de planilha CSV">
              <Download size={16} /> Estrutura CSV
            </button>
            <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer border border-slate-200 bg-white px-3 py-2 rounded-lg hover:bg-slate-50 transition select-none shadow-sm font-medium">
              <input type="checkbox" checked={useAICorrection} onChange={(e) => setUseAICorrection(e.target.checked)} className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer" />
              <Sparkles size={16} className={useAICorrection ? "text-amber-500" : "text-slate-400"} />
            </label>
            <button onClick={syncWithGoogleSheets} className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition shadow-sm text-sm font-medium">
              <RefreshCw size={16} /> Atualizar Dados
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50/80 text-slate-500 uppercase text-xs font-bold tracking-wider border-b border-slate-200">
              <tr>
                <th className="p-4 whitespace-nowrap">Mês</th>
                <th className="p-4 w-1/3">Publicação</th>
                <th className="p-4">Classificação</th>
                <th className="p-4 text-right">Alcance</th>
                <th className="p-4 text-right text-blue-600 bg-blue-50/30">Engajamento</th>
                <th className="p-4 text-right text-purple-600 bg-purple-50/30">Taxa Eng.</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {posts.length === 0 ? (
                <tr>
                  <td colSpan="6" className="p-12 text-center text-slate-500">
                    <FileText size={48} className="mx-auto text-slate-300 mb-3" />
                    <p className="text-base font-medium text-slate-600">Nenhuma publicação encontrada.</p>
                    <p className="text-sm mt-1">Sincronize uma planilha com dados válidos.</p>
                  </td>
                </tr>
              ) : (
                posts.sort((a,b) => b.month.localeCompare(a.month)).map(post => {
                  const eng = calculateEngagement(post);
                  const tax = post.reach > 0 ? ((eng / post.reach) * 100).toFixed(2) : 0;
                  return (
                    <tr key={post.id} className="hover:bg-slate-50/80 transition-colors group">
                      <td className="p-4 whitespace-nowrap font-medium text-slate-600">
                        {formatMonthYear(post.month)}
                      </td>
                      <td className="p-4 relative">
                        <div className="line-clamp-2 cursor-help text-slate-700 font-medium group-hover:text-blue-700 transition-colors max-w-sm">
                          {post.text || '-'}
                        </div>
                        <div className="opacity-0 invisible group-hover:opacity-100 group-hover:visible absolute z-50 left-4 top-full mt-1 w-80 bg-slate-800 text-white text-xs leading-relaxed p-4 rounded-xl shadow-2xl whitespace-normal break-words transition-all duration-200 border border-slate-700">
                          <p className="font-bold text-slate-300 mb-2 uppercase tracking-wider text-[10px]">Texto Completo</p>
                          {post.text}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex flex-wrap gap-1.5">
                          {post.type && <span className="px-2 py-0.5 bg-slate-100 border border-slate-200 text-slate-600 rounded text-xs font-semibold whitespace-nowrap">{post.type}</span>}
                          {post.pillar && <span className="px-2 py-0.5 bg-indigo-50 border border-indigo-100 text-indigo-700 rounded text-xs font-semibold whitespace-nowrap">{post.pillar}</span>}
                          {post.theme && <span className="px-2 py-0.5 bg-rose-50 border border-rose-100 text-rose-700 rounded text-xs font-semibold whitespace-nowrap">{post.theme}</span>}
                        </div>
                      </td>
                      <td className="p-4 text-right text-slate-600 font-medium">
                        {Number(post.reach).toLocaleString('pt-PT')}
                      </td>
                      <td className="p-4 text-right font-bold text-blue-700 bg-blue-50/30">
                        {eng.toLocaleString('pt-PT')}
                      </td>
                      <td className="p-4 text-right font-bold text-purple-700 bg-purple-50/30">
                        {tax}%
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
    if(isSyncing) return <LoadingView />;

    const handleSaveLead = async (e) => {
      e.preventDefault();
      if (!user || !db || !leadName.trim() || !leadDate) return;
      const newId = crypto.randomUUID();
      await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'leads', newId), {
        profileId: activeProfileId,
        name: leadName,
        date: leadDate,
        createdAt: new Date().toISOString()
      });
      setLeadName('');
      setLeadDate('');
      setShowLeadForm(false);
    };

    const handleDeleteLead = async (id) => {
      if (!user || !db) return;
      await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'leads', id));
    };

    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-800">Leads Qualificados</h2>
            <p className="text-sm text-slate-500 mt-1">Leads sincronizados da planilha e registos manuais.</p>
          </div>
          <div className="flex flex-wrap gap-3 items-center">
             <button onClick={() => downloadCSVTemplate('leads')} className="flex items-center gap-2 px-4 py-2 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 transition" title="Baixar modelo de planilha CSV para Leads">
              <Download size={18} /> Estrutura CSV (Leads)
            </button>
            <button onClick={() => setShowLeadForm(!showLeadForm)} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition">
              <Plus size={18} /> Registar Lead Manual
            </button>
            <button onClick={syncWithGoogleSheets} className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition shadow-sm text-sm font-medium">
              <RefreshCw size={16} /> Atualizar Sheets
            </button>
          </div>
        </div>

        {showLeadForm && (
          <form onSubmit={handleSaveLead} className="bg-slate-50 p-6 rounded-lg border border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Nome do Lead</label>
              <input required type="text" placeholder="Ex: João Silva" className="w-full p-2 border border-slate-200 rounded focus:ring-2 focus:ring-blue-500 outline-none" value={leadName} onChange={(e) => setLeadName(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Data de Entrada no Funil</label>
              <input required type="date" className="w-full p-2 border border-slate-200 rounded focus:ring-2 focus:ring-blue-500 outline-none" value={leadDate} onChange={(e) => setLeadDate(e.target.value)} />
            </div>
            <div className="md:col-span-2 flex justify-end gap-3 mt-2">
              <button type="button" onClick={() => setShowLeadForm(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded transition">Cancelar</button>
              <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition">Guardar Lead</button>
            </div>
          </form>
        )}

        <div className="overflow-x-auto mt-6">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600 uppercase text-xs font-semibold border-b border-slate-200">
              <tr>
                <th className="p-3 rounded-tl-lg w-32">Data</th>
                <th className="p-3">Nome do Lead</th>
                <th className="p-3">Origem</th>
                <th className="p-3 rounded-tr-lg w-20 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {allLeads.length === 0 ? (
                <tr>
                  <td colSpan="4" className="p-8 text-center text-slate-500">
                    Nenhum lead encontrado. Adicione um manualmente ou sincronize a sua planilha!
                  </td>
                </tr>
              ) : (
                allLeads.sort((a,b) => b.normalizedDate.localeCompare(a.normalizedDate)).map(lead => {
                  // Tenta formatar a data para ficar bonita (DD/MM/YYYY)
                  const displayDate = lead.date && lead.date.includes('-') && lead.date.split('-').length === 3
                    ? lead.date.split('-').reverse().join('/')
                    : lead.date;
                    
                  return (
                    <tr key={lead.id} className="hover:bg-slate-50 transition">
                      <td className="p-3 font-medium text-slate-700">{displayDate}</td>
                      <td className="p-3 font-medium">{lead.name}</td>
                      <td className="p-3">
                        {lead.source === 'manual' ? (
                          <span className="text-xs text-blue-700 bg-blue-50 border border-blue-100 px-2 py-1 rounded">Registo Manual</span>
                        ) : (
                          <span className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-1 rounded flex items-center gap-1 w-fit"><Database size={12}/> Sheets</span>
                        )}
                      </td>
                      <td className="p-3 text-center">
                        {lead.source === 'manual' ? (
                          <button onClick={() => handleDeleteLead(lead.id)} className="text-red-500 hover:text-red-700 p-1 transition" title="Apagar Lead">
                            <Trash2 size={18} className="mx-auto" />
                          </button>
                        ) : (
                          <span className="text-slate-300" title="Apagar na planilha do Google">-</span>
                        )}
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

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      <aside className="w-full md:w-64 bg-white border-r border-slate-200 flex flex-col shrink-0">
        <div className="p-6 border-b border-slate-100 flex flex-col gap-1">
          <h1 className="font-bold text-xl text-blue-700 flex items-center gap-2">
            <BarChart3 size={24} /> SkimMetrics
          </h1>
          <p className="text-xs text-slate-500 uppercase tracking-wider mt-2 font-semibold">Perfil Atual</p>
          <div className="flex items-center gap-2 text-slate-800 font-medium bg-slate-50 p-2 rounded-lg border border-slate-100">
            <UserCircle size={20} className="text-blue-500 shrink-0" />
            <span className="truncate" title={activeProfile?.name}>{activeProfile?.name}</span>
          </div>
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
          <button onClick={() => setCurrentView('dashboard')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${currentView === 'dashboard' ? 'bg-blue-50 text-blue-700 font-medium' : 'text-slate-600 hover:bg-slate-50'}`}>
            <LayoutDashboard size={20} /> Dashboard Geral
          </button>
          <button onClick={() => setCurrentView('posts')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${currentView === 'posts' ? 'bg-blue-50 text-blue-700 font-medium' : 'text-slate-600 hover:bg-slate-50'}`}>
            <FileText size={20} /> Publicações & Dados
          </button>
          <button onClick={() => setCurrentView('leads')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${currentView === 'leads' ? 'bg-blue-50 text-blue-700 font-medium' : 'text-slate-600 hover:bg-slate-50'}`}>
            <Users size={20} /> Leads Qualificados
          </button>
        </nav>

        <div className="p-4 border-t border-slate-200">
          <button onClick={() => setActiveProfileId(null)} className="w-full flex items-center justify-center gap-2 px-4 py-2 text-slate-500 hover:text-slate-800 transition">
            <ArrowLeft size={16} /> Voltar aos Perfis
          </button>
        </div>
      </aside>

      <main className="flex-1 p-4 md:p-8 overflow-y-auto">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">
              {currentView === 'dashboard' ? 'Visão Geral e Correlações' : 
               currentView === 'posts' ? 'Gestão de Conteúdo' : 'Gestão de Leads e CRM'}
            </h2>
            <p className="text-slate-500">A analisar dados para: <span className="font-semibold">{activeProfile?.name}</span></p>
          </div>
        </header>

        {currentView === 'dashboard' && renderDashboard()}
        {currentView === 'posts' && renderPosts()}
        {currentView === 'leads' && renderLeads()}
      </main>

      {infoModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 relative">
            <button onClick={() => setInfoModal(null)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-full p-1 transition">
              <X size={20} />
            </button>
            <div className="flex items-center gap-3 mb-5">
              <div className="bg-blue-100 text-blue-700 p-2 rounded-lg"><Info size={24} /></div>
              <h3 className="text-xl font-bold text-slate-800 pr-8 leading-tight">{infoModal.title}</h3>
            </div>
            <div className="space-y-4 text-sm text-slate-600">
              <div><h4 className="font-semibold text-slate-800 mb-1 flex items-center gap-2">Como é calculado</h4><p className="bg-slate-50 p-3 rounded-lg border border-slate-100">{infoModal.calc}</p></div>
              <div><h4 className="font-semibold text-slate-800 mb-1">De onde vêm os dados</h4><p>{infoModal.origin}</p></div>
              <div><h4 className="font-semibold text-slate-800 mb-1">Insight Estratégico</h4><p className="italic text-slate-500">"{infoModal.insight}"</p></div>
            </div>
            <div className="mt-6 flex justify-end border-t border-slate-100 pt-4">
              <button onClick={() => setInfoModal(null)} className="px-5 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition">Entendi</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function LoadingView() {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <RefreshCw size={32} className="text-blue-500 animate-spin mb-4" />
      <h3 className="text-lg font-semibold text-slate-700">A sincronizar os dados...</h3>
      <p className="text-slate-500 text-sm mt-1">Lendo as publicações e leads (Google Sheets e Nativos).</p>
    </div>
  );
}