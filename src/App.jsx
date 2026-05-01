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
  console.warn("Ambiente Firebase não detetado nativamente. A funcionar em Modo de Memória Local.");
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
  const [leads, setLeads] = useState([]); // Leads manuais
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

  // --- AUTENTICAÇÃO E FIREBASE ---
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

  // Ações de Perfil (Atualizado para funcionar com ou sem base de dados nativa)
  const handleCreateProfile = async (e) => {
    e.preventDefault();
    if (!newProfileName.trim()) return;
    
    const newId = crypto.randomUUID();
    const profileData = {
      name: newProfileName,
      postsCsvUrl: postsCsvUrl,
      leadsCsvUrl: leadsCsvUrl,
      createdAt: new Date().toISOString()
    };

    if (user && db) {
      // Salva na nuvem (Firebase)
      await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'profiles', newId), profileData);
    } else {
      // Salva localmente caso não haja ligação à base de dados (ex: Vercel)
      setProfiles(prev => [...prev, { id: newId, ...profileData }]);
    }
    
    setNewProfileName('');
    setPostsCsvUrl('');
    setLeadsCsvUrl('');
    setActiveProfileId(newId);
    setCurrentView('dashboard');
  };

  const handleDeleteProfile = async (id, e) => {
    e.stopPropagation();
    if (user && db) {
      await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'profiles', id));
    } else {
      setProfiles(prev => prev.filter(p => p.id !== id));
    }
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
            
            <p className="text-sm text-slate-500 mb-6">Selecione um perfil existente para carregar os dados associados. Os dados ficam guardados no seu ambiente atual.</p>
            
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

              {/* Removido o disabled={!user} para permitir o uso pleno quando exportado! */}
              <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors mt-2">
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
            <div