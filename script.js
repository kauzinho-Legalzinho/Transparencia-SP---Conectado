// =========================================================================
// CONFIGURAÇÃO DO SUPABASE
// =========================================================================
const SUPABASE_URL = "https://rnemkthhnqnmtzlqhewo.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_YfA-PzDsNCeGSvalgxBOlg_yHE2aqAR";

// Inicializa a conexão
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let usuarioAtual = null;

// =========================================================================
// NAVEGAÇÃO E AUTENTICAÇÃO
// =========================================================================
function atualizarDicaLogin() {
  const role = document.getElementById('login-role').value;
  const hint = document.getElementById('login-hint');
  const userField = document.getElementById('login-user');

  if (role === 'cidadao') {
    hint.textContent = 'Dica Cidadão: ana.silva | 123456';
    userField.value = 'ana.silva';
  } else if (role === 'tecnico') {
    hint.textContent = 'Dica Técnico: Carlos Eduardo | 123456';
    userField.value = 'Carlos Eduardo';
  } else if (role === 'gestor') {
    hint.textContent = 'Dica Atendente/Gestor: gestor_sp | 123456';
    userField.value = 'gestor_sp';
  }
}

async function fazerLogin() {
  const role = document.getElementById('login-role').value;
  const user = document.getElementById('login-user').value.trim();

  if (!user) { alert('Informe o usuário'); return; }

  usuarioAtual = {
    login: user,
    role: role,
    nome: role === 'cidadao' ? 'Ana Maria Silva' : (role === 'tecnico' ? 'Carlos Eduardo' : 'Atendimento Central')
  };

  document.getElementById('header-user-info').style.display = 'flex';
  document.getElementById('user-display').textContent = `${usuarioAtual.nome} (${role.toUpperCase()})`;

  const btnTecnico = document.getElementById('btn-nav-tecnico');
  const btnGestor = document.getElementById('btn-nav-gestor');

  btnTecnico.style.display = (role === 'tecnico' || role === 'gestor') ? 'inline-block' : 'none';
  btnGestor.style.display = (role === 'gestor') ? 'inline-block' : 'none';

  switchView(`${role}-view`);
  await renderizarPainel();
}

function logout() {
  usuarioAtual = null;
  document.getElementById('header-user-info').style.display = 'none';
  switchView('login-view');
}

function switchView(viewId) {
  document.querySelectorAll('.view-panel').forEach(panel => panel.classList.remove('active'));
  document.getElementById(viewId).classList.add('active');
}

// =========================================================================
// LEITURA DE DADOS (SUPABASE SELECT)
// =========================================================================
async function renderizarPainel() {
  if (!usuarioAtual) return;

  // 1. VISÃO CIDADÃO
  if (usuarioAtual.role === 'cidadao') {
    const lista = document.getElementById('cidadao-os-list');
    lista.innerHTML = '<p style="color:#777;">Carregando...</p>';

    const { data: chamados, error } = await _supabase
      .from('solicitacao')
      .select('*');

    if (error) {
      console.error('Erro ao buscar chamados:', error);
      lista.innerHTML = '<p style="color:red;">Erro ao carregar chamados.</p>';
      return;
    }

    lista.innerHTML = '';
    if (!chamados || chamados.length === 0) {
      lista.innerHTML = '<p style="color:#777; margin-top:10px;">Nenhum chamado encontrado.</p>';
      return;
    }

    chamados.forEach(c => {
      lista.innerHTML += `
        <div class="os-list-item" onclick="verDetalheCidadao('${c.id_solicitacao}')">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <strong>Protocolo #${c.id_solicitacao}</strong>
            <span class="status-badge status-${(c.status || 'Pendente').replace(/\s+/g, '-')}">${c.status || 'Pendente'}</span>
          </div>
          <p style="font-size: 0.85rem; color: #555; margin-top: 4px;">${c.tipo_problema}</p>
        </div>
      `;
    });
  }

  // 2. VISÃO GESTOR / ATENDENTE
  if (usuarioAtual.role === 'gestor') {
    const lista = document.getElementById('gestor-os-list');
    lista.innerHTML = '<p style="color:#777;">Carregando...</p>';

    const { data: chamados } = await _supabase.from('solicitacao').select('*');
    const { data: usuarios } = await _supabase.from('usuario').select('*').eq('perfil', 'tecnico');

    lista.innerHTML = '';
    if (chamados) {
      chamados.forEach(c => {
        lista.innerHTML += `
          <div class="os-list-item" onclick="carregarEdicaoGestor('${c.id_solicitacao}')">
            <div style="display:flex; justify-content:space-between;">
              <strong>#${c.id_solicitacao} - ${c.tipo_problema}</strong>
              <span class="prio-badge prio-${c.categoria || 'Media'}">${c.categoria || 'Média'}</span>
            </div>
            <p style="font-size: 0.85rem; color: #555; margin-top: 4px;">Status: ${c.status}</p>
          </div>
        `;
      });
    }

    const selectTech = document.getElementById('g-tech-select');
    selectTech.innerHTML = '<option value="">Selecione um técnico</option>';
    if (usuarios) {
      usuarios.forEach(u => {
        selectTech.innerHTML += `<option value="${u.id_usuario}">${u.nome}</option>`;
      });
    }
  }

  // 3. VISÃO TÉCNICO
  if (usuarioAtual.role === 'tecnico' || usuarioAtual.role === 'gestor') {
    const listaTec = document.getElementById('tecnico-os-list');
    listaTec.innerHTML = '<p style="color:#777;">Carregando...</p>';

    const { data: chamados } = await _supabase.from('solicitacao').select('*');
    
    listaTec.innerHTML = '';
    if (chamados) {
      chamados.forEach(c => {
        listaTec.innerHTML += `
          <div class="os-list-item" onclick="carregarEdicaoTecnico('${c.id_solicitacao}')">
            <strong>Protocolo #${c.id_solicitacao}</strong> - ${c.tipo_problema}
            <p style="font-size: 0.8rem; color: #666;">Status: ${c.status}</p>
          </div>
        `;
      });
    }
  }
}

// =========================================================================
// AÇÕES DO CIDADÃO
// =========================================================================
async function verDetalheCidadao(id) {
  const { data: os } = await _supabase
    .from('solicitacao')
    .select('*')
    .eq('id_solicitacao', id)
    .single();

  if (!os) return;

  const { data: parecer } = await _supabase
    .from('parecer_tecnico')
    .select('descricao_parecer')
    .eq('id_solicitacao', id)
    .maybeSingle();

  document.getElementById('cidadao-detalhe').style.display = 'block';
  document.getElementById('c-proto').textContent = `#${os.id_solicitacao}`;
  document.getElementById('c-status').textContent = os.status;
  document.getElementById('c-servico').textContent = os.tipo_problema;
  document.getElementById('c-endereco').textContent = os.descricao || 'Não informado';
  document.getElementById('c-tecnico').textContent = 'Técnico da Unidade';
  document.getElementById('c-notas').textContent = parecer ? parecer.descricao_parecer : 'Nenhuma atualização técnica registrada.';
}

// =========================================================================
// AÇÕES DO GESTOR / ATENDENTE (INSERT, UPDATE, DELETE)
// =========================================================================
function abrirModalNovoChamadoGestor() { 
  document.getElementById('modal-novo-chamado').style.display = 'flex'; 
}

async function salvarNovoChamadoGestor() {
  const tipoServico = document.getElementById('novo-servico').value;
  const endereco = document.getElementById('novo-endereco').value;
  const nomeSolicitante = document.getElementById('novo-solicitante-nome').value.trim() || 'Cidadão';
  const loginCidadao = document.getElementById('novo-cidadao-user').value.trim() || 'ana.silva';
  const emailCidadao = `${loginCidadao.toLowerCase().replace(/\s+/g, '')}@email.com`;

  // 1. Verifica se o usuário já existe na tabela "usuario"
  let { data: usuarioExistente } = await _supabase
    .from('usuario')
    .select('id_usuario')
    .eq('email', emailCidadao)
    .maybeSingle();

  let idUsuario = usuarioExistente ? usuarioExistente.id_usuario : null;

  // 2. Se não existir, cadastra-o automaticamente para satisfazer a chave estrangeira
  if (!idUsuario) {
    const { data: novoUsuario, error: errUser } = await _supabase
      .from('usuario')
      .insert([
        {
          nome: nomeSolicitante,
          email: emailCidadao,
          senha: '123',
          perfil: 'cidadao'
        }
      ])
      .select('id_usuario')
      .single();

    if (errUser) {
      alert('Erro ao vincular/criar cidadão: ' + errUser.message);
      return;
    }

    idUsuario = novoUsuario.id_usuario;
  }

  // 3. Insere a solicitação vinculada ao ID válido do usuário
  const { error } = await _supabase.from('solicitacao').insert([
    {
      tipo_problema: tipoServico,
      descricao: endereco,
      categoria: 'Media',
      status: 'Pendente',
      id_usuario_solicitante: idUsuario
    }
  ]);

  if (error) {
    alert('Erro ao cadastrar chamado: ' + error.message);
    return;
  }

  fecharModal('modal-novo-chamado');
  await renderizarPainel();
  alert('Ordem de serviço registrada no Supabase com sucesso!');
}

async function carregarEdicaoGestor(id) {
  const { data: os } = await _supabase
    .from('solicitacao')
    .select('*')
    .eq('id_solicitacao', id)
    .single();

  if (!os) return;

  document.getElementById('gestor-painel-edicao').style.display = 'block';
  document.getElementById('g-os-id').value = os.id_solicitacao;
  document.getElementById('g-proto-title').textContent = `#${os.id_solicitacao}`;
  document.getElementById('g-prio-select').value = os.categoria || 'Media';
  document.getElementById('g-status-select').value = os.status;
  document.getElementById('g-notas-input').value = os.descricao || '';
}

async function salvarEdicaoGestor() {
  const id = document.getElementById('g-os-id').value;

  const { error } = await _supabase
    .from('solicitacao')
    .update({
      categoria: document.getElementById('g-prio-select').value,
      status: document.getElementById('g-status-select').value,
      descricao: document.getElementById('g-notas-input').value
    })
    .eq('id_solicitacao', id);

  if (error) {
    alert('Erro ao atualizar: ' + error.message);
    return;
  }

  await renderizarPainel();
  alert('Ordem de serviço atualizada no Supabase!');
}

async function excluirChamadoGestor() {
  if (!confirm('Tem certeza que deseja excluir esta Ordem de Serviço?')) return;
  const id = document.getElementById('g-os-id').value;

  const { error } = await _supabase
    .from('solicitacao')
    .delete()
    .eq('id_solicitacao', id);

  if (error) {
    alert('Erro ao excluir: ' + error.message);
    return;
  }

  document.getElementById('gestor-painel-edicao').style.display = 'none';
  await renderizarPainel();
  alert('OS excluída com sucesso.');
}

async function abrirModalGerenciarTecnicos() {
  const lista = document.getElementById('lista-tecnicos-modal');
  lista.innerHTML = '<li>Carregando...</li>';

  const { data: tecnicos } = await _supabase
    .from('usuario')
    .select('*')
    .eq('perfil', 'tecnico');

  lista.innerHTML = '';
  if (tecnicos) {
    tecnicos.forEach(t => lista.innerHTML += `<li>${t.nome} (${t.email})</li>`);
  }
  document.getElementById('modal-tecnicos').style.display = 'flex';
}

async function cadastrarTecnico() {
  const nome = document.getElementById('novo-tecnico-nome').value.trim();
  if (!nome) return;

  const { error } = await _supabase.from('usuario').insert([
    {
      nome: nome,
      email: `${nome.toLowerCase().replace(/\s+/g, '.')}@transparencia.sp.gov.br`,
      senha: '123',
      perfil: 'tecnico'
    }
  ]);

  if (error) {
    alert('Erro ao adicionar técnico: ' + error.message);
    return;
  }

  document.getElementById('novo-tecnico-nome').value = '';
  await abrirModalGerenciarTecnicos();
  await renderizarPainel();
}

// =========================================================================
// AÇÕES DO TÉCNICO
// =========================================================================
async function carregarEdicaoTecnico(id) {
  const { data: os } = await _supabase
    .from('solicitacao')
    .select('*')
    .eq('id_solicitacao', id)
    .single();

  if (!os) return;

  document.getElementById('tecnico-painel-edicao').style.display = 'block';
  document.getElementById('t-os-id').value = os.id_solicitacao;
  document.getElementById('t-proto-title').textContent = `#${os.id_solicitacao}`;
  document.getElementById('t-solicitante').textContent = 'Cidadão Solicitante';
  document.getElementById('t-endereco').textContent = os.descricao || 'Não informado';
  document.getElementById('t-orientacao-gestor').textContent = 'Diretriz interna registrada pelo gestor.';
  document.getElementById('t-status-select').value = os.status;
}

async function salvarAtualizacaoTecnico() {
  const id = document.getElementById('t-os-id').value;
  const novoStatus = document.getElementById('t-status-select').value;
  const notasTecnico = document.getElementById('t-notas-input').value;

  await _supabase
    .from('solicitacao')
    .update({ status: novoStatus })
    .eq('id_solicitacao', id);

  if (notasTecnico.trim()) {
    await _supabase.from('parecer_tecnico').insert([
      {
        id_solicitacao: parseInt(id),
        descricao_parecer: notasTecnico,
        id_tecnico: 1
      }
    ]);
  }

  await renderizarPainel();
  alert('Parecer técnico gravado no Supabase com sucesso!');
}

function fecharModal(id) { 
  document.getElementById(id).style.display = 'none'; 
}