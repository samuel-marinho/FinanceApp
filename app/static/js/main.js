document.addEventListener('DOMContentLoaded', function() {
    const despesasContainer = document.getElementById('despesasContainer');
    const addDespesaBtn = document.getElementById('addDespesa');
    const despesaForm = document.getElementById('despesaForm');
    const orcamentoForm = document.getElementById('orcamentoForm');

    // Criar container para as notificações toast
    const toastContainer = document.createElement('div');
    toastContainer.className = 'toast-container position-fixed top-0 end-0 p-3';
    document.body.appendChild(toastContainer);

    // Função para mostrar notificação toast
    function mostrarNotificacao(mensagem, tipo = 'success') {
        const toast = document.createElement('div');
        toast.className = `toast align-items-center text-white bg-${tipo} border-0`;
        toast.setAttribute('role', 'alert');
        toast.setAttribute('aria-live', 'assertive');
        toast.setAttribute('aria-atomic', 'true');
        
        toast.innerHTML = `
            <div class="d-flex">
                <div class="toast-body">
                    ${mensagem}
                </div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
            </div>
        `;
        
        toastContainer.appendChild(toast);
        const bsToast = new bootstrap.Toast(toast, { delay: 3000 });
        bsToast.show();
        
        // Remover o toast do DOM após ser escondido
        toast.addEventListener('hidden.bs.toast', () => {
            toast.remove();
        });
    }

    // Função para criar um novo item de despesa
    function criarDespesaItem() {
        const despesaItem = document.createElement('div');
        despesaItem.className = 'despesa-item mb-3';
        despesaItem.innerHTML = `
            <div class="row g-2 align-items-center">
                <div class="col-12 col-md-5">
                    <input type="text" class="form-control" placeholder="Nome da despesa" required>
                </div>
                <div class="col-7 col-md-4">
                    <select class="form-select" required>
                        <option value="">Categoria</option>
                        <option>Transporte</option>
                        <option>Mercado</option>
                        <option>Saúde</option>
                        <option>Contas</option>
                        <option>Gastos Extras</option>
                    </select>
                </div>
                <div class="col-5 col-md-2">
                    <input type="number" class="form-control" placeholder="Valor" step="0.01" required>
                </div>
                <div class="col-12 col-md-1 text-end">
                    <button type="button" class="btn btn-light btn-remove d-none d-md-inline"><i class="bi bi-x-lg"></i></button>
                </div>
            </div>
        `;

        // Adicionar evento para remover o item
        const removeBtn = despesaItem.querySelector('.btn-remove');
        removeBtn.addEventListener('click', () => {
            despesaItem.remove();
        });

        return despesaItem;
    }

    // Adicionar novo item de despesa
    addDespesaBtn.addEventListener('click', () => {
        const newItem = criarDespesaItem();
        despesasContainer.appendChild(newItem);
    });

    // Enviar formulário de despesas
    despesaForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const despesas = [];
        const items = despesasContainer.querySelectorAll('.despesa-item');

        items.forEach(item => {
            const inputs = item.querySelectorAll('input, select');
            despesas.push({
                nome: inputs[0].value,
                categoria: inputs[1].value,
                valor: parseFloat(inputs[2].value)
            });
        });

        try {
            const response = await fetch('/api/transacoes', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(despesas)
            });

            if (response.ok) {
                mostrarNotificacao('Despesas registradas com sucesso!');
                despesaForm.reset();
                // Manter apenas o primeiro item
                while (despesasContainer.children.length > 1) {
                    despesasContainer.removeChild(despesasContainer.lastChild);
                }
                // Recarregar a lista de transações
                carregarTransacoes();
            } else {
                throw new Error('Erro ao registrar despesas');
            }
        } catch (error) {
            mostrarNotificacao('Erro ao registrar despesas: ' + error.message, 'danger');
        }
    });

    // Enviar formulário de orçamento
    orcamentoForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const orcamento = {
            categoria: document.getElementById('orcCategoria').value,
            valor: parseFloat(document.getElementById('orcValor').value)
        };

        try {
            const response = await fetch('/api/orcamentos', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(orcamento)
            });

            if (response.ok) {
                mostrarNotificacao('Orçamento registrado com sucesso!');
                orcamentoForm.reset();
                // Recarregar a lista de orçamentos
                carregarOrcamentos();
            } else {
                throw new Error('Erro ao registrar orçamento');
            }
        } catch (error) {
            mostrarNotificacao('Erro ao registrar orçamento: ' + error.message, 'danger');
        }
    });

    // Adicionar modal de edição ao carregar a página
    const modalHtml = `
    <div class="modal fade" id="editModal" tabindex="-1" aria-labelledby="editModalLabel" aria-hidden="true">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title" id="editModalLabel">Editar</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body">
            <form id="editForm">
              <input type="hidden" id="editId">
              <input type="hidden" id="editTipo">
              <div id="editFields"></div>
              <button type="submit" class="btn btn-primary mt-3">Salvar Alterações</button>
            </form>
          </div>
        </div>
      </div>
    </div>`;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    const editModal = new bootstrap.Modal(document.getElementById('editModal'));
    const editForm = document.getElementById('editForm');
    const editFields = document.getElementById('editFields');

    // Função para abrir modal de edição de transação
    window.abrirEditarTransacao = function(transacao) {
        document.getElementById('editId').value = transacao._id;
        document.getElementById('editTipo').value = 'transacao';
        editFields.innerHTML = `
            <div class="mb-3">
                <label class="form-label">Nome</label>
                <input type="text" class="form-control" id="editNome" value="${transacao.nome}" required>
            </div>
            <div class="mb-3">
                <label class="form-label">Categoria</label>
                <select class="form-select" id="editCategoria" required>
                    <option value="">Categoria</option>
                    <option${transacao.categoria==='Transporte'?' selected':''}>Transporte</option>
                    <option${transacao.categoria==='Mercado'?' selected':''}>Mercado</option>
                    <option${transacao.categoria==='Saúde'?' selected':''}>Saúde</option>
                    <option${transacao.categoria==='Contas'?' selected':''}>Contas</option>
                    <option${transacao.categoria==='Gastos Extras'?' selected':''}>Gastos Extras</option>
                </select>
            </div>
            <div class="mb-3">
                <label class="form-label">Valor</label>
                <input type="number" class="form-control" id="editValor" value="${transacao.valor}" step="0.01" required>
            </div>
        `;
        editModal.show();
    };

    // Função para abrir modal de edição de orçamento
    window.abrirEditarOrcamento = function(orcamento) {
        document.getElementById('editId').value = orcamento._id;
        document.getElementById('editTipo').value = 'orcamento';
        editFields.innerHTML = `
            <div class="mb-3">
                <label class="form-label">Categoria</label>
                <select class="form-select" id="editCategoria" required>
                    <option value="">Categoria</option>
                    <option${orcamento.categoria==='Transporte'?' selected':''}>Transporte</option>
                    <option${orcamento.categoria==='Mercado'?' selected':''}>Mercado</option>
                    <option${orcamento.categoria==='Saúde'?' selected':''}>Saúde</option>
                    <option${orcamento.categoria==='Contas'?' selected':''}>Contas</option>
                    <option${orcamento.categoria==='Gastos Extras'?' selected':''}>Gastos Extras</option>
                </select>
            </div>
            <div class="mb-3">
                <label class="form-label">Valor</label>
                <input type="number" class="form-control" id="editValor" value="${orcamento.valor}" step="0.01" required>
            </div>
        `;
        editModal.show();
    };

    // Adicionar botões de editar nas listas
    function renderTransacaoItem(transacao) {
        const item = document.createElement('div');
        item.className = 'list-group-item d-flex justify-content-between align-items-center';
        item.innerHTML = `
            <div>
                <h6 class="mb-1">${transacao.nome}</h6>
                <small class="text-muted">${transacao.categoria}</small>
            </div>
            <div class="d-flex align-items-center">
                <span class="text-danger me-3">R$ ${transacao.valor.toFixed(2)}</span>
                <button class="btn btn-sm btn-outline-secondary me-2" onclick='abrirEditarTransacao(${JSON.stringify(transacao)})'><i class="bi bi-pencil"></i></button>
                <button class="btn btn-sm btn-outline-danger" onclick="excluirTransacao('${transacao._id}')"><i class="bi bi-trash"></i></button>
            </div>
        `;
        return item;
    }

    function renderOrcamentoItem(orcamento) {
        const item = document.createElement('div');
        item.className = 'list-group-item d-flex justify-content-between align-items-center';
        item.innerHTML = `
            <div>
                <h6 class="mb-1">${orcamento.categoria}</h6>
                <small class="text-muted">Orçamento Mensal</small>
            </div>
            <div class="d-flex align-items-center">
                <span class="text-primary me-3">R$ ${orcamento.valor.toFixed(2)}</span>
                <button class="btn btn-sm btn-outline-secondary me-2" onclick='abrirEditarOrcamento(${JSON.stringify(orcamento)})'><i class="bi bi-pencil"></i></button>
                <button class="btn btn-sm btn-outline-danger" onclick="excluirOrcamento('${orcamento._id}')"><i class="bi bi-trash"></i></button>
            </div>
        `;
        return item;
    }

    // Atualizar funções de carregamento para usar os novos renders
    async function carregarTransacoes() {
        try {
            const response = await fetch('/api/transacoes');
            const transacoes = await response.json();
            const transacoesList = document.getElementById('transacoesList');
            if (transacoesList) {
                transacoesList.innerHTML = '';
                transacoes.forEach(transacao => {
                    transacoesList.appendChild(renderTransacaoItem(transacao));
                });
            }
        } catch (error) {
            console.error('Erro ao carregar transações:', error);
            mostrarNotificacao('Erro ao carregar transações', 'danger');
        }
    }

    async function carregarOrcamentos() {
        try {
            const response = await fetch('/api/orcamentos');
            const orcamentos = await response.json();
            const orcamentosList = document.getElementById('orcamentosList');
            if (orcamentosList) {
                orcamentosList.innerHTML = '';
                orcamentos.forEach(orcamento => {
                    orcamentosList.appendChild(renderOrcamentoItem(orcamento));
                });
            }
        } catch (error) {
            console.error('Erro ao carregar orçamentos:', error);
            mostrarNotificacao('Erro ao carregar orçamentos', 'danger');
        }
    }

    // Lógica de envio do formulário de edição
    editForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        const id = document.getElementById('editId').value;
        const tipo = document.getElementById('editTipo').value;
        const categoria = document.getElementById('editCategoria').value;
        const valor = parseFloat(document.getElementById('editValor').value);
        let body;
        let url;
        if (tipo === 'transacao') {
            const nome = document.getElementById('editNome').value;
            body = { nome, categoria, valor };
            url = `/api/transacoes/${id}`;
        } else {
            body = { categoria, valor };
            url = `/api/orcamentos/${id}`;
        }
        try {
            const response = await fetch(url, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });
            if (response.ok) {
                mostrarNotificacao('Alteração salva com sucesso!');
                editModal.hide();
                if (tipo === 'transacao') carregarTransacoes();
                else carregarOrcamentos();
            } else {
                throw new Error('Erro ao salvar alteração');
            }
        } catch (error) {
            mostrarNotificacao('Erro ao salvar alteração: ' + error.message, 'danger');
        }
    });

    // Função para excluir transação
    window.excluirTransacao = async function(id) {
        if (confirm('Tem certeza que deseja excluir esta transação?')) {
            try {
                const response = await fetch(`/api/transacoes/${id}`, {
                    method: 'DELETE'
                });
                if (response.ok) {
                    mostrarNotificacao('Transação excluída com sucesso!');
                    carregarTransacoes();
                }
            } catch (error) {
                console.error('Erro ao excluir transação:', error);
                mostrarNotificacao('Erro ao excluir transação', 'danger');
            }
        }
    };

    // Função para excluir orçamento
    window.excluirOrcamento = async function(id) {
        if (confirm('Tem certeza que deseja excluir este orçamento?')) {
            try {
                const response = await fetch(`/api/orcamentos/${id}`, {
                    method: 'DELETE'
                });
                if (response.ok) {
                    mostrarNotificacao('Orçamento excluído com sucesso!');
                    carregarOrcamentos();
                }
            } catch (error) {
                console.error('Erro ao excluir orçamento:', error);
                mostrarNotificacao('Erro ao excluir orçamento', 'danger');
            }
        }
    };

    // Carregar dados iniciais
    carregarTransacoes();
    carregarOrcamentos();
}); 